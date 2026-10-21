import { DATA } from '@/data/regulations';
import { pickVersion } from '@/data/schema';

/** 4대보험 계산에 쓰는 확인된 기준값. 없는 값은 undefined (계산 불가). */
export interface Rates {
  npsRateTotal?: number; // %
  npsMin?: number; // 원
  npsMax?: number; // 원
  nhiRateTotal?: number; // %
  ltcRatio?: number; // % (건강보험료 대비)
  eiRateWorker?: number; // %
  mealLimit?: number; // 원
}

export function ratesFor(date: string): Rates {
  const g = (key: string) => pickVersion(DATA, key, date)?.numeric;
  return {
    npsRateTotal: g('nps.rate.total'),
    npsMin: g('nps.base.min'),
    npsMax: g('nps.base.max'),
    nhiRateTotal: g('nhi.rate.total'),
    ltcRatio: g('ltc.ratio'),
    eiRateWorker: g('ei.rate.worker'),
    mealLimit: g('tax.meal.limit'),
  };
}
