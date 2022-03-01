import {PECancel, PELinear, PEValue, PETarget} from './types';

export const value = (v: number) => new PEValue(v);

export const linear = (v: number) => new PELinear(v);

export const cancel = () => new PECancel();

export const target = (v: number, tc: number) => new PETarget(v, tc);
