import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { emitToMess, emitToMessRole, SOCKET_EVENTS } from '../socket/socketEmitter.js';
import { NotificationService } from './notificationService.js';
import { MemberStatus, Role } from '@prisma/client';

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  audience?: 'ALL_MEMBERS' | 'ADMINS' | 'TREASURERS';
  expiresAt?: string | null;
}

export class AnnouncementService {
  /**
   * Create an announcement, generate in-app notifications for recipients, and broadcast via Socket.io.
   */
  static async createAnnouncement(messId: string, memberId: string, input: CreateAnnouncementInput) {
    const creator = await prisma.messMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!creator || creator.messId !== messId) {
      throw new Error('Unauthorized announcement creator');
    }

    const announcement = await prisma.announcement.create({
      data: {
        messId,
        title: input.title,
        message: input.message,
        priority: input.priority || 'NORMAL',
        audience: input.audience || 'ALL_MEMBERS',
        createdById: memberId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: {
        createdBy: {
          include: {
            user: {
              select: { name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Determine target members based on audience
    const roleFilter: Role[] = [];
    if (announcement.audience === 'ADMINS') {
      roleFilter.push(Role.OWNER, Role.MANAGER);
    } else if (announcement.audience === 'TREASURERS') {
      roleFilter.push(Role.OWNER, Role.MANAGER, Role.TREASURER);
    }

    const recipients = await prisma.messMember.findMany({
      where: {
        messId,
        status: { in: [MemberStatus.ACTIVE, MemberStatus.ON_LEAVE] },
        ...(roleFilter.length > 0 ? { role: { in: roleFilter } } : {}),
      },
      select: {
        id: true,
        userId: true,
      },
    });

    // Create in-app notifications for targeted recipients
    const notifInputs = recipients.map((r) => ({
      messId,
      userId: r.userId,
      memberId: r.id,
      type: 'ANNOUNCEMENT',
      category: 'ANNOUNCEMENT' as const,
      priority: announcement.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
      title: `Notice: ${announcement.title}`,
      message: announcement.message,
      entityType: 'ANNOUNCEMENT',
      entityId: announcement.id,
      actionUrl: '/notifications',
      idempotencyKey: `announcement_${announcement.id}_${r.userId}`,
    }));

    await NotificationService.createBulkNotifications(notifInputs);

    // Emit real-time socket event to the target room
    const eventPayload = {
      id: announcement.id,
      messId: announcement.messId,
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      audience: announcement.audience,
      createdAt: announcement.createdAt,
      createdBy: announcement.createdBy.user.name,
    };

    if (announcement.audience === 'ADMINS') {
      emitToMessRole(messId, 'admin', SOCKET_EVENTS.ANNOUNCEMENT_CREATED, eventPayload);
    } else if (announcement.audience === 'TREASURERS') {
      emitToMessRole(messId, 'treasurer', SOCKET_EVENTS.ANNOUNCEMENT_CREATED, eventPayload);
    } else {
      emitToMess(messId, SOCKET_EVENTS.ANNOUNCEMENT_CREATED, eventPayload);
    }

    logger.info(`📢 Announcement created [${announcement.id}] in mess ${messId} by member ${memberId}`);
    return announcement;
  }

  /**
   * Retrieve active announcements visible to a member's role.
   */
  static async getAnnouncements(messId: string, role: Role) {
    const visibleAudiences = ['ALL_MEMBERS'];
    if (role === Role.OWNER || role === Role.MANAGER) {
      visibleAudiences.push('ADMINS', 'TREASURERS');
    } else if (role === Role.TREASURER) {
      visibleAudiences.push('TREASURERS');
    }

    const now = new Date();

    return prisma.announcement.findMany({
      where: {
        messId,
        audience: { in: visibleAudiences },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          include: {
            user: {
              select: { name: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  /**
   * Delete an announcement.
   */
  static async deleteAnnouncement(announcementId: string, messId: string) {
    return prisma.announcement.delete({
      where: {
        id: announcementId,
        messId,
      },
    });
  }
}
