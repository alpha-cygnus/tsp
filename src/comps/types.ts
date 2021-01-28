import {Stream} from 'xstream';

export type AudioAny = AudioNode | AudioParam;

export type AudioIn = AudioNode | AudioParam;

export type AudioOut = AudioNode;

export type NodeRef = {
  current: AudioOut | null;
}

export type WithOut = {
  nodeRef?: NodeRef;
};

export type WithInChild = React.FunctionComponentElement<WithOut> | AudioOut | null;

export type WithInChildren = WithInChild | WithInChild[];

export type WithIn = {
  children: WithInChildren;
}

export type Time = number;

export type Timed<V> = [V, Time];

export interface Clock {
  now(): Time;
}

export interface MidiEvent {
  ch: number;
}

export interface ParamEvent {
  apply: (param: AudioParam, t: number) => void;
}

export type TimedObs<V> = Stream<Timed<V>>;

export type MidiEvents = TimedObs<MidiEvent>;

export type ParamEvents = TimedObs<ParamEvent>;

export type MidiToParamEvents = (midis: MidiEvents) => ParamEvents;

export type AParamValue = AudioOut | number | MidiToParamEvents;

export type AParamProp = AParamValue | AParamValue[] | null | undefined;

export type MidiToMidiEvents = (midis: MidiEvents) => MidiEvents;
