import React, {useMemo, useState, useEffect, useRef} from 'react';
import cs from 'classnames';
import {Chord, Midi} from '@tonaljs/tonal';

import {MidiEvent, Time, Timed, MidiToMidiEvents} from './types';

import {createSender} from './streams';

import {AudioClock} from './audio';

import {
  useACtx,
  MidiEventsContext,
  MidiSenderContext,
  useMidiSender,
  useMidiEvents,
} from './contexts';

import {midiOn, midiOff} from './events';

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

type NoteSenderProps = {
  ch?: number;
  note?: number;
  vel?: number;
  className: string;
  children: any;
};

export function NoteSender({ch = 0, note = 60, className, children}: NoteSenderProps) {
  const send = useMidiSender();
  const [pressed, setPressed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (pressed) {
      console.log('ON!');
      send(midiOn(ch, note, 100));
    } else {
      if (first.current) {
        first.current = false;
        return;
      }
      console.log('OFF!');
      send(midiOff(ch, note, 100));
    }
  }, [send, pressed, ch, note]);

  return <div
    className={cs(className, {pressed})}
    onMouseDown={() => setPressed(true)}
    onMouseUp={() => setPressed(false)}
  >
    {children}
  </div>
}

type ChordSenderProps = {
  ch?: number;
  chord: string;
  vel?: number;
  className: string;
};

export function ChordSender({ch = 0, chord, className}: ChordSenderProps) {
  const send = useMidiSender();
  const [pressed, setPressed] = useState(false);

  const ci = useMemo(() => {
    return Chord.get(chord);
  }, [chord]);

  const midiNotes = useMemo(() => {
    const ns = ci.notes.map((nn) => Midi.toMidi(nn + '4')).filter(Boolean) as number[];
    console.log('chord', ci, ns);
    return ns;
  }, [ci]);

  useEffect(() => {
    if (!pressed) return undefined;

    for (const note of midiNotes) {
      send(midiOn(ch, note, 100));
    }
    return () => {
      for (const note of midiNotes) {
        send(midiOff(ch, note, 100));
      }
    }
  }, [send, pressed, ch, midiNotes]);

  return <div
    className={cs(className, {pressed})}
    onMouseDown={() => setPressed(true)}
    onMouseUp={() => setPressed(false)}
  >
    {chord}
  </div>
}

type MidiFilterProps = {
  filter: MidiToMidiEvents;
  children: any;
};

export function MidiFilter({filter, children}: MidiFilterProps) {
  const midis = useMidiEvents();
  const output = useMemo(() => filter(midis), [filter, midis]);
  return <MidiEventsContext.Provider value={output}>{children}</MidiEventsContext.Provider>;
}


export function Ptn({children}: any) {
  console.log('Ptn:', children);
  return null;
}