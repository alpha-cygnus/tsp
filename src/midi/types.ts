import {TimedHS} from '../hs/types';

export interface MidiEvent {
  ch: number;
}

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

export class MidiOff extends MidiEventBase {
  note: number;
  vel: number;
  
  constructor (ch: number, note: number, vel: number) {
    super(ch);
    this.note = note;
    this.vel = vel;
  }
}

export type MidiEvents = TimedHS<MidiEvent>;
