import {useCallback, useEffect, useMemo, useState} from 'react';
import cs from 'classnames';

import { MidiEvent, midiOff, MidiOff, midiOn, MidiOn } from './types';

import {useMidiEvents, useRootCtx, RootCtx, useSendMidi} from '../root/ctx';
import {useSListen, useSTFilter} from '../hs/hooks';

import './midi.scss';


type MidiFilterProps = {
  filter: (me: MidiEvent) => boolean;
  children: any;
};

export function MidiFilter({filter, children}: MidiFilterProps) {
  const midis = useMidiEvents();
  const newEvents = useSTFilter(midis, filter);
  const rctx = useRootCtx();
  const newCtx = useMemo(() => ({
    ...rctx,
    midiEvents: newEvents,
  }), [rctx, newEvents]);
  return <RootCtx.Provider value={newCtx}>{children}</RootCtx.Provider>;
}

export function MidiChannel({ch, children}: {ch: number; children: any}) {
  const filter = useCallback((me: MidiEvent): boolean => {
    return me.ch === ch;
  }, [ch]);
  return <MidiFilter filter={filter}>
    {children}
  </MidiFilter>;
}

function useMidiNoteSet() {
  const midis = useMidiEvents();

  const [notes, setNotes] = useState<number[]>([])

  useSListen(midis, useCallback(([me]) => {
    if (me instanceof MidiOn) {
      setNotes((ns) => [...ns, me.note]);
    }
    if (me instanceof MidiOff) {
      setNotes((ns) => ns.filter((n) => n !== me.note));
    }
  }, []));

  useEffect(() => {
    console.log('notes', notes);
  }, [notes]);

  return notes;
}

type PianoKeyProps = {
  nn: number;
  cls: string;
  notes: number[];
}

function PianoKey({nn, cls, notes}: PianoKeyProps) {
  const send = useSendMidi();

  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (!clicked) return;
    send(midiOn(0, nn, 100));

    const up = () => {
      send(midiOff(0, nn, 100));
      setClicked(false);
    };

    document.addEventListener('mouseup', up);
    return () => {
      document.removeEventListener('mouseup', up);
    }
  }, [clicked]);

  return (
    <div
      className={cs(
        'piano-key',
        cls,
        notes.includes(nn) ? 'down' : null,
      )}
      onMouseDown={() => setClicked(true)}
    >
      {' '}
    </div>
  );
}

type PianoOctaveProps = {
  oct: number;
  notes: number[];
};

export function PianoOctave({oct, notes}: PianoOctaveProps) {
  useEffect(() => {
    console.log(oct);
  }, [oct]);

  return (
    <div className="piano-octave">
      <div className="piano-blacks">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => {
          if (Boolean(n % 2) === (n > 4)) return <div className={cs('piano-key-spacer', n > 4 ? 'narrow' : 'wide')}>{' '}</div>;
          return <PianoKey key={n} nn={n + oct * 12} notes={notes} cls="black" />;
        })}
      </div>
      <div className="piano-whites">
        {[0, 2, 4, 5, 7, 9, 11].map((n) => (
          <PianoKey
            cls="white"
            nn={n + oct * 12}
            key={n}
            notes={notes}
          />
        ))}
      </div>
    </div>
  )
}

type PianoProps = {
  octaves: number;
};

export function Piano({octaves}: PianoProps) {
  const notes = useMidiNoteSet();

  const os = useMemo(() => {
    const res: number[] = [];
    const o1 = Math.floor(5 - octaves / 2)
    for (let o = o1; o < o1 + octaves; o++) res.push(o);
    return res;
  }, [octaves]);

  return (
    <div className="piano">
      {os.map((o) => <PianoOctave key={o} oct={o} notes={notes} />)}
    </div>
  )
}
