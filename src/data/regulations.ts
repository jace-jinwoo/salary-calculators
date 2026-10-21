import type { DataItem } from './schema';

/**
 * 연도별 4대보험·세금·법적 요건 데이터.
 * 공식 출처를 직접 열어 확인한 값만 status '확인' (sourceUrl·verifiedAt 필수). 나머지는 '미확인'이며 계산에 쓰지 않습니다.
 * 갱신 절차: README "데이터 갱신" 참고.
 */
function todo(key: string, tool: string | string[], label: string, sourceName: string, note?: string): DataItem {
  return { id: `${key}@미확인`, key, tool: Array.isArray(tool) ? tool.join(',') : tool, label, status: '미확인', sourceName, note };
}

export const DATA: DataItem[] = [
  todo('nps.rate.total', ['salary','salary-table-2026'], '국민연금 보험료율(사업장가입자 합계, 근로자 부담은 절반)', '국민연금공단'),
  todo('nps.base.min', ['salary','salary-table-2026'], '국민연금 기준소득월액 하한', '국민연금공단'),
  todo('nps.base.max', ['salary','salary-table-2026'], '국민연금 기준소득월액 상한', '국민연금공단'),
  todo('nhi.rate.total', ['salary','salary-table-2026'], '건강보험료율(직장가입자 합계, 근로자 부담은 절반)', '국민건강보험공단'),
  todo('ltc.ratio', ['salary','salary-table-2026'], '장기요양보험료 (건강보험료 대비 비율)', '국민건강보험공단'),
  todo('ei.rate.worker', ['salary','salary-table-2026'], '고용보험 근로자 부담 요율(실업급여)', '고용노동부·근로복지공단'),
  todo('tax.meal.limit', ['salary','salary-table-2026'], '비과세 식대 월 한도', '국세청·법제처(소득세법 시행령)'),
  todo('sev.req.tenure', 'severance', '퇴직금 지급 요건: 계속근로기간 1년 이상', '근로자퇴직급여 보장법(법제처)', '계산기는 일반적으로 알려진 요건으로 판정하나 조문 원문은 직접 확인하지 못했습니다.'),
  todo('sev.req.weekly', 'severance', '퇴직금 지급 요건: 4주 평균 1주 소정근로시간 15시간 이상', '근로자퇴직급여 보장법(법제처)', '위와 동일(원문 미확인, 참고용 판정).'),
  todo('sev.avgwage', 'severance', '평균임금 산정(3개월 총액/총일수, 상여·연차 3/12 가산, 통상임금 하한)', '근로기준법·시행령(법제처)', '수식 기반 구현, 원문 미확인.'),
  todo('ot.premium', 'overtime', '연장·야간·휴일근로 가산율(50%, 휴일 8시간 초과 100%) 및 5인 미만 적용 제외', '근로기준법 제56조·제11조(법제처)', '수식 기반 구현, 원문 미확인.'),
  todo('ot.monthly.hours', 'overtime', '월 환산 소정근로시간 209시간(주 40시간·유급주휴)', '고용노동부', '기본값일 뿐이며 입력값을 수정할 수 있습니다. 출처 미확인.'),
  todo('fl.withholding.rate', 'freelancer', '사업소득 원천징수 3% + 지방소득세 0.3%(3.3%)', '국세청·소득세법(법제처)', '3.3% 구성은 일반 안내로 구현했으나 원문 미확인. 원 단위 절사 방식도 미확인(가정).'),
  todo('fl.income.tax.table', 'freelancer', '종합소득세 과세표준 세율표·경비율·공제(환급액 추정용)', '국세청', '미확인이므로 환급·추가납부액은 계산하지 않습니다.'),
  todo('tax.simple.table', ['salary','salary-table-2026'], '근로소득 간이세액표(근로소득세·지방소득세)', '국세청'),
];

export function dataFor(tool: string): DataItem[] {
  return DATA.filter((d) => d.tool.split(',').includes(tool));
}
