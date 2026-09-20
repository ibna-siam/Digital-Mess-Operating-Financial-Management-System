import { prisma, isDatabaseOnline } from '../config/database.js';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export interface RecordMeterReadingInput {
  meterType: string; // ELECTRICITY, WATER, GAS, OTHER
  meterName: string;
  meterIdentifier?: string;
  roomNumber?: string;
  billingPeriod: string; // YYYY-MM
  readingDate: string;
  currentValue: number;
  previousValue: number;
  isRollover?: boolean;
  recordedById?: string;
  notes?: string;
}

export interface MeterReadingDTO {
  id: string;
  messId: string;
  meterType: string;
  meterName: string;
  meterIdentifier: string | null;
  roomNumber: string | null;
  billingPeriod: string;
  readingDate: string;
  currentValue: number;
  previousValue: number;
  consumedUnits: number;
  isRollover: boolean;
  recordedById: string | null;
  recordedByName?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const memoryMeterReadings: Map<string, MeterReadingDTO[]> = new Map();

function initMemoryReadings(messId: string): MeterReadingDTO[] {
  if (!memoryMeterReadings.has(messId)) {
    memoryMeterReadings.set(messId, [
      {
        id: 'mr-1',
        messId,
        meterType: 'ELECTRICITY',
        meterName: 'Main Building DESCO Meter',
        meterIdentifier: 'ELEC-MAIN-01',
        roomNumber: null,
        billingPeriod: '2026-08',
        readingDate: '2026-08-31',
        currentValue: 1250,
        previousValue: 1100,
        consumedUnits: 150,
        isRollover: false,
        recordedById: 'mem-1',
        recordedByName: 'Siam Ahmed',
        notes: 'August final reading',
        createdAt: new Date('2026-08-31').toISOString(),
        updatedAt: new Date('2026-08-31').toISOString(),
      },
    ]);
  }
  return memoryMeterReadings.get(messId)!;
}

export class MeterService {
  /**
   * Records a new meter reading with rollover and negative usage validation
   */
  public static async recordReading(messId: string, input: RecordMeterReadingInput): Promise<MeterReadingDTO> {
    if (input.currentValue < 0 || input.previousValue < 0) {
      throw new BadRequestError('Meter reading values cannot be negative');
    }

    if (!input.isRollover && input.currentValue < input.previousValue) {
      throw new BadRequestError(
        `Current reading (${input.currentValue}) cannot be less than previous reading (${input.previousValue}) unless marked as meter rollover/reset`
      );
    }

    const consumedUnits = input.isRollover
      ? input.currentValue
      : Math.round((input.currentValue - input.previousValue) * 100) / 100;

    const readingDate = new Date(input.readingDate);
    const identifier = input.meterIdentifier?.trim() || 'DEFAULT';

    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const existing = await prisma.meterReading.findFirst({
        where: {
          messId,
          meterType: input.meterType,
          meterIdentifier: identifier,
          billingPeriod: input.billingPeriod,
        },
      });

      let record;
      if (existing) {
        record = await prisma.meterReading.update({
          where: { id: existing.id },
          data: {
            currentValue: new Prisma.Decimal(input.currentValue),
            previousValue: new Prisma.Decimal(input.previousValue),
            consumedUnits: new Prisma.Decimal(consumedUnits),
            isRollover: input.isRollover || false,
            readingDate,
            notes: input.notes,
          },
          include: {
            recordedBy: { include: { user: true } },
          },
        });
      } else {
        record = await prisma.meterReading.create({
          data: {
            messId,
            meterType: input.meterType,
            meterName: input.meterName,
            meterIdentifier: identifier,
            roomNumber: input.roomNumber,
            billingPeriod: input.billingPeriod,
            readingDate,
            currentValue: new Prisma.Decimal(input.currentValue),
            previousValue: new Prisma.Decimal(input.previousValue),
            consumedUnits: new Prisma.Decimal(consumedUnits),
            isRollover: input.isRollover || false,
            recordedById: input.recordedById,
            notes: input.notes,
          },
          include: {
            recordedBy: { include: { user: true } },
          },
        });
      }

      return {
        id: record.id,
        messId: record.messId,
        meterType: record.meterType,
        meterName: record.meterName,
        meterIdentifier: record.meterIdentifier,
        roomNumber: record.roomNumber,
        billingPeriod: record.billingPeriod,
        readingDate: record.readingDate.toISOString().split('T')[0],
        currentValue: Number(record.currentValue),
        previousValue: Number(record.previousValue),
        consumedUnits: Number(record.consumedUnits),
        isRollover: record.isRollover,
        recordedById: record.recordedById,
        recordedByName: record.recordedBy?.user?.name || null,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch {
      const list = initMemoryReadings(messId);
      const existing = list.find(
        (r) =>
          r.meterType === input.meterType &&
          r.meterIdentifier === identifier &&
          r.billingPeriod === input.billingPeriod
      );

      if (existing) {
        existing.currentValue = input.currentValue;
        existing.previousValue = input.previousValue;
        existing.consumedUnits = consumedUnits;
        existing.isRollover = !!input.isRollover;
        existing.readingDate = input.readingDate;
        existing.notes = input.notes || null;
        existing.updatedAt = new Date().toISOString();
        return existing;
      }

      const newDTO: MeterReadingDTO = {
        id: `mr-${Date.now()}`,
        messId,
        meterType: input.meterType,
        meterName: input.meterName,
        meterIdentifier: identifier,
        roomNumber: input.roomNumber || null,
        billingPeriod: input.billingPeriod,
        readingDate: input.readingDate,
        currentValue: input.currentValue,
        previousValue: input.previousValue,
        consumedUnits,
        isRollover: !!input.isRollover,
        recordedById: input.recordedById || null,
        recordedByName: 'Logged User',
        notes: input.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newDTO);
      return newDTO;
    }
  }

  /**
   * Retrieves the most recent meter reading to automatically prefill previous reading in forms
   */
  public static async getLatestReading(
    messId: string,
    meterType: string,
    meterIdentifier?: string
  ): Promise<MeterReadingDTO | null> {
    const identifier = meterIdentifier?.trim() || 'DEFAULT';
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const reading = await prisma.meterReading.findFirst({
        where: {
          messId,
          meterType,
          ...(meterIdentifier ? { meterIdentifier: identifier } : {}),
        },
        orderBy: { readingDate: 'desc' },
        include: {
          recordedBy: { include: { user: true } },
        },
      });

      if (!reading) return null;

      return {
        id: reading.id,
        messId: reading.messId,
        meterType: reading.meterType,
        meterName: reading.meterName,
        meterIdentifier: reading.meterIdentifier,
        roomNumber: reading.roomNumber,
        billingPeriod: reading.billingPeriod,
        readingDate: reading.readingDate.toISOString().split('T')[0],
        currentValue: Number(reading.currentValue),
        previousValue: Number(reading.previousValue),
        consumedUnits: Number(reading.consumedUnits),
        isRollover: reading.isRollover,
        recordedById: reading.recordedById,
        recordedByName: reading.recordedBy?.user?.name || null,
        notes: reading.notes,
        createdAt: reading.createdAt.toISOString(),
        updatedAt: reading.updatedAt.toISOString(),
      };
    } catch {
      const list = initMemoryReadings(messId);
      const filtered = list.filter((r) => r.meterType === meterType);
      if (filtered.length === 0) return null;
      return filtered[filtered.length - 1];
    }
  }

