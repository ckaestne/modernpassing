/**
 * Tracks and resolves movement segments within the location manager through a dedicated LocationTracker class
 */

import type { MovementAnimation } from "@modernpassing/layout";
import type { Role } from "@modernpassing/pattern";
import assert from "node:assert";
import type { MovementSegmentSpec } from "../animation-spec.ts";
import { createPasserIdx, genPath, helperSvg, type PasserIdx } from "./helpers.ts";
;



/**
 * MovementSegment describes a resolved or unresolved movement of a passer.
 * This is an intermediate representation used to resolve RelativeMovementSpecs to DirectMovementAnimations.
 * 
 * Resolved movements are expressed in terms a concrete path (MovementSegmentSpec) that directly
 * translate to DirectMovementAnimation.
 * Unresolved movements happen between a starting point (to be resolved) and an
 * end point defined relative to other passers (to be resolved).
 *
 * Teleportation is used temporarily only
 */


export abstract class MovementSegment {
    readonly passerIdx: PasserIdx
    readonly onBeat: number
    readonly duration: number
    readonly firstIteration?: boolean // if true, this is show only in the first iteration of the animation; if false it is shown in all but the first iteration, if undefined (default) it is shown in all iterations

    constructor(passerIdx: PasserIdx, onBeat: number, duration: number, firstIteration?: boolean) {
        this.passerIdx = passerIdx;
        this.onBeat = onBeat;
        this.duration = duration;
        this.firstIteration = firstIteration;
    }

    abstract isResolved(): boolean
    abstract isTeleport(): boolean

    /**
     * function that produces the format used for animations, where
     * all paths are resolved
     */
    abstract getAnimation(): MovementAnimation

    abstract getTargetLocation(): [number, number]
}

export class ResolvedMovementSegment extends MovementSegment {
    readonly seg: MovementSegmentSpec

    constructor(passerIdx: PasserIdx, onBeat: number, duration: number, seg: MovementSegmentSpec, firstIteration?: boolean) {
        super(passerIdx, onBeat, duration, firstIteration);
        this.seg = seg;
    }
    isResolved(): boolean { return true }
    isTeleport(): boolean { return false }
    getAnimation(): MovementAnimation {
        return {
            passerIdx: this.passerIdx,
            onBeat: this.onBeat,
            duration: this.duration,
            movementSpec: this.seg,
            firstIteration: this.firstIteration
        }
    }
    getTargetLocation(): [number, number] {
        return [this.seg.toX, this.seg.toY];
    }
}

export class UnresolvedMovementSegment extends MovementSegment {
    readonly spec: UnresolvedRelativeMovementSpec
    readonly fromPosition: [number, number] | undefined
    readonly toPosition: [number, number] | undefined

    constructor(passerIdx: PasserIdx, onBeat: number, duration: number, spec: UnresolvedRelativeMovementSpec, fromPosition?: [number, number], toPosition?: [number, number], firstIteration?: boolean) {
        super(passerIdx, onBeat, duration, firstIteration);
        this.spec = spec;
        this.fromPosition = fromPosition;
        this.toPosition = toPosition;
    }
    isResolved(): boolean { return false; }
    isTeleport(): boolean { return false; }
    getAnimation(): MovementAnimation {
        throw new Error("UnresolvedMovementSegment cannot produce MovementSpec until resolved");
    }
    getTargetLocation(): [number, number] {
        if (!this.toPosition) throw new Error("UnresolvedMovementSegment does not have target position resolved yet");
        return this.toPosition;
    }
}

export class TeleportMovementSegment extends MovementSegment {
    readonly toX: number
    readonly toY: number

    constructor(passerIdx: PasserIdx, onBeat: number, toX: number, toY: number) {
        super(passerIdx, onBeat, 0);
        this.toX = toX;
        this.toY = toY;
    }
    isResolved(): boolean { return true; }
    isTeleport(): boolean { return true; }
    getAnimation(): MovementAnimation {
        return {
            passerIdx: this.passerIdx,
            onBeat: this.onBeat,
            duration: 0,
            movementSpec: {
                fromX: this.toX,
                fromY: this.toY,
                toX: this.toX,
                toY: this.toY,
                path: []
            }
        }
    }
    getTargetLocation(): [number, number] {
        return [this.toX, this.toY];
    }
}


