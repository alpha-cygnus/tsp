import React, {useMemo, useState, useEffect, useRef} from 'react';

import {MidiEvent, Time, Timed} from './types';

import {createSender} from './xs';

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

  useEffect(() => {
    const sub = midis.subscribe({
      next: ([me, t]: Timed<MidiEvent>) => {
       console.log('ME', me, t);
      }
    });
    return () => sub.unsubscribe();
  }, [midis]);

  return <MidiSenderContext.Provider value={send}>
    <MidiEventsContext.Provider value={midis}>
      {children}
    </MidiEventsContext.Provider>
  </MidiSenderContext.Provider>
}

export function TestSender() {
  const send = useMidiSender();
  const [pressed, setPressed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (pressed) {
      console.log('ON!');
      send(midiOn(0, 60, 100));
    } else {
      if (first.current) {
        first.current = false;
        return;
      }
      console.log('OFF!');
      send(midiOff(0, 60, 100));
    }
  }, [send, pressed]);

  return <div
    className={`test-sender ${pressed ? 'pressed' : ''}`}
    onMouseDown={() => setPressed(true)}
    onMouseUp={() => setPressed(false)}
  >
    PRESS ME
  </div>
}
