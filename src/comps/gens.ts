import {createContext, useContext, useEffect} from 'react';

import {Time, Timed, Clock, MidiEvent, ParamEvent} from './types';

import {peCancel, peLinear, peValue, MidiOn, isTriggerOff, isTriggerOn} from './evs';

type TimedIterable<V> = AsyncIterable<Timed<V>>;

type TimedProducer<V> = {
  (): TimedIterable<V>;
}

type Triggered<V> = TimedProducer<V> & {
  send: (v: V) => void;
};


export function triggered<V>(clock: Clock): Triggered<V> {
  if (!clock) throw new Error('where is my clock?');

  let resolves: Array<(v: V) => void> = [];

  async function * iter() {
    for (;;) {
      const v = await new Promise<V>((resolve) => {
        resolves.push(resolve);
      })
      const tv: Timed<V> = [v, clock.now()];
      yield tv;
    }
  }
  iter.send = (v: V) => {
    for (const res of resolves) res(v);
    resolves = [];
  };
  return iter;
}

export async function * empty(): TimedIterable<any> {
  await new Promise(() => {});
}

export const map = <A, B>(f: (a: A) => B | Promise<B>) => async function * (src: TimedIterable<A>): TimedIterable<B> {
  for await (const [a, t] of src) {
    const b = await f(a);
    yield [b, t];
  }
}

export const filter = <V>(f: (v: V, t: Time) => boolean) => async function * (src: TimedIterable<V>): TimedIterable<V> {
  for await (const [v, t] of src) {
    if (f(v, t)) yield [v, t];
  }
}


export async function forEach<V>(f: (v: V, t: Time) => void, src: TimedIterable<V>) {
  for await (const [v, t] of src) f(v, t);
}


const compose = <A, B, C>(fab: (a: A) => B, fbc: (b: B) => C) => (a: A): C => (fbc(fab(a)));


type MidiEvents = TimedIterable<MidiEvent>;

type ParamEvents = TimedIterable<ParamEvent>;


export const midiToLinADSR = (a: number, d: number, s: number, r: number) => async function *(midis: MidiEvents): ParamEvents {
    for await (const [me, t] of midis) {
      if (isTriggerOn(me)) {
        yield [peCancel(), t];
        yield [peLinear(1), t + a];
        yield [peLinear(s), t + a + d];
      }
      if (isTriggerOff(me)) {
        yield [peCancel(), t];
        yield [peLinear(0), t + r];
      }
    }
  }
  
  const filterMidiOn = filter((me: MidiEvent) => (me instanceof MidiOn));
  
  export const midiToDetune = compose(
    filterMidiOn,
    map((me: MidiEvent): ParamEvent => peValue(((me as MidiOn).note - 69)*100)),
  );
  
  export const midiToFrequency = compose(
    filterMidiOn,
    map((me: MidiEvent): ParamEvent => peValue(Math.pow(2, ((me as MidiOn).note - 69) / 12)*440)),
  );
  
  class AudioClock implements Clock {
    ctx: AudioContext;
    constructor (ctx: AudioContext) {
      this.ctx = ctx;
    }
    now() {
      return this.ctx.currentTime * 1000;
    }
  }
  
  
  export type MidiEventsContextData = [MidiEvents, (me: MidiEvent) => void];
  
  export const MidiEventsContext = createContext<MidiEventsContextData>([empty(), () => {}]);
  
  export type MidiToParamEvents = (me: MidiEvents) => ParamEvents;
  
  export function useMidiToParam(param: AudioParam, midiToParam: MidiToParamEvents) {
    const [midiEvents] = useContext(MidiEventsContext);
    
    useEffect(() => {
      let stopped = false;
      async function * run() {
        for await (const [pe, t] of midiToParam(midiEvents)) {
          if (stopped) return;
          pe.apply(param, t / 1000);
        }
      }
      run();
      return () => {
        stopped = true;
      };
    }, [param, midiEvents]);
  }
  