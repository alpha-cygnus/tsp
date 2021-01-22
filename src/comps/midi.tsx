import React, {useEffect, createContext, useContext, useMemo} from 'react';

import {EMPTY} from 'rxjs';

import {MidiEvent, ParamEvent, Time} from './evs';

import {MidiEvents, ParamEvents, MidiToParamEvents, AudioClock, createSender} from './obs';

import {useACtx} from './au';

export const MidiEventsContext = createContext<MidiEvents>(EMPTY);

export const MidiSenderContext = createContext<(me: MidiEvent) => void>(() => {});

function useMidiToParam(param: AudioParam, midiToParam: MidiToParamEvents) {
  const midis = useContext(MidiEventsContext);

  useEffect(() => {
    const subscription = midis.pipe(midiToParam).subscribe(([pe, t]) => {
      pe.apply(param, t / 1000);
    });
    return () => subscription.unsubscribe();
  }, [param, midis]);
}

export function MidiRoot({lag = 0, children}: {lag: Time, children: any}) {
  const ctx = useACtx();

  const clock = useMemo(() => new AudioClock(ctx, lag), [ctx, lag]);

  const [midis, send] = useMemo(() => createSender<MidiEvent>(clock), [clock]);

  return <MidiSenderContext.Provider value={send}>
    <MidiEventsContext.Provider value={midis}>
      {children}
    </MidiEventsContext.Provider>
  </MidiSenderContext.Provider>
}
