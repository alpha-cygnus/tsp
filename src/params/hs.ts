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
) {
  return use$flatMap(trig$, useCallback(([v, t]: Timed<boolean>): Timed<ParamEvent>[] => {
    if (v) {
      return  [
        [peCancel(), t],
        [peTarget(1, a / 4), t],
        [peTarget(s, d / 4), t + d],
      ];
    } else {
      return [
        [peCancel(), t],
        [peTarget(0, r / 4), t],
      ]
    }
  }, [a, d, s, r]));
}
