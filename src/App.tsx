import React, { useCallback, useState } from 'react';
import './App.css';
import {useNodeRef, useNoteToDetune, Osc, Filter, Destination, Gain, Cut, ADSR} from './comps/audio';

import { MidiRoot, ChordSender, MidiFilter, Ptn, MidiChannel } from './comps/midi';
import { midiChannel, randomDelay } from './comps/streams';

import {Key} from '@tonaljs/tonal';


function TestSyn({freq}: {freq: number}) {
  const lfo = useNodeRef();
  const notes = useNoteToDetune();

  return (
    <Gain name="vol" gain={[0, <ADSR name="env" a={0.01} d={0.1} s={0.1} r={0.5} max={0.3}/>]}>
      <Filter type="lowpass" detune={<ADSR a={0.1} d={0.6} s={0} r={0.5} max={10000} />}>
        <Osc name="saw" type="sawtooth" frequency={freq - 3} detune={[lfo, notes]} />
        <Osc name="saw" type="sawtooth" frequency={freq + 3} detune={[lfo, notes]} />
      </Filter>
      <Cut>
        <ADSR name="lfo" a={0.5} d={1} s={1} r={0.5} max={30} delay={0.7} nodeRef={lfo}>
          <Osc type="sine" frequency={4} />
        </ADSR>
      </Cut>
    </Gain>
  );
}

// function TestSyn1({freq}: {freq: number}) {
//   const lfo = useNodeRef();

//   return (
//     <Gain gain={<ADSR a={0.01} d={0.1} s={0.1} r={0.5} />}>
//       <Filter type="lowpass">
//         <Osc type="sawtooth" frequency={freq + 3} detune={[lfo, noteToDetune]} />
//         <Osc type="sawtooth" frequency={freq - 3} detune={[noteToDetune]} />
//       </Filter>
//     </Gain>
//   );
// }

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
              {/* <MidiFilter filter={midiChannel(0)}>
                <MidiFilter filter={randomDelay(0.5)}>
                  <TestSyn freq={440} />
                </MidiFilter>
              </MidiFilter> */}
              <MidiChannel ch={0}>
                <TestSyn freq={440} />
              </MidiChannel>
              <MidiChannel ch={1}>
                <TestSyn freq={440} />
              </MidiChannel>
              <MidiChannel ch={2}>
                <TestSyn freq={440} />
              </MidiChannel>
              <MidiChannel ch={3}>
                <TestSyn freq={440} />
              </MidiChannel>
              <MidiChannel ch={4}>
                <TestSyn freq={440} />
              </MidiChannel>
              <MidiChannel ch={5}>
                <TestSyn freq={440} />
              </MidiChannel>
            </Gain>
          </Destination>
          <ChordSender chs={[0, 1, 2]} chord="CM" className="test-sender" /> 
          <ChordSender chs={[3, 4, 5]} chord="Cmin" className="test-sender" /> 
        </>}
      </div>
      <Ptn d={`
        |c-4|

        |c-5|
      `}
      >
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