export type UnresolvedRelativeMovementSpec = {
    positionSpec: UnresolvedTakePositionSpec | UnresolvedBetweenPositionSpec | UnresolvedInFrontOfPositionSpec  // positions are computed relative to where base roles fromRole and toRole (identified on time of beat) would be be at the end of the movement at the time (ie., onBeat+duration) -- note, the passer is identified by a role at an earlier time than where the passer's (not role's) position is computed
    bend?: "↻" | "↺"
}


// take is unusual in that it is depending on a position in the base pattern, not the current pattern
// hence, the target position in the base pattern can be looked up and resolved when creating the spec
export type UnresolvedTakePositionSpec = {
    type: "take",
    // toX: number,
    // toY: number
}
export type UnresolvedBetweenPositionSpec = {
    type: "between",
    between: [PasserIdx, PasserIdx],
    side: number, // relative distance: .5 is in the middle, 0.1 near the second role, 0 is where the second role is, ...
    offset: number, // absolute distance: 0 is in the passing lane between the roles, .2 is further to the outside of the righthand pass, -.2 is further to the outside of the lefthand pass
    direction: number // in degree; 0 is facing the second role, 90 (clockwise) is facing sideways to substitute a righthand pass to 
}
export type UnresolvedInFrontOfPositionSpec = {
    type: "infront",
    toPasserIdx: PasserIdx,
}



export class MovementTracker {
    readonly mod: number
    readonly movements: MovementSegment[]
    constructor(mod: number, movements: MovementSegment[]) {
        this.mod = mod;
        this.movements = movements;
    }

    resolve(): MovementTracker {
        let movementTracker = this.resolveNextMovement();
        if (movementTracker === this)
            return movementTracker;
        while (movementTracker.hasUnresolvedMovements()) {
            const newMovementTracker = movementTracker.resolveNextMovement();
            if (newMovementTracker === movementTracker)
                return movementTracker
            movementTracker = newMovementTracker;
        }
        return movementTracker
    }

    resolveNextMovement(): MovementTracker {
        for (let i = 0; i < this.movements.length; i++) {
            const mov = this.movements[i];
            if (!mov.isResolved()) {
                const resolvedMovements = this._tryResolveMovement(mov as UnresolvedMovementSegment);
                if (resolvedMovements.length !== 1 || resolvedMovements[0] !== mov) {
                    const newMovements = [
                        ...this.movements.slice(0, i),
                        ...resolvedMovements,
                        ...this.movements.slice(i + 1)
                    ]
                    return new MovementTracker(this.mod, newMovements)
                }
            }
        }
        return this; // nothing resolved
    }

    hasUnresolvedMovements(): boolean {
        return !this.movements.every(mov => mov.isResolved());
    }


    // private _resolveLocationAndUpdateMov(mov: UnresolvedMovementSegment, time: number, passerIdx: PasserIdx, update: (loc: [number, number]) => [number, number]): MovementSegment[] {

    //     if (mov.firstIteration === false) time += this.mod


    //     const firstIterationLoc = this._resolveLocation(time, passerIdx)
    //     // find possibly different location in second iteration
    //     const secondIterationLoc = mov.firstIteration===undefined && time< this.mod ? this._resolveLocation(time + this.mod, passerIdx): firstIterationLoc

    //     [1].flatMap(iteration => {


    //     const targetLocation = update(firstIterationLoc)

    //      if (time < this.mod && firstIterationLoc) {
    //                 const altRefLocation = this._resolveLocation(time + this.mod, passerIdx);
    //                 if (altRefLocation && (firstIterationLoc[0] !== altRefLocation[0] || firstIterationLoc[1] !== altRefLocation[1])) {
    //                     throw new Error("InFrontOf position cannot be resolved uniquely because the reference passer is not moving between iterations");
    //                 }
    //             }
    // }

