import { prisma } from '../config/database.js';
import { Role, MemberStatus, InvitationStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import crypto from 'crypto';

export interface CreateInvitationInput {
  email: string;
  name?: string;
  phone?: string;
  role?: Role;
  roomId?: string;
  roomNo?: string;
  joinDate?: string;
  notes?: string;
}

export class InvitationService {
  /**
   * Generates a cryptographically secure, single-use invitation token with 7-day expiration.
   */
  public static async createInvitation(
    messId: string,
    invitedByUserId: string,
    data: CreateInvitationInput
  ) {
    const email = data.email.toLowerCase().trim();
    const role = data.role || Role.MEMBER;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = crypto.randomBytes(32).toString('hex');

    // Check if active member already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.messMember.findUnique({
        where: {
          messId_userId: { messId, userId: existingUser.id },
        },
      });
      if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
        throw new ConflictError('User is already an active member of this mess');
      }
    }

    // Check if roomId is provided, verify room
    let roomNo = data.roomNo;
    if (data.roomId) {
      const room = await prisma.room.findFirst({
        where: { id: data.roomId, messId },
        include: { members: { where: { status: { notIn: [MemberStatus.ARCHIVED, MemberStatus.INACTIVE, MemberStatus.SETTLED] } } } },
      });
      if (!room) throw new NotFoundError('Specified room not found');
      if (room.members.length >= room.capacity) {
        throw new ValidationError(`Room ${room.roomNumber} is at capacity (${room.capacity} members max)`);
      }
      roomNo = room.roomNumber;
    }

    const invitation = await prisma.invitation.create({
      data: {
        messId,
        email,
        name: data.name?.trim() || null,
        phone: data.phone?.trim() || null,
        role,
        roomId: data.roomId || null,
        roomNo: roomNo || null,
        joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
        notes: data.notes || null,
        token,
        expiresAt,
        status: InvitationStatus.PENDING,
        invitedById: invitedByUserId,
      },
      include: {
        mess: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      ...invitation,
      inviteUrl: `/invite/${token}`,
    };
  }

  /**
   * Retrieves and validates an invitation token for the public onboarding view.
   */
  public static async getInvitationByToken(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        mess: {
          select: {
            id: true,
            name: true,
            code: true,
            area: true,
            city: true,
            currency: true,
            currencySymbol: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or invalid token');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ValidationError('This invitation has already been accepted');
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new ValidationError('This invitation has been revoked');
    }

    if (new Date() > invitation.expiresAt || invitation.status === InvitationStatus.EXPIRED) {
      if (invitation.status !== InvitationStatus.EXPIRED) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
      }
      throw new ValidationError('This invitation link has expired. Please ask the manager for a new invite.');
    }

    return invitation;
  }

  /**
   * Public acceptance flow.
   */
  public static async acceptInvitation(
    token: string,
    userId: string,
    profileData?: { name?: string; phone?: string }
  ) {
    const invitation = await this.getInvitationByToken(token);

    return await prisma.$transaction(async (tx) => {
      if (profileData?.name || profileData?.phone) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(profileData.name ? { name: profileData.name.trim() } : {}),
            ...(profileData.phone ? { phone: profileData.phone.trim() } : {}),
          },
        });
      }

      const existing = await tx.messMember.findUnique({
        where: { messId_userId: { messId: invitation.messId, userId } },
      });

      let member;
      if (existing) {
        member = await tx.messMember.update({
          where: { id: existing.id },
          data: {
            status: MemberStatus.ACTIVE,
            role: invitation.role,
            roomId: invitation.roomId || existing.roomId,
            roomNo: invitation.roomNo || existing.roomNo,
            leaveDate: null,
          },
        });
      } else {
        member = await tx.messMember.create({
          data: {
            messId: invitation.messId,
            userId,
            role: invitation.role,
            roomId: invitation.roomId,
            roomNo: invitation.roomNo,
            joinDate: invitation.joinDate || new Date(),
            status: MemberStatus.ACTIVE,
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      await tx.memberHistory.create({
        data: {
          messId: invitation.messId,
          memberId: member.id,
          action: 'INVITATION_ACCEPTED',
          details: {
            role: invitation.role,
            roomNo: invitation.roomNo,
            acceptedAt: new Date().toISOString(),
          },
        },
      });

      return { member, messId: invitation.messId };
    });
  }

  /**
   * Lists all invitations for a mess.
   */
  public static async listInvitations(messId: string) {
    const invitations = await prisma.invitation.findMany({
      where: { messId },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      ...inv,
      isExpired: new Date() > inv.expiresAt || inv.status === InvitationStatus.EXPIRED,
      inviteUrl: `/invite/${inv.token}`,
    }));
  }

  /**
   * Revokes an active invitation.
   */
  public static async revokeInvitation(messId: string, invitationId: string) {
    const inv = await prisma.invitation.findFirst({
      where: { id: invitationId, messId },
    });
    if (!inv) throw new NotFoundError('Invitation not found');

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
    return updated;
  }
}
