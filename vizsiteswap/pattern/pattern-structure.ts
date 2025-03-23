import { applyManipulations, fillPatternGaps } from "./manipulator-processing.ts";
import { PatternImpl } from "./pattern-impl.ts";

/**
 * abstraction of a visualization that represents a pattern
 * and the throws in it, but not logic for creating it or the
 * the actual rendering
 */
export enum Hand {
    Right, Left
}


// beat is always 0 ... pattern length
export type Beat = number
// time can exceed the boundaries of a pattern in both directions
export type Time = number


/**
 * a representation of a pattern (similar to JIF) with various functions for making changes
 * and computes properties of the pattern or its throws
 * 
 * can represent both sync and siteswap patterns (nrHands = 2 or 4)
 * 
 * each row corresponds to a physical passer, not to a role. Roles are just names assigned
 * to passers at specific points in the pattern.
 * 
 * mapRows can identify how physical passers repeat the pattern with another row
 * (in an odd-period 4-handed siteswap written just once, each passer alternates rows,
 * but by writing the pattern twice, each passer keeps a stable row)
 * 
 * the pattern is fundamentally circular and will always repeat over the period end 
 * (with row mapping if needed). to get the start, we simply ignore the incoming passes
 * from the previous period. as a special feature there are prefix throws that
 * are only thrown before the first iteration of the pattern, but then never again
 * Prefix throws are thrown on times -1, -2 etc. They are ignored for all computations
 * except validity checking, starting hands, and rendering
 * 
 * (this representation does not know about manipulators; labels are tracked as decoration)
 * 
 * immutable
 */
export interface Pattern {
    readonly throws: Throw[]
    readonly nrHands: number
    readonly mapRows: number[] // identify the new rowId for each row at the end of the pattern (i.e. classic relabeling)
    readonly roles: [Beat, Role[]][] // role label for each row after a given beat -- labels are purely decorative; multiple labels can be provided for different beats to highlight the effect of midpattern-relabeling after intercepts; always has at least one entry for beat 0 which is always first in the array
    readonly nrRows: number

    /**
     * return the role labels on the first beat of the pattern
     */
    getInitialRoles(): string[];

    findThrow(throwBeat: Beat, fromPasserIdx?: number, toPasserIdx?: number): Throw | undefined

    findThrows(throwBeat: Beat, fromPasserIdx?: number, toPasserIdx?: number): Throw[]

    /**
     * Due to limits of the notation, this is not straightforward --
     * we are looking for a throw thrown on $time of unknown length that arrives 
     * to a passer who at the time of arrival of the throw has the role $toRole
     * (this may not be the role the passer has at time $time)
     *
     * This is particularly unintuitive for an intercept that wraps around and lands 
     * on a beat earlier than thrown, because of the role switching at the end of the 
     * pattern. A self from B might well be thrown to A then.
     * Fortunately we don't put the intercept on the very last beat in practice.
     */
    findThrowsByRole(time: Time, fromRole?: Role, toRoleAtCausal?: Role): Throw[]


    /**
     * gets the role of a row on a given beat
     * 
     * if the beat is < 0 or > pattern length, it 
     * wraps around the pattern, considering the rearrangement of
     * rows
     */
    getRole(time: Time, rowIdx: number): string 

    /**
     * adjusts a row index for a time when it wraps around the pattern
     * 
     * (i.e., relabeling at end of pattern, not due to intercept swaps)
     * 
     * note: samePasserNBeatsLater is usually more intuitive to use
     */
    adjustRowIdxByTime(time: Time, rowIdx: number): number

    /** 
     * what row is a specific juggler n beats before/after the current beat
     * 
     * (hopefully clearer version of adjustRowIdxByTime)
     */
    samePasserNBeatsLater(rowIdx: number, currentTime: Time, timeDelta: number): number



    prettyPrintThrows(): string 

    /**
     * assumes that the pattern ends one beat after the last throw
     * @returns 
     */
    getLength(): number

    getThrowCauseTime(t: Throw): number 

    getThrowCauseTime_(throwTime: number, throwLength: number): number

    getThrowCauseBeat(t: Throw): number 
    getThrowCauseBeat_(throwTime: number, throwLength: number): number 


    addThrow(newThrow: Throw): Pattern 
    removeThrow(thatThrow: Throw): Pattern

    /** 
     * adds a row for a new passer with the provided role
     * 
     * returns the new pattern with the new row at the end
     */
    addRole(newRole: string): Pattern 

    /**
     * checks whether this patter has a row with a given role name
     */
    hasRole(role: string): boolean 


    /**
     * identify which row has a given role on a given beat,
     * 
     * considers rearranging rows at the end of the pattern
     */
    getRowIdxByRole(time: Time, role: string): number 



