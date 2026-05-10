/**
 * Tracks and resolves movement segments within the location manager through a dedicated LocationTracker class
 */

import type { MovementAnimation } from "@modernpassing/layout"
import type { Role } from "@modernpassing/pattern"
import assert from "node:assert"
import type { MovementSegmentSpec } from "../animation-spec.ts"
import { createPasserIdx, genPath, helperSvg, type PasserIdx } from "./helpers.ts"
import { on } from "node:events"
import { skip } from "node:test"
import { truncateAnimation } from "./truncate-svg-path.ts"
import { parentPort } from "node:worker_threads"

/**
 * MovementSegment describes a resolved or unresolved movement of a passer.
 * This is an intermediate representation used to resolve RelativeMovementSpecs to DirectMovementAnimations.
 *
 * Resolved movements are expressed in terms a concrete path (MovementSegmentSpec) that directly
 * translate to DirectMovementAnimation.
 * Unresolved movements happen between a starting point (to be resolved) and an
 * end point defined relative to other passers (to be resolved).
 */

export abstract class MovementSegment {
    readonly passerIdx: PasserIdx
    readonly onBeat: number
    readonly duration: number

    /**
     * skipInFirstIteration indicates that this movement should be skipped in the first iteration of the pattern;
     * the passer will start at the end position of the last skipped movement
     *
     * Multiple movements may be skipped, starting with the first movement that ends in the first iteration
     * (possibly wrapping from a prior iteration). If multiple movements are skipped, they must be consecutive
     * at the beginning
     */
    readonly skipInFirstIteration: boolean

    // positions remain undefinded until resolved; fromPosition from the first iteration may remain unresolved if skipInFirstIteration is true
    readonly fromPositionFirstIteration: [number, number] | undefined
    readonly fromPositionNextIteration: [number, number] | undefined
    readonly toPositionFirstIteration: [number, number] | undefined // needed even if skipInFirstIteration is true, as the next movement starts from there
    readonly toPositionNextIteration: [number, number] | undefined
    readonly toPositionPriorIteration: [number, number] | undefined // rarely needed, but the first iteration may depend on the to position of a move in the -1 iteration
    readonly segFirstIteration: MovementSegmentSpec | undefined
    readonly segNextIteration: MovementSegmentSpec | undefined
    readonly spec: UnresolvedRelativeMovementSpec | undefined

    constructor(
        passerIdx: PasserIdx,
        onBeat: number,
        duration: number,
        skipInFirstIteration: boolean,
        spec?: UnresolvedRelativeMovementSpec,
        fromPositionFirstIteration?: [number, number],
        fromPositionNextIteration?: [number, number],
        toPositionFirstIteration?: [number, number],
        toPositionNextIteration?: [number, number],
        toPositionPriorIteration?: [number, number],
        segFirstIteration?: MovementSegmentSpec,
        segNextIteration?: MovementSegmentSpec,
    ) {
        this.passerIdx = passerIdx
        this.onBeat = onBeat
        this.duration = Math.round(duration * 10000) / 10000
        this.skipInFirstIteration = skipInFirstIteration
        this.fromPositionFirstIteration = fromPositionFirstIteration
        this.fromPositionNextIteration = fromPositionNextIteration
        this.toPositionFirstIteration = toPositionFirstIteration
        this.toPositionNextIteration = toPositionNextIteration
        this.toPositionPriorIteration = toPositionPriorIteration
        this.segFirstIteration = segFirstIteration
        this.segNextIteration = segNextIteration
        this.spec = spec
        assert(spec || (fromPositionNextIteration && toPositionNextIteration && segNextIteration), "Either spec or all positions and segments must be defined")
        assert(skipInFirstIteration || spec || (fromPositionFirstIteration && toPositionFirstIteration && segFirstIteration), "Either spec or all positions and segments must be defined")
    }

    isResolved(): boolean {
        return (this.fromPositionFirstIteration !== undefined || this.skipInFirstIteration) &&
            this.fromPositionNextIteration !== undefined &&
            (this.toPositionFirstIteration !== undefined) &&
            this.toPositionNextIteration !== undefined
    }

    /**
     * function that produces the format used for animations, where
     * all paths are resolved
     */
    getAnimations(): MovementAnimation[] {
        assert(this.isResolved(), "MovementSegment must be resolved to produce MovementAnimation")
        if (this.skipInFirstIteration) {
            return [{
                passerIdx: this.passerIdx,
                onBeat: this.onBeat,
                duration: this.duration,
                movementSpec: this.segNextIteration!,
                firstIteration: false,
            }]
        }
        if (eqSeg(this.segFirstIteration, this.segNextIteration)) {
            return [{
                passerIdx: this.passerIdx,
                onBeat: this.onBeat,
                duration: this.duration,
                movementSpec: this.segNextIteration!,
                firstIteration: undefined,
            }]
        }
        return [
            {
                passerIdx: this.passerIdx,
                onBeat: this.onBeat,
                duration: this.duration,
                movementSpec: this.segFirstIteration!,
                firstIteration: true,
            },
            {
                passerIdx: this.passerIdx,
                onBeat: this.onBeat,
                duration: this.duration,
                movementSpec: this.segNextIteration!,
                firstIteration: false,
            },
        ]
    }

