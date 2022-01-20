import {ParamEvents} from '../params/types';


export type AudioAny = AudioNode | AudioParam;

export type AudioIn = AudioNode | AudioParam;

export type AudioOut = AudioNode;

export type NodeRef = {
  current: AudioOut | null;
}

export type WithOut = {
  nodeRef?: NodeRef;
};

export type WithInChild = React.ReactElement<WithOut> | AudioOut | NodeRef | null;

export type WithInChildren = WithInChild | WithInChild[];

export type WithIn = {
  children: WithInChildren;
}

export type AParamValue = WithInChild | number | ParamEvents | undefined;

export type AParamProp = AParamValue | AParamValue[];
