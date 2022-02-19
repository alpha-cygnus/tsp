import {createContext, useCallback, useContext} from 'react';
import {MidiEvent, MidiEvents} from '../midi/types';

import {BeatEvents} from './types';


export type RootContextData = {
  actx: BaseAudioContext;
  lag: number;
  midiEvents: MidiEvents;
  sendMidi: (ev: MidiEvent) => void;
  beatEvents: BeatEvents;
  bpm: number;
}

export const RootCtx = createContext<RootContextData | null>(null);

export function useRootCtx(): RootContextData {
  const ctx = useContext(RootCtx);
  if (!ctx) throw new Error('Root context expected');
  return ctx;
}

export function useACtx() {
  const {actx} = useRootCtx();
  return actx;
}

export function useGetTime() {
  const {actx, lag} = useRootCtx();
  return useCallback(() => actx.currentTime + lag, [actx, lag]);
}

export function useSendMidi() {
  const {sendMidi} = useRootCtx();
  return sendMidi;
}

export function useMidiEvents(): MidiEvents {
  const {midiEvents} = useRootCtx();
  return midiEvents;
}

export function useBeatEvents(): BeatEvents {
  const {beatEvents} = useRootCtx();
  return beatEvents;
}