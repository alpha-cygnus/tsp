import React, {createContext, useContext, useEffect, useMemo} from 'react';

import {Observable, Subscriber, pipe, EMPTY, from, merge} from 'rxjs';
import {filter, map, concatAll} from 'rxjs/operators';

import {Time, Timed, Clock, MidiEvent, ParamEvent, peCancel, peLinear, peValue, MidiOn, isTriggerOff, isTriggerOn} from './evs';

export type TimedObs<V> = Observable<Timed<V>>;

export type MidiEvents = TimedObs<MidiEvent>;

export type ParamEvents = TimedObs<ParamEvent>;

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

export type MidiToParamEvents = (midis: MidiEvents) => ParamEvents;

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

export class AudioClock implements Clock {
  ctx: AudioContext;
  lag: number;
  constructor (ctx: AudioContext, lag: number = 0) {
    this.ctx = ctx;
    this.lag = lag;
  }
  now() {
    return this.ctx.currentTime * 1000 + this.lag;
  }
}

