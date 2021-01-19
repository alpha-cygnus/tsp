import React, {useEffect, useState, useContext} from 'react';

const defAudioCtx = new AudioContext();

const ACtx = React.createContext(defAudioCtx);

function useACtx() {
  return useContext(ACtx);
}

class Wire {
  ins: Set<AudioNode> = new Set();
  outs: Set<AudioNode> = new Set();

  addOut(outNode: AudioNode) {
    this.ins.forEach(inNode => outNode.connect(inNode));
    this.outs.add(outNode);
  }
  removeOut(outNode: AudioNode) {
    this.ins.forEach(inNode => outNode.disconnect(inNode));
    this.outs.delete(outNode);
  }
  addIn(inNode: AudioNode) {
    this.outs.forEach(outNode => outNode.connect(inNode));
    this.ins.add(inNode);
  }
  removeIn(inNode: AudioNode) {
    this.outs.forEach(outNode => outNode.disconnect(inNode));
    this.ins.delete(inNode);
  }
}

type AParamValue = Wire | number;

type AParamProp = AParamValue | AParamValue[];

type WithOut = {
  out?: Wire;
};

type WithInChild = React.FunctionComponentElement<WithOut> | Wire;

type WithInChildren = WithInChild | WithInChild[];

type WithIn = {
  children: WithInChildren;
}

type OscProps = WithOut & {
  type: OscillatorType,
  frequency?: AParamProp;
  detune?: AParamProp;
};

export function useWire(): Wire {
  return new Wire();
}

const InContext = React.createContext<AudioNode | null>(defAudioCtx.destination);

export function useOut(node: AudioNode, out?: Wire) {
  const inNode = useContext(InContext);

  useEffect(() => {
    if (!inNode) return;
    node.connect(inNode);
    return () => {
      node.disconnect(inNode);
    }
  }, [inNode, node]);

  useEffect(() => {
    if (!out) return;
    out.addOut(node);
    return () => {
      out.removeOut(node);
    }
  }, [out]);
}

export function useIn(node: AudioNode, children: WithInChildren) {
  useEffect(() => {
    const chs = Array.isArray(children) ? children : (children ? [children] : []);
    for (const ch of chs) {
      if (ch instanceof Wire) {
        ch.addIn(node);
      }
    }
    return () => {
      for (const ch of chs) {
        if (ch instanceof Wire) {
          ch.removeIn(node);
        }
      }
    }
  }, [node, children]);
}

type InProps = WithIn & {
  node: AudioNode;
}

export function In({node, children}: InProps) {
  useIn(node, children);
  return <InContext.Provider value={node}>{children}</InContext.Provider>;
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

export function Osc({type, out}: OscProps) {
  const osc = useOsc(type);

  useOut(osc, out);

  useEffect(() => {
    console.log('OSC', type);
  }, [type]);

  return null;
}

type FilterProps = WithOut & WithIn & {
  type: BiquadFilterType;
};

export function Filter({type, children, out}: FilterProps) {
  const flt = useFilter(type);

  useOut(flt, out);

  return (
    <In node={flt}>{children}</In>
  )
}

export function OscFiltered() {
  const wire = useWire();
  return (
    <Filter type="lowpass">
      {wire}
      <Osc type="sine" />
    </Filter>
  )
}
