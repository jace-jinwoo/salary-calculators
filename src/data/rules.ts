/**
 * 연도별·법령별 기준 데이터. 공식 출처에서 직접 확인한 값만 status:'확인' 으로 기록합니다.
 * 2026-10-19 확인 시도에서 법제처·국민연금공단·건강보험공단·국세청 페이지 본문을 열람하지 못해
 * 아래 모든 값은 '미확인' 입니다. 미확인 값은 계산에 자동 적용하지 않고 사용자가 직접 입력해야 합니다.
 */
export type Status = '확인' | '미확인';

export interface Rule<T> {
  /** status 가 '미확인' 이면 value 는 계산에 자동 사용되지 않습니다(null). */
  value: T | null;
  status: Status;
  label: string;
  sourceUrl: string;
  checkedAt: string; // 확인(시도)일
  appliesFrom: string; // 적용 기준일/버전. 모르면 '미확인'
  note?: string;
}

const CHECKED = '2026-10-19';
const unk = <T,>(label: string, sourceUrl: string, note?: string): Rule<T> => ({
  value: null,
  status: '미확인',
  label,
  sourceUrl,
  checkedAt: CHECKED,
  appliesFrom: '미확인',
  note: note ?? '공식 출처 본문을 열람하지 못해 값을 기록하지 않았습니다.',
});

const LAW = 'https://www.law.go.kr/법령/';
const NPS = 'https://www.nps.or.kr';
const NHIS = 'https://www.nhis.or.kr';
const NTS = 'https://www.nts.go.kr';
const MOEL = 'https://www.moel.go.kr';

export interface RateRule {
  rate: Rule<number>; // 근로자 부담률(%)
  min?: Rule<number>; // 월 하한(원)
  max?: Rule<number>; // 월 상한(원)
}

export interface YearData {
  year: number;
  pension: RateRule;
  health: RateRule;
  longTermCare: { rate: Rule<number> }; // 건강보험료 대비 %
  employment: RateRule;
  incomeTax: Rule<string>; // 근로소득 간이세액표 (구조 미확인)
  localIncomeTaxRatio: Rule<number>; // 소득세 대비 %
}

export const YEAR_DATA: Record<number, YearData> = {
  2026: {
    year: 2026,
    pension: {
      rate: unk('국민연금 근로자 부담률(%)', `${NPS}/jsppage/info/easy/easy_04_02.jsp`),
      min: unk('국민연금 기준소득월액 하한(원)', `${NPS}/jsppage/info/easy/easy_04_02.jsp`),
      max: unk('국민연금 기준소득월액 상한(원)', `${NPS}/jsppage/info/easy/easy_04_02.jsp`, '상·하한은 매년 7월 조정되므로 적용 기간 확인이 필요합니다.'),
    },
    health: { rate: unk('건강보험 근로자 부담률(%)', `${NHIS}/nhis/policy/wbhada07700m01.do`) },
    longTermCare: { rate: unk('장기요양보험료(건강보험료 대비 %)', `${NHIS}/nhis/policy/wbhada07700m01.do`) },
    employment: { rate: unk('고용보험 근로자 부담률(%)', `${MOEL}`) },
    incomeTax: unk('근로소득 간이세액표', `${NTS}/nts/cm/cntnts/cntntsView.do?mi=2432&cntntsId=7765`, '홈택스에서 조회한 월 원천징수액을 직접 입력하세요.'),
    localIncomeTaxRatio: unk('지방소득세(소득세 대비 %)', `${LAW}지방세법`),
  },
};

export interface LegalRules {
  overtimeMultiplier: Rule<number>;
  nightPremium: Rule<number>;
  holidayMultiplier: Rule<number>;
  holidayOver8Multiplier: Rule<number>;
  smallBizThreshold: Rule<number>;
  severanceMinDays: Rule<number>;
  severanceDays: Rule<number>;
  severanceMinWeeklyHours: Rule<number>;
  freelancerIncomeTaxPct: Rule<number>;
  freelancerLocalPct: Rule<number>;
}

const n = (label: string, url: string, note?: string) => unk<number>(label, url, note);
const READ_FAIL = '법제처(law.go.kr) 본문을 열람하지 못했습니다. 일반적으로 알려진 값은 화면의 직접 입력란에 참고용 기본값으로만 제공합니다.';

export const LEGAL_RULES: LegalRules = {
  overtimeMultiplier: n('연장근로 지급 배율', `${LAW}근로기준법/제56조`, READ_FAIL),
  nightPremium: n('야간근로(22시~06시) 가산 배율', `${LAW}근로기준법/제56조`, READ_FAIL),
  holidayMultiplier: n('휴일근로 8시간 이내 배율', `${LAW}근로기준법/제56조`, READ_FAIL),
  holidayOver8Multiplier: n('휴일근로 8시간 초과 배율', `${LAW}근로기준법/제56조`, READ_FAIL),
  smallBizThreshold: n('상시근로자 수 적용 기준(가산수당)', `${LAW}근로기준법/제11조`, READ_FAIL),
  severanceMinDays: n('퇴직금 계속근로기간 기준(일)', `${LAW}근로자퇴직급여보장법/제4조`, READ_FAIL),
  severanceDays: n('퇴직금 평균임금 일수', `${LAW}근로자퇴직급여보장법/제8조`, READ_FAIL),
  severanceMinWeeklyHours: n('퇴직급여 적용 주 소정근로시간 기준', `${LAW}근로자퇴직급여보장법/제4조`, READ_FAIL),
  freelancerIncomeTaxPct: n('사업소득 원천징수 소득세율(%)', `${NTS}/nts/cm/cntnts/cntntsView.do?mi=2432&cntntsId=7765`, '국세청 페이지에서 본문을 열람하지 못했습니다.'),
  freelancerLocalPct: n('지방소득세(소득세 대비 %)', `${LAW}지방세법`, READ_FAIL),
};

/** 화면 입력란에 채워 두는 '참고용 기본값'. 공식 확인 값이 아니며 사용자가 검증해야 합니다. */
export const REFERENCE_DEFAULTS = {
  overtimeMultiplier: 1.5,
  nightPremium: 0.5,
  holidayMultiplier: 1.5,
  holidayOver8Multiplier: 2.0,
  severanceMinDays: 365,
  severanceDays: 30,
  severanceMinWeeklyHours: 15,
  freelancerIncomeTaxPct: 3,
  freelancerLocalPct: 10,
} as const;

export function allRules(): { group: string; rule: Rule<unknown> }[] {
  const y = YEAR_DATA[2026];
  return [
    ...Object.values(LEGAL_RULES).map((rule) => ({ group: '법령 기준', rule: rule as Rule<unknown> })),
    ...[y.pension.rate, y.pension.min!, y.pension.max!, y.health.rate, y.longTermCare.rate, y.employment.rate, y.incomeTax, y.localIncomeTaxRatio].map((rule) => ({ group: '2026년 4대보험·세금', rule: rule as Rule<unknown> })),
  ];
}
