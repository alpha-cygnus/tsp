import {useCallback, useMemo} from 'react';

import { MidiEvent } from './types';

import {useMidiEvents, useRootCtx, RootCtx} from '../root/ctx';
import {useSTFilter} from '../hs/hooks';

import './midi.css';

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

type PianoOctaveProps = {
  oct: number;
};

export function PianoOctave({oct}: PianoOctaveProps) {
  return (
    <div className="piano-octave">
      <div className="piano-chromas">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
          <div
            className={Boolean(n % 2) === n > 4 ? `piano-key white top${n > 4 ? 2 : 1}` : 'piano-key black'}
          >
            {}
          </div>
        ))}
      </div>
      <div className="piano-whites">
        {[0, 2, 4, 5, 7, 9, 11].map((n) => (
          <div
            className="piano-key white bottom"
          >
            {}
          </div>
        ))}
      </div>
    </div>
  )
}

type PianoProps = {
  octaves: number;
};

export function Piano({octaves}: PianoProps) {
  const os = useMemo(() => {
    const res: number[] = [];
    const o1 = Math.floor(5 - octaves / 2)
    for (let o = o1; o < o1 + octaves; o++) res.push(o);
    return res;
  }, [octaves]);

  return (
    <div className="piano">
      {os.map((o) => <PianoOctave oct={o} />)}
    </div>
  )
}