    resolveFromPositionFirstIteration(loc: [number, number] | undefined): MovementSegment {
        if (this.fromPositionFirstIteration !== loc) {
            return new MovementSegmentImpl(
                this.passerIdx,
                this.onBeat,
                this.duration,
                this.skipInFirstIteration,
                this.spec,
                loc,
                this.fromPositionNextIteration,
                this.toPositionFirstIteration,
                this.toPositionNextIteration,
                this.toPositionPriorIteration,
                this.toPositionFirstIteration && loc ? createDirectMovementSpec(loc, this.toPositionFirstIteration, this.spec!.bend) : this.segFirstIteration,
                this.segNextIteration,
            )
        }
        return this
    }
    resolveFromPositionNextIteration(loc: [number, number] | undefined): MovementSegment {
        if (this.fromPositionNextIteration !== loc) {
            return new MovementSegmentImpl(
                this.passerIdx,
                this.onBeat,
                this.duration,
                this.skipInFirstIteration,
                this.spec,
                this.fromPositionFirstIteration,
                loc,
                this.toPositionFirstIteration,
                this.toPositionNextIteration,
                this.toPositionPriorIteration,
                this.segFirstIteration,
                this.toPositionNextIteration && loc ? createDirectMovementSpec(loc, this.toPositionNextIteration, this.spec!.bend) : this.segNextIteration,
            )
        }
        return this
    }
    resolveToPositionFirstIteration(loc: [number, number] | undefined): MovementSegment {
        if (this.toPositionFirstIteration !== loc) {
            return new MovementSegmentImpl(
                this.passerIdx,
                this.onBeat,
                this.duration,
                this.skipInFirstIteration,
                this.spec,
                this.fromPositionFirstIteration,
                this.fromPositionNextIteration,
                loc,
                this.toPositionNextIteration,
                this.toPositionPriorIteration,
                this.fromPositionFirstIteration && loc ? createDirectMovementSpec(this.fromPositionFirstIteration, loc, this.spec!.bend) : this.segFirstIteration,
                this.segNextIteration,
            )
        }
        return this
    }
    resolveToPositionNextIteration(loc: [number, number] | undefined): MovementSegment {
        if (this.toPositionNextIteration !== loc) {
            return new MovementSegmentImpl(
                this.passerIdx,
                this.onBeat,
                this.duration,
                this.skipInFirstIteration,
                this.spec,
                this.fromPositionFirstIteration,
                this.fromPositionNextIteration,
                this.toPositionFirstIteration,
                loc,
                this.toPositionPriorIteration,
                this.segFirstIteration,
                this.fromPositionNextIteration && loc ? createDirectMovementSpec(this.fromPositionNextIteration, loc, this.spec!.bend) : this.segNextIteration,
            )
        }
        return this
    }
    resolveToPositionPriorIteration(loc: [number, number] | undefined): MovementSegment {
        // this is only ever used as a dependency to identify the from location of another move,
        // no need to adjust a path/segment
        if (this.toPositionPriorIteration !== loc) {
            return new MovementSegmentImpl(
                this.passerIdx,
                this.onBeat,
                this.duration,
                this.skipInFirstIteration,
                this.spec,
                this.fromPositionFirstIteration,
                this.fromPositionNextIteration,
                this.toPositionFirstIteration,
                this.toPositionNextIteration,
                loc,
                this.segFirstIteration,
                this.segNextIteration,
            )
        }
        return this
    }

    doSkipInFirstIteration(): MovementSegment {
        return new MovementSegmentImpl(
            this.passerIdx,
            this.onBeat,
            this.duration,
            true,
            this.spec,
            undefined, //this.fromPositionFirstIteration,
            this.fromPositionNextIteration,
            this.toPositionFirstIteration,
            this.toPositionNextIteration,
            undefined,
            undefined, // this.segFirstIteration,
            this.segNextIteration,
        )
    }

    /**
     * whether the movement wraps around, i.e. starts at a high beat
     * and ends at a low beat of the next iteration
     *
     * @param mod
     * @returns
     */
    isCrossingIterationBoundary(mod: number): boolean {
        return this.onBeat + this.duration >= mod
    }

    /**
     * returns whether the movement is going on during a specific time
     *
     * the start and end times are not included
     *
     * @param time
     * @param mod
     * @returns
     */
    isOngoingAt(time: number, mod: number): boolean {
        return (time - this.onBeat + mod) % mod < this.duration
    }

