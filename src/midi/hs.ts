import {Timed} from '../common/types';
import {TimedHS} from '../hs/types';
import {use$flatMap} from '../hs/hooks';
import {MidiEvent} from './types';
import {isTriggerOff, isTriggerOn} from './utils';

const trigFmap = ([me, t]: Timed<MidiEvent>): Timed<boolean>[] => {
  if (isTriggerOff(me)) return [[false, t]];
  if (isTriggerOn(me)) return [[true, t]];
  return [];
};

export function use$onOff(midi$: TimedHS<MidiEvent>): TimedHS<boolean> {
  return use$flatMap(midi$, trigFmap);
}
