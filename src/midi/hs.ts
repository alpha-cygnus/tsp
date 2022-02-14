import {Timed} from '../common/types';
import {TimedHS} from '../hs/types';
import {useSFlatMap} from '../hs/hooks';
import {MidiEvent} from './types';
import {isTriggerOff, isTriggerOn} from './utils';

const trigFmap = ([me, t]: Timed<MidiEvent>): Timed<boolean>[] => {
  if (isTriggerOff(me)) return [[false, t]];
  if (isTriggerOn(me)) return [[true, t]];
  return [];
};

export function useSOnOff(midi$: TimedHS<MidiEvent>): TimedHS<boolean> {
  return useSFlatMap(midi$, trigFmap);
}
