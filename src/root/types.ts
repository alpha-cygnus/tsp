import {TimedHS} from '../hs/types';

export type BeatEvent = {
  index: number;
  dur: number;
};

export type BeatEvents = TimedHS<BeatEvent>;
