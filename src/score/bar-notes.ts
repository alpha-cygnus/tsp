import {addRatio, subRatio} from '../common/math';
import {Ratio} from '../common/types';
import {Parse, parseString, eq, many, many1, map, mapData, match, oneOf, opt, seq, trim} from '../common/parse';


// Bar Code

type BarNoteData = {
  sig: Sig;
  dur: Dur;
  oct: number;
  key: Key;
  bar: number;
  vel: number;
  beat: Dur;
  repitch: Record<string, number>;
};

const initBarNoteData: BarNoteData = {
  sig: [4, 4],
  dur: [1, 4],
  oct: 5,
  key: {
    fs: 1,
    pitches: '',
  },
  bar: 0,
  vel: 100,
  beat: [1, 4],
  repitch: {},
}

type Bar = {
  key: Key | null;
  sig: Sig | null;
  items: BarItem[];
};

const fifths = 'FCGDAEB';

type Key = {
  fs: 1 | -1,
  pitches: string;
};

type Dur = Ratio;

type Sig = Ratio;

type FS = -1 | 1 | 0;

type Note = {
  _: 'note';
  note: number;
  dur: Dur;
  vel: number;
}

type Rest = {
  _: 'rest';
  dur: Dur;
};

type Tie = {
  _: 'tie';
  dur: Dur;
};

type BarItem = Note | Rest | Tie;

const num: Parse<number, BarNoteData> = map(match(/[0-9]+/, 'number'), (s) => parseInt(s, 10));

const dur: Parse<Dur, BarNoteData> = map(seq(num, opt(seq(eq('/'), num))), ([a, b]): Dur => {
  if (!b) return [1, a];
  const [, bb] = b;
  return [a, bb];
});

const durDot: Parse<Dur, BarNoteData> = map(
  seq(opt(dur), many(eq('.'))),
  ([dur, dots], data): Dur => {
    let res: Dur = dur || data.dur;
    const add: Dur = [...res];
    for (let i = 0; i < dots.length; i++) {
      add[1] /= 2;
      res = addRatio(res, add);
    }
    return res;
  },
);

const fs: Parse<FS, BarNoteData> = map(oneOf(eq('b'), eq('='), eq('n'), eq('#')), (s) => {
  switch(s) {
    case '-':
    case 'b':
        return -1;
    case '#':
      return -1;
    default:
      return 0;
  }
});

const noteSymToNum = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const note: Parse<Note, BarNoteData> = map(
  seq(match(/[CDEFGAB]/, 'note'), opt(fs), durDot),
  ([n, fs, dur], data, setData): Note => {
    const nn = n.toUpperCase();
    const {repitch, oct, vel} = data;
    // @ts-ignore
    let note = noteSymToNum[nn] || 0;
    if (fs == null) {
      note += repitch[nn] || 0;
    } else {
      note += fs;
      setData(({repitch}) => {
        repitch[nn] = fs;
      });
    }
    note += oct * 12;
    return {
      _: 'note',
      note,
      dur,
      vel,
    };
  }
);

const rest: Parse<Rest, BarNoteData> = map(
  seq(match(/[rp]/, 'rest'), durDot),
  ([, dur]) => ({_: 'rest', dur}),
);

const tie: Parse<Tie, BarNoteData> = map(
  seq(eq('^'), durDot),
  ([, dur]) => ({_: 'tie', dur}),
);

const octSet: Parse<null, BarNoteData> = mapData(
  seq(eq('o'), num),
  (data, [, set]) => {
    data.oct = set;
  },
);

const durSet: Parse<null, BarNoteData> = mapData(
  seq(eq('l'), dur),
  (data, [, dur]) => {
    data.dur = dur;
  },
);

const velSet: Parse<null, BarNoteData> = mapData(
  seq(eq('v'), num),
  (data, [, n]) => {
    data.vel = n;
  },
);

const beatSet: Parse<null, BarNoteData> = mapData(
  seq(eq('q'), dur),
  (data, [, dur]) => {
    data.beat = dur;
  },
);

const octUp: Parse<null, BarNoteData> = mapData(
  match(/[>)']/, 'oct up'),
  (data) => { data.oct++; },
);

const octDown: Parse<null, BarNoteData> = mapData(
  match(/[<(,]/, 'oct down'),
  (data) => { data.oct--; },
);

const sig: Parse<null, BarNoteData> = mapData(
  seq(eq('s'), num, eq('/'), num),
  (data, [, a,, b]) => { data.sig = [a, b]; },
);

const keyFs: Parse<1 | -1, BarNoteData> = map(oneOf(eq('-'), eq('+'), eq('b'), eq('#')), (s) => {
  switch(s) {
    case '-':
    case 'b':
      return -1;
    default:
      return 1;
  }
})

const key: Parse<null, BarNoteData> = mapData(
  seq(eq('k'), keyFs, num),
  (data, [, fs, n]) => {
    const pitches = fs < 0 ? fifths.slice(-n) : fifths.slice(0, n);
    data.repitch = {};
    for (const p of pitches) {
      data.repitch[p] = fs;
    }
    data.key = {pitches, fs};
  },
);

export function notNull<T>(t: T | null): t is T {
  return t != null;
}

const bar: Parse<Bar, BarNoteData> = map(
  seq(
    opt(trim(key)),
    opt(trim(sig)),
    many1(trim(oneOf<BarItem | null, BarNoteData>(note, rest, tie, octSet, octUp, octDown, durSet, beatSet, velSet))),
  ),
  ([, , itemsNull], data): Bar => {
    const {key, sig, bar} = data;
    const items = itemsNull.filter(notNull);
    let td: Dur = [0, 1];
    for (const item of items) {
      td = addRatio(td, item.dur);
    }
    console.log('bar dur', bar, td);
    const [a, b] = subRatio(td, sig);
    if (a > 0) console.error('bar', bar, 'is longer then needed by', a, '/', b);
    if (a < 0) console.error('bar', bar, 'is shorter then needed by', -a, '/', b);
    return {key: {...key}, sig: [...sig], items};
  },
);

const barSep: Parse<null, BarNoteData> = mapData(trim(eq('|')), (data) => ({
  ...data,
  bar: data.bar + 1,
  repitch: [...data.key.pitches].reduce((res, p) => ({...res, [p]: data.key.fs}), {}),
}));

export const bars: Parse<Bar[], BarNoteData> = map(
  seq(bar, many(seq(barSep, bar))),
  ([bar0, bs]) => [bar0, ...bs.map(([, b]) => b)],
);

export const parseBarCode = parseString(bars, initBarNoteData);
