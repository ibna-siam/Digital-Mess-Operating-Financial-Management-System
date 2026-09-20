import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { setSocketIO } from './socketEmitter.js';
import { MemberStatus, Role } from '@prisma/client';

export function initializeSocket(io: SocketIOServer): void {
  // Register singleton for service layer emissions
  setSocketIO(io);

  // Scoped authentication & membership resolution middleware
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

    if (!token) {
      return next(new Error('Authentication token required for WebSocket connection'));
    }

    try {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const payload = verifyToken(cleanToken);
      socket.data.userId = payload.userId;

      // Query active mess memberships from the database
      const memberships = await prisma.messMember.findMany({
        where: {
          userId: payload.userId,
          status: {
            in: [
              MemberStatus.ACTIVE,
              MemberStatus.ON_LEAVE,
              MemberStatus.PENDING,
              MemberStatus.LEAVING_REQUESTED,
            ],
          },
        },
        select: {
          messId: true,
          role: true,
          status: true,
        },
      });

      socket.data.memberships = memberships;
      next();
    } catch (err: any) {
      logger.warn(`Invalid WebSocket handshake auth: ${err.message}`);
      next(new Error('Invalid WebSocket authentication token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    const memberships: Array<{ messId: string; role: Role; status: MemberStatus }> =
      socket.data.memberships || [];

    logger.info(`🔌 WebSocket client connected: ${socket.id} (user: ${userId})`);

    // 1. Join user-specific private room
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      logger.debug(`User ${userId} joined personal room ${userRoom}`);
    }

    // 2. Automatically join authorized mess rooms and role sub-rooms derived from DB
    memberships.forEach((m) => {
      const messRoom = `mess:${m.messId}`;
      socket.join(messRoom);

      // Members room
      socket.join(`mess:${m.messId}:members`);

      // Admin sub-room
      if (m.role === Role.OWNER || m.role === Role.MANAGER) {
        socket.join(`mess:${m.messId}:admins`);
      }

      // Treasurer sub-room
      if (m.role === Role.OWNER || m.role === Role.MANAGER || m.role === Role.TREASURER) {
        socket.join(`mess:${m.messId}:treasurers`);
      }

      logger.debug(`Socket ${socket.id} auto-joined rooms for mess:${m.messId} (role: ${m.role})`);
    });

    // 3. Client-initiated join mess handler with STRICT server-side membership validation
    socket.on('join:mess', async (messId: string) => {
      if (!messId || typeof messId !== 'string') return;

      // Security validation: verify that user is an authorized active member of this mess
      const isAuthorized = memberships.some((m) => m.messId === messId);
      if (!isAuthorized) {
        // Fallback: query database in case membership was just granted mid-session
        const dbMember = await prisma.messMember.findUnique({
          where: { messId_userId: { messId, userId } },
          select: { role: true, status: true },
        });

        if (
          !dbMember ||
          (dbMember.status !== MemberStatus.ACTIVE &&
            dbMember.status !== MemberStatus.ON_LEAVE &&
            dbMember.status !== MemberStatus.LEAVING_REQUESTED)
        ) {
          logger.warn(`🚨 Security: Unauthorized room join attempt rejected. User ${userId} tried joining mess:${messId}`);
          socket.emit('error', { message: 'Unauthorized: You are not an active member of this mess.' });
          return;
        }

        // Add to cached socket memberships
        memberships.push({ messId, role: dbMember.role, status: dbMember.status });
      }

      const messRoom = `mess:${messId}`;
      socket.join(messRoom);
      logger.info(`User ${userId} verified and joined mess room: ${messRoom}`);

      socket.emit('joined:mess', {
        messId,
        room: messRoom,
        status: 'joined',
        timestamp: new Date().toISOString(),
      });
    });

    // 4. Leave mess room
    socket.on('leave:mess', (messId: string) => {
      if (!messId) return;
      const messRoom = `mess:${messId}`;
      socket.leave(messRoom);
      logger.info(`User ${userId} left mess room: ${messRoom}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
