import xs, {Listener} from 'xstream';
import memoize from 'lodash/memoize';

import {
  Time,
  Timed,
  Clock,
  TimedObs,
  ParamEvents,
  MidiToParamEvents,
  ParamToParamEvents,
  ParamEvent,
  MidiToMidiEvents,
  Stream,
} from './types';

import {
  peCancel,
  peTarget,
  peValue,
  isTriggerOff,
  isTriggerOn,
  MidiOn,
} from './events';

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

type UnaryFunction<A, B> = (a: A) => B;

/* tslint:disable:max-line-length */
export function pipe<T, A, B>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>): UnaryFunction<T, B>;
export function pipe<T, A, B, C>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>): UnaryFunction<T, C>;
export function pipe<T, A, B, C, D>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>): UnaryFunction<T, D>;
export function pipe<T, A, B, C, D, E>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>, fn5: UnaryFunction<D, E>): UnaryFunction<T, E>;
export function pipe<T, A, B, C, D, E, F>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>, fn5: UnaryFunction<D, E>, fn6: UnaryFunction<E, F>): UnaryFunction<T, F>;
export function pipe<T, A, B, C, D, E, F, G>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>, fn5: UnaryFunction<D, E>, fn6: UnaryFunction<E, F>, fn7: UnaryFunction<F, G>): UnaryFunction<T, G>;
export function pipe<T, A, B, C, D, E, F, G, H>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>, fn5: UnaryFunction<D, E>, fn6: UnaryFunction<E, F>, fn7: UnaryFunction<F, G>, fn8: UnaryFunction<G, H>): UnaryFunction<T, H>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>, fn5: UnaryFunction<D, E>, fn6: UnaryFunction<E, F>, fn7: UnaryFunction<F, G>, fn8: UnaryFunction<G, H>, fn9: UnaryFunction<H, I>): UnaryFunction<T, I>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>, fn3: UnaryFunction<B, C>, fn4: UnaryFunction<C, D>, fn5: UnaryFunction<D, E>, fn6: UnaryFunction<E, F>, fn7: UnaryFunction<F, G>, fn8: UnaryFunction<G, H>, fn9: UnaryFunction<H, I>, ...fns: UnaryFunction<any, any>[]): UnaryFunction<T, {}>;
/* tslint:enable:max-line-length */

export function pipe(...fns: Array<UnaryFunction<any, any>>): UnaryFunction<any, any> {
  return (input) => fns.reduce((prev: any, fn) => fn(prev), input);
}


type StreamTrans<A, B> = (a: Stream<A>) => Stream<B>;

export const filter = <A>(fn: (a: A) => boolean): StreamTrans<A, A> => (s) => s.filter(fn);
export const filterVal = <A>(fn: (a: A) => boolean): StreamTrans<Timed<A>, Timed<A>> => filter(([v]) => fn(v));
export const map = <A, B>(fn: (a: A) => B): StreamTrans<A, B> => (s) => s.map(fn);
export const mapVal = <A, B>(fn: (a: A) => B): StreamTrans<Timed<A>, Timed<B>> => map(([v, t]) => [fn(v), t]);
export const mapTime = <V>(fn: (t: Time) => Time): StreamTrans<Timed<V>, Timed<V>> => map(([v, t]) => [v, fn(t)]);

export const noteToDetune: MidiToParamEvents = pipe(
  filterVal((me) => me instanceof MidiOn),
  mapVal((me) => peValue(((me as MidiOn).note - 69) * 100) as ParamEvent),
);

export const noteToFrequency: MidiToParamEvents = pipe(
  filterVal((me) => me instanceof MidiOn),
  mapVal((me) => peValue((Math.pow(2, (me as MidiOn).note - 69) / 12) * 440) as ParamEvent),
);

export const midiChannel = (channel: number): MidiToMidiEvents => filterVal((me) => me.ch === channel);

export const delay = (dt: number): ParamToParamEvents => mapTime((t) => t + dt);

export const randomDelay = (dt: number): MidiToMidiEvents => mapTime((t) => t + Math.random()*dt);

export const mul = (v: number): ParamToParamEvents => mapVal((pe) => pe.mul(v));

// export function clock(): Stream<Time> {
//   return null;
// }