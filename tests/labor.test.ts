import { describe, expect, it } from 'vitest';
import { calcOvertime } from '@/lib/overtime';
import { calcSeverance } from '@/lib/severance';
import { grossFromNet, withholdFromGross } from '@/lib/freelancer';

describe('overtime', () => {
  it('통상시급 15,000원 연장 10시간 = 225,000원', () => {
    const r = calcOvertime({ monthlyOrdinaryWage: 3135000, monthlyHours: 209, fiveOrMore: true, hours: { overtime: 10 } });
    expect(r.ok && r.hourly).toBe(15000);
    expect(r.ok && r.total).toBe(225000);
  });
  it('야간근로(소정)는 가산분 0.5만, 휴일 8시간 초과+야간은 2.5배', () => {
    const r = calcOvertime({ monthlyOrdinaryWage: 2090000, monthlyHours: 209, fiveOrMore: true, hours: { night: 4, holidayOver8Night: 2 } });
    expect(r.ok && r.total).toBe(10000 * 4 * 0.5 + 10000 * 2 * 2.5);
  });
  it('5인 미만은 가산 없이 연장 1.0배, 야간 소정 0', () => {
    const r = calcOvertime({ monthlyOrdinaryWage: 2090000, monthlyHours: 209, fiveOrMore: false, hours: { overtime: 10, night: 5 } });
    expect(r.ok && r.total).toBe(100000);
  });
  it('잘못된 입력', () => {
    expect(calcOvertime({ monthlyOrdinaryWage: 0, monthlyHours: 209, fiveOrMore: true, hours: {} }).ok).toBe(false);
    expect(calcOvertime({ monthlyOrdinaryWage: 1, monthlyHours: 209, fiveOrMore: true, hours: { overtime: -1 } }).ok).toBe(false);
  });
});

describe('severance', () => {
  const base = { joinDate: '2023-01-01', leaveDate: '2025-12-31', last3mWage: 9000000, annualBonus: 0, annualLeavePay: 0, weeklyHours: 40 };
  it('3년, 92일, 9,000,000원', () => {
    const r = calcSeverance(base);
    expect(r.ok && r.tenureDays).toBe(1096);
    expect(r.ok && r.periodDays).toBe(92);
    expect(r.ok && r.severance).toBe(8812388);
    expect(r.ok && r.eligible).toBe(true);
  });
  it('상여·연차 3/12 가산', () => {
    const r = calcSeverance({ ...base, annualBonus: 1200000, annualLeavePay: 400000, last3mDays: 90 });
    expect(r.ok && r.avgDaily).toBeCloseTo((9000000 + 300000 + 100000) / 90, 6);
  });
  it('통상임금이 크면 통상임금 적용', () => {
    const r = calcSeverance({ ...base, ordinaryDaily: 200000 });
    expect(r.ok && r.usedOrdinary).toBe(true);
  });
  it('1년 미만·주 15시간 미만은 요건 미충족', () => {
    const a = calcSeverance({ ...base, joinDate: '2025-06-01' });
    expect(a.ok && a.eligible).toBe(false);
    const b = calcSeverance({ ...base, weeklyHours: 10 });
    expect(b.ok && b.eligible).toBe(false);
  });
  it('날짜 오류', () => {
    expect(calcSeverance({ ...base, leaveDate: '2022-01-01' }).ok).toBe(false);
    expect(calcSeverance({ ...base, joinDate: '2023-02-30' }).ok).toBe(false);
  });
});

describe('freelancer 3.3%', () => {
  it('1,000,000원 → 33,000원 공제', () => {
    expect(withholdFromGross(1000000)).toMatchObject({ incomeTax: 30000, localTax: 3000, totalTax: 33000, net: 967000 });
  });
  it('세후 → 세전 역산이 순방향과 일치', () => {
    const w = grossFromNet(967000);
    expect(w?.gross).toBe(1000000);
    for (const g of [123456, 5000000, 77777]) {
      const n = withholdFromGross(g)!.net;
      expect(withholdFromGross(grossFromNet(n)!.gross)!.net).toBe(n);
    }
  });
  it('음수·NaN 거부', () => {
    expect(withholdFromGross(-1)).toBeNull();
    expect(withholdFromGross(NaN)).toBeNull();
  });
});
