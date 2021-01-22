import React, { useCallback, useState, useRef } from 'react';
import './App.css';
import {defAudioCtx, useNodeRef, Osc, Filter, Destination, Gain, Const} from './comps/au';

import * as E from './comps/evs';


function App() {
  const [playing, setPlaying] = useState(false);

  const btnClk = useCallback(() => {
    console.log(defAudioCtx);
    setPlaying(p => !p);
  }, []);

  const lfo = useNodeRef();

  return (
    <div className="App">
      <button onClick={btnClk}>{playing ? 'STOP' : 'PLAY'}</button>
      {playing && <>
        <Destination>
          <Gain gain={0.2}>
            <Filter type="lowpass">
              <Osc type="sawtooth" frequency={110} detune={lfo.current} />
            </Filter>
          </Gain>
        </Destination>
        <Gain gain={-500} nodeRef={lfo}>
          <Osc type="sawtooth" frequency={2} />
          <Const value={0} />
        </Gain>
      </>}
    </div>
  );
}

export default App;

// @ts-ignore
window.E = E;
