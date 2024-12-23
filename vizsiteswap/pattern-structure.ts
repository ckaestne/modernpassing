/**
 * abstraction of a visualization that represents a pattern
 * and the throws in it, but not logic for creating it or the
 * the actual rendering
 */
export enum Hand {
    Right, Left
}


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
    fromHand: Hand;
    toHand: Hand;

    // the label for the throw (e.g "3p" or "a") and a possible annotation (e.g., "X", "||")
    label: string;
    annotation: string
}

export type Pattern = {

    // the number of and names (A, B, ...) representing the passers
    passerNames: string[];

    // [right, left] clubs at the start for each passer
    startingHands: [number, number][];

    // the throws in the pattern
    prefixPeriod: number // time length of the prefix
    period: number // time until it repeats
    getThrows(iteration: number): Throw[] // throw sequence, including prefix throws, for both passers, for n iterations

}







export type GroupPattern = {
    pattern: Pattern,
    layout?: GroupPatternLayout
}
export type GroupPatternLayout = {
    // group pattern layouts have three forms: static overall, static frames, and animation
    // they are separately, and partially redundantly encoded
    static: GroupPatternStaticLayout,
    frames?: FrameLayout[],
    animation?: AnimationLayout
}
export type FrameLayout = { label: string, static: GroupPatternStaticLayout }

export type Role = string
export type GroupPatternStaticLayout = {
    positions: PositionLayout[],
    passes: PassLayout[]
}
export type PositionLayout = {
    passerIdx: number, // unique, permanent id, despite relabeling
    x: number,
    y: number,
    role: Role
}
export type PassLayout = {
    fromRole: Role,
    fromHand: Hand,
    toRole: Role,
    toHand: Hand,
    label: string
}

/**
 * animations consist of passes and movement and relabeling
 * 
 * relabeling is always performed first, then passes and movement are identified based on the updated labels
 * 
 * all animations run on a timer that's continuously counting up
 * animations are triggered at a time identified by `onBeat` and `mod` 
 * when `(time % mod) == onBeat`. In many cases, `mod` is the number of beats in a pattern
 * (which is also the default if mod is not provided)
 * so onBeat identifies triggers that happen at every iteration. However movement may
 * happen distributed across many iterations, so larger mods are possible to express that
 * 
 * animations of movement may be much longer than the number of beats in a pattern
 */
export type AnimationLayout = {
    initialPositions: PositionLayout[],
    passAnimations: PassAnimation[],
    movementSegments: MovementSegment[],
    movementTriggers: MovementTrigger[],
    relabeling: Relabel[]
}

/**
 * passes are easy -- they are lines between the positions of two roles
 * and are shown for a certain time, identified by beats
 */

export type PassAnimation = {
    pass: PassLayout,
    onBeat: number,
    mod: number, // default to length of the pattern
    duration: number,
}
/**
 * movement is more complex -- 
 * segments describe possible movement paths in the pattern; 
 * a role may go through or all a subset of these segments in any order
 * 
 * locations are absolute, not relative to the previous location
 * animations should be created such that the start position of the triggered segment
 * is where the role is actually positioned to avoid jumps
 */
export type MovementSegment = {
    fromX: number,
    fromY: number,
    path: (number|string)[], // path instructions using C or A for curves and arches in SVG path notation
    toX: number,
    toY: number,
}
/**
 * a trigger identifies the time when a role should start moving
 * with a provided segment and duration
 * 
 * for example in scrambled V, role B starts walking after beat
 * 5; the walk animation may start at 5.5 for 3.5 beats.
 * however, since walking does not immediately repeat, there are
 * several triggers on a much longer mod, so that the right segment
 * is identified in each iteration of the pattern
 */
export type MovementTrigger = {
    onBeat: number,
    mod: number,
    role: Role,
    movementSegment: number
    duration: number,
}
export type Relabel = {
    onBeat: number,
    mod: number,
    changes: [Role, Role][] // oldRole, newRole
    shiftMovementSegments: number // shift all movement segments to a lower index by this number
}


/**
 * checks a pattern, returns a list of problems, if any
 * @param p pattern
 * @returns list of problems, empty list if none
 */
export function checkValidPattern(p: Pattern): string[] {
    const r: string[] = []
    if (p.getThrows(1).length === 0) r.push(`pattern has no throws`)
    p.getThrows(3).map((t) => r.push(...checkValidThrow(t, p)))
    for (const t of p.getThrows(1)) {
        if (t.throwTime < -.5) r.push(`throw ${JSON.stringify(t)} thrown before 0`)
        if (t.throwTime >= p.prefixPeriod + p.period) r.push(`throw ${JSON.stringify(t)} after end of period`)
    }

    return r
}

function checkValidThrow(t: Throw, _p: Pattern): string[] {
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