import { prisma } from '../config/database.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { emitToMess, SOCKET_EVENTS } from '../socket/socketEmitter.js';
import { invalidateDashboardCache } from '../controllers/dashboardController.js';

export interface MealRecord {
  id: string;
  messId: string;
  memberId: string;
  memberName: string;
  roomNo?: string | null;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  guestBreakfast: number;
  guestLunch: number;
  guestDinner: number;
  total: number;
}

export interface MealSummaryResult {
  date: string;
  totalMealsToday: number;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalGuest: number;
  activeMembers: number;
  avgPerMember: number;
}

// Server-side query cache for blazing-fast responses
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const mealCache = new Map<string, CacheItem<any>>();
const MEAL_CACHE_TTL_MS = 0; // Disabled to guarantee fresh meal data

export function invalidateMealCache(messId: string, dateStr?: string) {
  const prefix = dateStr ? `${messId}_daily_${dateStr}` : `${messId}_`;
  for (const key of mealCache.keys()) {
    if (key.startsWith(prefix) || key.startsWith(`${messId}_summary_`) || key.startsWith(`${messId}_calendar_`)) {
      mealCache.delete(key);
    }
  }
}

export class MealService {
  public static async getDailyMeals(messId: string, dateStr: string): Promise<MealRecord[]> {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      throw new ValidationError('Invalid date format. Expected YYYY-MM-DD');
    }

