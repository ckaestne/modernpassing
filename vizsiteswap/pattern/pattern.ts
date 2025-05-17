import { PatternImpl, ThrowImpl } from "./pattern-impl.ts";

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
 * a representation of an (infinitely repeating) pattern, similar to JIF, with various functions for making changes
 * and computes properties of the pattern or its throws
 * 
 * can represent both sync and siteswap patterns (nrHands = 2 or 4). it can have multiple
 * throws on the same beat to model fully-sync patterns (e.g., 8club2count)
 * 
 * has markers for takeout actions, though takeouts are otherwise just represented as normal throws
 * (it's the responsibility of the manipulator module to convert Aidan notation into a pattern)
 * 
 * each row corresponds to a physical passer, not to a role. Roles are just names assigned
 * to passers at specific points in the pattern.
 * 
 * for repetition, mapping is needed:
 * - `mapRows` identifies how physical passers repeat the pattern with another row
 *   For example, in an odd-period 4-handed siteswap, the passer in the first row
 *   continues with the passes of the second row in the second iteration.
 * - `mapHands` and `mapCrossing` identify how the hand sequence is repeated or alternated,
 *   described below
 * 
 * the pattern is fundamentally circular and will always repeat over the period end 
 * (with row mapping if needed). it may require multiple iterations to get back to the
 * original start (e.g., with more than 2 passers or with siteswaps switching hands)
 * 
 * Roles, stored in `roles`, are purely decorative and can change with mapping at the end of the pattern
 * or due to relabeling during the pattern for manipulations.
 * 
 * All information in throws is relative to the first iteration of the pattern and
 * differences for subsequent iterations will be computed based on the mapping.
 * Information of throws is usually relative to the throw beat in the first iteration;
 * the key exception is the `toPasserIdx` which indicates the receiving passer on
 * the causal beat, which may be a different row than on the throw beat due to mapping.
 * 
 * As a special feature there are prefix throws that
 * are only thrown before the first iteration of the pattern, but then never again
 * Prefix throws are thrown on times -1, -2 etc. They are ignored for all computations
 * except validity checking, starting hands, and rendering
 * 
 * hand sequence is nontrivial:
 * - each throw indicates the hand it is thrown from and whether it is crossing/straight 
 *   with regards to the first round. note that crossing indicates a throw from a right to a left hand and
 *   vice versa, which makes straight passes be modeled as crossing throws.
 * - a pattern can have a throw from each hand on each beat for fewer (including no throw),
 *   but not multiple throws from the same hand
 * - left and right hand starts can swap for each passer across iterations. This is modeled
 *   with `mapHands`, which indicates for each passer whether the next iteration starts
 *   with the same or the opposite hand. 
 *   For an even period sync patterns, no hands change; for an odd period sync pattern all
 *   hands change; for a four-handed siteswap only the passer with the odd number of throws
 *   changes hands.
 * - To handle crossing and straight passes in four-handed siteswaps, `mapCrossing` indicates
 *   whether straight and flipping should be flipped from what is notated for the first iteration
 *   in the throws (this only applies to passes). For four-handed siteswaps all passers switch 
 *   straight/crossing every period.
 * - Prefix throws are always thrown with the hand indicated in the throw, as if they were
 *   part of the first iteration. No mapping is done before the end of the first period.
 * - `isValid` checks that a unique incoming throw and outgoing throw are from the same hand if there
 *   is a throw on a beat from a hand.
 * - There is no assumption built in that indicates whether any specific throw height is straight
 *   or crossing or whether the pattern starts left-handed or right-handed. This is modeled with
 *   information for individual throws.
 *   
 * 
 * This allows us to model:
 * - normal normal even period patterns just alternate left and right in the throws and don't require adjustments (`mapHands = [[false], [false]]`)
 * - normal sync odd period patterns switch left and right every period with `mapHands = [[true], [true]]`
 * - odd period four-handed siteswaps shift the passer's hand of one passer `mapHands = [[true], [false]]`;
 *   left/right starts and straight/crossing passes is modeled directly in the throws
 * - 7-club two count with straight doubles can be modeled as a left-hand start and straight double
 *   passes directly in the throws
 * - Jim's patterns by simply throwing multiple passes with the same hand in a row as modeled
 *   in the throws
 * - All-sync patterns by having both left and right hands throw on the same beat, as modeled in the throws
 * - Walking patterns like Ambled V where hand order switches mid pattern are modeled like Jim's patterns
 * For many of these the difficulty is in parsing the right behavior from a notation, not in modeling this
 * 
 * (this representation does not know about manipulators, positions, or movement; roles are tracked as decoration)
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

    findThrow(throwBeat: Beat, fromPasserIdx?: number, toPasserIdx?: number, fromHand?: Hand, toHand?: Hand): Throw | undefined

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
    findThrowsByRoleAtCausal(time: Time, fromRole?: Role, toRoleAtCausal?: Role): Throw[]


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
    /**
     * another version of the same idea for convenience -- find which row 
     * the passer on rowIdx at currentTime will be at newTime
     * 
     * same as samePasserNBeatsLater(rowIdx, currentTime, newTime - currentTime)
     * 
     * @param rowIdx rowidx of the passer
     * @param currentTime time to which the provided rowIdx relates
     * @param newTime time for which an updated rowIdx is needed
     */
    samePasserOtherTime(rowIdx: number, currentTime: Time, newTime: number): number



    prettyPrintThrows(): string

    /**
     * returns the period length of the pattern
     * 
     * assumes that the pattern ends one beat after the last throw
     * 
     * does not consider any possible prefix
     * @returns 
     */
    getLength(): number

    getPrefixLength(): number

    getThrowCauseTime(t: Throw): number

    getThrowCauseTime_(throwTime: number, throwLength: number): number

    getThrowCauseBeat(t: Throw): number
    getThrowCauseBeat_(throwTime: number, throwLength: number): number

    getThrowCauseLength(t: Throw): number

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
    getStartingHands(): [number, number][]


    // hand modeling

    /**
     * mapping happens at the end of a period, like mapRows
     * - mapHands = true for a row indicates that the passer next for this row switches left and right hands to be opposite of those of the first period (two trues switch back). If there is an array of n switches, they are only applied every n periods to model longer more complicated sequences
     * - mapCrossing = true for a row indicates that the next passer switches straight and crossing passes compared to those in the first period (two trues switch back). If there is an array of n switches, they are only applied every n periods to model longer more complicated sequences
     **/
    readonly mapHands: boolean[][] // swapping of labels for subsequent rounds; false = same hand, true = flipped left/right; one entry per row, entry contains array for n-periods until the pattern repeats (often just 1 or is entirely mirrored)
    readonly mapCrossing: boolean[][]
    readonly initialHands: Hand[] // initial hands for each passer for the first beat of the pattern (not counting prefix throws); undefined for default for all right-handed

    /**
     * computes the actual hand of a throw, based on the hand indicated in `t`
     * and `flipCrossing` and `swapHands`
     * 
     * iterations start with 0, negative iterations are allowed
     * 
     * we assume time = iteration*patternLength + t.throwBeat
     */
    getThrowHand(t: Throw, iteration: number): Hand

    /**
     * computed hand purely by getThrowHand(t) and t.isCrossing 
     * adjusted by `mapHands` and `mapCrossing`
     * 
     * If it crosses the pattern boundary, it returns to hand of
     * the juggler in the next iteration. To compute the
     * corresponding hand in the first iteration use
     * `getTargetHandFirstIteration` which finds hand catching
     * this throw in the first iteration (assuming it was thrown
     * in a prior iteration)
     */
    getTargetHand(t: Throw, iteration: number): Hand

    getTargetHandFirstIteration(t: Throw): Hand

    isCrossingPass(t: Throw, iteration: number): boolean 
    isSelfThrow(t: Throw): boolean 

    /** 
     * computes the number of iterations needed for the pattern to repeat.
     * repeating implies the same physical passers start the period in the same role, with the same hand, and the same james/not-james state.
     * 
     * Since the Pattern does not know about positions, movement and positions
     * are not relevant for the computation
     * 
     * for example, four-count repeats every iteration, three-count every other, 4hsiteswaps after 4,
     * roundabout after 6, and so forth
     **/
    iterationsUntilRepeat(): number
}


