import { PatternImpl, ThrowImpl } from "./pattern-impl.ts";

export type Role = string

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
 * - `globalHandOrder` defines the global hand sequence that all passers follow,
 *   e.g., [Right, Left] for alternating patterns or [Right, Right, Left, Left] for 4-handed patterns
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
 * hand sequence is fairly simple: by default, there is a global hand-order that
 * just proceeds through the pattern. The second iteration of the pattern continues
 * the global hand sequence where the first one left off.
 * - Throws can intentionally be thrown from the "wrong" hand, such as in 7-club 2 count
 *   with straight doubles. This is indicated with `fromOppositeHand: true` in the throw.
 * - To model simultaneous throws from both hands, a pattern can include two throws on the same
 *   beat, with `fromOppositeHand` set to true for one of the throws.
 * - A throw from the default hand will land on the default hand of the time it gets rethrown,
 *   this will automatically handle crossing/straight throws in 4-handed siteswaps. To force
 *   a throw to the "wrong" hand (as with x in siteswap 4x), set `flipCrossing: true` in the throw.
 * - Prefix throws follow the same rules, the hand sequence is just propagated back
 * - `isValid` checks that a unique incoming throw and outgoing throw are from the same hand if there
 *   is a throw on a beat from a hand.
 *   
 * 
 * This allows us to model:
 * - normal even period patterns with alternating hands using globalHandOrder = [Right, Left]
 * - four-handed siteswaps using globalHandOrder = [Right, Right, Left, Left] (or also [Right, Left, Left, Right] for B starting, etc)
 * - 7-club two count with straight doubles can be modeled with B doing all throws from the opposite
 *   hand and all passes being marked as flipCrossing: true
 * - Jim's patterns have many throws from the opposite hand
 * - All-sync patterns by having both left and right hands throw on the same beat, one of each modeled as `fromOppositeHand: true`
 * - Walking patterns like Ambled V where hand order switches mid pattern are modeled like Jim's patterns, with the relevant throws being marked as `fromOppositeHand: true`
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

    findThrow(throwBeat: Beat, fromPasserIdx?: number, toPasserIdxAtCausal?: number, fromHand?: Hand, toHand?: Hand): Throw | undefined

    findThrows(throwBeat: Beat, fromPasserIdx?: number, toPasserIdxAtCausal?: number): Throw[]

    /**
     * Find a throw in the pattern that is thrown on beat $beat from/to passers
     * identified by their roles on that beat
     * (that is using role at the throw beat, not at the causal beat)
     */
    findThrowsByRoleAtThrow(beat: Beat, fromRole?: Role, toRoleAtThrow?: Role): Throw[]


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

    /**
     * helper function to do the same transformation as `samePasserOtherTime`
     * but with roles
     */
    samePasserOtherTimeByRole(role: Role, currentTime: Time, newTime: Time): Role



    prettyPrintThrows(withColor?: boolean): string

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


    getToPasserIdxOnCausal(t: Throw): number

    getToPasserIdxAtThrow(t: Throw): number

    getFromPasserRole/*atThrow*/(t: Throw): Role
    getToPasserRole/*atThrow*/(t: Throw): Role


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
    readonly globalHandOrder: Hand[] // global hand sequence, e.g., [Right, Left] or [Right, Right, Left, Left]
    readonly globalHandOrderOffset: number // number of hands to skip after each iteration

    /**
     * Get default hand on a beat in an iteration using global hand order sequence
     * 
     * @param iteration - which iteration of the pattern
     * @param beat - which beat within the pattern
     * @returns Hand for this time (same for all passers)
     */
    getGlobalHand(iteration: number, beat: number): Hand

    /**
     * computes the actual hand of a throw, based on the hand indicated in the throw
     * and the global hand order sequence
     * 
     * iterations start with 0, negative iterations are allowed
     * 
     * we assume time = iteration*patternLength + t.throwBeat
     */
    getThrowHand(t: Throw, iteration: number): Hand

    /**
     * computed hand purely by getThrowHand(t) and t.flipCrossing 
     * using the global hand order system
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

    isStraightPass(t: Throw, iteration: number): boolean
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
     * whether the throw comes from the opposite hand (relative to the current global hand order)
     * false means it comes from the default hand (as per global hand order) for this passer at this time
     * true means it comes from the opposite hand
     */
    readonly fromOppositeHand: boolean

    /**
     * by default, a throw thrown from the default hand (as per global hand order)
     * arrives at the default hand of the target beat (as per global hand order).
     * a throw thrown from the opposite hand arrives at the opposite hand of the target beat.
     * 
     * if flipCrossing is true, this is reversed and the throw arrives at the opposite hand of what would be expected
     * (i.e., opposite of default hand when thrown from default hand, default hand when thrown from opposite of the default hand)
     */
    readonly flipCrossing: boolean

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
    readonly markers?: ThrowMarker[]

    /**
     * optional free text note for this throw, mostly for debugging
     */
    readonly note?: string
}

