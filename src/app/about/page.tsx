import type { Metadata } from 'next';
import Link from 'next/link';
import { TOOLS } from '@/data/tools';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: '서비스 소개',
  description: `${SITE_NAME}는 연봉·실수령액, 프리랜서 3.3%, 퇴직금, 수당 계산기를 제공하는 무료 웹 서비스입니다. 운영 원칙과 데이터 정확성 정책을 안내합니다.`,
  alternates: { canonical: '/about/' },
  openGraph: { url: '/about/', title: `서비스 소개 | ${SITE_NAME}` },
};

export default function AboutPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">서비스 소개</h1>
      <p className="text-gray-700">
        {SITE_NAME}는 연봉·실수령액, 프리랜서 3.3% 원천징수, 퇴직금, 연장·야간·휴일수당 계산을 한곳에 모은 무료 웹 서비스입니다. 회원가입이 필요 없고, 입력한 값은 서버로 전송되지 않고 방문자의 브라우저 안에서만 처리됩니다.
      </p>

      <section aria-labelledby="tools-h">
        <h2 id="tools-h" className="text-xl font-semibold">제공 도구</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
          {TOOLS.map((t) => (
            <li key={t.slug}>
              <Link href={`/${t.slug}/`} className="text-brand-700 underline">{t.name}</Link> - {t.shortDescription}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="policy-h">
        <h2 id="policy-h" className="text-xl font-semibold">데이터 정확성 정책</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          <li>4대보험 요율·한도 등 연도별 기준은 공식 출처를 직접 확인한 값만 데이터 파일에 넣고 출처·확인일을 기록합니다.</li>
          <li>확인하지 못한 기준은 계산하지 않고 화면에 “미확인”으로 표시하며, 결과는 참고용 추정임을 명시합니다.</li>
          <li>신발·의류 사이즈는 브랜드마다 다르고 단일 공식 환산표가 없어, 근사 참고값임을 화면에 명확히 표시합니다.</li>
          <li>확인할 수 없는 기준은 임의로 만들지 않고 제외하거나 "미확인"으로 표시합니다.</li>
        </ul>
      </section>

      <section aria-labelledby="ads-h">
        <h2 id="ads-h" className="text-xl font-semibold">광고에 대해</h2>
        <p className="mt-2 text-gray-700">
          서비스 운영을 위해 Google AdSense 광고를 게재할 수 있습니다. 광고는 "광고" 라벨로 구분되며 도구의 버튼·결과와 분리되어 표시됩니다.
        </p>
      </section>

      <p className="text-gray-700">
        오류 제보와 개선 제안은 <Link href="/contact/" className="text-brand-700 underline">문의 페이지</Link>를 이용해 주세요.
      </p>
    </article>
  );
}
