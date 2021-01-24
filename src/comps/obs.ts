import {Observable, Subscriber, from, merge} from 'rxjs';
import {filter, map, concatAll} from 'rxjs/operators';

import {
  Timed,
  Clock,
  MidiEvent,
  ParamEvent,
  TimedObs,
  ParamEvents,
  MidiToParamEvents,
} from './types';

import {
  peCancel,
  peLinear,
  isTriggerOff,
  isTriggerOn,
} from './evs';

export function createSender<V>(clock: Clock): [TimedObs<V>, (v: V) => void] {
  let theSub: Subscriber<Timed<V>>;
  const obs = new Observable<Timed<V>>((sub) => {
    theSub = sub;
  });
  const send = (v: V) => {
    theSub.next([v, clock.now()]);
  }
  return [obs, send];
}

export const timedFrom = <V>(vs: Array<Timed<V>>): TimedObs<V> => {
  return from(vs);
}

export const linADSR = (a: number, d: number, s: number, r: number): MidiToParamEvents => (midis) => {
  const ads = midis.pipe(
    filter(([me]) => isTriggerOn(me)),
    map<Timed<MidiEvent>, ParamEvents>(([_, t]) => timedFrom<ParamEvent>([
      [peCancel, t],
      [peLinear(1), t + a],
      [peLinear(s), t + a + d],
    ])),
    concatAll(),
  );
  const rs = midis.pipe(
    filter(([me]) => isTriggerOff(me)),
    map<Timed<MidiEvent>, ParamEvents>(([_, t]) => timedFrom<ParamEvent>([
      [peCancel, t],
      [peLinear(0), t + r],
    ])),
    concatAll(),
  );
  return merge(ads, rs);
}