export interface Throw {
    /**
     * the beat of the pattern on which this throw is thrown
     * 
     * beat, not time; whole number, 0 <= beat < pattern length
     */
    readonly throwBeat: Beat

    /**
     * this is the row corresponding to the first iteration of the pattern; 
     * it does not care about relabeling from intercepts, labels can be derived from this
     * 
     * for the role see also `pattern.getFromPasserRole`
     */
    readonly fromPasserIdx: number

    /**
     * hand from which this throw is thrown in the first iteration
     */
    readonly fromHand: Hand

    /**
     * whether the throw is crossing (with regards to hands)
     * (note that traditional straight passes are crossing from a right to a left hand)
     */
    readonly isCrossing: boolean

    /**
     * the height of the throw in siteswap terminology (3 or 6 is a self depending on whether we use 2 or 4 handed siteswaps as the timing)
     */
    readonly throwLength: number

    /**
     * this is the row of the receiving passer on the causal beat
     * 
     * this can be unintuitive if we pass through the end of the pattern due to remapping.
     * so a self may well point to another row in the next round.
     * 
     * This is not how we think in terms of targets (pA means pass who the row where
     * A is at the time of the throw, not the time of the catch), but it is the better
     * internal representation.
     * 
     * To get the row/role of the throw at the time of the throw, use `pattern.getToPasserIdxAtThrow`
     * or `pattern.getToPasserRole`
     */
    readonly toPasserIdxAtCausal: number

    /**
     * optional markers to indicate what kind of throw this is; multiple markers possible
     */
    readonly markers?: ThrowType[],

    /**
     * optional free text note for this throw, mostly for debugging
     */
    readonly note?: string
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
    fromHand: Hand,
    isCrossing: boolean,
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
    // static: GroupPatternStaticLayout,
    // frames?: FrameLayout[],
    animation?: AnimationLayout,
    background?: BackgroundLayout[]
}
// export type FrameLayout = { label: string, static: GroupPatternStaticLayout }

export type Role = string
// export type GroupPatternStaticLayout = {
//     positions: PositionLayout[],
//     passes: PassLayout[]
// }
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
    segments: (number | string)[],
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
    relabeling: RelabelAnimation[],
    speed: number // relative speed, normal = 1, 4hsw = 2
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
    path: (number | string)[], // path instructions using C or A for curves and arches in SVG path notation
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

export function createPattern(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [Beat, Role[]][], mapHands?: boolean[][], mapCrossing?: boolean[][], initialHands?: Hand[], patternLength?: number): Pattern {
    return new PatternImpl(throws, nrHands, mapRows, roles, mapHands, mapCrossing, initialHands, patternLength)
}

export function createThrow(
    throwBeat: number,
    fromPasserIdx: number,
    fromHand: Hand,
    isCrossing: boolean,
    toPasserIdxAtCausal: number,
    throwLength: number,
    markers?: ThrowType[],
    note?: string
) {
    return new ThrowImpl(
        throwBeat,
        fromPasserIdx,
        fromHand,
        isCrossing,
        toPasserIdxAtCausal,
        throwLength,
        markers,
        note
    )
}

