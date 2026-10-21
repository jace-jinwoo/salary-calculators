'use client';

import { useState, type FormEvent } from 'react';
import { Field, MAN, Msg, num, Panel, ResultBox, SelectField, Stat, SubmitButton, won } from './FormBits';
import { calcOvertime, DEFAULT_MONTHLY_HOURS, KINDS, type OvertimeKind } from '@/lib/overtime';
import { grossFromNet, withholdFromGross } from '@/lib/freelancer';
import { calcSeverance } from '@/lib/severance';
import { calcSalary } from '@/lib/salary';
import { ratesFor } from '@/lib/rates';

const DEFAULT_BASE_DATE = '2026-10-01';

function need(raw: string, label: string): number | string {
  const v = num(raw);
  if (v === undefined) return `${label}: 숫자만 입력해 주세요.`;
  if (v === null) return `${label}을(를) 입력해 주세요.`;
  return v;
}
const err = (m: string): Msg => ({ kind: 'error', text: m });

/* ───────── /salary ───────── */
export function SalaryCalculator() {
  const [mode, setMode] = useState<'annual' | 'monthly'>('annual');
  const [amount, setAmount] = useState('48000000');
  const [meal, setMeal] = useState('200000');
  const [baseDate, setBaseDate] = useState(DEFAULT_BASE_DATE);
  const [dependents, setDependents] = useState('1');
  const [msg, setMsg] = useState<Msg | null>(null);
  const [res, setRes] = useState<ReturnType<typeof calcSalary> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setRes(null);
    const a = need(amount, mode === 'annual' ? '연봉' : '월 급여');
    const m = need(meal || '0', '비과세 식대');
    if (typeof a === 'string') return setMsg(err(a));
    if (typeof m === 'string') return setMsg(err(m));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return setMsg(err('기준일을 올바르게 입력해 주세요.'));
    const r = calcSalary({ monthlyGross: mode === 'annual' ? a / 12 : a, mealAllowance: m }, ratesFor(baseDate));
    if (!r.ok) return setMsg(err(r.error));
    setMsg(null);
    setRes(r);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Panel title="입력">
        <SelectField id="s-mode" label="입력 방식" value={mode} onChange={setMode} options={[{ value: 'annual', label: '연봉(세전)' }, { value: 'monthly', label: '월 급여(세전)' }]} />
        <Field id="s-amount" label={mode === 'annual' ? '연봉' : '월 급여'} value={amount} onChange={setAmount} suffix="원" hint="세전 총액. 연봉에 퇴직금이 포함되어 있다면 제외한 금액을 입력하세요." />
        <Field id="s-meal" label="월 비과세 식대" value={meal} onChange={setMeal} suffix="원" hint="한도는 확인된 기준이 있을 때만 적용됩니다." />
        <Field id="s-base" label="기준일(급여 지급월)" value={baseDate} onChange={setBaseDate} type="date" hint="이 날짜에 유효한 확인된 기준 데이터를 사용합니다." />
        <Field id="s-dep" label="부양가족 수(본인 포함)" value={dependents} onChange={setDependents} suffix="명" hint="근로소득세 계산에만 쓰이며, 세금 기준 미확인 동안은 반영되지 않습니다." />
      </Panel>
      <SubmitButton />
      <ResultBox msg={msg}>
        {res && res.ok && (
          <div className="mt-3 space-y-3">
            <dl className="grid gap-2 sm:grid-cols-3">
              <Stat label="월 급여(세전)" value={won(res.monthlyGross)} />
              <Stat label="비과세 식대 반영" value={won(res.nonTaxable)} />
              <Stat label="과세 대상 월 급여" value={won(res.taxableBase)} />
            </dl>
            {res.mealCapped && <p className="text-sm text-amber-900">입력한 식대가 확인된 월 한도를 초과해 한도까지만 비과세로 계산했습니다.</p>}
            <table className="w-full text-left text-sm">
              <caption className="sr-only">공제 내역</caption>
              <thead><tr className="border-b border-brand-200"><th scope="col" className="p-2">항목</th><th scope="col" className="p-2 text-right">월 공제액</th></tr></thead>
              <tbody>
                {res.lines.map((l) => (
                  <tr key={l.id} className="border-b border-brand-100 align-top">
                    <th scope="row" className="p-2 font-medium">{l.label}{l.note && <span className="block text-xs font-normal text-gray-500">{l.note}</span>}</th>
                    <td className="p-2 text-right">{l.amount === null ? <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">미확인·계산 불가</span> : won(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Stat label="확인된 항목 공제 합계" value={won(res.knownDeduction)} />
              <Stat label={res.unavailable.length ? '월 실수령액 (확인된 항목까지만 공제)' : '월 실수령액'} value={won(res.netPartial)} />
            </dl>
            {res.unavailable.length > 0 && (
              <p role="status" className="rounded bg-white p-3 text-sm text-amber-900">
                <strong>주의:</strong> {res.unavailable.join(', ')} 기준이 확인되지 않아 반영하지 못했습니다. 위 실수령액은 실제보다 <strong>높게</strong> 표시됩니다. 연 환산 참고: {won(res.netPartial * 12)}.
              </p>
            )}
          </div>
        )}
      </ResultBox>
    </form>
  );
}

/* ───────── /salary-table-2026 ───────── */
const TABLE_SALARIES = [24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 120].map((m) => m * 100 * MAN);

export function SalaryTable() {
  const [meal, setMeal] = useState('200000');
  const [baseDate] = useState(DEFAULT_BASE_DATE);
  const m = num(meal || '0');
  const rates = ratesFor(baseDate);
  const rows = m === undefined || m === null ? [] : TABLE_SALARIES.map((a) => ({ a, r: calcSalary({ monthlyGross: a / 12, mealAllowance: Math.min(m, a / 12) }, rates) }));
  const cell = (v: number | null | undefined) => (v === null || v === undefined ? <span className="text-amber-800">미확인</span> : won(v));
  return (
    <div className="space-y-3">
      <Field id="t-meal" label="월 비과세 식대" value={meal} onChange={setMeal} suffix="원" />
      {m === undefined && <p role="alert" className="text-sm text-red-700">식대는 숫자만 입력해 주세요.</p>}
      <p className="text-sm text-gray-600">기준일 {baseDate}. 근로소득세·지방소득세는 기준 확인 전까지 표에서 제외되며 실수령액은 <strong>세금 미반영</strong> 값입니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">연봉별 월 공제와 실수령액</caption>
          <thead><tr className="border-b border-gray-300 bg-gray-50"><th scope="col" className="p-2">연봉</th><th scope="col" className="p-2">월 급여</th><th scope="col" className="p-2">국민연금</th><th scope="col" className="p-2">건강보험</th><th scope="col" className="p-2">장기요양</th><th scope="col" className="p-2">고용보험</th><th scope="col" className="p-2">소득세·지방세</th><th scope="col" className="p-2">실수령(세금 미반영)</th></tr></thead>
          <tbody>
            {rows.map(({ a, r }) => r.ok && (
              <tr key={a} className="border-b border-gray-200">
                <th scope="row" className="p-2 font-medium">{(a / MAN).toLocaleString('ko-KR')}만원</th>
                <td className="p-2">{won(r.monthlyGross)}</td>
                {(['nps', 'nhi', 'ltc', 'ei'] as const).map((id) => <td key={id} className="p-2">{cell(r.lines.find((l) => l.id === id)?.amount)}</td>)}
                <td className="p-2">{cell(null)}</td>
                <td className="p-2 font-semibold">{won(r.netPartial)}{r.unavailable.length > 0 && <span className="block text-xs font-normal text-amber-800">미확인 항목 미공제</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── /freelancer ───────── */
export function FreelancerCalculator() {
  const [dir, setDir] = useState<'gross' | 'net'>('gross');
  const [amount, setAmount] = useState('1000000');
  const [msg, setMsg] = useState<Msg | null>(null);
  const [res, setRes] = useState<ReturnType<typeof withholdFromGross>>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setRes(null);
    const a = need(amount, dir === 'gross' ? '세전 금액' : '세후 금액');
    if (typeof a === 'string') return setMsg(err(a));
    if (a < 0) return setMsg(err('금액은 0 이상이어야 합니다.'));
    setMsg(null);
    setRes(dir === 'gross' ? withholdFromGross(a) : grossFromNet(a));
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Panel title="입력">
        <SelectField id="f-dir" label="계산 방향" value={dir} onChange={setDir} options={[{ value: 'gross', label: '세전 → 세후' }, { value: 'net', label: '세후 → 세전' }]} />
        <Field id="f-amount" label={dir === 'gross' ? '세전 지급액' : '세후 실수령액'} value={amount} onChange={setAmount} suffix="원" />
      </Panel>
      <SubmitButton />
      <ResultBox msg={msg}>
        {res && (
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <Stat label="세전 지급액" value={won(res.gross)} />
            <Stat label="소득세 3%" value={won(res.incomeTax)} />
            <Stat label="지방소득세 0.3%" value={won(res.localTax)} />
            <Stat label="원천징수 합계(3.3%)" value={won(res.totalTax)} />
            <Stat label="세후 실수령액" value={won(res.net)} />
          </dl>
        )}
        <div role="note" className="mt-3 rounded bg-white p-3 text-sm text-gray-800">
          <strong>환급액 안내:</strong> 원천징수된 3.3%는 5월 종합소득세 신고 전까지의 <em>기납부세액</em>입니다. 환급·추가납부액은 (종합소득세 결정세액 − 기납부세액)으로 정해지며 필요경비·공제·세율표에 따라 달라집니다. 3.3% 전액이 환급되지 않으며, 이 계산기는 환급액을 추정하지 않습니다(종합소득세 기준 미확인).
        </div>
      </ResultBox>
    </form>
  );
}

/* ───────── /overtime ───────── */
export function OvertimeCalculator() {
  const [wage, setWage] = useState('3135000');
  const [hours, setHours] = useState(String(DEFAULT_MONTHLY_HOURS));
  const [five, setFive] = useState<'yes' | 'no'>('yes');
  const [h, setH] = useState<Record<OvertimeKind, string>>({ overtime: '10', overtimeNight: '', night: '', holiday8: '', holiday8Night: '', holidayOver8: '', holidayOver8Night: '' });
  const [msg, setMsg] = useState<Msg | null>(null);
  const [res, setRes] = useState<ReturnType<typeof calcOvertime> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setRes(null);
    const w = need(wage, '월 통상임금');
    const mh = need(hours, '월 소정근로시간');
    if (typeof w === 'string') return setMsg(err(w));
    if (typeof mh === 'string') return setMsg(err(mh));
    const parsed: Partial<Record<OvertimeKind, number>> = {};
    for (const k of Object.keys(KINDS) as OvertimeKind[]) {
      const v = num(h[k]);
      if (v === undefined) return setMsg(err(`${KINDS[k].label}: 숫자만 입력해 주세요.`));
      parsed[k] = v ?? 0;
    }
    const r = calcOvertime({ monthlyOrdinaryWage: w, monthlyHours: mh, fiveOrMore: five === 'yes', hours: parsed });
    if (!r.ok) return setMsg(err(r.error));
    setMsg(null);
    setRes(r);
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Panel title="기본 정보">
        <Field id="o-wage" label="월 통상임금" value={wage} onChange={setWage} suffix="원" />
        <Field id="o-hours" label="월 소정근로시간" value={hours} onChange={setHours} suffix="시간" hint="주 40시간·유급주휴 포함 시 209시간이 일반적입니다." />
        <SelectField id="o-five" label="상시 근로자 수" value={five} onChange={setFive} options={[{ value: 'yes', label: '5명 이상' }, { value: 'no', label: '5명 미만(가산 미적용)' }]} />
      </Panel>
      <Panel title="근로 시간(월 합계)">
        {(Object.keys(KINDS) as OvertimeKind[]).map((k) => (
          <Field key={k} id={`o-${k}`} label={KINDS[k].label} value={h[k]} onChange={(v) => setH({ ...h, [k]: v })} suffix="시간" />
        ))}
      </Panel>
      <SubmitButton />
      <ResultBox msg={msg}>
        {res && res.ok && (
          <div className="mt-3 space-y-3">
            <dl className="grid gap-2 sm:grid-cols-2"><Stat label="통상시급" value={won(res.hourly)} /><Stat label="수당 합계" value={won(res.total)} /></dl>
            {res.rows.length > 0 && (
              <table className="w-full text-left text-sm"><caption className="sr-only">유형별 수당</caption>
                <thead><tr className="border-b border-brand-200"><th scope="col" className="p-2">유형</th><th scope="col" className="p-2">시간</th><th scope="col" className="p-2">지급 배율</th><th scope="col" className="p-2 text-right">금액</th></tr></thead>
                <tbody>{res.rows.map((r) => <tr key={r.kind} className="border-b border-brand-100"><th scope="row" className="p-2 font-medium">{r.label}</th><td className="p-2">{r.hours}</td><td className="p-2">×{r.multiplier}</td><td className="p-2 text-right">{won(r.amount)}</td></tr>)}</tbody>
              </table>
            )}
            {res.warnings.map((w) => <p key={w} className="text-sm text-amber-900">{w}</p>)}
          </div>
        )}
      </ResultBox>
    </form>
  );
}

/* ───────── /severance ───────── */
export function SeveranceCalculator() {
  const [f, setF] = useState({ join: '2023-01-01', leave: '2025-12-31', wage: '9000000', bonus: '0', leavePay: '0', weekly: '40', days: '', ordinary: '' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const [msg, setMsg] = useState<Msg | null>(null);
  const [res, setRes] = useState<ReturnType<typeof calcSeverance> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setRes(null);
    const wage = need(f.wage, '3개월 임금 총액');
    const weekly = need(f.weekly, '주 소정근로시간');
    if (typeof wage === 'string') return setMsg(err(wage));
    if (typeof weekly === 'string') return setMsg(err(weekly));
    const bonus = num(f.bonus || '0'), lp = num(f.leavePay || '0'), days = num(f.days), ord = num(f.ordinary);
    if (bonus === undefined || bonus === null || lp === undefined || lp === null || days === undefined || ord === undefined) return setMsg(err('숫자 입력란에는 숫자만 입력해 주세요.'));
    const r = calcSeverance({ joinDate: f.join, leaveDate: f.leave, last3mWage: wage, annualBonus: bonus, annualLeavePay: lp, weeklyHours: weekly, last3mDays: days ?? undefined, ordinaryDaily: ord ?? undefined });
    if (!r.ok) return setMsg(err(r.error));
    setMsg(null);
    setRes(r);
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Panel title="근속 정보">
        <Field id="v-join" label="입사일" type="date" value={f.join} onChange={set('join')} />
        <Field id="v-leave" label="퇴사일(마지막 근무일)" type="date" value={f.leave} onChange={set('leave')} />
        <Field id="v-weekly" label="평균 주 소정근로시간" value={f.weekly} onChange={set('weekly')} suffix="시간" />
      </Panel>
      <Panel title="임금 정보(세전)">
        <Field id="v-wage" label="퇴직 전 3개월 임금 총액" value={f.wage} onChange={set('wage')} suffix="원" hint="상여금·연차수당 제외 기본급·수당 합계" />
        <Field id="v-bonus" label="연간 상여금 총액" value={f.bonus} onChange={set('bonus')} suffix="원" hint="3/12 가산" />
        <Field id="v-lp" label="연차수당(전년도 발생분)" value={f.leavePay} onChange={set('leavePay')} suffix="원" hint="3/12 가산" />
        <Field id="v-days" label="3개월 총 일수(선택)" value={f.days} onChange={set('days')} suffix="일" hint="비우면 퇴사일 기준 자동 계산" />
        <Field id="v-ord" label="1일 통상임금(선택)" value={f.ordinary} onChange={set('ordinary')} suffix="원" hint="평균임금보다 크면 통상임금 적용" />
      </Panel>
      <SubmitButton />
      <ResultBox msg={msg}>
        {res && res.ok && (
          <div className="mt-3 space-y-3">
            <dl className="grid gap-2 sm:grid-cols-2">
              <Stat label="재직일수(초일 산입)" value={`${res.tenureDays.toLocaleString('ko-KR')}일`} />
              <Stat label="3개월 총 일수" value={`${res.periodDays}일`} />
              <Stat label="1일 평균임금" value={won(res.avgDaily)} />
              <Stat label={res.usedOrdinary ? '적용 일급(통상임금)' : '적용 일급(평균임금)'} value={won(res.appliedDaily)} />
              <Stat label="예상 퇴직금(세전)" value={won(res.severance)} />
            </dl>
            {res.eligible ? <p className="text-sm text-gray-800">입력 기준으로 지급 요건(1년 이상·주 15시간 이상)을 충족합니다. 요건의 확인 상태는 아래 표를 참고하세요.</p>
              : <p role="alert" className="rounded bg-white p-3 text-sm text-red-700"><strong>지급 요건 미충족 가능:</strong> {res.reasons.join(' ')} 위 금액은 참고용 산식 결과이며 지급 대상이 아닐 수 있습니다.</p>}
          </div>
        )}
      </ResultBox>
    </form>
  );
}
