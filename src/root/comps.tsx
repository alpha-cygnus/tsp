import {useEffect, useMemo, useRef, useState, useCallback} from 'react';

import { useSNew } from '../hs/hooks';
import {Timed} from '../common/types';
import {MidiEvent} from '../midi/types';

import {RootContextData, RootCtx} from './ctx';
import {BeatEvent} from './types';


type TSPRootProps = {
  actx?: BaseAudioContext;
  lag?: number;
  bpm?: number;
  children: any;
}

export function TSPRoot({actx: a, lag: l, bpm = 120, children}: TSPRootProps) {
  const midiEvents = useSNew<Timed<MidiEvent>>();
  const beatEvents = useSNew<Timed<BeatEvent>>();

  const actxRef = useRef(a || new AudioContext({
    latencyHint: 'playback',
  }));

  const lag: number = l != null && l >= 0 ? l : 0.01;

  const sendMidi = useCallback((evt: MidiEvent, t: number = 0) => {
    if (!t) t = actxRef.current.currentTime + lag;
    midiEvents.send([evt, t]);
  }, [lag, midiEvents]);

  const data: RootContextData = useMemo((): RootContextData => {
    return {
      actx: actxRef.current,
      lag,
      midiEvents,
      beatEvents,
      bpm,
      sendMidi,
    };
  }, [lag, midiEvents, beatEvents, bpm, sendMidi]);

  const [aState, setAState] = useState(actxRef.current.state);

  useEffect(() => {
    const actx = actxRef.current;
    const stateChange = () => {
      setAState(actx.state);
    }
    actx.addEventListener('statechange', stateChange);
    return () => {
      actx.removeEventListener('statechange', stateChange);
    };
  }, []);

  useEffect(() => {
    const actx = actxRef.current;

    console.log('actx', actx, aState);

    if (!(actx instanceof AudioContext)) return;

    if (aState !== 'suspended') return;

    const resume = () => {
      actx.resume();
      console.log('resuming');
    };

    document.addEventListener('mousedown', resume);
    document.addEventListener('keydown', resume);

    return () => {
      document.removeEventListener('mousedown', resume);
      document.removeEventListener('keydown', resume);
    }
  }, [aState]);

  const lagRef = useRef(lag);
  useEffect(() => {
    lagRef.current = lag;
  }, [lag]);

  const lastBeatRef = useRef<Timed<BeatEvent>>([{index: 0, dur: 0}, 0]);

  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    if (aState !== 'running') return;

    let tmId: ReturnType<typeof setTimeout>;
    
    function send() {
      const [lastBeat, lastBeatTime] = lastBeatRef.current;
      const ct = actxRef.current.currentTime;
      const dur = 60 / bpmRef.current;
      const index = lastBeat.index + 1;
      let nbt = lastBeatTime + lastBeat.dur;
      if (nbt < ct) {
        console.log('SKIPPED A BEAT?', nbt, ct);
        nbt = ct;
      }
      if (nbt < ct + dur) {
        const nb: Timed<BeatEvent> = [{index, dur}, nbt];
        beatEvents.send(nb);
        lastBeatRef.current = nb;
      }
      tmId = setTimeout(send, dur * 500);
    }

    send();
    
    return () => {
      clearTimeout(tmId);
    };
  }, [aState, beatEvents]);

  return (
    <RootCtx.Provider value={data}>
      {children}
    </RootCtx.Provider>
  );
}
