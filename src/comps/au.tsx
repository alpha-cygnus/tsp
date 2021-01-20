import React, {useEffect, useState, useContext, useRef, useImperativeHandle, useMemo} from 'react';

// types

type AudioAny = AudioNode | AudioParam;

type AudioIn = AudioNode | AudioParam;

type AudioOut = AudioNode;

type AParamValue = AudioOut | number;

type AParamProp = AParamValue | AParamValue[] | null | undefined;

type NodeRef = {
  current: AudioOut | null;
}

type WithOut = {
  nodeRef?: NodeRef;
};

type WithInChild = React.FunctionComponentElement<WithOut> | AudioOut | null;

type WithInChildren = WithInChild | WithInChild[];

type WithIn = {
  children: WithInChildren;
}

// consts

export const defAudioCtx = new AudioContext();

const ACtx = React.createContext(defAudioCtx);

const InContext = React.createContext<AudioIn | null>(null);

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

export function useACtx() {
  return useContext(ACtx);
}

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
    console.log('connect', from, to);
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
    <InContext.Provider value={node}>{children}</InContext.Provider>
  </>
}


type NodeOutProps = WithOut & {
  node: AudioOut;
}

export function NodeOut({node, nodeRef}: NodeOutProps) {
  const nodeIn = useContext(InContext);

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


type ParamInProps = {
  children: AParamProp;
  param: AudioParam;
}

export function ParamIn({param, children}: ParamInProps) {
  const chs = asArray(children);

  const nums = useMemo(() => chs.filter((child) => typeof child === 'number') as number[], [children]);
  
  useEffect(() => {
    if (nums.length) param.value = nums.reduce((a, b) => a + b);
  }, [nums]);

  return <>
    {chs.map((ch) => {
      if (ch instanceof AudioNode) return makeConn(ch, param);
      return null;
    })}
    {/* <InContext.Provider value={param}>{children}</InContext.Provider> */}
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
    <ParamIn param={osc.frequency}>{frequency}</ParamIn>
    <ParamIn param={osc.detune}>{detune}</ParamIn>
  </>;
}


type ConstProps = WithOut & {
  value: AParamProp;
};

export function Const({value, ...rest}: ConstProps) {
  const node = useConst();

  return <>
    <NodeOut node={node} {...rest} />
    <ParamIn param={node.offset}>{value}</ParamIn>
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
    <ParamIn param={node.gain}>{gain}</ParamIn>
  </>;
}

