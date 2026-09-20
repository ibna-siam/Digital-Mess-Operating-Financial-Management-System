import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/token.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { AuthenticatedUser } from '../types/auth.js';
import { generateJoinCode, normalizeJoinCode } from '../utils/joinCode.js';
import { MessStatus, Role, MemberStatus } from '@prisma/client';

export class AuthService {
  public static async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    onboarding?: {
      mode: 'CREATE' | 'JOIN';
      messName?: string;
      city?: string;
      area?: string;
      address?: string;
      currency?: string;
      currencySymbol?: string;
      joinCode?: string;
    };
  }): Promise<{ user: AuthenticatedUser; token: string; activeMess?: any }> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const passwordHash = await hashPassword(data.password);

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    // 1. Unified Registration with "CREATE NEW MESS"
    if (data.onboarding?.mode === 'CREATE') {
      const messName = data.onboarding.messName?.trim();
      if (!messName) {
        throw new BadRequestError('Mess name is required to create a new mess');
      }

      let code = generateJoinCode('MM');
      let existingMess = await prisma.mess.findUnique({ where: { code } });
      while (existingMess) {
        code = generateJoinCode('MM');
        existingMess = await prisma.mess.findUnique({ where: { code } });
      }

      const currency = data.onboarding.currency || 'BDT';
      const currencySymbol =
        data.onboarding.currencySymbol ||
        (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '৳');

      const { user, mess, member } = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: data.name.trim(),
            phone: data.phone?.trim() || null,
          },
        });

        const newMess = await tx.mess.create({
          data: {
            name: messName,
            code,
            currency,
            currencySymbol,
            area: data.onboarding?.area?.trim() || null,
            city: data.onboarding?.city?.trim() || null,
            address: data.onboarding?.address?.trim() || null,
            status: MessStatus.ACTIVE,
            createdById: newUser.id,
          },
        });

        const newMember = await tx.messMember.create({
          data: {
            messId: newMess.id,
            userId: newUser.id,
            role: Role.MANAGER,
            status: MemberStatus.ACTIVE,
          },
        });

        return { user: newUser, mess: newMess, member: newMember };
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: member.role,
        messId: mess.id,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        },
        token,
        activeMess: {
          id: mess.id,
          name: mess.name,
          code: mess.code,
          currency: mess.currency,
          currencySymbol: mess.currencySymbol,
          area: mess.area,
          city: mess.city,
          status: mess.status,
          myRole: member.role,
        },
      };
    }

    // 2. Unified Registration with "JOIN EXISTING MESS"
    if (data.onboarding?.mode === 'JOIN') {
      const rawJoinCode = data.onboarding.joinCode?.trim();
      if (!rawJoinCode) {
        throw new BadRequestError('Mess join code is required to join an existing mess');
      }

      const cleanCode = normalizeJoinCode(rawJoinCode);
      const targetMess = await prisma.mess.findFirst({
        where: {
          code: { equals: cleanCode, mode: 'insensitive' },
          status: MessStatus.ACTIVE,
        },
      });

      if (!targetMess) {
        throw new NotFoundError('Invalid or inactive mess join code. Please check with your mess manager.');
      }

      const { user, member } = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: data.name.trim(),
            phone: data.phone?.trim() || null,
          },
        });

        const newMember = await tx.messMember.create({
          data: {
            messId: targetMess.id,
            userId: newUser.id,
            role: Role.MEMBER,
            status: MemberStatus.ACTIVE,
          },
        });

        return { user: newUser, member: newMember };
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: member.role,
        messId: targetMess.id,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        },
        token,
        activeMess: {
          id: targetMess.id,
          name: targetMess.name,
          code: targetMess.code,
          currency: targetMess.currency,
          currencySymbol: targetMess.currencySymbol,
          area: targetMess.area,
          city: targetMess.city,
          status: targetMess.status,
          myRole: member.role,
        },
      };
    }

    // 3. Fallback: Standard User Registration without immediate mess
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
      },
    });

    const token = generateToken({ userId: created.id, email: created.email });
    const user: AuthenticatedUser = {
      id: created.id,
      email: created.email,
      name: created.name,
      phone: created.phone,
      avatarUrl: created.avatarUrl,
    };

    return { user, token };
  }

  public static async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: AuthenticatedUser; token: string; activeMess?: any }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    const memberships = await prisma.messMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { mess: true },
      take: 1,
    });

    const activeMess = memberships[0]?.mess
      ? {
          id: memberships[0].mess.id,
          name: memberships[0].mess.name,
          code: memberships[0].mess.code,
          currency: memberships[0].mess.currency,
          currencySymbol: memberships[0].mess.currencySymbol,
          area: memberships[0].mess.area,
          city: memberships[0].mess.city,
          status: memberships[0].mess.status,
          myRole: memberships[0].role,
        }
      : null;

    const token = generateToken({ userId: user.id, email: user.email, role: memberships[0]?.role, messId: memberships[0]?.messId });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
      token,
      activeMess,
    };
  }

  public static async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }
}
