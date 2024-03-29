import React, {useEffect, useMemo, ReactElement, useRef, useState} from 'react';

import {AudioOut, AudioIn, WithIn, WithOut, WithInChildren, AParamProp} from './types';
import {getNodeId, doDisconnect, doConnect, asArray, setNodeId} from './utils';
import {NodeInContext, useNodeIn} from './ctx';
import {useAnalyser, useConst, useFilter, useGain, useOsc} from './hooks';


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

function makeConn(from?: AudioOut | null, to?: AudioIn | null) {
  return <Conn key={`${getNodeId(from)}--${getNodeId(to)}`} from={from} to={to} />;
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
  const actx = useACtx();

  useEffect(() => {
    const unsub = events.subscribe(([pe, t]: Timed<ParamEvent>) => {
      console.log('applying', getNodeId(param), t, pe);
      pe.apply(param, t);
    });
    return unsub;
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

  const {nodes, num, evs} = useMemo(() => {
    const evs: Array<ParamEvents> = [];
    let num: number | null = null;
    const nodes: WithInChildren = [];
    for (const child of chs) {
      if (child == null) continue;
      if (typeof child === 'number') {
        num = (num || 0) + child;
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
      if (child instanceof HS) {
        evs.push(child);
      }
    }
    return {evs, num, nodes};
  }, [chs]);

  useEffect(() => {
    if (num != null || evs.length) param.value = num || 0;
    else param.value = param.defaultValue;
    console.log('setting', name, getNodeId(param), '=', param.value, num);
  }, [num, evs.length, param, name]);

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
  const midi$ = useMidiEvents();
  const trig$ = useSOnOff(midi$);
  const adsr$ = useSADSR(trig$, a, d, s, r, max, del);

  if (children) {
    return <Gain name={name} gain={[0, adsr$]} {...without}>
      {children}
    </Gain>;
  } else {
    return <Const name={name} value={[0, adsr$]} {...without} />;
  }
}

type ScopeProps = WithIn & WithOut & {
};

export function Scope({...rest}: ScopeProps) {
  const node = useAnalyser();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [paused, setPaused] = useState(false);

  const width = 200;
  const height = 100;

  useEffect(() => {
    if (paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const res = new Uint8Array(node.fftSize);
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    let id: number;
    const draw = () => {
      node.getByteTimeDomainData(res);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, width, height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 255, 0)';
      canvasCtx.beginPath();

      const sliceWidth = 1; //width * 1.0 / res.length;
      let i0 = 0;
      for (let i = 1; i < res.length; i++) {
        if (res[i] >= 128 && res[i - 1] < 128) {
          i0 = res[i] - 128 < 128 - res[i - 1] ? i : i - 1;
          break;
        }
      }
      let x = 0;
      for (let i = 0; i <= width / sliceWidth; i++) {
        const v = res[i + i0] / 128.0;
        const y = v * height / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      // canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      id = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(id);
    }
  }, [node, paused]);

  return <>
    <NodeInOut node={node} {...rest} />
    <div className="scope">
      <canvas ref={canvasRef} width={width} height={height} onClick={() => setPaused(x => !x)} />
    </div>
  </>;
}