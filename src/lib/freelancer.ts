/**
 * 사업소득(프리랜서) 3.3% 원천징수 계산.
 * 소득세 3% + 지방소득세(소득세의 10%) = 3.3%. 원천징수는 '미리 낸 세금'이며 확정 세액이 아닙니다.
 * 5월 종합소득세 신고 결과 환급/추가납부액은 필요경비·공제·세율표에 따라 달라지므로 여기서 계산하지 않습니다.
 */
export const INCOME_TAX_RATE = 0.03;
export const LOCAL_TAX_RATIO = 0.1;

export interface Withholding { gross: number; incomeTax: number; localTax: number; totalTax: number; net: number }

/** 지급액(세전) → 원천징수. 원 단위 미만 절사 가정(실무 절사 단위는 지급자에 따라 다를 수 있음). */
export function withholdFromGross(gross: number): Withholding | null {
  if (!Number.isFinite(gross) || gross < 0) return null;
  const incomeTax = Math.floor(gross * INCOME_TAX_RATE);
  const localTax = Math.floor(incomeTax * LOCAL_TAX_RATIO);
  return { gross, incomeTax, localTax, totalTax: incomeTax + localTax, net: gross - incomeTax - localTax };
}

/** 실수령액(세후) → 지급액(세전) 역산. 절사로 ±수 원 차이가 날 수 있어 정확히 일치하는 값을 탐색합니다. */
export function grossFromNet(net: number): Withholding | null {
  if (!Number.isFinite(net) || net < 0) return null;
  const est = Math.round(net / (1 - INCOME_TAX_RATE * (1 + LOCAL_TAX_RATIO)));
  for (let g = est + 5; g >= est - 5; g--) {
    const w = withholdFromGross(g);
    if (w && w.net === net) return w;
  }
  return withholdFromGross(est);
}