    /**
     * swap row reindexing at the end of the pattern too
     * and adjusts labeling earlier: at and after a given beat by swapping two roles 
     * 
     * @param labelsOnly if true, this does not change the relabeling at the end
     *   should probably be used only for debugging/testing
     */
    swapRoles(beat: Beat, roleA: string, roleB: string, labelsOnly: boolean): Pattern

    /**
     * checks whether the pattern is valid in that there is a single throw thrown and landing on every beat per juggler
     * 
     * call getValidationError() to get the error message if this returns false
     */
    isValid(): boolean 

    getValidationError(): string 

    /**
     * returns the starting objects in each hand for each row, as pair of [right, left] numbers
     */
    getStartingHands(): [number,number][]
}


export type Throw = {
    fromPasserIdx: number // this is the row corresponding to the first iteration of the pattern; it does not care about relabeling from intercepts, labels can be derived from this
    // fromPasserRole = pattern.getRole(this.throwBeat, this.fromPasserIdx)
    // fromHand: Hand // hand in the first iteration, will be mirrored 2 (sync) or 4 (4hsw) times on odd patterns

    throwBeat: Beat // 0 to pattern length
    // causeTime: number // does wrap around, i.e. always in 0 to pattern length
    throwLength: number

    toPasserIdx: number // this is the row of the receiving passer on the causal beat (which may involve relabeling at the end of the row, so a self might go to a different row)
    // toPasserRole = pattern.getRole(pattern.getCausalTime(this), this.toPasserIdx)
    // toHand: Hand // receiving hand, relative to the throw time (relabeling may cause it to point to the wrong hand if showing only one iteration for odd period patterns/4hsw)

    markers?: ThrowType[],
    note?: string
}
export enum ThrowType {
    Base = 'B',
    BaseManipulator = 'M', // normal throw from the manipulator (not a substitution or intercept or carry)
    SubstitutionPelf = 'P',
    SubstitutionPlacement = 'S',
    Intercept = 'I',
    Carry = 'C',
    Filled = 'F', // automatically filled non-actions or automated actions (hold or empty hand or zip)
}


export type ManipulatorAction = InterceptAction | CarryAction | SubstitutionAction | ThrowAction
export type InterceptAction = {
    beat: Beat,
    fromPasserRole?: Role,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'I'
    modifiers: string
}
export type SubstitutionAction = {
    beat: Beat,
    fromPasserRole?: Role,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'S'
    modifiers: string
}
export type ThrowAction = {
    beat: Beat,
    throwLength: number,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'T'
}
export type CarryAction = {
    beat: Beat,
    toPasserRole?: Role,
    manipulatorRole: Role,
    kind: 'C' // carry
}







export type GroupPattern = {
    pattern: Pattern,
    aidenNotation?: [Pattern, ManipulatorAction[]]
    layout?: GroupPatternLayout
}
export type GroupPatternLayout = {
    // group pattern layouts have three forms: static overall, static frames, and animation
    // they are separately, and partially redundantly encoded
    static: GroupPatternStaticLayout,
    frames?: FrameLayout[],
    animation?: AnimationLayout,
    background?: BackgroundLayout[]
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

export type BackgroundLayout = BackgroundCircleLayout | BackgroundLineLayout | BackgroundPathLayout
type BackgroundCircleLayout = {
    type: "circle",
    x: number,
    y: number,
    r: number,
    fill: string,
    stroke: string,
    strokeWidth: number
}
type BackgroundLineLayout = {
    type: "line",
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: string,
    strokeWidth: number
}
type BackgroundPathLayout = {
    type: "path",
    segments: (number|string)[],
    stroke: string,
    strokeWidth: number
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
    movementSequences: MovementSequence[], // segment indices for each jugger (not role), by the order of initial roles
    movementTriggers: MovementTrigger[],
    relabeling: RelabelAnimation[]
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
 * a juggler/role may go through or all a subset of these segments in any order
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
 * a movement sequence is a list of segment indices that an 
 * unmanipulated jugger (not role) goes through
 * 
 * a sequence corresponds to a starting position. each juggler
 * tracks which part of the sequence they are on. a trigger identifies
 * when a role is moving, which identifies the corresponding juggler
 * and the next step in this sequence
 * 
 * the first segment is always the movement from the starting position
 */
export type MovementSequence = number[]
/**
 * a trigger identifies the time when a role should start moving
 * with a provided duration
 * 
 * the juggler in the identified role will always walk the next
 * segment in their current sequence
 * 
 * for example in scrambled V, role B starts walking after beat
 * 5; the walk animation may start at 5.5 for 3.5 beats.
 */
export type MovementTrigger = {
    onBeat: number,
    mod: number,
    role: Role,
    duration: number,
}
export type RelabelAnimation = {
    onBeat: number,
    mod: number,
    changes: [Role, Role][] // oldRole, newRole
}

export function createPattern(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [Beat, Role[]][]): Pattern {
    return new PatternImpl(throws, nrHands, mapRows, roles)
}


export {applyManipulations, fillPatternGaps}