/** 순수 계산 함수. 법정 기준값은 호출자가 인자로 전달합니다(미확인 값을 내부에 하드코딩하지 않음). */

export interface WithholdingInput {
  amount: number; // 세전 지급액(원)
  incomeTaxPct: number; // 예: 3
  localPct: number; // 소득세 대비 %, 예: 10
}
export interface WithholdingResult {
  gross: number;
  incomeTax: number;
  localTax: number;
  totalTax: number;
  net: number;
  effectivePct: number;
}

/** 원 미만 절사(원천징수 실무 관행 가정. 참고용). */
export function withholding({ amount, incomeTaxPct, localPct }: WithholdingInput): WithholdingResult {
  const incomeTax = Math.floor((amount * incomeTaxPct) / 100);
  const localTax = Math.floor((incomeTax * localPct) / 100);
  const totalTax = incomeTax + localTax;
  return { gross: amount, incomeTax, localTax, totalTax, net: amount - totalTax, effectivePct: amount > 0 ? (totalTax / amount) * 100 : 0 };
}

/** 실수령액으로부터 세전 지급액 역산(원 단위 반올림 후 오차 보정). */
export function grossFromNet(net: number, incomeTaxPct: number, localPct: number): number {
  const eff = (incomeTaxPct / 100) * (1 + localPct / 100);
  if (eff >= 1) return NaN;
  let g = Math.round(net / (1 - eff));
  for (let i = 0; i < 5000 && withholding({ amount: g, incomeTaxPct, localPct }).net < net; i++) g += 1;
  for (let i = 0; i < 5000 && withholding({ amount: g - 1, incomeTaxPct, localPct }).net >= net; i++) g -= 1;
  return g;
}

/** 월 소정근로시간 환산 = (주 소정근로시간 + 주휴시간) × (365/7) / 12. 주휴시간 = min(주 소정/5, 8) (주 15시간 미만은 0). */
export function monthlyPaidHours(weeklyHours: number, minWeeklyForHoliday = 15): number {
  const holiday = weeklyHours >= minWeeklyForHoliday ? Math.min(weeklyHours / 5, 8) : 0;
  return ((weeklyHours + holiday) * (365 / 7)) / 12;
}

export interface OvertimeInput {
  hourlyWage: number;
  overtimeHours: number; // 연장근로(1주 40h 또는 1일 8h 초과) 시간
  nightHours: number; // 22~06시 근로 시간(연장·휴일과 겹치면 양쪽에 모두 입력)
  holidayHours: number; // 휴일근로 8시간 이내
  holidayOver8Hours: number; // 휴일근로 8시간 초과
  overtimeMultiplier: number;
  nightPremium: number;
  holidayMultiplier: number;
  holidayOver8Multiplier: number;
  /** 가산수당 비적용 사업장(상시 5명 미만 등): 배율 1.0, 야간 가산 0 */
  noPremium: boolean;
}
export interface OvertimeResult {
  overtime: number;
  night: number;
  holiday: number;
  holidayOver8: number;
  total: number;
}
export function overtimePay(i: OvertimeInput): OvertimeResult {
  const m = (v: number) => (i.noPremium ? 1 : v);
  const overtime = Math.floor(i.hourlyWage * i.overtimeHours * m(i.overtimeMultiplier));
  const holiday = Math.floor(i.hourlyWage * i.holidayHours * m(i.holidayMultiplier));
  const holidayOver8 = Math.floor(i.hourlyWage * i.holidayOver8Hours * m(i.holidayOver8Multiplier));
  const night = i.noPremium ? 0 : Math.floor(i.hourlyWage * i.nightHours * i.nightPremium);
  return { overtime, night, holiday, holidayOver8, total: overtime + night + holiday + holidayOver8 };
}

const DAY = 86_400_000;
/** YYYY-MM-DD → UTC 자정 ms. 형식·실재 날짜가 아니면 NaN. */
export function parseDate(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return NaN;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : NaN;
}
/** 입사일~퇴사일 재직일수(양 끝 포함). */
export function tenureDays(start: string, end: string): number {
  const a = parseDate(start), b = parseDate(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return NaN;
  return Math.round((b - a) / DAY) + 1;
}
/** 퇴사일 직전 3개월의 총 일수(퇴사일 이전 3개월, 월말 보정). */
export function threeMonthDays(end: string): number {
  const b = parseDate(end);
  if (Number.isNaN(b)) return NaN;
  const e = new Date(b);
  const s = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() - 3, e.getUTCDate()));
  // 월말 넘침 보정 (예: 5/31 → 2/31 → 3/3 이면 2월 말로)
  if (s.getUTCDate() !== e.getUTCDate()) s.setUTCDate(0);
  return Math.round((b - s.getTime()) / DAY);
}

