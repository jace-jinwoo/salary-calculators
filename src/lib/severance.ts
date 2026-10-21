/** 퇴직금 계산 (근로자퇴직급여 보장법 / 근로기준법 평균임금 수식 기반, 참고용). */
export interface SeveranceInput {
  joinDate: string; // YYYY-MM-DD
  leaveDate: string; // YYYY-MM-DD (마지막 근무일 = 퇴직일)
  /** 퇴직 전 3개월 임금 총액(세전, 상여·연차수당 제외) */
  last3mWage: number;
  /** 연간 상여금 총액 (3/12 가산) */
  annualBonus: number;
  /** 전년도 연차수당 (3/12 가산) */
  annualLeavePay: number;
  /** 평균 주 소정근로시간 */
  weeklyHours: number;
  /** 퇴직 전 3개월 총 일수 (비우면 퇴직일 기준 자동 계산) */
  last3mDays?: number;
  /** 1일 통상임금 (선택). 평균임금보다 높으면 통상임금을 적용 */
  ordinaryDaily?: number;
}

export type SeveranceResult =
  | { ok: false; error: string }
  | {
      ok: true;
      tenureDays: number;
      periodDays: number;
      avgDaily: number;
      appliedDaily: number;
      usedOrdinary: boolean;
      severance: number;
      eligible: boolean;
      reasons: string[];
    };

function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}
const DAY = 86400000;

/** 월 단위 감산(말일 보정) */
export function addMonthsUTC(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}

export function calcSeverance(i: SeveranceInput): SeveranceResult {
  const join = parseDate(i.joinDate);
  const leave = parseDate(i.leaveDate);
  if (!join || !leave) return { ok: false, error: '입사일과 퇴사일을 올바른 날짜로 입력해 주세요.' };
  if (leave < join) return { ok: false, error: '퇴사일은 입사일 이후여야 합니다.' };
  for (const [n, v] of [['3개월 임금 총액', i.last3mWage], ['연간 상여금', i.annualBonus], ['연차수당', i.annualLeavePay], ['주 소정근로시간', i.weeklyHours]] as const) {
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: `${n}은(는) 0 이상의 숫자여야 합니다.` };
  }
  if (i.last3mWage <= 0) return { ok: false, error: '퇴직 전 3개월 임금 총액을 입력해 주세요.' };
  const tenureDays = Math.round((leave.getTime() - join.getTime()) / DAY) + 1; // 초일 산입
  const periodStart = addMonthsUTC(leave, -3);
  const autoDays = Math.round((leave.getTime() - periodStart.getTime()) / DAY);
  const periodDays = i.last3mDays && i.last3mDays > 0 ? i.last3mDays : autoDays;
  const wageSum = i.last3mWage + (i.annualBonus * 3) / 12 + (i.annualLeavePay * 3) / 12;
  const avgDaily = wageSum / periodDays;
  const usedOrdinary = !!i.ordinaryDaily && i.ordinaryDaily > avgDaily;
  const appliedDaily = usedOrdinary ? (i.ordinaryDaily as number) : avgDaily;
  const severance = Math.round((appliedDaily * 30 * tenureDays) / 365);

  const reasons: string[] = [];
  const oneYear = addMonthsUTC(join, 12);
  if (leave.getTime() + DAY < oneYear.getTime()) reasons.push('계속근로기간이 1년 미만입니다.');
  if (i.weeklyHours < 15) reasons.push('4주 평균 1주 소정근로시간이 15시간 미만입니다.');
  return { ok: true, tenureDays, periodDays, avgDaily, appliedDaily, usedOrdinary, severance, eligible: reasons.length === 0, reasons };
}