    /**
     * computes whether a movement is considered as first iteration at a given time
     *
     * this is a bit tricky: if the movement is entirely within the iteration boundaries,
     * then any time before and during the movement are considered as first;
     * if the movement crosses the iteration boundary, then only the times where the
     * first movement wraps around are considered first
     *
     * @param time
     * @param mod
     * @returns
     */
    isFirstIterationAt(time: number, mod: number): boolean {
        // first iteration is determined by the time the movement ends, not starts
        return this.isOngoingAt(time, mod) ? time < (this.onBeat + this.duration) % mod : this.isCrossingIterationBoundary(mod) ? false : time < this.onBeat
    }

    /**
     * returns time since the movement last started before $time
     *
     * the start may be in the previous iteration
     *
     * @param time
     * @param mod
     * @returns 0 <= timeSince < mod
     */
    timeSinceMovementStartAt(time: number, mod: number): number {
        return (time - this.onBeat + mod) % mod
    }

    truncateToDuration(newDuration: number) {
        if (this.duration === newDuration) return this

        assert(this.segFirstIteration && this.segNextIteration, "Cannot truncate unresolved movement segment")

        const firstSeg = this.segFirstIteration ? truncateAnimation(this.segFirstIteration, 0, (this.duration - newDuration) / this.duration) : undefined
        const nextSeg = this.segNextIteration ? truncateAnimation(this.segNextIteration, 0, (this.duration - newDuration) / this.duration) : undefined

        return new MovementSegmentImpl(
            this.passerIdx,
            this.onBeat,
            newDuration,
            this.skipInFirstIteration,
            this.spec,
            this.fromPositionFirstIteration,
            this.fromPositionNextIteration,
            [firstSeg!.toX, firstSeg!.toY],
            [nextSeg!.toX, nextSeg!.toY],
            undefined,
            firstSeg,
            nextSeg,
        )
    }

    /**
     * gets the to position relative to a given time
     *
     * it is assumed that this is latest the movement before that time
     * if that time is early in the first iteration, we might return the position of iteration -1
     *
     * @param beforeTime
     * @param mod
     * @returns
     */
    getToPosition(beforeTime: number, mod: number): [number, number] | undefined {
        const isFirstIteration = beforeTime < mod
        // if the time is in the first iteration and this movement is entirely in the iteration before
        if (isFirstIteration && this.onBeat >= beforeTime && this.onBeat + this.duration <= mod) {
            return this.toPositionPriorIteration
        }
        // if this movement itself is in the first iteration
        if (this.isFirstIterationAt(beforeTime - mod, mod)) {
            return this.toPositionFirstIteration
        }

        return this.toPositionNextIteration
    }
}

class MovementSegmentImpl extends MovementSegment {}

export function createUnresolvedMovementSegment(
    passerIdx: PasserIdx,
    onBeat: number,
    duration: number,
    skipInFirstIteration: boolean,
    spec: UnresolvedRelativeMovementSpec,
    toPositionFirstIteration?: [number, number],
    toPositionNextIteration?: [number, number],
    toPositionPriorIteration?: [number, number],
): MovementSegment {
    const ms = new MovementSegmentImpl(
        passerIdx,
        onBeat,
        duration,
        skipInFirstIteration,
        spec,
        undefined,
        undefined,
        toPositionFirstIteration,
        toPositionNextIteration,
        toPositionPriorIteration,
        undefined,
        undefined,
    )
    assert(!ms.isResolved(), "Created unresolved movement segment must not be resolved")
    return ms
}

export function createResolvedMovementSegmentFromSegmentSpec(passerIdx: PasserIdx, onBeat: number, duration: number, spec: MovementSegmentSpec, skipInFirstIteration: boolean): MovementSegment {
    const from: [number, number] = [spec.fromX, spec.fromY]
    const to: [number, number] = [spec.toX, spec.toY]
    const ms = new MovementSegmentImpl(
        passerIdx,
        onBeat,
        duration,
        skipInFirstIteration,
        undefined,
        from,
        from,
        to,
        to,
        to,
        spec,
        spec,
    )
    assert(ms.isResolved(), "Created movement segment must be resolved")
    return ms
}

export type UnresolvedRelativeMovementSpec = {
    positionSpec: UnresolvedTakePositionSpec | UnresolvedBetweenPositionSpec | UnresolvedInFrontOfPositionSpec // positions are computed relative to where base roles fromRole and toRole (identified on time of beat) would be be at the end of the movement at the time (ie., onBeat+duration) -- note, the passer is identified by a role at an earlier time than where the passer's (not role's) position is computed
    bend?: "↻" | "↺"
}

