import {createContext, useContext} from 'react';

import {AudioIn} from './types';


export const defAudioCtx = new AudioContext({
  latencyHint: "playback",
});

export const ACtx = createContext(defAudioCtx);

export const NodeInContext = createContext<AudioIn | null>(null);

export const useNodeIn = () => useContext(NodeInContext);

export function useACtx() {
  return useContext(ACtx);
}
