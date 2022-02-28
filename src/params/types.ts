import {TimedHS} from '../hs/types';


export interface ParamEvent {
  apply: (param: AudioParam, t: number) => void;
  mul: (v: number) => ParamEvent;
}

export class PEValue implements ParamEvent {
  v: number;
  constructor (v: number) {
    this.v = v;
  }
  apply(param: AudioParam, t: number) {
    param.setValueAtTime(this.v, t);
  }
  mul(v: number) {
    return new PEValue(this.v * v);
  }
}

export class PELinear implements ParamEvent {
  v: number;
  constructor (v: number) {
    this.v = v;
  }
  apply(param: AudioParam, t: number) {
    param.linearRampToValueAtTime(this.v, t);
  }
  mul(v: number) {
    return new PELinear(this.v * v);
  }
}

export class PETarget implements ParamEvent {
  v: number;
  tc: number;
  constructor (v: number, tc: number) {
    this.v = v;
    this.tc = tc;
  }
  apply(param: AudioParam, t: number) {
    param.setTargetAtTime(this.v, t, this.tc);
  }
  mul(v: number) {
    return new PETarget(this.v * v, this.tc);
  }
}

export class PECancel implements ParamEvent {
  apply(param: AudioParam, t: number) {
    // if (param.cancelAndHoldAtTime)
    param.cancelAndHoldAtTime(t);
    // else
    param.cancelScheduledValues(t);
  }
  mul(_v: number) {
    return this;
  }
}

export type ParamEvents = TimedHS<ParamEvent>;