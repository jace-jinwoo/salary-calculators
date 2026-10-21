import type { Rates } from './rates';

export interface SalaryInput {
  /** 월 세전 급여(총액). 연봉이면 연봉/12 로 넘깁니다. */
  monthlyGross: number;
  /** 월 비과세 식대 (입력값) */
  mealAllowance: number;
}

export interface DeductionLine {
  id: 'nps' | 'nhi' | 'ltc' | 'ei' | 'incomeTax' | 'localTax';
  label: string;
  /** null = 계산 불가(기준 미확인) */
  amount: number | null;
  note?: string;
}

export type SalaryResult =
  | { ok: false; error: string }
  | {
      ok: true;
      monthlyGross: number;
      nonTaxable: number;
      mealCapped: boolean;
      taxableBase: number;
      lines: DeductionLine[];
      knownDeduction: number;
      /** 확인된 항목만 공제한 금액. 미확인 항목(근로소득세 등)은 반영되지 않음 */
      netPartial: number;
      unavailable: string[];
    };

const floor10 = (v: number) => Math.floor(v / 10) * 10;

export function calcSalary(i: SalaryInput, r: Rates, incomeTax?: { income: number; local: number }): SalaryResult {
  if (!Number.isFinite(i.monthlyGross) || i.monthlyGross <= 0) return { ok: false, error: '급여는 0보다 커야 합니다.' };
  if (!Number.isFinite(i.mealAllowance) || i.mealAllowance < 0) return { ok: false, error: '비과세 식대는 0 이상이어야 합니다.' };
  if (i.mealAllowance > i.monthlyGross) return { ok: false, error: '비과세 식대가 월 급여보다 클 수 없습니다.' };

  // 비과세 식대 한도가 확인된 경우에만 한도를 적용. 미확인이면 입력값을 그대로 쓰되 화면에서 안내.
  const mealCapped = r.mealLimit !== undefined && i.mealAllowance > r.mealLimit;
  const nonTaxable = r.mealLimit !== undefined ? Math.min(i.mealAllowance, r.mealLimit) : i.mealAllowance;
  const taxableBase = i.monthlyGross - nonTaxable;

  const lines: DeductionLine[] = [];
  const unavailable: string[] = [];

  let nps: number | null = null;
  if (r.npsRateTotal !== undefined && r.npsMin !== undefined && r.npsMax !== undefined) {
    const base = Math.min(Math.max(taxableBase, r.npsMin), r.npsMax);
    nps = floor10((base * r.npsRateTotal) / 100 / 2);
  } else unavailable.push('국민연금');
  lines.push({ id: 'nps', label: '국민연금(근로자 부담)', amount: nps, note: '기준소득월액 상·하한 적용, 10원 미만 절사 가정' });

  let nhi: number | null = null;
  if (r.nhiRateTotal !== undefined) nhi = floor10((taxableBase * r.nhiRateTotal) / 100 / 2);
  else unavailable.push('건강보험');
  lines.push({ id: 'nhi', label: '건강보험(근로자 부담)', amount: nhi, note: '10원 미만 절사 가정' });

  let ltc: number | null = null;
  if (nhi !== null && r.ltcRatio !== undefined) ltc = floor10((nhi * r.ltcRatio) / 100);
  else unavailable.push('장기요양보험');
  lines.push({ id: 'ltc', label: '장기요양보험(근로자 부담)', amount: ltc, note: '건강보험료 × 장기요양 비율, 10원 미만 절사 가정' });

  let ei: number | null = null;
  if (r.eiRateWorker !== undefined) ei = floor10((taxableBase * r.eiRateWorker) / 100);
  else unavailable.push('고용보험');
  lines.push({ id: 'ei', label: '고용보험(근로자 부담)', amount: ei, note: '10원 미만 절사 가정' });

  if (incomeTax) {
    lines.push({ id: 'incomeTax', label: '근로소득세', amount: incomeTax.income });
    lines.push({ id: 'localTax', label: '지방소득세', amount: incomeTax.local });
  } else {
    unavailable.push('근로소득세·지방소득세');
    lines.push({ id: 'incomeTax', label: '근로소득세', amount: null, note: '간이세액표 기준 미확인' });
    lines.push({ id: 'localTax', label: '지방소득세', amount: null, note: '근로소득세 미확인으로 계산 불가' });
  }

  const knownDeduction = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  return { ok: true, monthlyGross: i.monthlyGross, nonTaxable, mealCapped, taxableBase, lines, knownDeduction, netPartial: i.monthlyGross - knownDeduction, unavailable };
}
