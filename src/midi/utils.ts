import {MidiEvent, MidiOn, MidiOff} from './types';

export function isTriggerOn(me: MidiEvent): boolean {
  if (me instanceof MidiOn) return true;
  return false;
}

export function isTriggerOff(me: MidiEvent): boolean {
  if (me instanceof MidiOff) return true;
  return false;
}
