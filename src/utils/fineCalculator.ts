import { FineRule, FineBreakdownItem, LibrarySetting } from '../types';

export interface CalculatedFineResult {
  lateDays: number;
  fineAmount: number;
  breakdown: FineBreakdownItem[];
  appliedRulesCount: number;
}

/**
 * Calculates the exact overdue fine based on effective-date fine rate slabs.
 * For example:
 * - If dueDate is 2026-07-25 and returned on 2026-08-03
 * - Rate was ₹2/day until 2026-08-01 (6 days = ₹12)
 * - Rate became ₹5/day from 2026-08-01 (3 days = ₹15)
 * - Total fine = ₹12 + ₹15 = ₹27
 */
export function calculateClientFineBreakdown(
  dueDateInput: Date | string,
  targetDateInput: Date | string = new Date(),
  settings?: Partial<LibrarySetting> | null
): CalculatedFineResult {
  if (!dueDateInput) {
    return { lateDays: 0, fineAmount: 0, breakdown: [], appliedRulesCount: 0 };
  }

  const due = new Date(dueDateInput);
  const target = new Date(targetDateInput);

  if (isNaN(due.getTime()) || isNaN(target.getTime())) {
    return { lateDays: 0, fineAmount: 0, breakdown: [], appliedRulesCount: 0 };
  }

  const dueYear = due.getFullYear();
  const dueMonth = due.getMonth();
  const dueDateNum = due.getDate();
  const dueMidnight = new Date(dueYear, dueMonth, dueDateNum);

  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();
  const targetDateNum = target.getDate();
  const targetMidnight = new Date(targetYear, targetMonth, targetDateNum);

  if (targetMidnight.getTime() <= dueMidnight.getTime()) {
    return { lateDays: 0, fineAmount: 0, breakdown: [], appliedRulesCount: 0 };
  }

  const defaultRate =
    settings?.finePerDay !== undefined && settings.finePerDay !== null
      ? Math.max(0, Number(settings.finePerDay))
      : 2;

  let sortedRules: Array<{ dateMidnight: Date; rate: number; note?: string }> = [];

  if (settings?.fineRules && Array.isArray(settings.fineRules) && settings.fineRules.length > 0) {
    sortedRules = settings.fineRules
      .filter((r) => r && r.effectiveDate && typeof r.finePerDay === 'number')
      .map((r) => {
        const d = new Date(r.effectiveDate);
        return {
          dateMidnight: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          rate: Math.max(0, Number(r.finePerDay)),
          note: r.note,
        };
      })
      .sort((a, b) => a.dateMidnight.getTime() - b.dateMidnight.getTime());
  }

  if (sortedRules.length === 0) {
    sortedRules = [
      {
        dateMidnight: new Date(2000, 0, 1),
        rate: defaultRate,
        note: 'Default rate',
      },
    ];
  }

  const getRateForDate = (date: Date): number => {
    let chosenRate = sortedRules[0].rate;
    for (const rule of sortedRules) {
      if (date.getTime() >= rule.dateMidnight.getTime()) {
        chosenRate = rule.rate;
      } else {
        break;
      }
    }
    return chosenRate;
  };

  const cur = new Date(dueMidnight);
  cur.setDate(cur.getDate() + 1);

  let totalDays = 0;
  let totalAmount = 0;
  const dayList: Array<{ dateStr: string; rate: number }> = [];

  while (cur.getTime() <= targetMidnight.getTime()) {
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const rate = getRateForDate(cur);

    dayList.push({ dateStr, rate });
    totalDays += 1;
    totalAmount += rate;

    cur.setDate(cur.getDate() + 1);
  }

  const breakdown: FineBreakdownItem[] = [];
  if (dayList.length > 0) {
    let currentSegment: FineBreakdownItem = {
      fromDate: dayList[0].dateStr,
      toDate: dayList[0].dateStr,
      days: 1,
      ratePerDay: dayList[0].rate,
      amount: dayList[0].rate,
    };

    for (let i = 1; i < dayList.length; i++) {
      const day = dayList[i];
      if (day.rate === currentSegment.ratePerDay) {
        currentSegment.toDate = day.dateStr;
        currentSegment.days += 1;
        currentSegment.amount += day.rate;
      } else {
        breakdown.push(currentSegment);
        currentSegment = {
          fromDate: day.dateStr,
          toDate: day.dateStr,
          days: 1,
          ratePerDay: day.rate,
          amount: day.rate,
        };
      }
    }
    breakdown.push(currentSegment);
  }

  return {
    lateDays: totalDays,
    fineAmount: Math.round(totalAmount * 100) / 100,
    breakdown,
    appliedRulesCount: breakdown.length,
  };
}
