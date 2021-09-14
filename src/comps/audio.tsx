import React, {useEffect, useState, useMemo, ReactElement} from 'react';

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
  ParamEvents,
  Timed,
  ParamEvent,
  WithInChildren,
} from './types';

import {
  useACtx,
  NodeInContext,
  useMidiEvents,
  useNodeIn,
} from './contexts';

import { adsr, pipe, mul, delay, noteToDetune } from './streams';

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

function setNodeId(node: AudioAny, id: string) {
  theNodeIds.set(node, id);
}

function getNodeId(node?: AudioAny | null, name?: string): string {
  if (!node) return '';
  let id = theNodeIds.get(node);
  if (id) return id;
  id = `${name || node.constructor.name}-${++theLastId}`;
  setNodeId(node, id);
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

export function useMidiToParam(midiToParam: MidiToParamEvents) {
  const midis = useMidiEvents();
  return useMemo(() => {
    return midiToParam(midis);
  }, [midis, midiToParam]);
}

export function useNoteToDetune() {
  return useMidiToParam(noteToDetune);
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
  const [nodes, subs] = useMemo(() => {
    const chs = asArray(children);
    const nodes: AudioOut[] = [];
    const subs: ReactElement[] = [];
    for (const ch of chs) {
      if (!ch) continue;
      if (ch instanceof AudioNode) {
        nodes.push(ch);
        continue;
      }
      if ('current' in ch && ch.current instanceof AudioNode) {
        nodes.push(ch.current);
        continue;
      }
      if (React.isValidElement(ch)) {
        subs.push(ch);
      }
    }
    return [nodes, subs];
  }, [children]);

  return <>
    {nodes.map((n) => makeConn(n, node))}
    <NodeInContext.Provider value={node}>{subs}</NodeInContext.Provider>
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

function ParamFromEvents({param, events}: {param: AudioParam; events: ParamEvents}) {
  const midis = useMidiEvents();
  const actx = useACtx();

  useEffect(() => {
    const subscription = events.subscribe({
      next: ([pe, t]: Timed<ParamEvent>) => {
        console.log('applying', getNodeId(param), t, pe);
        pe.apply(param, t);
      },
    });
    return () => subscription.unsubscribe();
  }, [param, events, actx]);

  return null;
}

type ParamInProps = {
  children: AParamProp;
  param: AudioParam;
  name: string;
}

export function ParamIn({param, children, name}: ParamInProps) {
  const chs = asArray(children);

  const {nodes, nums, evs} = useMemo(() => {
    const evs: Array<ParamEvents> = [];
    const nums: Array<number> = [];
    const nodes: WithInChildren = [];
    for (const child of chs) {
      if (child == null) continue;
      if (typeof child === 'number') {
        nums.push(child);
        continue;
      }
      if (child instanceof AudioNode) {
        nodes.push(child);
        continue;
      }
      if ('current' in child) {
        nodes.push(child);
        continue;
      }
      if (React.isValidElement(child)) {
        nodes.push(child);
        continue;
      }
      evs.push(child);
    }
    return {evs, nums, nodes};
  }, [chs]);

  useEffect(() => {
    if (nums.length || evs.length) param.value = nums.reduce((a, b) => a + b, 0);
    else param.value = param.defaultValue;
    console.log('setting', name, getNodeId(param), '=', param.value, nums);
  }, [nums.join(','), evs.length, param, name]);

  return <>
    <NodeIn node={param}>
      {nodes}
    </NodeIn>
    {evs.map((child, i) => <ParamFromEvents key={i} param={param} events={child} />)}
  </>
}



type OscProps = WithOut & {
  name?: string;
  type: OscillatorType,
  frequency?: AParamProp;
  detune?: AParamProp;
};

export function Osc({name, type, frequency, detune, ...rest}: OscProps) {
  const node = useOsc(type);

  setNodeId(node.frequency, `${getNodeId(node, name)}.frequency`);
  setNodeId(node.detune, `${getNodeId(node, name)}.detune`);

  return <>
    <NodeOut node={node} {...rest} />
    <ParamIn name="freq" param={node.frequency}>{frequency}</ParamIn>
    <ParamIn name="detune" param={node.detune}>{detune}</ParamIn>
  </>;
}


type ConstProps = WithOut & {
  name?: string;
  value: AParamProp;
};

export function Const({value, name, ...rest}: ConstProps) {
  const node = useConst();

  setNodeId(node.offset, `${getNodeId(node, name)}.offset`);

  return <>
    <NodeOut node={node} {...rest} />
    <ParamIn name="value" param={node.offset}>{value}</ParamIn>
  </>;
}


type FilterProps = WithOut & WithIn & {
  name?: string;
  type: BiquadFilterType;
  frequency?: AParamProp;
  detune?: AParamProp;
};

export function Filter({name, type, frequency, detune, ...rest}: FilterProps) {
  const node = useFilter(type);

  setNodeId(node.frequency, `${getNodeId(node, name)}.frequency`);
  setNodeId(node.detune, `${getNodeId(node, name)}.detune`);

  return <>
    <NodeInOut node={node} {...rest} />
    <ParamIn name="freq" param={node.frequency}>{frequency}</ParamIn>
    <ParamIn name="detune" param={node.detune}>{detune}</ParamIn>
  </>;
}


export function Destination(props: WithIn) {
  const ctx = useACtx();

  return <NodeIn node={ctx.destination} {...props} />;
}


type GainProps = WithIn & WithOut & {
  gain?: AParamProp;
  name?: string;
};

export function Gain({gain, name, ...rest}: GainProps) {
  const node = useGain();

  setNodeId(node.gain, `${getNodeId(node, name)}.gain`);

  return <>
    <NodeInOut node={node} {...rest} />
    <ParamIn name="gain" param={node.gain}>{gain}</ParamIn>
  </>;
}

export function Cut({children}: WithIn) {
  const chs = asArray(children);
  return <NodeInContext.Provider value={null}>{
    chs.filter((ch) => !(ch instanceof AudioNode))
  }</NodeInContext.Provider>;
}

type FromProps = {
  node: AudioOut;
}

export function From({node}: FromProps) {
  const nodeIn = useNodeIn();

  return makeConn(node, nodeIn);
}

type ADSRProps = WithOut & {
  name?: string;
  a: number;
  d: number;
  s: number;
  r: number;
  max?: number;
  delay?: number;
  children?: WithInChildren,
}

export function ADSR({
  name,
  a, d, s, r,
  max = 1,
  delay: del = 0,
  children,
  ...without
}: ADSRProps) {
  const m2p = useMemo(() => pipe(adsr(a, d, s, r), mul(max), delay(del)), [a, d, s, r, max, del]);
  const events = useMidiToParam(m2p);

  if (children) {
    return <Gain name={name} gain={[0, events]} {...without}>
      {children}
    </Gain>;
  } else {
    return <Const name={name} value={[0, events]} {...without} />;
  }
}
