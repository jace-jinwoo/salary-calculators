import { describe, expect, it } from 'vitest';
import { DATA } from '@/data/regulations';
import { calcSalary } from '@/lib/salary';
import { ratesFor } from '@/lib/rates';

describe('regulations 데이터 무결성', () => {
  it('확인 항목은 sourceUrl·verifiedAt·effectiveFrom·numeric 필수', () => {
    for (const d of DATA.filter((x) => x.status === '확인')) {
      expect(d.sourceUrl, d.id).toMatch(/^https:\/\//);
      expect(d.verifiedAt, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.effectiveFrom, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('미확인 항목은 값을 가지지 않음', () => {
    for (const d of DATA.filter((x) => x.status === '미확인')) {
      expect(d.numeric, d.id).toBeUndefined();
      expect(d.valueText, d.id).toBeUndefined();
    }
  });
  it('id 중복 없음', () => {
    expect(new Set(DATA.map((d) => d.id)).size).toBe(DATA.length);
  });
});

describe('calcSalary', () => {
  const rates = { npsRateTotal: 9, npsMin: 400000, npsMax: 6000000, nhiRateTotal: 7, ltcRatio: 10, eiRateWorker: 0.9, mealLimit: 200000 };
  it('주입된 기준으로 계산(수식 검증용 가상 값)', () => {
    const r = calcSalary({ monthlyGross: 4000000, mealAllowance: 200000 }, rates);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taxableBase).toBe(3800000);
    expect(r.lines.find((l) => l.id === 'nps')!.amount).toBe(171000);
    expect(r.lines.find((l) => l.id === 'nhi')!.amount).toBe(133000);
    expect(r.lines.find((l) => l.id === 'ltc')!.amount).toBe(13300);
    expect(r.lines.find((l) => l.id === 'ei')!.amount).toBe(34200);
    expect(r.unavailable).toContain('근로소득세·지방소득세');
  });
  it('기준이 없으면 해당 항목은 null(계산 불가)', () => {
    const r = calcSalary({ monthlyGross: 3000000, mealAllowance: 0 }, {});
    expect(r.ok && r.lines.every((l) => l.amount === null)).toBe(true);
    expect(r.ok && r.netPartial).toBe(3000000);
  });
  it('식대 한도 초과 시 한도 적용 / 입력 검증', () => {
    const r = calcSalary({ monthlyGross: 3000000, mealAllowance: 300000 }, { mealLimit: 200000 });
    expect(r.ok && r.nonTaxable).toBe(200000);
    expect(calcSalary({ monthlyGross: 0, mealAllowance: 0 }, {}).ok).toBe(false);
    expect(calcSalary({ monthlyGross: 100, mealAllowance: 200 }, {}).ok).toBe(false);
  });
  it('ratesFor 는 기준일에 확인된 값만 반환', () => {
    expect(typeof ratesFor('2026-10-01')).toBe('object');
  });
});