export interface SeveranceInput {
  tenureDays: number;
  weeklyHours: number;
  threeMonthWage: number; // 퇴직 전 3개월 임금 총액(기본급·수당)
  annualBonus: number; // 최근 1년 상여금 총액
  annualLeavePay: number; // 연차수당(전년도 발생분 중 퇴직 전 3개월 귀속분 기준 — 사용자가 확인한 금액)
  daysIn3Months: number;
  dailyOrdinaryWage?: number; // 1일 통상임금(선택)
  minDays: number;
  payDays: number;
  minWeeklyHours: number;
}
export interface SeveranceResult {
  eligible: boolean;
  reasons: string[];
  dailyAverageWage: number;
  appliedDailyWage: number;
  usedOrdinary: boolean;
  severance: number;
}
export function severancePay(i: SeveranceInput): SeveranceResult {
  const reasons: string[] = [];
  if (i.tenureDays < i.minDays) reasons.push(`계속근로기간이 ${i.minDays}일 미만입니다(재직 ${i.tenureDays}일).`);
  if (i.weeklyHours < i.minWeeklyHours) reasons.push(`주 소정근로시간이 ${i.minWeeklyHours}시간 미만입니다.`);
  const total = i.threeMonthWage + (i.annualBonus * 3) / 12 + (i.annualLeavePay * 3) / 12;
  const avg = i.daysIn3Months > 0 ? total / i.daysIn3Months : 0;
  const ord = i.dailyOrdinaryWage ?? 0;
  const usedOrdinary = ord > avg;
  const applied = usedOrdinary ? ord : avg;
  const eligible = reasons.length === 0;
  return {
    eligible,
    reasons,
    dailyAverageWage: avg,
    appliedDailyWage: applied,
    usedOrdinary,
    severance: eligible ? Math.floor((applied * i.payDays * i.tenureDays) / 365) : 0,
  };
}

export interface RateSpec { rate: number | null; min?: number | null; max?: number | null }
export interface NetPayInput {
  monthlyGross: number;
  nonTaxableMeal: number;
  pension: RateSpec;
  health: RateSpec;
  ltcRate: number | null; // 건강보험료 대비 %
  employment: RateSpec;
  incomeTax: number | null; // 월 근로소득세(간이세액표 조회값)
  localTaxPct: number | null; // 소득세 대비 %
}
export interface NetLine { key: string; label: string; amount: number | null; reason?: string }
export interface NetPayResult {
  lines: NetLine[];
  missing: string[];
  knownDeduction: number;
  net: number; // 산정된 항목만 공제한 금액
  complete: boolean;
}
const clampBase = (v: number, min?: number | null, max?: number | null) => {
  let b = v;
  if (min != null && b < min) b = min;
  if (max != null && b > max) b = max;
  return b;
};
const won = (v: number) => Math.floor(v / 10) * 10; // 10원 미만 절사(참고용 가정)

export function netPay(i: NetPayInput): NetPayResult {
  const insBase = Math.max(0, i.monthlyGross - i.nonTaxableMeal);
  const NA = '요율 미확인·미입력';
  const lines: NetLine[] = [];
  const pensionAmt = i.pension.rate == null ? null : won((clampBase(insBase, i.pension.min, i.pension.max) * i.pension.rate) / 100);
  lines.push({ key: 'pension', label: '국민연금', amount: pensionAmt, reason: pensionAmt == null ? NA : undefined });
  const healthAmt = i.health.rate == null ? null : won((insBase * i.health.rate) / 100);
  lines.push({ key: 'health', label: '건강보험', amount: healthAmt, reason: healthAmt == null ? NA : undefined });
  const ltcAmt = healthAmt == null || i.ltcRate == null ? null : won((healthAmt * i.ltcRate) / 100);
  lines.push({ key: 'ltc', label: '장기요양보험', amount: ltcAmt, reason: ltcAmt == null ? NA : undefined });
  const empAmt = i.employment.rate == null ? null : won((insBase * i.employment.rate) / 100);
  lines.push({ key: 'employment', label: '고용보험', amount: empAmt, reason: empAmt == null ? NA : undefined });
  lines.push({ key: 'incomeTax', label: '근로소득세', amount: i.incomeTax, reason: i.incomeTax == null ? '간이세액표 값 미확인·미입력' : undefined });
  const localAmt = i.incomeTax == null || i.localTaxPct == null ? null : won((i.incomeTax * i.localTaxPct) / 100);
  lines.push({ key: 'localTax', label: '지방소득세', amount: localAmt, reason: localAmt == null ? NA : undefined });
  const missing = lines.filter((l) => l.amount == null).map((l) => l.label);
  const knownDeduction = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  return { lines, missing, knownDeduction, net: i.monthlyGross - knownDeduction, complete: missing.length === 0 };
}