// take is unusual in that it is depending on a position in the base pattern, not the current pattern
// hence, the target position in the base pattern can be looked up and resolved when creating the spec
export type UnresolvedTakePositionSpec = {
    type: "take"
    // toX: number,
    // toY: number
}
export type UnresolvedBetweenPositionSpec = {
    type: "between"
    between: [PasserIdx, PasserIdx]
    side: number // relative distance: .5 is in the middle, 0.1 near the second role, 0 is where the second role is, ...
    offset: number // absolute distance: 0 is in the passing lane between the roles, .2 is further to the outside of the righthand pass, -.2 is further to the outside of the lefthand pass
    direction: number // in degree; 0 is facing the second role, 90 (clockwise) is facing sideways to substitute a righthand pass to
}
export type UnresolvedInFrontOfPositionSpec = {
    type: "infront"
    toPasserIdx: PasserIdx
    direction: number // in degree; 0 is facing the role, 90 and -90 is standing next to them
}

export class MovementTracker {
    readonly mod: number
    readonly movements: MovementSegment[]
    readonly startingPositions: ([number, number] | undefined)[] // starting positions; expect it to be defined for all non-manipulators
    constructor(mod: number, movements: MovementSegment[], startingPositions: ([number, number] | undefined)[]) {
        this.mod = mod
        this.movements = movements
        this.startingPositions = startingPositions
    }

    resolve(): MovementTracker {
        // assume everything is sorted and trunctated (i.e. movements do not overlap)
        // and that skipInFirstIteration is consistent at the beginning
        dbgAssert(this.movements.every((mov, i) => i === 0 || this.movements[i - 1].onBeat <= mov.onBeat), "All movements must be sorted by onBeat")
        for (const mov of this.movements) {
            const [prior, _] = this._findPriorMovement(mov.onBeat, mov.passerIdx)
            if (prior && prior !== mov) {
                dbgAssert(!overlap(mov, prior, this.mod), "All movements must be truncated and not overlap, but found overlap between: " + JSON.stringify(mov) + " and " + JSON.stringify(prior))
                const movIsWrapping = mov.isCrossingIterationBoundary(this.mod)
                dbgAssert(
                    movIsWrapping || !mov.skipInFirstIteration || prior.onBeat > mov.onBeat || prior.skipInFirstIteration,
                    "If a movement is skipped in the first iteration, all prior movements must also be skipped in the first iteration. Found: " + JSON.stringify(mov) + " after " + JSON.stringify(prior),
                )
            }
        }

        let movementTracker = this.resolveNextMovement()
        if (movementTracker === this) {
            return movementTracker
        }
        while (movementTracker.hasUnresolvedMovements()) {
            const newMovementTracker = movementTracker.resolveNextMovement()
            if (newMovementTracker === movementTracker) {
                break
            }
            movementTracker = newMovementTracker
        }
        return movementTracker
    }

    resolveNextMovement(): MovementTracker {
        for (let i = 0; i < this.movements.length; i++) {
            const mov = this.movements[i]
            if (!mov.isResolved()) {
                const resolvedMovement = this._tryResolveMovement(mov)
                if (resolvedMovement !== mov) {
                    const newMovements = [
                        ...this.movements.slice(0, i),
                        resolvedMovement,
                        ...this.movements.slice(i + 1),
                    ]
                    return new MovementTracker(this.mod, newMovements, this.startingPositions)
                }
            }
        }
        return this // nothing resolved
    }

    hasUnresolvedMovements(): boolean {
        return !this.movements.every((mov) => mov.isResolved())
    }

