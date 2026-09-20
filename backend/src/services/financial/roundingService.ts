import { Prisma } from '@prisma/client';

export class RoundingService {
  /**
   * Converts a numeric value or Prisma Decimal to a normalized 2-decimal rounded number.
   */
  public static roundMoney(value: number | string | Prisma.Decimal): number {
    const num = typeof value === 'object' && 'toNumber' in value ? (value as Prisma.Decimal).toNumber() : Number(value);
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  public static roundCurrency(value: number | string | Prisma.Decimal): number {
    return this.roundMoney(value);
  }

  /**
   * Formats a money amount to BDT currency string with 2 decimal places.
   */
  public static formatMoney(amount: number | string | Prisma.Decimal): string {
    const rounded = this.roundMoney(amount);
    return `৳ ${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Splits an amount evenly among N participants without losing a single paisa/cent.
   * Any remainder cents are deterministically distributed to the first R participants.
   * Example: 100 / 3 => [33.34, 33.33, 33.33], sum = 100.00 exactly.
   */
  public static splitEvenly(totalAmount: number | Prisma.Decimal, participantCount: number): number[] {
    if (participantCount <= 0) return [];
    
    const totalNum = typeof totalAmount === 'object' && 'toNumber' in totalAmount 
      ? (totalAmount as Prisma.Decimal).toNumber() 
      : Number(totalAmount);
    
    const totalPaisa = Math.round(totalNum * 100);
    const basePaisa = Math.floor(totalPaisa / participantCount);
    const remainderPaisa = totalPaisa % participantCount;

    const result: number[] = [];
    for (let i = 0; i < participantCount; i++) {
      const paisa = i < remainderPaisa ? basePaisa + 1 : basePaisa;
      result.push(paisa / 100);
    }

    return result;
  }

  /**
   * Splits an amount across weighted participants without losing a single paisa/cent.
   * Uses Hamilton-Webster largest remainder method for exact zero-loss precision.
   * Supports both number[] and Array<{ weight: number, ... }>
   */
  public static splitByWeights(
    totalAmount: number | Prisma.Decimal,
    weights: number[] | Array<{ weight: number; [key: string]: any }>
  ): any {
    if (!weights || weights.length === 0) return [];

    const isObjectArray = typeof weights[0] === 'object' && weights[0] !== null;
    const rawWeights = isObjectArray
      ? (weights as Array<{ weight: number }>).map((w) => w.weight)
      : (weights as number[]);

    const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) {
      const evenSplits = this.splitEvenly(totalAmount, rawWeights.length);
      return isObjectArray
        ? evenSplits.map((amount, idx) => ({ ...(weights[idx] as object), amount }))
        : evenSplits;
    }

    const totalNum =
      typeof totalAmount === 'object' && 'toNumber' in totalAmount
        ? (totalAmount as Prisma.Decimal).toNumber()
        : Number(totalAmount);
    const totalPaisa = Math.round(totalNum * 100);

    const initialPaisa: number[] = [];
    const remainders: Array<{ index: number; remainder: number }> = [];

    let allocatedPaisa = 0;
    for (let i = 0; i < rawWeights.length; i++) {
      const exactPaisa = (totalPaisa * rawWeights[i]) / totalWeight;
      const floorPaisa = Math.floor(exactPaisa);
      initialPaisa.push(floorPaisa);
      remainders.push({ index: i, remainder: exactPaisa - floorPaisa });
      allocatedPaisa += floorPaisa;
    }

    let deltaPaisa = totalPaisa - allocatedPaisa;
    // Sort descending by remainder to allocate residual pennies to highest remainder
    remainders.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < deltaPaisa && i < remainders.length; i++) {
      initialPaisa[remainders[i].index] += 1;
    }

    const resultAmounts = initialPaisa.map((p) => p / 100);
    return isObjectArray
      ? resultAmounts.map((amount, idx) => ({ ...(weights[idx] as object), amount }))
      : resultAmounts;
  }

  /**
   * Validates whether an array of split allocations matches the source amount.
   * Tolerates a maximum variance of 0.01 due to rounding.
   */
  public static validateAllocationsSum(allocations: number[], sourceTotal: number): boolean {
    const sum = allocations.reduce((acc, curr) => acc + curr, 0);
    const diff = Math.abs(Math.round(sum * 100) - Math.round(sourceTotal * 100));
    return diff <= 1; // within 1 paisa
  }
}
