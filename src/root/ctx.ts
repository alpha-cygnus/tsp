import {createContext, useCallback, useContext} from 'react';
import {MidiEvent, MidiEvents} from '../midi/types';

export type RootContextData = {
    actx: BaseAudioContext;
    lag: number;
    midiEvents: MidiEvents;
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
    const {midiEvents} = useRootCtx();
    const getTime = useGetTime();
    return useCallback((evt: MidiEvent, t: number = 0) => {
        if (!t) t = getTime();
        midiEvents.send([evt, t]);
    }, [getTime, midiEvents]);
}

export function useMidiEvents(): MidiEvents {
    const {midiEvents} = useRootCtx();
    return midiEvents;
}
