import React, { useCallback, useState } from 'react';
import './App.css';
import {useNodeRef, Osc, Filter, Destination, Gain, Cut} from './comps/audio';

import { MidiRoot, ChordSender, MidiFilter, Ptn } from './comps/midi';
import { adsr, noteToDetune, midiChannel, pipe, mul, delay } from './comps/streams';

import {Key} from '@tonaljs/tonal';


function TestSyn({freq}: {freq: number}) {
  const lfo = useNodeRef();

  return (
    <Gain gain={adsr(0.01, 0.1, 0.7, 0.5)}>
      <Filter type="lowpass">
        <Osc type="sawtooth" frequency={freq + 3} detune={[lfo.current, noteToDetune]} />
        <Osc type="sawtooth" frequency={freq - 3} detune={[lfo.current, noteToDetune]} />
      </Filter>
      <Cut>
        <Gain gain={pipe(adsr(0.5, 1, 1, 0.5), mul(30), delay(0.2))} nodeRef={lfo}>
          <Osc type="sine" frequency={4} />
        </Gain>
      </Cut>
    </Gain>
  );
}

function App() {
  const [playing, setPlaying] = useState(false);

  const btnClk = useCallback(() => {
    setPlaying(p => !p);
  }, []);

  return (
    <MidiRoot lag={0.01}>
      <div className="App">
        <button onClick={btnClk}>{playing ? 'STOP' : 'PLAY'}</button>
        {playing && <>
          <Destination>
            <Gain gain={0.3}>
              <MidiFilter filter={midiChannel(0)}>
                <TestSyn freq={440} />
              </MidiFilter>
              <MidiFilter filter={midiChannel(1)}>
                <TestSyn freq={440} />
              </MidiFilter>
            </Gain>
          </Destination>
          <ChordSender ch={0} chord="Cmaj" className="test-sender" /> 
          <ChordSender ch={1} chord="Cmin" className="test-sender" /> 
        </>}
      </div>
      <Ptn>
        <p>This is a text</p>
        {'some value'}
        {3.14}
        text line
        What is it?
      </Ptn>
      <pre>
        {JSON.stringify(Key.minorKey('C'), null, 2)}
      </pre>
    </MidiRoot>
  );
}

export default App;
