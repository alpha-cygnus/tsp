import {useEffect, useMemo, useRef} from 'react';

import { useSNew } from '../hs/hooks';
import {Timed} from '../common/types';
import {MidiEvent} from '../midi/types';

import {RootContextData, RootCtx} from './ctx';


type TSPRootProps = {
  actx?: BaseAudioContext;
  lag?: number;
  children: any;
}

export function TSPRoot({actx: a, lag: l, children}: TSPRootProps) {
  const midiEvents = useSNew<Timed<MidiEvent>>();

  const actxRef = useRef(a || new AudioContext({
    latencyHint: 'playback',
  }));

  const data: RootContextData = useMemo((): RootContextData => {
    const lag: number = l != null && l >= 0 ? l : 0.01;
    return {
      actx: actxRef.current,
      lag,
      midiEvents,
    };
  }, [l, midiEvents]);

  useEffect(() => {
    const actx = actxRef.current;
    if (!(actx instanceof AudioContext)) return;
    if (actx.state !== 'suspended') return;

    const resume = () => {
      actx.resume();
    };
    let clean = false;
    const cleanUp = () => {
      if (clean) return;
      document.removeEventListener('mousemove', resume);
      document.removeEventListener('keydown', resume);
      clean = true;
    }

    document.addEventListener('mousemove', resume);
    document.addEventListener('keydown', resume);
    
    actx.addEventListener('statechange', () => {
      if (actx.state === 'running') cleanUp();
    });

    return cleanUp;
  }, []);

  return (
    <RootCtx.Provider value={data}>
      {children}
    </RootCtx.Provider>
  )
}
