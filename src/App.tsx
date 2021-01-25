import React, { useCallback, useState } from 'react';
import './App.css';
import {useNodeRef, Osc, Filter, Destination, Gain, Const} from './comps/au';

import { MidiRoot, TestSender } from './comps/midi';
import { adsr } from './comps/xs';


function App() {
  const [playing, setPlaying] = useState(false);

  const btnClk = useCallback(() => {
    setPlaying(p => !p);
  }, []);

  const lfo = useNodeRef();

  return (
    <MidiRoot lag={0.01}>
      <div className="App">
        <button onClick={btnClk}>{playing ? 'STOP' : 'PLAY'}</button>
        {playing && <>
            <Destination>
              <Gain gain={[0, adsr(0.01, 0.1, 0.7, 0.5)]}>
                <Filter type="lowpass">
                  <Osc type="sawtooth" frequency={110} detune={lfo.current} />
                </Filter>
              </Gain>
            </Destination>
            <Gain gain={-500} nodeRef={lfo}>
              <Osc type="sawtooth" frequency={2} />
              <Const value={0} />
            </Gain>
            <TestSender />
        </>}
      </div>
    </MidiRoot>
  );
}

export default App;
