# 연봉·실수령액 계산기 (salary-calculators)

Next.js(App Router) + TypeScript + Tailwind 3, `output: 'export'` 정적 사이트. 서버 API·DB·로그인 없음.

페이지: `/salary`, `/freelancer`, `/severance`, `/overtime`, `/salary-table-2026` + 홈·소개·이용 안내·개인정보처리방침·이용약관·문의, `robots.txt`, `sitemap.xml`.

## 개발
```
npm install
npm run dev
npm test          # vitest (tests/)
npm run build     # out/ 생성
npm run verify    # out/ 정적 경로·메타·내부 링크 검증
```

## 배포 (Netlify)
GitHub 저장소 연결 → Build command `npm run build`, Publish directory `out` (`netlify.toml` 포함).
환경변수: `.env.example` 참고 (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, AdSense는 승인 전 `false`).
AdSlot 은 환경변수로 활성화하기 전에는 아무것도 렌더링하지 않습니다.

## 데이터 구조와 갱신 절차
- `src/data/regulations.ts`: 연도별 4대보험·세금·법적 요건. 각 항목에 `status`('확인'|'미확인'), `sourceUrl`, `verifiedAt`, `effectiveFrom` 기록.
- `src/data/schema.ts`: 스키마와 기준일 버전 선택(`pickVersion`). `src/lib/rates.ts` 가 기준일에 맞는 값을 꺼냅니다.
- 갱신: 공식 출처(국민연금공단·건강보험공단·국세청·고용노동부·법제처)를 직접 확인 → 새 `effectiveFrom` 버전 항목 추가(기존 항목 유지) → `tests/data-salary.test.ts` 통과 확인. 확인하지 못한 값은 `status: '미확인'` 으로 두고 값을 넣지 않습니다.
- 확인 상태는 각 도구 페이지의 “적용 기준 데이터와 확인 상태” 표에 그대로 노출됩니다.

## 검증 상태 (정직한 현황)
- **모든 연도별 기준 데이터는 '미확인'** 입니다: 국민연금(요율·기준소득월액 상·하한), 건강보험·장기요양, 고용보험, 비과세 식대 한도, 근로소득 간이세액표, 퇴직금·수당 법적 요건 원문, 종합소득세 세율표. 웹 확인(WebFetch)이 권한 요청 미응답으로 차단되어 공식 출처를 열어 확인하지 못했고, 기억에 의존한 수치는 데이터에 넣지 않았습니다.
- 그 결과 `/salary`·`/salary-table-2026` 은 보험·세금을 계산하지 않고 "미확인·계산 불가"를 표시하며 실수령액은 급여 그대로(실제보다 높게)임을 화면에 명시합니다. 공식 값을 `src/data/regulations.ts` 에 `status:'확인'`(+`numeric`, `sourceUrl`, `verifiedAt`, `effectiveFrom`)으로 추가하면 계산식(`src/lib/salary.ts`)이 자동으로 사용합니다(근로소득세 계산식은 간이세액표 확인 후 `calcSalary` 의 `incomeTax` 인자로 연결 필요 — 미구현).
- 수식 기반 계산(통상시급·가산 배율, 평균임금·퇴직금, 3.3% 원천징수)은 구현되어 있으나 법령 원문을 확인하지 못해 참고용입니다. 3.3% 환급액은 계산하지 않습니다.
- npm 레지스트리 접근 불가로 `npm install`, `npm test`, `npm run build`, `npm run verify` 는 **실행하지 못했습니다**. 순수 로직(overtime·severance·freelancer)만 node 로 직접 확인했습니다.
