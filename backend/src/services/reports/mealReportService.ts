import { MealRateService } from '../financial/mealRateService.js';
import { MemberService } from '../memberService.js';
import { PeriodService } from '../period/periodService.js';

export interface FoodCostReportDTO {
  periodKey: string;
  periodStatus: string;
  totalFoodCost: number;
  totalMeals: number;
  mealRate: number;
  members: Array<{
    memberId: string;
    name: string;
    roomNo: string;
    meals: number;
    foodShare: number;
  }>;
  generatedAt: string;
}

export class MealReportService {
  /**
   * Generates food cost and meal consumption distribution report
   */
  static async getFoodCostReport(messId: string, periodKey: string): Promise<FoodCostReportDTO> {
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    const periodStatus = period ? period.status : 'ACTIVE';

    const calculation = await MealRateService.calculateMealRate(messId, periodKey);
    const allMembers = await MemberService.listMembers(messId);
    const memberMap = new Map(allMembers.map((m: any) => [m.id, m]));

    const members = calculation.memberShares.map((mc) => {
      const m = memberMap.get(mc.memberId) as any;
      return {
        memberId: mc.memberId,
        name: mc.memberName,
        roomNo: m?.roomNo || 'N/A',
        meals: mc.mealCount,
        foodShare: mc.foodShare,
      };
    });

    return {
      periodKey,
      periodStatus,
      totalFoodCost: calculation.totalFoodCost,
      totalMeals: calculation.totalMeals,
      mealRate: calculation.mealRate,
      members,
      generatedAt: new Date().toISOString(),
    };
  }
}
