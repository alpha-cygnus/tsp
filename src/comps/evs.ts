import {useEffect, createContext, useContext} from 'react';

export class MidiEvent {
  ch: number;

  constructor (ch: number) {
    this.ch = ch;
  }
}

export class MidiOn extends MidiEvent {
  note: number;
  vel: number;
  
  constructor (ch: number, note: number, vel: number) {
    super(ch);
    this.note = note;
    this.vel = vel;
  }
}

export class MidiOff extends MidiEvent {
  note: number;
  vel: number;
  
  constructor (ch: number, note: number, vel: number) {
    super(ch);
    this.note = note;
    this.vel = vel;
  }
}

export class ParamEvent {
  apply(param: AudioParam, t: number) {
  }
}

export class PEValue extends ParamEvent {
  v: number;
  constructor (v: number) {
    super();
    this.v = v;
  }
  apply(param: AudioParam, t: number) {
    param.setValueAtTime(this.v, t);
  }
}

export const peValue = (v: number) => new PEValue(v);

export class PELinear extends ParamEvent {
  v: number;
  constructor (v: number) {
    super();
    this.v = v;
  }
  apply(param: AudioParam, t: number) {
    param.linearRampToValueAtTime(this.v, t);
  }
}

export const peLinear = (v: number) => new PELinear(v);

export class PECancel extends ParamEvent {
  apply(param: AudioParam, t: number) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else param.cancelScheduledValues(t);
  }
}

export const peCancel = () => new PECancel();

export type Time = number;

export type Timed<V> = [V, Time];

export interface Clock {
  now(): Time;
}

export function isTriggerOn(me: MidiEvent): boolean {
  if (me instanceof MidiOn) return true;
  return false;
}

export function isTriggerOff(me: MidiEvent): boolean {
  if (me instanceof MidiOff) return true;
  return false;
}