    /**
     * a previous movement must end where the next movement begins, unless the movement get's interrupted along the way
     *
     * used for tests/consistency checking
     */
    hasJumpsInMovement(): boolean {
        // check starting positions
        for (let passerIdx = 0; passerIdx < this.startingPositions.length; passerIdx++) {
            const allMovements = this.movements.filter((m) => m.passerIdx === passerIdx && !m.skipInFirstIteration)
            const firstOffset = Math.min(...allMovements.map((mv) => mv.onBeat))
            const firstMovement = allMovements.find((m) => m.onBeat === firstOffset)
            dbgAssert(
                !firstMovement || !this.startingPositions[passerIdx] || eq(firstMovement.fromPositionFirstIteration, this.startingPositions[passerIdx]),
                `Jump in starting position for passer ${passerIdx} from [${this.startingPositions[passerIdx]}] to [${firstMovement?.fromPositionFirstIteration}]`,
            )
        }

        // check consistency between each movement and the following movement
        const maxPasserIdx = this.movements.reduce((max, mov) => Math.max(max, mov.passerIdx), -1)
        for (let passerIdx = 0; passerIdx <= maxPasserIdx; passerIdx++) {
            const allMovements = this.movements.filter((m) => m.passerIdx === passerIdx)
            dbgAssert(allMovements.every((mov, i) => i === 0 || allMovements[i - 1].onBeat <= mov.onBeat), "All movements for this passer must be sorted by onBeat")
            for (let i = 0; i < allMovements.length; i++) {
                const mov = allMovements[i]
                const nextMov = allMovements[(i + 1) % allMovements.length]

                // ignoring jumps from interrupted walks
                const timeBetweenMoves = (nextMov.onBeat - mov.onBeat + this.mod) % this.mod
                if (timeBetweenMoves < mov.duration) {
                    continue
                }

                const movEndTime = (mov.onBeat + mov.duration) % this.mod
                if (nextMov.isFirstIterationAt(movEndTime, this.mod)) {
                    const priorPos = mov.getToPosition(nextMov.onBeat, this.mod)
                    dbgAssert(
                        mov.skipInFirstIteration || eq(priorPos!, nextMov.fromPositionFirstIteration),
                        `Jump in movement for passer ${passerIdx} at ${movEndTime} from [${priorPos}] to [${nextMov.fromPositionFirstIteration}]: 
  - ${JSON.stringify(mov)} 
  -> ${JSON.stringify(nextMov)}`,
                    )
                } else {
                    dbgAssert(
                        eq(mov.toPositionFirstIteration, nextMov.fromPositionNextIteration),
                        `Jump in movement for passer ${passerIdx} at ${movEndTime} from [${mov.toPositionFirstIteration}] to [${nextMov.fromPositionNextIteration}]: 
  - ${JSON.stringify(mov)} 
  -> ${JSON.stringify(nextMov)}`,
                    )
                }

                dbgAssert(
                    eq(mov.toPositionNextIteration, nextMov.fromPositionNextIteration),
                    `Jump in movement for passer ${passerIdx} at ${movEndTime}+mod from [${mov.toPositionNextIteration}] to [${nextMov.fromPositionNextIteration}]: 
  - ${JSON.stringify(mov)} 
  -> ${JSON.stringify(nextMov)}`,
                )
            }
        }
        return false
    }

    /**
     * need to resolve the position where we start and the position where we are going. if any of that fails,
     * because those are not resolved yet, we return the unmodified object
     *
     * to handle the first-round starting positions, we track separate start/end positions for first iteration and all other iterations
     */
    private _tryResolveMovement(mov: MovementSegment): MovementSegment {
        // get start position
        if (!mov.skipInFirstIteration && (mov.fromPositionFirstIteration === undefined)) {
            const [_priorMovement, priorToLocation] = this._findPriorMovement(mov.onBeat, mov.passerIdx)
            // if at the very beginning of the pattern, use the starting position
            if (!_priorMovement && this.startingPositions[mov.passerIdx]) {
                mov = mov.resolveFromPositionFirstIteration(this.startingPositions[mov.passerIdx])
            } else {
                mov = mov.resolveFromPositionFirstIteration(priorToLocation)
            }
        }
        if (mov.fromPositionNextIteration === undefined) {
            const [_prior, priorToLocation] = this._findPriorMovement(mov.onBeat + this.mod, mov.passerIdx)
            mov = mov.resolveFromPositionNextIteration(priorToLocation)
        }

        // update end positions
        if (mov.toPositionFirstIteration === undefined) {
            // we update the end position even if skipInFirstIteration is true, as the next movement starts from there
            mov = mov.resolveToPositionFirstIteration(this._resolveToSpec(mov, 0, mov.passerIdx))
        }
        if (mov.toPositionNextIteration === undefined) {
            mov = mov.resolveToPositionNextIteration(this._resolveToSpec(mov, this.mod, mov.passerIdx))
        }
        if (mov.toPositionPriorIteration === undefined) {
            mov = mov.resolveToPositionPriorIteration(this._resolveToSpec(mov, -this.mod, mov.passerIdx))
        }

        return mov
    }

    private _resolveToSpec(mov: MovementSegment, timeOffset: number, _passerIdx: PasserIdx): [number, number] | undefined {
        const endTime = mov.onBeat + mov.duration
        assert(mov.spec!.positionSpec.type !== "take", "assuming end position is always defined for Take position spec, as it comes from the base pattern")

        if (mov.spec!.positionSpec.type === "between") {
            const locA = this._resolveLocation(endTime + timeOffset, mov.spec!.positionSpec.between[0])
            const locB = this._resolveLocation(endTime + timeOffset, mov.spec!.positionSpec.between[1])
            if (locA && locB) {
                return computeLocationInBetween(locA, locB, mov.spec!.positionSpec as UnresolvedBetweenPositionSpec)
            }
        }

        if (mov.spec!.positionSpec.type === "infront") {
            const loc = this._resolveLocation(endTime + timeOffset, mov.spec!.positionSpec.toPasserIdx)
            if (loc) return computeLocationInFrontOf(loc, mov.spec!.positionSpec.direction)
        }

        return undefined
    }

