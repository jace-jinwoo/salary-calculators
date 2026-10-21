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
  todo('nps.rate.total', 'salary', '국민연금 보험료율(사업장가입자 합계, 근로자 부담은 절반)', '국민연금공단'),
  todo('nps.base.min', 'salary', '국민연금 기준소득월액 하한', '국민연금공단'),
  todo('nps.base.max', 'salary', '국민연금 기준소득월액 상한', '국민연금공단'),
  todo('nhi.rate.total', 'salary', '건강보험료율(직장가입자 합계, 근로자 부담은 절반)', '국민건강보험공단'),
  todo('ltc.ratio', 'salary', '장기요양보험료 (건강보험료 대비 비율)', '국민건강보험공단'),
  todo('ei.rate.worker', 'salary', '고용보험 근로자 부담 요율(실업급여)', '고용노동부·근로복지공단'),
  todo('tax.meal.limit', 'salary', '비과세 식대 월 한도', '국세청·법제처(소득세법 시행령)'),
  todo('tax.simple.table', 'salary', '근로소득 간이세액표(근로소득세·지방소득세)', '국세청'),
];

export function dataFor(tool: string): DataItem[] {
  return DATA.filter((d) => d.tool.split(',').includes(tool));
}
