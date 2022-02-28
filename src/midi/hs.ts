import {Timed} from '../common/types';
import {TimedHS} from '../hs/types';
import {useSFlatMap} from '../hs/hooks';
import {ParamEvents, ParamEvent} from '../params/types';
import * as PE from '../params/events';
import {MidiEvent, MidiEvents, MidiOn} from './types';
import {isTriggerOff, isTriggerOn} from './utils';

const trigFmap = ([me, t]: Timed<MidiEvent>): Timed<boolean>[] => {
  if (isTriggerOff(me)) return [[false, t]];
  if (isTriggerOn(me)) return [[true, t]];
  return [];
};

export function useSOnOff(midi$: MidiEvents): TimedHS<boolean> {
  return useSFlatMap(midi$, trigFmap);
}

const detuneFmap = ([me, t]: Timed<MidiEvent>): Timed<ParamEvent>[] => {
  if (me instanceof MidiOn) return [[PE.value((me.note - 69) * 100), t]];
  return [];
}

export function useDetuneFromNotes(midi$: MidiEvents): ParamEvents {
  return useSFlatMap(midi$, detuneFmap);
}
