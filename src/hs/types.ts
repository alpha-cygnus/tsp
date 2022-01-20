import {Timed} from '../common/types';

export type Listener<T> = (v: T) => void;
export type Unsub = () => void;
export type HSOptions = {};

export const defaultOptions: HSOptions = {};

export class HS<T> {
  _subs: Set<Listener<T>> = new Set();

  _options: HSOptions;

  constructor(options: HSOptions = defaultOptions) {
    this._options = options;
  }
  subscribe(listener: Listener<T>): Unsub {
    this._subs.add(listener);
    return () => {
      this._subs.delete(listener);
    }
  }
  send(v: T) {
    for (const l of this._subs) {
      l(v);
    }
  }
}

export type TimedHS<T> = HS<Timed<T>>;
