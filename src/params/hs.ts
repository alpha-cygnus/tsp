import {useCallback} from 'react';

import {Timed} from '../common/types';
import {TimedHS} from '../hs/types';
import {use$flatMap} from '../hs/hooks';
import {ParamEvent, peCancel, peTarget} from '../params/types';

export function use$adsr(
  trig$: TimedHS<boolean>,
  a: number,
  d: number,
  s: number,
  r: number,
  max: number = 1,
  del: number = 0,
) {
  return use$flatMap(trig$, useCallback(([v, t]: Timed<boolean>): Timed<ParamEvent>[] => {
    if (v) {
      return  [
        [peCancel(), t + del],
        [peTarget(max, a / 4), t + del],
        [peTarget(s * max, d / 4), t + d + del],
      ];
    } else {
      return [
        [peCancel(), t],
        [peTarget(0, r / 4), t],
      ]
    }
  }, [a, d, s, r]));
}
