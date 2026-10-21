import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { FreelancerCalculator, OvertimeCalculator, SalaryCalculator, SalaryTable, SeveranceCalculator } from '@/components/Calculators';
import ToolPage from '@/components/ToolPage';
import { getTool, TOOLS } from '@/data/tools';
import { SITE_NAME } from '@/lib/site';

// 정적 내보내기: 빌드 시 생성한 경로 외에는 404
export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const meta = getTool(tool);
  if (!meta) return {};
  const path = `/${meta.slug}/`;
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
      url: path,
    },
    twitter: { card: 'summary', title: meta.title, description: meta.description },
  };
}

function renderTool(slug: string): ReactNode {
  switch (slug) {
    case 'salary':
      return <SalaryCalculator />;
    case 'freelancer':
      return <FreelancerCalculator />;
    case 'severance':
      return <SeveranceCalculator />;
    case 'overtime':
      return <OvertimeCalculator />;
    case 'salary-table-2026':
      return <SalaryTable />;
    default:
      return null;
  }
}

export default async function ToolRoute({ params }: Props) {
  const { tool } = await params;
  const meta = getTool(tool);
  if (!meta) notFound();
  return <ToolPage meta={meta}>{renderTool(meta.slug)}</ToolPage>;
}
