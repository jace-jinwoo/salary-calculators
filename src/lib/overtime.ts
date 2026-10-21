/** 연장·야간·휴일 가산수당 계산 (근로기준법 제56조 수식 기반, 참고용). */
export const DEFAULT_MONTHLY_HOURS = 209; // 주 40시간 + 유급주휴 8시간 기준 월 환산 소정근로시간 (사용자가 수정 가능)

export type OvertimeKind = 'overtime' | 'overtimeNight' | 'night' | 'holiday8' | 'holiday8Night' | 'holidayOver8' | 'holidayOver8Night';

/** base: 월 통상임금에 포함되지 않은 시간에 대해 추가로 주는 기본 비율, premium: 가산 비율 */
export const KINDS: Record<OvertimeKind, { label: string; base: number; premium: number }> = {
  overtime: { label: '연장근로(주간)', base: 1, premium: 0.5 },
  overtimeNight: { label: '연장근로 + 야간(22시~06시)', base: 1, premium: 1.0 },
  night: { label: '야간근로(소정근로시간 중 22시~06시)', base: 0, premium: 0.5 },
  holiday8: { label: '휴일근로 8시간 이내', base: 1, premium: 0.5 },
  holiday8Night: { label: '휴일근로 8시간 이내 + 야간', base: 1, premium: 1.0 },
  holidayOver8: { label: '휴일근로 8시간 초과', base: 1, premium: 1.0 },
  holidayOver8Night: { label: '휴일근로 8시간 초과 + 야간', base: 1, premium: 1.5 },
};

export interface OvertimeInput {
  monthlyOrdinaryWage: number;
  monthlyHours: number;
  /** 상시 5인 이상 사업장 여부. false 이면 가산(할증)을 적용하지 않음 */
  fiveOrMore: boolean;
  hours: Partial<Record<OvertimeKind, number>>;
}

export type OvertimeResult =
  | { ok: false; error: string }
  | { ok: true; hourly: number; rows: { kind: OvertimeKind; label: string; hours: number; multiplier: number; amount: number }[]; total: number; warnings: string[] };

export function calcOvertime(i: OvertimeInput): OvertimeResult {
  if (!Number.isFinite(i.monthlyOrdinaryWage) || i.monthlyOrdinaryWage <= 0) return { ok: false, error: '월 통상임금은 0보다 커야 합니다.' };
  if (!Number.isFinite(i.monthlyHours) || i.monthlyHours <= 0 || i.monthlyHours > 400) return { ok: false, error: '월 소정근로시간은 0 초과 400 이하로 입력해 주세요.' };
  const hourly = i.monthlyOrdinaryWage / i.monthlyHours;
  const rows: Extract<OvertimeResult, { ok: true }>['rows'] = [];
  let total = 0;
  for (const kind of Object.keys(KINDS) as OvertimeKind[]) {
    const h = i.hours[kind] ?? 0;
    if (!Number.isFinite(h) || h < 0) return { ok: false, error: `${KINDS[kind].label} 시간은 0 이상의 숫자여야 합니다.` };
    if (h === 0) continue;
    const k = KINDS[kind];
    const multiplier = k.base + (i.fiveOrMore ? k.premium : 0);
    const amount = Math.round(hourly * h * multiplier);
    rows.push({ kind, label: k.label, hours: h, multiplier, amount });
    total += amount;
  }
  const warnings: string[] = [];
  if (!i.fiveOrMore) warnings.push('상시 5명 미만 사업장은 연장·야간·휴일 가산수당 규정이 적용되지 않는다는 전제로 계산했습니다(가산 0, 연장·휴일 시간은 통상임금 100%만 반영).');
  return { ok: true, hourly, rows, total, warnings };
}
