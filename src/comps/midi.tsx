import React, {useMemo, useState, useEffect} from 'react';

import {MidiEvent, Time} from './types';

import {createSender} from './obs';

import {AudioClock} from './au';

import {
  useACtx,
  MidiEventsContext,
  MidiSenderContext,
  useMidiSender,
} from './ctx';

import {midiOn, midiOff} from './evs';

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

export function TestSender() {
  const send = useMidiSender();
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (pressed) send(midiOn(0, 60, 100));
    else send(midiOff(0, 60, 100));
  }, [send, pressed]);

  <div
    className={`test-sender ${pressed ? 'pressed' : ''}`}
    onMouseDown={() => setPressed(true)}
    onMouseUp={() => setPressed(false)}
  >
    PRESS ME
  </div>

  return null;
}
