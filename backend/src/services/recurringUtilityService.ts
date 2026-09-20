import { prisma, isDatabaseOnline } from '../config/database.js';
import { Prisma, SplitMethod } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { UtilityService } from './utilityService.js';

export interface CreateRecurringTemplateInput {
  name: string;
  category: string;
  utilityType: string; // FIXED, METER_BASED, USAGE_BASED, CUSTOM
  defaultAmount: number;
  frequency?: string;
  dueDay?: number;
  splitMethod?: SplitMethod;
  autoGenerate?: boolean;
  requiresReview?: boolean;
  notes?: string;
}

export interface RecurringTemplateDTO {
  id: string;
  messId: string;
  name: string;
  category: string;
  utilityType: string;
  defaultAmount: number;
  frequency: string;
  dueDay: number;
  splitMethod: SplitMethod;
  autoGenerate: boolean;
  requiresReview: boolean;
  isActive: boolean;
  lastGeneratedPeriod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const memoryTemplates: Map<string, RecurringTemplateDTO[]> = new Map();

function initMemoryTemplates(messId: string): RecurringTemplateDTO[] {
  if (!memoryTemplates.has(messId)) {
    memoryTemplates.set(messId, [
      {
        id: 'rec-1',
        messId,
        name: 'High-Speed Fiber Wi-Fi',
        category: 'WIFI',
        utilityType: 'FIXED',
        defaultAmount: 1200,
        frequency: 'MONTHLY',
        dueDay: 10,
        splitMethod: 'EQUAL',
        autoGenerate: true,
        requiresReview: false,
        isActive: true,
        lastGeneratedPeriod: null,
        notes: 'Monthly optical fiber package',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rec-2',
        messId,
        name: 'Housekeeper / Maid Salary',
        category: 'MAID',
        utilityType: 'FIXED',
        defaultAmount: 4500,
        frequency: 'MONTHLY',
        dueDay: 5,
        splitMethod: 'EQUAL',
        autoGenerate: false,
        requiresReview: true,
        isActive: true,
        lastGeneratedPeriod: null,
        notes: 'Monthly cooking and cleaning service',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rec-3',
        messId,
        name: 'House Rent',
        category: 'RENT',
        utilityType: 'ROOM_BASED',
        defaultAmount: 20000,
        frequency: 'MONTHLY',
        dueDay: 7,
        splitMethod: 'ROOM_BASED',
        autoGenerate: false,
        requiresReview: true,
        isActive: true,
        lastGeneratedPeriod: null,
        notes: 'Monthly flat rent to landlord',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }
  return memoryTemplates.get(messId)!;
}

export class RecurringUtilityService {
  /**
   * List recurring utility templates for a mess
   */
  public static async listTemplates(messId: string): Promise<RecurringTemplateDTO[]> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const templates = await prisma.recurringUtilityTemplate.findMany({
        where: { messId },
        orderBy: { dueDay: 'asc' },
      });

      return templates.map((t) => ({
        id: t.id,
        messId: t.messId,
        name: t.name,
        category: t.category,
        utilityType: t.utilityType,
        defaultAmount: Number(t.defaultAmount),
        frequency: t.frequency,
        dueDay: t.dueDay,
        splitMethod: t.splitMethod,
        autoGenerate: t.autoGenerate,
        requiresReview: t.requiresReview,
        isActive: t.isActive,
        lastGeneratedPeriod: t.lastGeneratedPeriod,
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    } catch {
      return initMemoryTemplates(messId);
    }
  }

  /**
   * Create a new recurring utility template
   */
  public static async createTemplate(
    messId: string,
    input: CreateRecurringTemplateInput
  ): Promise<RecurringTemplateDTO> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestError('Recurring expense name is required');
    }
    if (input.defaultAmount <= 0) {
      throw new BadRequestError('Default amount must be greater than zero');
    }

    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const created = await prisma.recurringUtilityTemplate.create({
        data: {
          messId,
          name: input.name.trim(),
          category: input.category || 'OTHER',
          utilityType: input.utilityType || 'FIXED',
          defaultAmount: new Prisma.Decimal(input.defaultAmount),
          frequency: input.frequency || 'MONTHLY',
          dueDay: input.dueDay || 10,
          splitMethod: input.splitMethod || 'EQUAL',
          autoGenerate: input.autoGenerate ?? false,
          requiresReview: input.requiresReview ?? true,
          notes: input.notes,
        },
      });

      return {
        id: created.id,
        messId: created.messId,
        name: created.name,
        category: created.category,
        utilityType: created.utilityType,
        defaultAmount: Number(created.defaultAmount),
        frequency: created.frequency,
        dueDay: created.dueDay,
        splitMethod: created.splitMethod,
        autoGenerate: created.autoGenerate,
        requiresReview: created.requiresReview,
        isActive: created.isActive,
        lastGeneratedPeriod: created.lastGeneratedPeriod,
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch {
      const list = initMemoryTemplates(messId);
      const newDTO: RecurringTemplateDTO = {
        id: `rec-${Date.now()}`,
        messId,
        name: input.name.trim(),
        category: input.category || 'OTHER',
        utilityType: input.utilityType || 'FIXED',
        defaultAmount: input.defaultAmount,
        frequency: input.frequency || 'MONTHLY',
        dueDay: input.dueDay || 10,
        splitMethod: input.splitMethod || 'EQUAL',
        autoGenerate: input.autoGenerate ?? false,
        requiresReview: input.requiresReview ?? true,
        isActive: true,
        lastGeneratedPeriod: null,
        notes: input.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newDTO);
      return newDTO;
    }
  }

  /**
   * Generates draft utility bills for all active recurring templates for a target billing period.
   * Enforces strict idempotency and duplicate prevention.
   */
  public static async generateBillsForPeriod(
    messId: string,
    billingPeriod: string,
    actorId?: string
  ): Promise<{
    generatedCount: number;
    skippedCount: number;
    generatedBills: any[];
  }> {
    const templates = await this.listTemplates(messId);
    const activeTemplates = templates.filter((t) => t.isActive);

    let generatedCount = 0;
    let skippedCount = 0;
    const generatedBills: any[] = [];

    const [yearStr, monthStr] = billingPeriod.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    for (const template of activeTemplates) {
      // Idempotency: skip if already generated for this billing period
      if (template.lastGeneratedPeriod === billingPeriod) {
        skippedCount++;
        continue;
      }

      // Check if bill with matching title and period already exists
      const existingBills = await UtilityService.listUtilityBills(messId, {
        periodKey: billingPeriod,
      });

      if (existingBills.some((b) => b.title.toLowerCase() === template.name.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const dueDay = Math.min(28, template.dueDay || 10);
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay)).toISOString().split('T')[0];

      let mappedType: any = 'OTHER';
      const cat = (template.category || '').toUpperCase();
      if (cat.includes('RENT')) mappedType = 'RENT';
      else if (cat.includes('ELEC')) mappedType = 'ELECTRICITY';
      else if (cat.includes('GAS')) mappedType = 'GAS';
      else if (cat.includes('WATER')) mappedType = 'WATER';
      else if (cat.includes('WIFI') || cat.includes('INTERNET')) mappedType = 'INTERNET';
      else if (cat.includes('MAID') || cat.includes('COOK')) mappedType = 'MAID';
      else if (cat.includes('WASTE')) mappedType = 'WASTE';

      const createdBill = await UtilityService.createUtilityBill({
        messId,
        title: template.name,
        category: mappedType,
        amount: template.defaultAmount,
        billingPeriod,
        dueDate,
        splitMethod: 'EQUAL',
        notes: `Auto-generated from recurring template: ${template.name}`,
        createdById: actorId,
      });

      generatedBills.push(createdBill);
      generatedCount++;

      // Update template lastGeneratedPeriod
      try {
        if (await isDatabaseOnline()) {
          await prisma.recurringUtilityTemplate.update({
            where: { id: template.id },
            data: { lastGeneratedPeriod: billingPeriod },
          });
        } else {
          template.lastGeneratedPeriod = billingPeriod;
        }
      } catch {
        template.lastGeneratedPeriod = billingPeriod;
      }
    }

    return {
      generatedCount,
      skippedCount,
      generatedBills,
    };
  }
}
