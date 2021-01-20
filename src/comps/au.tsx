import React, {useEffect, useState, useContext, useRef, useImperativeHandle} from 'react';

// types

type AudioAny = AudioNode | AudioParam;

type AudioIn = AudioNode | AudioParam;

type AudioOut = AudioNode;

type AudioOutRef = (node: AudioOut | null) => void;

type AParamValue = AudioOutRef | number;

type AParamProp = AParamValue | AParamValue[];

type WithOut = {
  nodeRef?: React.Ref<AudioOut | null>;
};

type WithInChild = React.FunctionComponentElement<WithOut> | AudioOut | null;

type WithInChildren = WithInChild | WithInChild[];

type WithIn = {
  children: WithInChildren;
}

// consts

const defAudioCtx = new AudioContext();

const ACtx = React.createContext(defAudioCtx);

const InContext = React.createContext<AudioIn | null>(defAudioCtx.destination);

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

// hooks

function useACtx() {
  return useContext(ACtx);
}

export function useOsc(type: OscillatorType) {
  const actx = useACtx();
  const [node] = useState(actx.createOscillator());
  
  useEffect(() => {
    node.type = type;
  }, [node, type]);
  
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

// components

type ConnProps = {
  from?: AudioOut | null;
  to?: AudioIn | null;
};

function Conn({from, to}: ConnProps) {
  useEffect(() => {
    if (!from) return;
    if (!to) return;
    doConnect(from, to);
    return () => {
      doDisconnect(from, to);
    };
  }, [from, to]);
  return null;
}


type NodeInProps = WithIn & {
  node: AudioIn;
}

export function NodeIn({node, children}: NodeInProps) {
  const chs = Array.isArray(children) ? children : (children ? [children] : []);

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

  useImperativeHandle(nodeRef, () => node, [node])

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


type OscProps = WithOut & {
  type: OscillatorType,
  frequency?: AParamProp;
  detune?: AParamProp;
};

export function Osc({type, ...rest}: OscProps) {
  const osc = useOsc(type);

  return <NodeOut node={osc} {...rest} />;
}


type FilterProps = WithOut & WithIn & {
  type: BiquadFilterType;
};

export function Filter({type, ...rest}: FilterProps) {
  const flt = useFilter(type);

  return <NodeInOut node={flt} {...rest} />;
}


// test

export function OscFiltered() {
  const [wire, setWire] = useState<AudioOut | null>(null);
  return <>
    <Filter type="lowpass">
      {wire}
      <Osc type="sine" />
    </Filter>
    <Osc type="sine" nodeRef={setWire} />
  </>
}
