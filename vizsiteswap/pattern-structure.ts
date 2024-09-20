/**
 * abstraction of a visualization that represents a pattern
 * and the throws in it, but not logic for creating it or the
 * the actual rendering
 */

export type Throw = {
    // time starts at 0 and usually increments by 1 for sync and 0.5 for async patterns; 
    // it then repeats after the length of the pattern
    // prefix throws are in negative time
    throwTime: number;
    causeTime: number;
    rethrowTime: number; // assuming that cause and rethrow happen to the same passer with the same hand

    // the index of the passer throwing and receiving in passerNames
    fromPasserIdx: number;
    toPasserIdx: number;

    // the index of the hand throwing and receiving
    fromHandIdx: 0 | 1; // 0 = right, 1 = left
    toHandIdx: 0 | 1; // 0 = right, 1 = left

    // the label for the throw (e.g "3p" or "a") and a possible annotation (e.g., "X", "||")
    label: string;
    annotation: string
}

export type Pattern = {

    // the number of and names (A, B, ...) representing the passers
    passerNames: string[];

    // [right, left] clubs at the start for each passer
    startingHands: [number, number][];

    // optionally, the setup throws in the beginning of the pattern that do not repeat
    prefixPeriod: number // time length of the prefix
    prefixThrows: Throw[]

    // the throws in the pattern
    period: number // time until it repeats
    getThrows(iterationNr: number): Throw[]

}

/**
 * checks a pattern, returns a list of problems, if any
 * @param p pattern
 * @returns list of problems, empty list if none
 */
export function checkValidPattern(p: Pattern): string[] {
    const r: string[] = []
    if (p.getThrows(1).length === 0) r.push(`pattern has no throws`)
    p.getThrows(1).map((t) => r.push(...checkValidThrow(t, p)))
    for (const t of p.getThrows(1)) {
        if (t.throwTime < 0) r.push(`throw ${JSON.stringify(t)} thrown before 0`)
        if (t.throwTime >= p.period) r.push(`throw ${JSON.stringify(t)} after end of period`)
    }
    for (const t of p.prefixThrows) {
        if (t.throwTime >= 0) r.push(`prefix throw ${JSON.stringify(t)} thrown at or after 0`)
        if (t.throwTime < p.prefixPeriod) r.push(`prefix throw ${JSON.stringify(t)} before length of prefix period`)
    }

    return r
}

function checkValidThrow(t: Throw, p: Pattern): string[] {
    const r = []
    if (t.causeTime > t.rethrowTime) r.push(`throw ${JSON.stringify(t)} rethrown before cause`)
    return r
}

export function repeatThrows(p: Pattern, nrIterations: number): Throw[] {
    if (nrIterations < 1) throw Error("invalid number of iterations")
    const throws: Throw[] = [];
    for (let i = 0; i < nrIterations; i++) {
        throws.push(...p.getThrows(i + 1));
    }
    return throws;
}