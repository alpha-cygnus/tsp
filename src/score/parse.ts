import produce from 'immer';
import { addRatio, subRatio } from '../common/math';
import {Ratio} from '../common/types';

type Loc<D> = {
	i: number;
	l: number;
	c: number;
	data: D;
};

type Parse<T, D> = (s: string, loc: Loc<D>) => [T, Loc<D>];

export class ParseError<D> extends Error {
	loc: Loc<D>;

	constructor(desc: string, loc: Loc<D>) {
		super(desc);
		this.loc = loc;
	}
}

function _locInc<D>(loc: Loc<D>, by: string): Loc<D> {
	const res = {...loc};
	res.i += by.length;
	for (const c of by) {
		switch (c) {
			case '\n':
				res.c = 0;
				res.l++;
				break;
			case '\r':
				res.c = 0;
				break;
			case '\t':
				res.c += 8;
				break;
			default:
				res.c++;
				break;
		}
	}
	return res;
}

function opt<T, D>(p: Parse<T, D>): Parse<T | null, D> {
	return (s, loc) => {
		try {
			return p(s, loc);
		} catch {
			return [null, loc];
		}
	}
}

function many<T, D>(p: Parse<T, D>): Parse<T[], D> {
 	return (s, loc) => {
		const res: T[] = [];
		for (;;) {
			try {
				const [t, l] = p(s, loc);
				res.push(t);
				loc = l;
			} catch {
				break;
			}
		}
		return [res, loc];
	}
}

function eq<D = any>(str: string): Parse<string, D> {
	return (s, loc) => {
		if (s.slice(loc.i).startsWith(str)) {
			return [str, _locInc(loc, str)];
		}
		throw new ParseError(`${str} expected`, loc);
	}
}

function match<D = any>(re: RegExp, desc: string): Parse<string, D> {
	return (s, loc) => {
		const m = s.slice(loc.i).match(re);
		if (!m || (m.index || 0) > 0) throw new ParseError(`Expected ${desc}`, loc);
		const res = m[0];
		return [res, _locInc(loc, res)];
	}
}

const ews = <D>(): Parse<string, D> => match(/[ \r\n\t]*/, ' ');

type ParseList<TS extends [...any[]], D> = {[I in keyof TS]: Parse<TS[I], D>};

function seq<TS extends [...any[]], D>(...ps: ParseList<TS, D>): Parse<TS, D> {
	return (s, loc) => {
		// @ts-ignore
		const rs: TS = ps.map((p, i) => {
			const [r, l] = p(s, loc);
			loc = l;
			return r;
		});
		return [rs, loc];
	}
}

function map<A, B, D>(p: Parse<A, D>, f: (a: A, data: D) => B): Parse<B, D> {
	return (s, loc) => {
		const [r, l] = p(s, loc);
		let res: B;
		let resLoc = produce((l) => {
			res = f(r, l.data);
		})(l);
		// @ts-ignore
		return [res, resLoc];
	}
}

function mapData<T, D>(p: Parse<T, D>, f: (data: D, t: T) => void): Parse<null, D> {
	return (s, loc) => {
		const [r, l] = p(s, loc);
		const resLoc = produce((l) => {
			f(l.data, r);
		})(l);
		return [null, resLoc];
	}
}

function oneOf<T, D>(...ps: Parse<T, D>[]): Parse<T, D> {
	return (s, loc) => {
		let es: ParseError<D>[] = [];
		for (const p of ps) {
			try {
				return p(s, loc);
			} catch(e) {
				if (e instanceof ParseError) {
					es.push(e);
				} else {
					throw e;
				}
			}
		}
		throw new ParseError(`one of (${es.map((e) => e.message).join(',')})`, loc);
	}
}

function trim<T, D>(p: Parse<T, D>): Parse<T, D> {
	return map(seq(ews(), p, ews()), ([, t,]) => t);
}

// Bar Code

type BarNoteData = {
	sig: Sig;
	dur: Dur;
	oct: number;
	key: Key;
	bar: number;
	repitch: Record<string, number>;
};

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

const durDot: Parse<Dur, BarNoteData> = map(seq(dur, opt(eq('.'))), ([[a, b], dot]): Dur => {
	if (dot) return [a * 3, b * 2];
	return [a, b];
});

const fs: Parse<FS, BarNoteData> = map(oneOf(eq('-'), eq('+'), eq('='), eq('#')), (s) => {
	switch(s) {
		case '-':
			return -1;
		case '+':
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
	seq(match(/[cdefgab]/i, 'note'), opt(fs), opt(durDot)),
	([n, fs, dur], data): Note => {
		const nn = n.toUpperCase();
		const {repitch, oct} = data;
		// @ts-ignore
		let note = noteSymToNum[nn] || 0;
		if (fs == null) {
			note += repitch[nn] || 0;
		} else {
			note += fs;
			data.repitch[nn] = fs;
		}
		note += oct * 12;
		return {
			_: 'note',
			note,
			dur: dur || [...data.dur],
		};
	}
);

const rest: Parse<Rest, BarNoteData> = map(
	seq(match(/[rp]/i, 'rest'), opt(dur)),
	([, dur], data): Rest => {
		return {
			_: 'rest',
			dur: dur || [...data.dur],
		};
	}
);

const tie: Parse<Tie, BarNoteData> = map(
	seq(eq('^'), opt(durDot)),
	([, dur], data): Tie => ({
		_: 'tie',
		dur: dur || [...data.dur],
	}),
);

const octSet: Parse<null, BarNoteData> = mapData(
	seq(eq('o'), num),
	(data, [, set]) => {
		data.oct = set;
	},
);

const durSet: Parse<null, BarNoteData> = mapData(
	seq(eq('t'), dur),
	(data, [, dur]) => {
		data.dur = dur;
	},
);

const octUp: Parse<null, BarNoteData> = mapData(
	match(/[>\)\]]/, 'oct up'),
	(data) => { data.oct++; },
);

const octDown: Parse<null, BarNoteData> = mapData(
	match(/[<\(\[]/, 'oct down'),
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
		many(trim(oneOf<BarItem | null, BarNoteData>(note, rest, tie, octSet, octUp, octDown, durSet))),
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

export const parseString = <T>(p: Parse<T, BarNoteData>) => (s: string): T => {
	const [res, loc] = p(s, {i: 0, l: 0, c: 0, data: {
		dur: [1, 4],
		sig: [4, 4],
		oct: 5,
		key: {pitches: '', fs: -1},
		bar: 0,
		repitch: {},
	}});
	console.log(loc);
	if (loc.i < s.length) throw new ParseError('Smth wrong here', loc);
	return res;
}

export const parseBarCode = parseString(bars);