  /**
   * List meter readings with optional period and type filters
   */
  public static async listReadings(
    messId: string,
    filters?: { billingPeriod?: string; meterType?: string }
  ): Promise<MeterReadingDTO[]> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const where: Prisma.MeterReadingWhereInput = { messId };
      if (filters?.billingPeriod) where.billingPeriod = filters.billingPeriod;
      if (filters?.meterType) where.meterType = filters.meterType;

      const readings = await prisma.meterReading.findMany({
        where,
        include: {
          recordedBy: { include: { user: true } },
        },
        orderBy: { readingDate: 'desc' },
      });

      return readings.map((r) => ({
        id: r.id,
        messId: r.messId,
        meterType: r.meterType,
        meterName: r.meterName,
        meterIdentifier: r.meterIdentifier,
        roomNumber: r.roomNumber,
        billingPeriod: r.billingPeriod,
        readingDate: r.readingDate.toISOString().split('T')[0],
        currentValue: Number(r.currentValue),
        previousValue: Number(r.previousValue),
        consumedUnits: Number(r.consumedUnits),
        isRollover: r.isRollover,
        recordedById: r.recordedById,
        recordedByName: r.recordedBy?.user?.name || null,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch {
      let list = initMemoryReadings(messId);
      if (filters?.billingPeriod) list = list.filter((r) => r.billingPeriod === filters.billingPeriod);
      if (filters?.meterType) list = list.filter((r) => r.meterType === filters.meterType);
      return list;
    }
  }
}
