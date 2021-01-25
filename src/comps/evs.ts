import {ParamEvent, MidiEvent} from './types';

export class MidiEventBase implements MidiEvent {
  ch: number;

  constructor (ch: number) {
    this.ch = ch;
  }
}

export class MidiOn extends MidiEventBase {
  note: number;
  vel: number;
  
  constructor (ch: number, note: number, vel: number) {
    super(ch);
    this.note = note;
    this.vel = vel;
  }
}

export const midiOn = (ch: number, note: number, vel: number) => new MidiOn(ch, note, vel);

export class MidiOff extends MidiEventBase {
  note: number;
  vel: number;
  
  constructor (ch: number, note: number, vel: number) {
    super(ch);
    this.note = note;
    this.vel = vel;
  }
}

export const midiOff = (ch: number, note: number, vel: number) => new MidiOff(ch, note, vel);

export class PEValue implements ParamEvent {
  v: number;
  constructor (v: number) {
    this.v = v;
  }
  apply(param: AudioParam, t: number) {
    param.setValueAtTime(this.v, t);
  }
}

export const peValue = (v: number) => new PEValue(v);

export class PELinear implements ParamEvent {
  v: number;
  constructor (v: number) {
    this.v = v;
  }
  apply(param: AudioParam, t: number) {
    param.linearRampToValueAtTime(this.v, t);
  }
}

export const peLinear = (v: number) => new PELinear(v);

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
}

export const peTarget = (v: number, tc: number) => new PETarget(v, tc);

export class PECancel implements ParamEvent {
  apply(param: AudioParam, t: number) {
    // if (param.cancelAndHoldAtTime)
    param.cancelAndHoldAtTime(t);
    // else
    param.cancelScheduledValues(t);
  }
}

export const peCancel = () => new PECancel();

export function isTriggerOn(me: MidiEvent): boolean {
  if (me instanceof MidiOn) return true;
  return false;
}

export function isTriggerOff(me: MidiEvent): boolean {
  if (me instanceof MidiOff) return true;
  return false;
}
