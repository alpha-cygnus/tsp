import {createContext, useContext} from 'react';

import xs from 'xstream';

import {AudioIn, MidiEvents, MidiEvent} from './types';

export const defAudioCtx = new AudioContext({
  latencyHint: "playback",
});

export const ACtx = createContext(defAudioCtx);

export const NodeInContext = createContext<AudioIn | null>(null);

export const useNodeIn = () => useContext(NodeInContext);

export const MidiEventsContext = createContext<MidiEvents>(xs.empty());

export const MidiSenderContext = createContext<(me: MidiEvent) => void>(() => {});

export function useACtx() {
  return useContext(ACtx);
}

export function useMidiEvents() {
  return useContext(MidiEventsContext);
}

export function useMidiSender() {
  return useContext(MidiSenderContext);
}