import {createContext, useContext} from 'react';

import {MidiEvents, MidiEvent} from './types';
import {HS} from '../hs/types';

export const MidiEventsContext = createContext<MidiEvents>(new HS());

export const MidiSenderContext = createContext<(me: MidiEvent) => void>(() => {});

export function useMidiEvents() {
  return useContext(MidiEventsContext);
}

export function useMidiSender() {
  return useContext(MidiSenderContext);
}
