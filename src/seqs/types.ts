export type SeqItem<T> = [val: T[], dur: number];

export type SeqGen<T> = Generator<SeqItem<T>>;

export type SeqGenFunc<T> = (i?: number) => SeqGen<T>;

