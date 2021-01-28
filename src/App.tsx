import React, { useCallback, useState } from 'react';
import './App.css';
import {useNodeRef, Osc, Filter, Destination, Gain, Cut} from './comps/audio';

import { MidiRoot, NoteSender, MidiFilter, Ptn } from './comps/midi';
import { adsr, noteToDetune, midiChannel, pipe, mul, delay } from './comps/streams';


function TestSyn({freq}: {freq: number}) {
  const lfo = useNodeRef();

  return (
    <Gain gain={adsr(0.01, 0.1, 0.7, 0.5)}>
      <Filter type="lowpass">
        <Osc type="sawtooth" frequency={freq} detune={[lfo.current, noteToDetune]} />
      </Filter>
      <Cut>
        <Gain gain={pipe(adsr(0.1, 1, 1, 1), mul(100), delay(1))} nodeRef={lfo}>
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
              <MidiFilter filter={midiChannel(0)}>
                <TestSyn freq={110} />
              </MidiFilter>
              <MidiFilter filter={midiChannel(1)}>
                <TestSyn freq={220} />
              </MidiFilter>
            </Destination>
            <NoteSender ch={0} note={60} className="test-sender">C</NoteSender>
            <NoteSender ch={1} note={62} className="test-sender">D</NoteSender>
        </>}
      </div>
      <Ptn>
        <p>This is a text</p>
        {'some value'}
        {3.14}
        text line
        What is it?
      </Ptn>
    </MidiRoot>
  );
}

export default App;
