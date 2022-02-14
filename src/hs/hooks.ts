import {useCallback, useEffect, useRef, useState} from 'react';

import {HS, HSOptions, defaultOptions, Listener} from './types';

export function useSNew<T>(options: HSOptions = defaultOptions): HS<T> {
  const [s] = useState(new HS<T>(options));
  return s;
}

export function useSListen<T>(h$: HS<T>, listen: Listener<T>) {
  useEffect(() => h$.subscribe(listen), [h$, listen]);
}

export function useSFlatMap<A, B>(src$: HS<A>, fmap: (a: A) => B[]) {
  const re$ = useSNew<B>();
  
  const listen = useCallback((a: A) => {
    const bs = fmap(a);
    for (const b of bs) {
      re$.send(b);
    }
  }, [fmap, re$]);
  
  useSListen(src$, listen);
  
  return re$;
}

export function useSMap<A, B>(src$: HS<A>, map: (a: A) => B) {
  return useSFlatMap(src$, useCallback((a: A) => [map(a)], [map]));
}

export function useSFilter<A>(src$: HS<A>, filter: (a: A) => boolean) {
  return useSFlatMap(src$, useCallback((a: A) => filter(a) ? [a] : [], [filter]));
}

export function useSChanges<T>(v: T) {
  const re$ = useSNew<T>();

  useEffect(() => {
    re$.send(v);
  }, [v, re$]);

  return re$;
}

type Arr = any[];
type HSList<TS extends Arr> = {[T in keyof TS]: HS<T>};

export function useSCombine<TS extends Arr, R>(
  hs$: HSList<TS>,
  combine: (...args: TS) => R,
  defs: TS,
): HS<R> {
  const r$ = useSNew<R>();
  const vs = useRef<TS>([...defs] as TS);

  useEffect(() => {
    const listen = (i: number) => (v: any) => {
      vs.current[i] = v;
      r$.send(combine(...vs.current));
    }
    const unsubs = hs$.map((h$, i) => h$.subscribe(listen(i)));
    return () => {
      for (const unsub of unsubs) unsub();
    }
  }, [hs$, combine, r$]);

  return r$;
}