    /**
     * computing the actual location, whether stationary or currently moving for a passer (not role)
     * at a given time (0<=time).
     *
     * All passers start at the position from where
     * they first walk. -- That is, if a passer would have been walking at time 0, they start
     * at the position where they would have arrived after that walk. All movements
     * with skipInFirstIteration=true are ignored for identifying the starting position
     *
     * Use this once all locations are resolved. Use _resolveLocation for a more robust
     * but expensive version that can handle unresolved movements.
     *
     * @param time Time at which to get the location (0<=time)
     * @param passerIdx Id of a physical passer, can be looked up by role at a given time if needed
     * @returns location [x,y]
     */
    _getLocation(time: number, passerIdx: PasserIdx): [number, number] {
        const pos = this._resolveLocation(time, passerIdx, true)
        assert(pos, "Could not resolve location for passer " + passerIdx + " at time " + time)
        return pos!
    }

    findOngoingAnimation(time: number, passerIdx: PasserIdx): MovementSegment | undefined {
        const allMovements = this.movements.filter((m) => m.passerIdx === passerIdx)

        // find the ongoing movement (if any) with the most recent start
        const ongoingMovement: MovementSegment | undefined = allMovements
            // keep only ongoing movements
            .filter((mov) => mov && mov.timeSinceMovementStartAt(time, this.mod) < mov.duration && mov.timeSinceMovementStartAt(time, this.mod) > 0)
            // ignore if firstIteration does not match
            .filter((mov) => mov && !ignoreOngoingOrNextDueToFirstIteration(mov, time, this.mod))
            //find the one with the most recent start
            .reduce<MovementSegment | undefined>((prev, curr) => {
                if (!prev) return curr
                else if (prev.timeSinceMovementStartAt(time, this.mod) < curr.timeSinceMovementStartAt(time, this.mod)) return prev
                else return curr
            }, undefined)
        return ongoingMovement
    }

    /**
     * assuming we are not moving right now, find the next movement and it's start position starting after $time,
     * while potentially ignoring some in the first iteration
     *
     * @param time
     * @param passerIdx
     * @returns
     */
    private _findNextMovement(time: number, passerIdx: PasserIdx): [MovementSegment, [number, number] | undefined] {
        const allMovements = this.movements.filter((m) => m.passerIdx === passerIdx)
        assert(allMovements.length > 0, "This passer never moves and no teleport provided for initial position")
        assert(allMovements.every((mov, i) => i === 0 || allMovements[i - 1].onBeat <= mov.onBeat), "All movements for this passer must be sorted by onBeat")

        // let's rotate the array to move all movements that start before time to the end
        for (let i = 0; i < allMovements.length && allMovements[0].onBeat < time % this.mod; i++) {
            // move the first movement to the end
            allMovements.push(allMovements.shift()!)
        }
        // now the first element of allMovements is the first one that starts after time % mod
        for (let i = 0; i < allMovements.length; i++) {
            const mov = allMovements[i]

            //special handling for first iteration
            if (ignoreOngoingOrNextDueToFirstIteration(mov, time, this.mod)) {
                continue
            }

            const pos = mov.isFirstIterationAt(time, this.mod) ? mov.fromPositionFirstIteration : mov.fromPositionNextIteration
            return [mov, pos]
        }
        // in the unlikely case that all movements ae skipped due to firstIteration, return the first from the second iteration
        return [allMovements[0], allMovements[0].fromPositionNextIteration]
    }

    /**
     * assuming we are not moving right now, find the prior movement and it's end position ending before $time.
     *
     * we will return a prior movement, if one exists, independent of whether the position has been resolved,
     * so returning undefined movement means no prior movement exist, whereas defined movement with undefined
     * position means prior movement exists, but position is not yet resolved
     *
     * we will return a prior movement even if skipFirstIteration is true, as we will want the toPosition
     * of that movement even if it is skipped
     *
     * if we get a prior movement of a first iteration movement, we may return the movement's toPosition in the
     * -1 iteration
     *
     * @param time
     * @param passerIdx
     * @returns
     */
    private _findPriorMovement(time: number, passerIdx: PasserIdx): [MovementSegment | undefined, [number, number] | undefined] {
        const allMovements = this.movements.filter((m) => m.passerIdx === passerIdx)
        dbgAssert(allMovements.length > 0, "This passer never moves")
        dbgAssert(allMovements.every((mov, i) => i === 0 || allMovements[i - 1].onBeat <= mov.onBeat), "All movements for this passer must be sorted by onBeat")
        allMovements.map((mov, i) =>
            dbgAssert(
                allMovements.length === 1 || !overlap(mov, allMovements[(i - 1 + allMovements.length) % allMovements.length], this.mod),
                `All movements must be truncated and not overlap, but found overlap between: ${JSON.stringify(mov)} and ${JSON.stringify(allMovements[(i - 1 + allMovements.length) % allMovements.length])}`,
            )
        )

        const isFirstIteration = time < this.mod

        // let's rotate the array to move all movements that start before time to the end
        for (let i = 0; i < allMovements.length && allMovements[0].onBeat < time % this.mod; i++) {
            // move the first movement to the end
            allMovements.push(allMovements.shift()!)
        }
        // let's go backward and find the previous movement, skipping those that are ignored due to first iteration
        for (let i = allMovements.length - 1; i >= 0; i--) {
            const mov = allMovements[i]

            // in the first iteration, do not consider movements entirely in the prior iteration, if a starting position exists (i.e, we cannot rely on this for manipulators)
            if (isFirstIteration && mov.onBeat + mov.duration > time && (mov.onBeat + mov.duration < this.mod || mov.skipInFirstIteration) && this.startingPositions[passerIdx]) {
                return [undefined, undefined]
            }

            const pos = mov.getToPosition(time, this.mod)
            return [mov, pos]
        }
        // if we skipped all due to firstIteration skipping, there is no prior movement
        return [undefined, undefined]
    }

