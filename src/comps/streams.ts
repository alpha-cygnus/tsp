import xs, {Listener, Stream} from 'xstream';
import memoize from 'lodash/memoize';

import {
  Timed,
  Clock,
  TimedObs,
  ParamEvents,
  MidiToParamEvents,
  ParamEvent,
} from './types';

import {
  peCancel,
  peLinear,
  peTarget,
  isTriggerOff,
  isTriggerOn,
} from './evs';

export function createSender<V>(clock: Clock): [TimedObs<V>, (v: V) => void] {
  let theSub: Listener<Timed<V>>;
  const obs = xs.create<Timed<V>>({
    start(listener) {
      theSub = listener;
    },
    stop() {}
  });

  const send = (v: V) => {
    if (!theSub) {
      console.error('no theSub!');
      return;
    }
    theSub.next([v, clock.now()]);
  }
  return [obs, send];
}

export const paramEvents = (...ps: Array<Timed<ParamEvent>>): ParamEvents => xs.from(ps);

export const linADSR = memoize(
  (a: number, d: number, s: number, r: number): MidiToParamEvents => (midis) => {
    return midis
      .map(([me, t]) => {
        if (isTriggerOn(me)) {
          return paramEvents(
            [peCancel(), t],
            [peLinear(1), t + a],
            [peLinear(s), t + a + d],
          );
        }
        if (isTriggerOff(me)) {
          return paramEvents(
            [peCancel(), t],
            [peLinear(0), t + r],
          );
        }
        return xs.empty();
      })
      .flatten();
  },
  (...args) => args.join(','),
);

export const adsr = memoize(
  (a: number, d: number, s: number, r: number): MidiToParamEvents => (midis) => {
    return midis
      .map(([me, t]) => {
        if (isTriggerOn(me)) {
          return paramEvents(
            [peCancel(), t],
            [peTarget(1, a / 4), t],
            [peTarget(s, d / 4), t + d],
          );
        }
        if (isTriggerOff(me)) {
          return paramEvents(
            [peCancel(), t],
            [peTarget(0, r / 4), t],
          );
        }
        return xs.empty();
      })
      .flatten();
  },
  (...args) => args.join(','),
);
