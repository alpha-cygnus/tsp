import React, {useEffect, useState, useMemo} from 'react';

// types

import {
  AParamProp,
  AudioAny,
  AudioIn,
  AudioOut,
  NodeRef,
  WithIn,
  WithOut,
  Clock,
  MidiToParamEvents,
  Timed,
  ParamEvent,
} from './types';

import {
  useACtx,
  NodeInContext,
  useMidiEvents,
  useNodeIn,
} from './ctx';

export class AudioClock implements Clock {
  ctx: AudioContext;
  lag: number;
  constructor (ctx: AudioContext, lag: number = 0) {
    this.ctx = ctx;
    this.lag = lag;
  }
  now() {
    return this.ctx.currentTime + this.lag;
  }
}

const theNodeIds = new WeakMap<AudioAny, string>();

let theLastId = 0;

// utils

function getNodeId(node?: AudioAny | null): string {
  if (!node) return '';
  let id = theNodeIds.get(node);
  if (id) return id;
  id = `${node.constructor.name}-${++theLastId}`;
  theNodeIds.set(node, id);
  return id;
}

function doConnect(from: AudioOut, to: AudioIn) {
  // @ts-ignore
  from.connect(to);
}

function doDisconnect(from: AudioOut, to: AudioIn) {
  // @ts-ignore
  from.disconnect(to);
}

function makeConn(from?: AudioOut | null, to?: AudioIn | null) {
  return <Conn key={`${getNodeId(from)}--${getNodeId(to)}`} from={from} to={to} />;
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

// hooks

export function useNodeRef(): NodeRef {
  const [node, setNode] = useState<AudioOut | null>(null);
  return {
    set current(n) { setNode(n); },
    get current() { return node; },
  };
}

export function useConst() {
  const actx = useACtx();
  const [node] = useState(actx.createConstantSource());
  
  useEffect(() => {
    node.start();
    return () => node.stop();
  }, [node]);
  
  return node;
}

export function useOsc(type: OscillatorType) {
  const actx = useACtx();
  const [node] = useState(actx.createOscillator());
  
  useEffect(() => {
    node.type = type;
  }, [node, type]);

  useEffect(() => {
    node.start();
    return () => node.stop();
  }, [node]);
  
  return node;
}

export function useFilter(type: BiquadFilterType) {
  const actx = useACtx();
  const [node] = useState(actx.createBiquadFilter());
  
  useEffect(() => {
    node.type = type;
  }, [node, type]);

  return node;
}

export function useGain() {
  const actx = useACtx();
  const [node] = useState(actx.createGain());

  return node;
}

// components

type ConnProps = {
  from?: AudioOut | null;
  to?: AudioIn | null;
};

function Conn({from, to}: ConnProps) {
  useEffect(() => {
    if (!from) return;
    if (!to) return;
    console.log('connect', getNodeId(from), '->', getNodeId(to));
    doConnect(from, to);
    return () => {
      doDisconnect(from, to);
      console.log('disconnect', from, to);
    };
  }, [from, to]);
  return null;
}


type NodeInProps = WithIn & {
  node: AudioIn;
}

export function NodeIn({node, children}: NodeInProps) {
  const chs = asArray(children);

return <>
    {chs.map((ch) => {
      if (ch instanceof AudioNode) return makeConn(ch, node);
      return null;
    })}
    <NodeInContext.Provider value={node}>{children}</NodeInContext.Provider>
  </>
}


type NodeOutProps = WithOut & {
  node: AudioOut;
}

export function NodeOut({node, nodeRef}: NodeOutProps) {
  const nodeIn = useNodeIn();

  useEffect(() => {
    if (nodeRef) nodeRef.current = node;
  }, [nodeRef, node]);

  return makeConn(node, nodeIn);
}


type NodeInOutProps = WithIn & WithOut & {
  node: AudioOut;
}

export function NodeInOut({node, nodeRef, children}: NodeInOutProps) {
  return <>
    <NodeIn node={node}>{children}</NodeIn>
    <NodeOut node={node} nodeRef={nodeRef} />
  </>;
}

function ParamFromMidi({param, midiToParam}: {param: AudioParam; midiToParam: MidiToParamEvents}) {
  const midis = useMidiEvents();
  const actx = useACtx();

  const paramEvents = useMemo(() => {
    return midiToParam(midis);
  }, [midis, midiToParam]);

  useEffect(() => {
    const subscription = paramEvents.subscribe({
      next: ([pe, t]: Timed<ParamEvent>) => {
        pe.apply(param, t);
      },
    });
    return () => subscription.unsubscribe();
  }, [param, paramEvents, actx]);

  return null;
}

type ParamInProps = {
  children: AParamProp;
  param: AudioParam;
  name: string;
}

export function ParamIn({param, children, name}: ParamInProps) {
  const chs = asArray(children);

  const {nodes, nums, m2ps} = useMemo(() => {
    const m2ps: Array<MidiToParamEvents> = [];
    const nums: Array<number> = [];
    const nodes: Array<AudioNode> = [];
    for (const child of chs) {
      if (child == null) continue;
      if (child instanceof AudioNode) {
        nodes.push(child);
        continue;
      }
      if (typeof child === 'number') {
        nums.push(child);
        continue;
      }
      m2ps.push(child);
    }
    return {m2ps, nums, nodes};
  }, [chs]);

  useEffect(() => {
    if (nums.length) param.value = nums.reduce((a, b) => a + b);
    else param.value = param.defaultValue;
    console.log('setting', name, getNodeId(param), '=', param.value, nums);
  }, [nums, param, name]);

  return <>
    {nodes.map((child) => makeConn(child, param))}
    {m2ps.map((child, i) => <ParamFromMidi key={i} param={param} midiToParam={child} />)}
  </>
}



type OscProps = WithOut & {
  type: OscillatorType,
  frequency?: AParamProp;
  detune?: AParamProp;
};

export function Osc({type, frequency, detune, ...rest}: OscProps) {
  const osc = useOsc(type);

  return <>
    <NodeOut node={osc} {...rest} />
    <ParamIn name="freq" param={osc.frequency}>{frequency}</ParamIn>
    <ParamIn name="detune" param={osc.detune}>{detune}</ParamIn>
  </>;
}


type ConstProps = WithOut & {
  value: AParamProp;
};

export function Const({value, ...rest}: ConstProps) {
  const node = useConst();

  return <>
    <NodeOut node={node} {...rest} />
    <ParamIn name="value" param={node.offset}>{value}</ParamIn>
  </>;
}


type FilterProps = WithOut & WithIn & {
  type: BiquadFilterType;
};

export function Filter({type, ...rest}: FilterProps) {
  const flt = useFilter(type);

  return <NodeInOut node={flt} {...rest} />;
}


export function Destination(props: WithIn) {
  const ctx = useACtx();

  return <NodeIn node={ctx.destination} {...props} />;
}


type GainProps = WithIn & WithOut & {
  gain?: AParamProp;
};

export function Gain({gain, ...rest}: GainProps) {
  const node = useGain();

  return <>
    <NodeInOut node={node} {...rest} />
    <ParamIn name="gain" param={node.gain}>{gain}</ParamIn>
  </>;
}

