import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { MemberService } from '../services/memberService.js';
import { MealService } from '../services/mealService.js';
import { ExpenseStatus, BillStatus } from '@prisma/client';
import { BalanceService } from '../services/financial/balanceService.js';

interface CachedDashboard {
  data: any;
  timestamp: number;
}
const dashboardCache = new Map<string, CachedDashboard>();
const CACHE_TTL_MS = 25000; // 25s TTL for lightning-fast page loads

export function invalidateDashboardCache(messId?: string): void {
  if (messId) {
    dashboardCache.delete(messId);
  } else {
    dashboardCache.clear();
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const messId = req.params.messId;
    const now = Date.now();
    const cached = dashboardCache.get(messId);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      sendSuccess(res, cached.data);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const period = todayStr.slice(0, 7);

    // Fetch operational and financial metrics in parallel with targeted queries
    const [
      mess,
      members,
      mealSummary,
      recentBazar,
      bazarCount,
      recentExpenses,
      pendingApprovals,
      upcomingBills,
      messBalances,
    ] = await Promise.all([
      prisma.mess.findUnique({ where: { id: messId } }),
      MemberService.getMembers(messId),
      MealService.getMealSummary(messId, todayStr),
      prisma.bazarEntry.findMany({
        where: { messId },
        take: 3,
        orderBy: { date: 'desc' },
        include: { buyer: { include: { user: true } } },
      }),
      prisma.bazarEntry.count({ where: { messId } }),
      prisma.expense.findMany({
        where: { messId, status: ExpenseStatus.APPROVED },
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: { payer: { include: { user: true } } },
      }),
      prisma.expense.count({ where: { messId, status: ExpenseStatus.PENDING_APPROVAL } }),
      prisma.bill.count({ where: { messId, status: { in: [BillStatus.UPCOMING, BillStatus.DUE] } } }),
      BalanceService.calculateMessBalances(messId, period),
    ]);

    const activeMembers = members.filter((m: any) => m.status === 'ACTIVE').length;

    // Financial breakdown from authoritative BalanceService
    const foodAmount = messBalances.totalFoodCost;
    const rentAmount = messBalances.totalRentExpenses ?? 0;
    const utilitiesAmount = messBalances.totalUtilityExpenses ?? 0;
    const otherAmount = 0;
    const finalTotalExpense = messBalances.totalMessExpenses;

    const foodPct = finalTotalExpense > 0 ? Math.round((foodAmount / finalTotalExpense) * 100) : 0;
    const rentPct = finalTotalExpense > 0 ? Math.round((rentAmount / finalTotalExpense) * 100) : 0;
    const utilPct = finalTotalExpense > 0 ? Math.round((utilitiesAmount / finalTotalExpense) * 100) : 0;
    const otherPct = finalTotalExpense > 0 ? Math.max(0, 100 - (foodPct + rentPct + utilPct)) : 0;

    const expenseByCategory = [
      { category: 'Food & Bazar', percentage: foodPct, amount: foodAmount, color: '#10B981' },
      { category: 'House Rent', percentage: rentPct, amount: rentAmount, color: '#F59E0B' },
      { category: 'Utilities', percentage: utilPct, amount: utilitiesAmount, color: '#06B6D4' },
      { category: 'Other', percentage: otherPct, amount: otherAmount, color: '#8B5CF6' },
    ];

    // Authoritative Top Spenders from member balances
    const topSpendersList = messBalances.memberBalances
      .filter((s) => s.totalContributions > 0)
      .sort((a, b) => b.totalContributions - a.totalContributions)
      .slice(0, 5)
      .map((s, idx) => ({
        rank: idx + 1,
        name: s.memberName,
        amount: `৳ ${s.totalContributions.toLocaleString()}`,
        role: s.role.charAt(0).toUpperCase() + s.role.slice(1).toLowerCase(),
        avatar: null,
      }));

    if (topSpendersList.length === 0 && members.length > 0) {
      members.slice(0, 4).forEach((m: any, idx: number) => {
        topSpendersList.push({
          rank: idx + 1,
          name: m.name,
          amount: '৳ 0',
          role: m.role.charAt(0).toUpperCase() + m.role.slice(1).toLowerCase(),
          avatar: null,
        });
      });
    }

    const currentMonthName = new Date().toLocaleString('en-US', { month: 'short' });
    const monthlyOverview = [
      { month: currentMonthName, food: foodAmount, rent: rentAmount, utilities: utilitiesAmount, other: otherAmount },
    ];

    const messLocation = [mess?.area, mess?.city].filter(Boolean).join(', ') || mess?.address || 'Bangladesh';

    const stats = {
      messId,
      messName: mess?.name || 'My Mess',
      location: messLocation,
      status: mess?.status === 'ACTIVE' ? 'Active' : (mess?.status || 'Active'),
      currencySymbol: mess?.currency === 'BDT' ? '৳' : (mess?.currency || '৳'),
      kpis: {
        totalMembers: {
          value: members.length,
          change: `${activeMembers} active residents`,
          trend: 'up',
        },
        totalExpenses: {
          value: finalTotalExpense.toLocaleString(),
          change: 'Food + Fixed overheads',
          trend: 'neutral',
        },
        mealRate: {
          value: messBalances.totalCountedMeals > 0 ? messBalances.currentMealRate.toFixed(2) : '0.00',
          label: messBalances.totalCountedMeals > 0 ? 'Authoritative rate' : 'Calculated Live',
          isCalculated: messBalances.totalCountedMeals > 0,
        },
        pendingSettlement: {
          value: messBalances.pendingSettlementPool.toLocaleString(),
          subtext: `${messBalances.membersOwingCount} members owing`,
          trend: messBalances.pendingSettlementPool > 0 ? 'warning' : 'neutral',
        },
      },
      todayMeals: {
        total: mealSummary.totalMealsToday,
        breakfast: mealSummary.totalBreakfast,
        lunch: mealSummary.totalLunch,
        dinner: mealSummary.totalDinner,
        avgPerMember: mealSummary.avgPerMember,
      },
      operationalSummary: {
        totalMembers: members.length,
        activeMembers,
        pendingApprovals,
        upcomingBills,
        totalBazarCount: bazarCount,
      },
      monthlyOverview,
      expenseByCategory,
      recentActivities: [
        ...recentBazar.map((b: any) => ({
          id: b.id,
          type: 'bazar',
          title: `${b.buyer?.user?.name || 'Member'} added ৳${Number(b.amount).toLocaleString()} Bazar (${b.description || 'Grocery'})`,
          time: 'Recently',
          user: b.buyer?.user?.name || 'Member',
          avatar: b.buyer?.user?.avatarUrl || null,
          category: 'Food',
        })),
        ...recentExpenses.map((e: any) => ({
          id: e.id,
          type: 'expense',
          title: `${e.payer?.user?.name || 'Member'} logged ৳${Number(e.amount).toLocaleString()} ${e.category} (${e.description || 'Expense'})`,
          time: 'Recently',
          user: e.payer?.user?.name || 'Member',
          avatar: e.payer?.user?.avatarUrl || null,
          category: 'Utilities',
        })),
        {
          id: 'meal-recent',
          type: 'meal',
          title: `Daily meal count: ${mealSummary.totalMealsToday} recorded today`,
          time: 'Today',
          user: 'System',
          avatar: null,
          category: 'Meals',
        },
      ],
      topSpenders: topSpendersList,
    };

    dashboardCache.set(messId, { data: stats, timestamp: Date.now() });
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}
