import React, {useMemo} from 'react';

import {MidiEvent, Time} from './types';

import {createSender} from './obs';

import {AudioClock} from './au';

import {useACtx, MidiEventsContext, MidiSenderContext} from './ctx';

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

