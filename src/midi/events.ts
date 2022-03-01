import { MidiOn, MidiOff } from './types';

export const on = (ch: number, note: number, vel: number) => new MidiOn(ch, note, vel);

export const off = (ch: number, note: number, vel: number) => new MidiOff(ch, note, vel);