    private _resolveLocationWithIteration(beat: number, passerIdx: PasserIdx, firstIteration?: boolean): [[number, number]?, boolean?][] {
        if (firstIteration !== undefined)
            return [[this._resolveLocation(beat, passerIdx, firstIteration), firstIteration]]

        const loc0 = this._resolveLocation(beat, passerIdx, true)
        const loc1 = this._resolveLocation(beat, passerIdx, false)
        const same = (loc0 === loc1) || (loc0 && loc1 && loc0[0] === loc1[0] && loc0[1] === loc1[1])
        if (same)
            return [[loc0, undefined]]
        else
            return [[loc0, true], [loc1, false]];
    }
    private _resolveLocationPairWithIteration(beatA: number, passerIdxA: PasserIdx, beatB: number, passerIdxB: PasserIdx, firstIteration?: boolean): [[[number, number], [number, number]]?, boolean?][] {
        if (firstIteration !== undefined) {
            const locA = this._resolveLocation(beatA, passerIdxA, firstIteration)
            const locB = this._resolveLocation(beatB, passerIdxB, firstIteration)
            return [[locA && locB ? [locA, locB] : undefined, firstIteration]]
        }


        const locA0 = this._resolveLocation(beatA, passerIdxA, true)
        const locA1 = this._resolveLocation(beatA, passerIdxA, false)
        const locB0 = this._resolveLocation(beatB, passerIdxB, true)
        const locB1 = this._resolveLocation(beatB, passerIdxB, false)
        const same = ((locA0 === locA1) || (locA0 && locA1 && locA0[0] === locA1[0] && locA0[1] === locA1[1])) &&
            ((locB0 === locB1) || (locB0 && locB1 && locB0[0] === locB1[0] && locB0[1] === locB1[1]))
        if (same)
            return [[locA0 && locB0 ? [locA0, locB0] : undefined, undefined]]
        else
            return [[locA0 && locB0 ? [locA0, locB0] : undefined, true], [locA1 && locB1 ? [locA1, locB1] : undefined, false]];
    }

    /**
     * need to resolve the position where we start and the position where we are going. if any of that fails, 
     * because those are not resolved yet, we return the unmodified object
     * 
     * to handle the first-round starting positions, we may sometimes resolve to two different movement segments
     * with different values for firstIteration
     */
    private _tryResolveMovement(m: UnresolvedMovementSegment): MovementSegment[] {
        let mov: UnresolvedMovementSegment[] = [m];

        // get start position
        const updateStartLocation = (mov: UnresolvedMovementSegment): UnresolvedMovementSegment[] => {
            if (mov.fromPosition) return [mov];
            const startLocations: [[number, number]?, boolean?][] = this._resolveLocationWithIteration(mov.onBeat, mov.passerIdx, mov.firstIteration);
            if (startLocations.length === 1 && !startLocations[0][0] && startLocations[0][1] === mov.firstIteration) return [mov]
            return startLocations.flatMap(([startLocation, isFirstIteration]: [[number, number]?, boolean?]) =>
                new UnresolvedMovementSegment(mov.passerIdx, mov.onBeat, mov.duration, mov.spec, startLocation, mov.toPosition, isFirstIteration))
        }
        mov = mov.flatMap(updateStartLocation)

        // update end positions
        mov = mov.flatMap<UnresolvedMovementSegment>(mov => {
            if (mov.toPosition) return [mov];
            const endTime = (mov.onBeat + mov.duration) % this.mod;
            if (mov.spec.positionSpec.type === "take") {
                assert(mov.toPosition !== undefined, "assuming end position is always defined for Take position spec, as it comes from the base pattern");
            }
            else if (mov.spec.positionSpec.type === "between") {
                const locationPairs = this._resolveLocationPairWithIteration(endTime, mov.spec.positionSpec.between[0], endTime, mov.spec.positionSpec.between[1], mov.firstIteration);
                if (locationPairs.length === 1 && !locationPairs[0][0] && locationPairs[0][1] === mov.firstIteration) return [mov]
                return locationPairs.flatMap<UnresolvedMovementSegment>(([locationPair, isFirstIteration]: [[[number, number], [number, number]]?, boolean?]) =>
                    new UnresolvedMovementSegment(mov.passerIdx, mov.onBeat, mov.duration, mov.spec, mov.fromPosition,
                        locationPair ? computeLocationInBetween(locationPair[0], locationPair[1], mov.spec.positionSpec as UnresolvedBetweenPositionSpec) : undefined,
                        isFirstIteration))
            } else if (mov.spec.positionSpec.type === "infront") {
                const refLocations: [[number, number]?, boolean?][] = this._resolveLocationWithIteration(endTime, mov.spec.positionSpec.toPasserIdx, mov.firstIteration);
                if (refLocations.length === 1 && !refLocations[0][0] && refLocations[0][1] === mov.firstIteration) return [mov]
                return refLocations.flatMap<UnresolvedMovementSegment>(([refLocation, isFirstIteration]: [[number, number]?, boolean?]) =>
                    new UnresolvedMovementSegment(mov.passerIdx, mov.onBeat, mov.duration, mov.spec, mov.fromPosition,
                        refLocation ? computeLocationInFrontOf(refLocation) : undefined,
                        isFirstIteration))
            }
            throw new Error("Unknown positionSpec type in UnresolvedMovementSegment")
        })

        return mov.map<MovementSegment>(mov => {
            if (mov.fromPosition && mov.toPosition)
                return new ResolvedMovementSegment(
                    mov.passerIdx,
                    mov.onBeat,
                    mov.duration,
                    createDirectMovementSpec(mov.fromPosition, mov.toPosition, mov.spec.bend),
                    mov.firstIteration
                )
            return mov
        })
    }