    const cacheKey = `${messId}_daily_${dateStr}`;
    const cached = mealCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEAL_CACHE_TTL_MS) {
      return cached.data;
    }

    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

    // Parallel optimized query with lean projections
    const [meals, activeMembers] = await Promise.all([
      prisma.meal.findMany({
        where: {
          messId,
          date: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          id: true,
          memberId: true,
          breakfast: true,
          lunch: true,
          dinner: true,
          guestBreakfast: true,
          guestLunch: true,
          guestDinner: true,
        },
      }),
      prisma.messMember.findMany({
        where: { messId, status: 'ACTIVE' },
        select: {
          id: true,
          roomNo: true,
          room: { select: { roomNumber: true } },
          user: { select: { name: true } },
        },
        orderBy: { user: { name: 'asc' } },
      }),
    ]);

    // Map meals to each active member
    const results: MealRecord[] = activeMembers.map((mem) => {
      const found = meals.find((m) => m.memberId === mem.id);
      const b = found ? Number(found.breakfast) : 0;
      const l = found ? Number(found.lunch) : 0;
      const d = found ? Number(found.dinner) : 0;
      const gb = found ? Number(found.guestBreakfast) : 0;
      const gl = found ? Number(found.guestLunch) : 0;
      const gd = found ? Number(found.guestDinner) : 0;
      return {
        id: found ? found.id : `draft-${mem.id}`,
        messId,
        memberId: mem.id,
        memberName: mem.user.name,
        roomNo: mem.roomNo || mem.room?.roomNumber || 'Unassigned',
        date: dateStr,
        breakfast: b,
        lunch: l,
        dinner: d,
        guestBreakfast: gb,
        guestLunch: gl,
        guestDinner: gd,
        total: b + l + d + gb + gl + gd,
      };
    });

    mealCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  public static async updateMeal(
    messId: string,
    memberId: string,
    dateStr: string,
    counts: {
      breakfast?: number;
      lunch?: number;
      dinner?: number;
      guestBreakfast?: number;
      guestLunch?: number;
      guestDinner?: number;
    }
  ): Promise<MealRecord> {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    for (const [key, val] of Object.entries(counts)) {
      if (val !== undefined && (typeof val !== 'number' || val < 0)) {
        throw new ValidationError(`Meal count for ${key} cannot be negative`);
      }
    }

    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));

    const existing = await prisma.meal.findFirst({
      where: {
        messId,
        memberId,
        date: startOfDay,
      },
    });

    let meal;
    if (existing) {
      meal = await prisma.meal.update({
        where: { id: existing.id },
        data: {
          breakfast: counts.breakfast !== undefined ? counts.breakfast : existing.breakfast,
          lunch: counts.lunch !== undefined ? counts.lunch : existing.lunch,
          dinner: counts.dinner !== undefined ? counts.dinner : existing.dinner,
          guestBreakfast: counts.guestBreakfast !== undefined ? counts.guestBreakfast : existing.guestBreakfast,
          guestLunch: counts.guestLunch !== undefined ? counts.guestLunch : existing.guestLunch,
          guestDinner: counts.guestDinner !== undefined ? counts.guestDinner : existing.guestDinner,
        },
        include: { member: { include: { user: true } } },
      });
    } else {
      meal = await prisma.meal.create({
        data: {
          messId,
          memberId,
          date: startOfDay,
          breakfast: counts.breakfast || 0,
          lunch: counts.lunch || 0,
          dinner: counts.dinner || 0,
          guestBreakfast: counts.guestBreakfast || 0,
          guestLunch: counts.guestLunch || 0,
          guestDinner: counts.guestDinner || 0,
        },
        include: { member: { include: { user: true } } },
      });
    }

    const b = Number(meal.breakfast);
    const l = Number(meal.lunch);
    const d = Number(meal.dinner);
    const gb = Number(meal.guestBreakfast);
    const gl = Number(meal.guestLunch);
    const gd = Number(meal.guestDinner);

    const record: MealRecord = {
      id: meal.id,
      messId,
      memberId,
      memberName: meal.member.user.name,
      date: dateStr,
      breakfast: b,
      lunch: l,
      dinner: d,
      guestBreakfast: gb,
      guestLunch: gl,
      guestDinner: gd,
      total: b + l + d + gb + gl + gd,
    };

    // Invalidate caches
    invalidateMealCache(messId, dateStr);
    invalidateDashboardCache(messId);

    // Broadcast real-time events
    emitToMess(messId, SOCKET_EVENTS.MEAL_UPDATED, record);
    emitToMess(messId, SOCKET_EVENTS.DASHBOARD_UPDATED, { type: 'MEAL', date: dateStr });

    return record;
  }

  public static async quickSelfEntry(
    messId: string,
    userId: string,
    dateStr: string,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    count: number
  ) {
    if (count < 0) throw new ValidationError('Meal count cannot be negative');

    // Find member by userId & messId
    const member = await prisma.messMember.findUnique({
      where: { messId_userId: { messId, userId } },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundError('Active mess membership not found for current user');
    }

    return this.updateMeal(messId, member.id, dateStr, { [mealType]: count });
  }

  public static async bulkUpdateMeals(
    messId: string,
    dateStr: string,
    entries: Array<{ memberId: string; breakfast: number; lunch: number; dinner: number }>
  ) {
    const results = [];
    for (const entry of entries) {
      const res = await this.updateMeal(messId, entry.memberId, dateStr, {
        breakfast: entry.breakfast,
        lunch: entry.lunch,
        dinner: entry.dinner,
      });
      results.push(res);
    }
    return results;
  }

  public static async getMealSummary(messId: string, dateStr: string): Promise<MealSummaryResult> {
    const cacheKey = `${messId}_summary_${dateStr}`;
    const cached = mealCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEAL_CACHE_TTL_MS) {
      return cached.data;
    }

    const records = await this.getDailyMeals(messId, dateStr);
    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;
    let totalGuest = 0;

    for (const r of records) {
      totalBreakfast += r.breakfast;
      totalLunch += r.lunch;
      totalDinner += r.dinner;
      totalGuest += r.guestBreakfast + r.guestLunch + r.guestDinner;
    }

    const totalMeals = totalBreakfast + totalLunch + totalDinner + totalGuest;
    const memberCount = records.length;
    const avgPerMember = memberCount > 0 ? parseFloat((totalMeals / memberCount).toFixed(1)) : 0;

    const summary: MealSummaryResult = {
      date: dateStr,
      totalMealsToday: totalMeals,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalGuest,
      activeMembers: memberCount,
      avgPerMember,
    };

    mealCache.set(cacheKey, { data: summary, timestamp: Date.now() });
    return summary;
  }

  public static async getMealCalendar(messId: string, year: number, month: number) {
    const cacheKey = `${messId}_calendar_${year}_${month}`;
    const cached = mealCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEAL_CACHE_TTL_MS) {
      return cached.data;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // Real database query for the entire month
    const monthlyMeals = await prisma.meal.findMany({
      where: {
        messId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        date: true,
        breakfast: true,
        lunch: true,
        dinner: true,
        guestBreakfast: true,
        guestLunch: true,
        guestDinner: true,
      },
    });

    // Map by day of month
    const dayMap = new Map<number, { breakfast: number; lunch: number; dinner: number; guest: number }>();
    for (const m of monthlyMeals) {
      const dayNum = new Date(m.date).getUTCDate();
      const curr = dayMap.get(dayNum) || { breakfast: 0, lunch: 0, dinner: 0, guest: 0 };
      curr.breakfast += Number(m.breakfast);
      curr.lunch += Number(m.lunch);
      curr.dinner += Number(m.dinner);
      curr.guest += Number(m.guestBreakfast) + Number(m.guestLunch) + Number(m.guestDinner);
      dayMap.set(dayNum, curr);
    }

    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const counts = dayMap.get(day) || { breakfast: 0, lunch: 0, dinner: 0, guest: 0 };
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendarDays.push({
        date: dateStr,
        day,
        totalMeals: counts.breakfast + counts.lunch + counts.dinner + counts.guest,
        breakfast: counts.breakfast,
        lunch: counts.lunch,
        dinner: counts.dinner,
      });
    }

    const result = {
      year,
      month,
      days: calendarDays,
    };

    mealCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }
}