    /**
     * like getLocation, but handles lookups forward and backward in time in case of unresolved movements
     *
     * returns undefined if the location cannot be resolved due to unresolved movements
     *
     * @param time
     * @param passerIdx
     * @param doNotStartPassersMidWalk
     * @returns
     */
    private _resolveLocation(time: number, passerIdx: PasserIdx, throwOnUnresolvedMove: boolean = false): [number, number] | undefined {
        // passer never moves -- just return starting position
        const allMovements = this.movements.filter((m) => m.passerIdx === passerIdx)
        if (allMovements.length === 0) {
            assert(this.startingPositions[passerIdx], "No movement or starting position found for passer " + passerIdx)
            const startingPosition: [number, number] = this.startingPositions[passerIdx]!
            if (!startingPosition) {
                throw new Error("No movement or starting position found for passer " + passerIdx)
            }
            return startingPosition
        }
        if (time < 0 && this.startingPositions[passerIdx]) {
            return this.startingPositions[passerIdx]
        }

        // check ongoing movements; can only return a location if it is resolved
        const ongoingMovement = this.findOngoingAnimation(time, passerIdx)
        if (ongoingMovement) {
            const spec = ongoingMovement.isFirstIterationAt(time, this.mod) ? ongoingMovement.segFirstIteration! : ongoingMovement.segNextIteration!
            if (throwOnUnresolvedMove) assert(spec, "Ongoing movement must be resolved")
            else if (!spec) return undefined
            // we are currently moving, so we need to find where on the path we are
            const progress = ongoingMovement.timeSinceMovementStartAt(time, this.mod) / ongoingMovement.duration
            const path = genPath(helperSvg, spec) // create the path in the helper SVG to get the length
            const p = path.pointAt(progress * path.length())
            return [p.x, p.y]
        }

        // so we are not moving, let's find the first movement starting after $time
        const [nextMovement, fromPosition] = this._findNextMovement(time, passerIdx)
        assert(!throwOnUnresolvedMove || fromPosition, "Movement's fromPosition must be resolved here, but found " + JSON.stringify(nextMovement))
        if (fromPosition) return fromPosition

        // second attempt to find the position while not moving: check the toPosition of the prior movement
        // there be no prior movement, or if there is one, the toPosition may not be resolved yet
        const [_priorMovement, toPosition] = this._findPriorMovement(time, passerIdx)

        // if there is no prior movement (i.e., very start of the pattern in first iteration), we use the initial location
        if (!_priorMovement && this.startingPositions[passerIdx]) {
            return this.startingPositions[passerIdx]
        }

        return toPosition
    }
}

export class ResolvedMovementTracker {
    readonly movementTracker: MovementTracker
    constructor(movementTracker: MovementTracker) {
        this.movementTracker = movementTracker
        assert(this.movementTracker.movements.every((mov) => "segment" in mov), "All movements must be resolved")
    }
}

export class RoleTracker {
    readonly mod: number
    readonly roleMapping: [number, /*onBeat*/ Role[]][]
    readonly roles: Role[]
    constructor(roles: Role[], mod: number, roleMapping: [number, /*onBeat*/ Role[]][]) {
        this.roles = roles
        this.mod = mod
        this.roleMapping = roleMapping
    }

    /**
     * indexes are only used internally, when figuring out the base locations of roles
     * -- this is not necessarily indexing a passer in a real pattern (especially with manipulators,
     * but possibly also when going over the mod boundary)
     */
    _getPasserIdx(time: number, role: Role): PasserIdx {
        const rolesAtTime = this.roleMapping.findLast((r) => r[0] <= time % this.mod)![1]
        const passerIdx = rolesAtTime.indexOf(role)
        assert(passerIdx !== -1, `Role ${role} not found at time ${time} in animation mod ${this.mod}.`)
        return createPasserIdx(passerIdx)
    }
}