    /**
     * computing the actual location, whether stationary or currently moving for a passer (not role)
     * at a given time (0<=time).
     * 
     * If `doNotStartPassersMidWalk` is true, all passers start at the position from where
     * they first walk. -- That is, if a passer would have been walking at time 0, they start
     * at the position where they would have arrived after that walk. This is 
     * modeled internally with distinct "firstIteration" movements 
     * 
     * 
     * @param time Time at which to get the location (0<=time)
     * @param passerIdx Id of a physical passer, can be looked up by role at a given time if needed
     * @returns location [x,y]
     */
    _getLocation(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean = true): [number, number] {
        const mov = this._getOngoingOrPriorMovement(time, passerIdx, doNotStartPassersMidWalk);

        const timeSinceMoveStart = (time - mov.onBeat + this.mod) % this.mod;
        if (mov.isTeleport())
            return [(mov as TeleportMovementSegment).toX, (mov as TeleportMovementSegment).toY];
        if (mov.isResolved()) {
            const spec = (mov as ResolvedMovementSegment).seg;

            if (timeSinceMoveStart >= mov.duration) {
                // the last move has completed, so we know where we are
                return [spec.toX, spec.toY]
            } else {
                // // if we are mid-walk in the first iteration from a walk that would have started in the prior iteration, we start at the end position of that walk
                // if (time < this.mod && mov.onBeat > time)
                //     return [spec.toX, spec.toY]
                // we are currently moving, so we need to find where on the path we are
                const progress = timeSinceMoveStart / mov.duration;
                const path = genPath(helperSvg, spec); // create the path in the helper SVG to get the length
                const p = path.pointAt(progress * path.length());
                return [p.x, p.y]
            }
        }
        // if we have resolved only the end of the prior movement, but the movement is over, we can use that
        if (!mov.isResolved()) {
            const m = mov as UnresolvedMovementSegment;
            if (m.toPosition && timeSinceMoveStart >= mov.duration)
                return m.toPosition;
        }
        throw new Error("Unexpected return from _getOngoingOrPriorMovement");
    }

    findOngoingAnimation(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean = true): MovementSegment | undefined {
        const mov = this._getOngoingOrPriorMovement(time, passerIdx, doNotStartPassersMidWalk);
        if (mov.isResolved()) {
            const timeSinceMoveStart = (time - mov.onBeat + this.mod) % this.mod;
            if (timeSinceMoveStart < mov.duration)
                return mov;
        }
        return undefined
    }


