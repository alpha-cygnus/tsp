import {useCallback, useEffect, useMemo, useState} from 'react';
import { styled } from '@stitches/react'; 

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


const isWhite = (n: number): boolean => {
  n = n % 12;
  return Boolean(n % 2) === (n > 4);
}

const PianoKeyDiv = styled('div', {
  border: '1px solid black',
  borderBottomLeftRadius: 4,
  borderBottomRightRadius: 4,
  cursor: 'pointer',
  variants: {
    color: {
      white: {
        height: 100,
        background: 'white',
        width: 38,
      },
      black: {
        height: 80,
        background: 'black',
        width: 22,
        pointerEvents: 'all',
      },
    },
    down: {
      true: {
      },
    },
  },
  compoundVariants: [
    {
      color: 'black',
      down: true,
      css: {
        backgroundColor: 'blue',
        borderColor: 'blue',
      },
    },
    {
      color: 'white',
      down: true,
      css: {
        backgroundColor: 'yellow',
      },
    },
  ]
})

type PianoKeyProps = {
  nn: number;
  notes: number[];
}

function PianoKey({nn, notes}: PianoKeyProps) {
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
    <PianoKeyDiv
      color={isWhite(nn) ? 'white' : 'black'}
      down={notes.includes(nn)}
      onMouseDown={() => setClicked(true)}
    >{' '}</PianoKeyDiv>
  );
}

const FlexRowDiv = styled('div', {
  display: 'flex',
  flexDirection: 'row',
});

const PianoTopDiv = styled(FlexRowDiv, {
  position: 'absolute',
  pointerEvents: 'none',
});

const PianoBottomDiv = styled(FlexRowDiv, {
});

type PianoProps = {
  from: number;
  to: number;
};

const PianoSepDiv = styled('div', {
  variants: {
    wide: {
      true: {
        width: 24,
      },
      false: {
        width: 22,
      },
    },
  },
});

const PianoDiv = styled('div', {
  position: 'relative',
});

export function Piano({from, to}: PianoProps) {
  const notes = useMidiNoteSet();

  const nns = useMemo(() => {
    const result: number[] = [];
    for (let n = from; n <= to; n++) result.push(n);
    return result;
  }, [from, to]);

  return (
    <PianoDiv>
      <PianoTopDiv>
        {nns.map((n) => {
          if (isWhite(n)) return <PianoSepDiv wide={n % 12 <= 4} />;
          return <PianoKey key={n} nn={n} notes={notes} />;
        })}
      </PianoTopDiv>
      <PianoBottomDiv>
        {nns.filter(isWhite).map((n) => <PianoKey key={n} nn={n} notes={notes} />)}
      </PianoBottomDiv>
    </PianoDiv>
  )
}
