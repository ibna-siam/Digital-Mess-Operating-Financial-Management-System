import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';
import { invalidateDashboardCache } from '../controllers/dashboardController.js';

let ioInstance: SocketIOServer | null = null;

export const SOCKET_EVENTS = {
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_READ_ALL: 'notification.read_all',
  ANNOUNCEMENT_CREATED: 'announcement.created',
  DASHBOARD_UPDATED: 'dashboard.financial_updated',
  MEMBER_UPDATED: 'member.updated',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_APPROVED: 'expense.approved',
  EXPENSE_REJECTED: 'expense.rejected',
  PERIOD_FINALIZED: 'period.finalized',
  BAZAR_CREATED: 'bazar.created',
  MEAL_UPDATED: 'meal.updated',
  BILL_CREATED: 'bill.created',
  SETTLEMENT_UPDATED: 'settlement.updated',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export function setSocketIO(io: SocketIOServer): void {
  ioInstance = io;
  logger.info('⚡ Socket.io singleton registered in socketEmitter');
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Emit an event to a single authenticated user's private room.
 */
export function emitToUser(userId: string, event: string, payload: any): void {
  if (!ioInstance) {
    logger.debug(`[SocketEmitter] io not initialized. Suppressing emit to user:${userId}`);
    return;
  }
  const room = `user:${userId}`;
  ioInstance.to(room).emit(event, payload);
  if (event.includes('.')) {
    ioInstance.to(room).emit(event.replace('.', ':'), payload);
  } else if (event.includes(':')) {
    ioInstance.to(room).emit(event.replace(':', '.'), payload);
  }
  logger.debug(`[SocketEmitter] Emitted ${event} to room ${room}`);
}

/**
 * Emit an event to an entire mess room (all authorized members of the mess).
 */
export function emitToMess(messId: string, event: string, payload: any): void {
  // Invalidate any cached dashboard metrics when mess state changes
  invalidateDashboardCache(messId);

  if (!ioInstance) {
    logger.debug(`[SocketEmitter] io not initialized. Suppressing emit to mess:${messId}`);
    return;
  }
  const room = `mess:${messId}`;
  ioInstance.to(room).emit(event, payload);
  if (event.includes('.')) {
    ioInstance.to(room).emit(event.replace('.', ':'), payload);
  } else if (event.includes(':')) {
    ioInstance.to(room).emit(event.replace(':', '.'), payload);
  }
  logger.debug(`[SocketEmitter] Emitted ${event} to room ${room}`);
}

/**
 * Emit an event to a specific role sub-room within a mess.
 * e.g. mess:{messId}:admins or mess:{messId}:treasurers
 */
export function emitToMessRole(messId: string, role: string, event: string, payload: any): void {
  if (!ioInstance) return;
  const room = `mess:${messId}:${role.toLowerCase()}s`;
  ioInstance.to(room).emit(event, payload);
  logger.debug(`[SocketEmitter] Emitted ${event} to room ${room}`);
}

/**
 * Emit specifically to admins & managers of a mess.
 */
export function emitToMessAdmins(messId: string, event: string, payload: any): void {
  emitToMessRole(messId, 'admin', event, payload);
}

/**
 * Emit specifically to treasurers & financial managers of a mess.
 */
export function emitToMessTreasurers(messId: string, event: string, payload: any): void {
  emitToMessRole(messId, 'treasurer', event, payload);
}

/**
 * Emit an event to multiple rooms simultaneously.
 */
export function emitToRooms(rooms: string[], event: string, payload: any): void {
  if (!ioInstance) return;
  rooms.forEach((room) => {
    ioInstance?.to(room).emit(event, payload);
  });
}