    _getOngoingOrPriorMovement(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean): MovementSegment {

        // let's find the last movement before the time of interest

        // while movement can potentially overlap, whenever a new movement starts, the previous one is aborted, 
        // so we only need to look at the one that started the most recently.
        // Also movements are on fixed paths in the base pattern, so we don't care where an aborted walk was aborted

        // Teleportation is used as a crutch, should only really be needed for passers who never walk -- let's ignore them here


        const allMovements = this.movements.filter(m => m.passerIdx === passerIdx);
        if (allMovements.length === 0)
            throw new Error("This passer never moves and no teleport provided for initial position");
        // no moment, just teleport to indicate initial position -- return that position
        if (allMovements.length === 1 && allMovements[0].isTeleport())
            return allMovements[0]

        assert(allMovements.every((mov, i) => i === 0 || allMovements[i - 1].onBeat <= mov.onBeat), "All movements for this passer must be sorted by onBeat")
        // rotate the array so that the first element is the first after time % mod; so we can go from the back
        for (let i = 0; i < allMovements.length && allMovements[0].onBeat <= time % this.mod; i++) {
            // move the first movement to the end
            allMovements.push(allMovements.shift()!)
        }
        for (let i = allMovements.length - 1; i >= 0; i--) {
            const mov = allMovements[i];
            // if a movement starts right now, but it is unresolved, we can look at where the previous one ended
            if (mov.onBeat === time % this.mod && !mov.isResolved())
                continue
            if (!mov.isResolved())
                return mov //throw new Error("This passer's last movement is not resolved");
            // teleport should not be relevant, let's ignore it
            if (mov.isTeleport())
                continue
            assert(mov.isResolved(), "Movement must be resolved here");

            //special handling for first iteration
            const movAcrossIterations = mov.onBeat + mov.duration > this.mod
            const isFirstIerationMovement = movAcrossIterations ? time < mov.onBeat : time< this.mod
            if (doNotStartPassersMidWalk && (mov.firstIteration === !isFirstIerationMovement) 
             || !doNotStartPassersMidWalk && mov.firstIteration===true)
                continue

            return mov
        }
        throw new Error("Could not find prior movement to determine location");
    }

    private _resolveLocation(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean = true): [number, number] | undefined {
        try {
            return this._getLocation(time, passerIdx, doNotStartPassersMidWalk);
        } catch (_) {
            return undefined;
        }
    }


}

export class ResolvedMovementTracker {
    readonly movementTracker: MovementTracker
    constructor(movementTracker: MovementTracker) {
        this.movementTracker = movementTracker;
        assert(this.movementTracker.movements.every(mov => "segment" in mov), "All movements must be resolved");
    }
}


export class RoleTracker {
    readonly mod: number
    readonly roleMapping: [number/*onBeat*/, Role[]][]
    readonly roles: Role[]
    constructor(roles: Role[], mod: number, roleMapping: [number/*onBeat*/, Role[]][]) {
        this.roles = roles;
        this.mod = mod;
        this.roleMapping = roleMapping;
    }



    /**
     * indexes are only used internally, when figuring out the base locations of roles
     * -- this is not necessarily indexing a passer in a real pattern (especially with manipulators,
     * but possibly also when going over the mod boundary)
     */
    _getPasserIdx(time: number, role: Role): PasserIdx {
        const rolesAtTime = this.roleMapping.findLast(r => r[0] <= time % this.mod)![1]
        const passerIdx = rolesAtTime.indexOf(role);
        assert(passerIdx !== -1, `Role ${role} not found at time ${time} in animation mod ${this.mod}.`);
        return createPasserIdx(passerIdx);
    }


}

function createDirectMovementSpec(startLocation: [number, number], endLocation: [number, number], bend: string | undefined): MovementSegmentSpec {
    let path: (string | number)[] = []
    if (bend) {
        const distance = Math.sqrt((endLocation[0] - startLocation[0]) ** 2 + (endLocation[1] - startLocation[1]) ** 2)
        const r = distance * 1
        path = ['A', r, r, 0, 0, bend === "↻" ? 1 : 0]
    }

    return {
        fromX: startLocation[0],
        fromY: startLocation[1],
        path,
        toX: endLocation[0],
        toY: endLocation[1],
    }
}


function computeLocationInFrontOf(loc0: [number, number]): [number, number] {
    return computeLocationInBetween(loc0, loc0, {
        type: "between",
        between: [createPasserIdx(0), createPasserIdx(0)],
        side: 0.6,
        offset: 0,
        direction: 0
    })
}

function computeLocationInBetween(loc0: [number, number], loc1: [number, number], betweenSpec: UnresolvedBetweenPositionSpec): [number, number] {

    const [fromX, fromY] = loc0;
    let [toX, toY] = loc1;

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
    return [x + offsetX, y + offsetY];


}

