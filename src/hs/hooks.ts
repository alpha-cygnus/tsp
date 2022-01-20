import {useCallback, useEffect, useRef, useState} from 'react';

import {HS, HSOptions, defaultOptions, Listener} from './types';

export function use$new<T>(options: HSOptions = defaultOptions): HS<T> {
  const [s] = useState(new HS<T>(options));
  return s;
}

export function use$listen<T>(h$: HS<T>, listen: Listener<T>) {
  useEffect(() => h$.subscribe(listen), [h$, listen]);
}

export function use$flatMap<A, B>(src$: HS<A>, fmap: (a: A) => B[]) {
  const re$ = use$new<B>();
  
  const listen = useCallback((a: A) => {
    const bs = fmap(a);
    for (const b of bs) {
      re$.send(b);
    }
  }, [fmap, re$]);
  
  use$listen(src$, listen);
  
  return re$;
}

export function use$map<A, B>(src$: HS<A>, map: (a: A) => B) {
  return use$flatMap(src$, useCallback((a: A) => [map(a)], []));
}

export function use$filter<A>(src$: HS<A>, filter: (a: A) => boolean) {
  return use$flatMap(src$, useCallback((a: A) => filter(a) ? [a] : [], []));
}

export function use$changes<T>(v: T) {
  const re$ = use$new<T>();

  useEffect(() => {
    re$.send(v);
  }, [v, re$]);

  return re$;
}

type Arr = any[];
type HSList<TS extends Arr> = {[T in keyof TS]: HS<T>};

export function use$combine<TS extends Arr, R>(
  hs$: HSList<TS>,
  combine: (...args: TS) => R,
  defs: TS,
): HS<R> {
  const r$ = use$new<R>();
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
  }, [hs$, combine]);

  return r$;
}