function createDirectMovementSpec(startLocation: [number, number], endLocation: [number, number], bend: string | undefined): MovementSegmentSpec {
    let path: (string | number)[] = []
    if (bend) {
        const distance = Math.sqrt((endLocation[0] - startLocation[0]) ** 2 + (endLocation[1] - startLocation[1]) ** 2)
        const r = distance * 1
        path = ["A", r, r, 0, 0, bend === "↻" ? 1 : 0]
    }

    return {
        fromX: startLocation[0],
        fromY: startLocation[1],
        path,
        toX: endLocation[0],
        toY: endLocation[1],
    }
}

export function computeLocationInFrontOf(loc0: [number, number], direction: number): [number, number] {
    const [px, py] = loc0
    // default vector (direction=0) points from loc0 toward the pattern center (0.5, 0.5),
    // matching the prior side=0.6 between-with-mirror computation:
    // position = loc0 + 0.4 * (mirror - loc0) = loc0 + 0.8 * (center - loc0)
    const dx = 0.8 * (0.5 - px)
    const dy = 0.8 * (0.5 - py)
    // rotate that vector by `direction` degrees (positive = clockwise on screen, since y points down)
    const rad = direction * Math.PI / 180
    const cosA = Math.cos(rad)
    const sinA = Math.sin(rad)
    const rx = dx * cosA - dy * sinA
    const ry = dx * sinA + dy * cosA
    return [px + rx, py + ry]
}

export function computeLocationInBetween(loc0: [number, number], loc1: [number, number], betweenSpec: UnresolvedBetweenPositionSpec): [number, number] {
    const [fromX, fromY] = loc0
    let [toX, toY] = loc1

    // TODO for positioning relative to a self, for now we assume that the manipulator is facing
    // the manipulated from the middle of the space, as if they were manipulating a pass comming
    // from the point mirror position of the space.
    if (fromX === toX && fromY === toY) {
        toX = 1 - toX
        toY = 1 - toY
    }

    const x = fromX + (toX - fromX) * (1 - betweenSpec.side)
    const y = fromY + (toY - fromY) * (1 - betweenSpec.side)

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const angleDegrees = angle * (180 / Math.PI)
    // const absoluteRotation = (angleDegrees + betweenSpec.direction) % 360

    //  Compute perpendicular direction for the offset
    const perpendicularAngle = angleDegrees + 90
    const perpendicularRad = perpendicularAngle * (Math.PI / 180)
    const offsetX = betweenSpec.offset * Math.cos(perpendicularRad)
    const offsetY = betweenSpec.offset * Math.sin(perpendicularRad)

    // return [x + offsetX, y + offsetY, absoluteRotation]
    return [x + offsetX, y + offsetY]
}

export function ignoreOngoingOrPriorDueToFirstIteration(mov: MovementSegment, time: number, mod: number): boolean {
    return time < mod && mov.skipInFirstIteration
}

export function ignoreOngoingOrNextDueToFirstIteration(mov: MovementSegment, time: number, mod: number): boolean {
    // if firstIteration is true or false, match exactly
    if (mov.skipInFirstIteration && mov.isFirstIterationAt(time, mod)) {
        return true
    }

    return false
}

function eq(loc1: [number, number] | undefined, loc2: [number, number] | undefined): boolean {
    if (loc1 === undefined && loc2 === undefined) {
        return true
    }
    if (loc1 === undefined || loc2 === undefined) {
        return false
    }
    return Math.abs(loc1[0] - loc2[0]) < 0.0001 && Math.abs(loc1[1] - loc2[1]) < 0.0001
}
function eqSeg(seg1: MovementSegmentSpec | undefined, seg2: MovementSegmentSpec | undefined): boolean {
    if (seg1 === undefined && seg2 === undefined) {
        return true
    }
    if (seg1 === undefined || seg2 === undefined) {
        return false
    }
    return eq([seg1.fromX, seg1.fromY], [seg2.fromX, seg2.fromY]) &&
        eq([seg1.toX, seg1.toY], [seg2.toX, seg2.toY]) &&
        JSON.stringify(seg1.path) === JSON.stringify(seg2.path)
}

export function overlap(mov1: MovementSegment, mov2: MovementSegment, mod: number): boolean {
    const start1 = mov1.onBeat
    const end1 = (mov1.onBeat + mov1.duration) % mod
    const start2 = mov2.onBeat
    const end2 = (mov2.onBeat + mov2.duration) % mod

    if (start1 < end1) {
        if (start2 < end2) {
            return !(end1 <= start2 + 0.00001 || end2 <= start1 + 0.00001)
        } else {
            return !(end1 <= start2 + 0.00001 && end2 <= start1 + 0.00001)
        }
    } else {
        if (start2 < end2) {
            return !(end2 <= start1 + 0.00001 && end1 <= start2 + 0.00001)
        } else {
            return true // both wrap around, so they must overlap
        }
    }
}

function dbgAssert(condition: boolean, message: string) {
    if (!condition) {
        console.error("Assertion failed: " + message)
    }
    assert(condition, message)
}