/**
 * the marker stores information about the throw, especially for throws resulting from manipulations
 * 
 * for manipulation-induced throws, it also stores the roles involved, which is useful for animation
 * and reasoning about original throws. Roles here are always fully resolved for from/to
 */
export interface ThrowMarker {
    kind: string
}
export const baseMarker: ThrowMarker = { kind: 'B' }
export const baseManipulatorMarker: ThrowMarker = { kind: 'M' }
export interface SubstitutionMarker extends ThrowMarker {
    kind: 'S',
    throw: 'P' | 'S'/*pelf or substituted*/,
    fromRole: Role, // actually from fromRole to manipulator and from manipulator to toRoleAtThrow
    toRoleAtThrow: Role,
    modifiers: string
    uniqueKey: number // links two SubstitutionActions (pelf and sub) together -- they share the same key if they originate from the same action
}
export interface InterceptMarker extends ThrowMarker {
    kind: 'I',
    fromRole: Role,
    originalFromRole: Role, // usually same as fromRole unless the intercepted throw is substituted -- needed to track the original origin of the throw for position computations
    originalToRoleAtThrow: Role, // actually to manipulator
    originalThrowLength: number,
    modifiers: string
}
export interface CarryMarker extends ThrowMarker {
    kind: 'C',
    originalFromRole: Role, // actually from manipulator
    toRoleAtThrow: Role,
    carryDelay: number, //how many beats after the IBeat
    modifiers: string
}
export const filledMarker: ThrowMarker = { kind: 'F' } // automatically filled non-actions or automated actions (hold or empty hand or zip)



export type ManipulatorAction = InterceptAction | CarryAction | SubstitutionAction | ThrowAction
export type InterceptAction = {
    beat: Beat,
    fromPasserRole?: Role,
    toPasserRole: Role, // at throw time
    manipulatorRole: Role,
    kind: 'I'
    modifiers: string
}
export type SubstitutionAction = {
    beat: Beat,
    fromPasserRole?: Role,
    toPasserRole: Role, // at throw time
    manipulatorRole: Role,
    kind: 'S'
    modifiers: string
}
export type ThrowAction = {
    beat: Beat,
    throwLength: number,
    toPasserRole: Role, // at throw time
    manipulatorRole: Role,
    fromOppositeHand: boolean,
    flipCrossing: boolean,
    modifiers: string
    kind: 'T'
}
export type CarryAction = {
    beat: Beat,
    toPasserRole?: Role, // at throw time
    manipulatorRole: Role,
    kind: 'C', // carry
    modifiers: string
}






export function createPattern(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [Beat, Role[]][], globalHandOrder?: Hand[], patternLength?: number, globalHandOrderOffset?: number): Pattern {
    if (!globalHandOrder) {
        globalHandOrder = nrHands ===2?[Hand.Right, Hand.Left]:[Hand.Right, Hand.Right, Hand.Left, Hand.Left]
    }
    return new PatternImpl(throws, nrHands, mapRows, roles, globalHandOrder, globalHandOrderOffset ?? 0, patternLength)
}


export function createTwoHandedPattern(throws: Throw[], mapRows: number[], roles: Role[] | [Beat, Role[]][], patternLength?: number, prefixLength?: number, globalHandOrderOffset?: number): Pattern {
    const globalHandOrder = [Hand.Right, Hand.Left]
    return new PatternImpl(throws, 2, mapRows, roles, globalHandOrder, globalHandOrderOffset ?? 0, patternLength, prefixLength)
}

export function createFourHandedPattern(throws: Throw[], mapRows: number[], roles: Role[] | [Beat, Role[]][], patternLength?: number, globalHandOrderOffset?: number): Pattern {
    const globalHandOrder = [Hand.Right, Hand.Right, Hand.Left, Hand.Left]
    return new PatternImpl(throws, 4, mapRows, roles, globalHandOrder, globalHandOrderOffset ?? 0, patternLength)
}

export function createThrow(
    throwBeat: number,
    fromPasserIdx: number,
    fromOppositeHand: boolean,
    flipCrossing: boolean,
    toPasserIdxAtCausal: number,
    throwLength: number,
    markers?: ThrowMarker[],
    note?: string
) {
    return new ThrowImpl(
        throwBeat,
        fromPasserIdx,
        fromOppositeHand,
        flipCrossing,
        toPasserIdxAtCausal,
        throwLength,
        markers,
        note
    )
}

