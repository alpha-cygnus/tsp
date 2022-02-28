import {useCallback} from 'react';

import {Timed} from '../common/types';
import {TimedHS} from '../hs/types';
import {useSFlatMap} from '../hs/hooks';
import {ParamEvent} from '../params/types';
import {cancel, target} from '../params/events';

export function useSADSR(
  trig$: TimedHS<boolean>,
  a: number,
  d: number,
  s: number,
  r: number,
  max: number = 1,
  del: number = 0,
) {
  return useSFlatMap(trig$, useCallback(([v, t]: Timed<boolean>): Timed<ParamEvent>[] => {
    if (v) {
      return  [
        [cancel(), t + del],
        [target(max, a / 4), t + del],
        [target(s * max, d / 4), t + d + del],
      ];
    } else {
      return [
        [cancel(), t],
        [target(0, r / 4), t],
      ]
    }
  }, [a, d, s, r, max, del]));
}
