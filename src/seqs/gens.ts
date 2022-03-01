import {useMemo} from 'react';

import {HS, TimedHS} from '../hs/types';
import {useSMap} from '../hs/hooks';
import {SeqGen, SeqGenFunc, SeqItem} from './types';

export const loop = <T>(src: SeqGenFunc<T>, count?: number): SeqGenFunc<T> => function * (ii) {
  for (let i = 0; count ? i < count : true; i++) {
    yield * src(i + (ii || 0) * (count || 0));
  }
}

export const sequence = <T>(srcs: SeqGenFunc<T>[]): SeqGenFunc<T> => function * (ii) {
  for (const src of srcs) {
    yield * src(ii);
  }
}

type ConsumeCtx<T> = {
  mes: T[];
  t: number;
}

const consume = <T>(g: SeqGen<T>, ctx: ConsumeCtx<T>): boolean => {
  const {value, done} = g.next();
  if (done) return true;
  const [mes, dur] = value as SeqItem<T>;
  ctx.mes = mes;
  ctx.t += dur;
  return false;
}

export const merge = <T>(srcs: SeqGenFunc<T>[]): SeqGenFunc<T> => function * (ii) {
  const gens = srcs.map((src) => src(ii));

  const cs: ConsumeCtx<T>[] = gens.map(() => ({
    mes: [],
    t: 0,
  }));

  for (;;) {
    const minT = Math.min(...cs.map(({t}) => t));
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      let mes: T[] = [];
      if (c.t === minT) {
        if (consume(gens[i], c)) return;
        mes = [...mes, ...c.mes];
      }
      const dur = Math.min(...cs.map(({t}) => t - minT));
      yield [mes, dur];
    }
  }
}

export const fromSeqItems = <T>(srcs: SeqItem<T>[]): SeqGenFunc<T> => function * () {
  yield * srcs;
}

type StepperHS = TimedHS<number>;

export function makeStepSeq<T>(seq: SeqGenFunc<T>, stepper: StepperHS, step: number = 1/16): TimedHS<T[]> {
  const gen = seq();
  const res: TimedHS<T[]> = new HS();
  const cc: ConsumeCtx<T> = {mes: [], t: 0};
  let ct = 0;
  let done = false;
  stepper.subscribe(([dur, t]) => {
    const dt = cc.t - ct;
    while (dt < step) {
      done = consume(gen, cc);
      if (!done) {
        res.send([cc.mes, t + (cc.t - ct) * dur / step]);
      }
    }
    ct += step;
  });

  return res;
}
