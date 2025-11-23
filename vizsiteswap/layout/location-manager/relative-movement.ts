import { MovementSegmentSpec, RelativeMovementSpec } from "../animation-spec.ts";
import { DirectMovementAnimation } from "@modernpassing/layout";
import { Role } from "@modernpassing/pattern";
import { createPasserIdx, genPath, helperSvg, PasserIdx } from "./helpers.ts";
import assert from "node:assert";
import { create } from "node:domain";


/**
 * To handle relative movements, we translate a RelativeMovementSpec into a concrete movement path (DirectMovementAnimation)
 * and update the location manager
 * 
 * Without relative movements, the location manager knows about the positions of baseline passers and only approximates
 * manipulators with teleports. Here, we compute additional movements that update locations. This affects the locations 
 * of the manipulator (obviously), but also the locations of the baseline passer if they still move to their real position
 * after the intercept.
 * 
 * In theory, positions can be expressed relative to other manipulators and even to base locations that will still be updated.
 * For simplicity, we do not perform fixpoint computations if locations depend on each other. If manipulator M depends on the 
 * location of N, we compute N first, but don't support circular dependencies.
 */



// function _getRelevantTargetRoles(relMove: RelativeMovementSpec): Role[] {
//     if (relMove.positionSpec.type === "take" || relMove.positionSpec.type === "infront") {
//         return [relMove.positionSpec.toRole];
//     } else if (relMove.positionSpec.type === "between") {
//         return relMove.positionSpec.between;
//     } else {
//         throw new Error(`Unknown position spec type: ${relMove.positionSpec}`);
//     }
// }


// function computeRelativeMovements(relativeMovements: RelativeMovementSpec[], roleMgr: RoleTracker, baseMovements: MovementTracker): [DirectMovementAnimation[], ResolvedMovementTracker] {

//     //TODO model initial positions as teleportation
//     assert(roleMgr.mod === baseMovements.mod, "Role tracker and movement tracker must have the same mod");

//     // first let's create a movement tracker with all relative movements marked as unresolved
//     const allMovements: MovementSpec[] = baseMovements.movements.slice();
//     for (let startTime = 0; startTime < baseMovements.mod; startTime++) {
//         for (const relMove of relativeMovements) {
//             if (startTime % relMove.mod === Math.floor(relMove.onBeat)) {
//                 const passerIdx = roleMgr._getPasserIdx(relMove.onBeat, relMove.role);
//                 const targetBeat = (relMove.onBeat + relMove.duration) % relMove.mod;
//                 const unresolvedSpec = createUnresolvedRelativeMovementSpec(relMove, startTime + relMove.onBeat % 1, roleMgr);
//                 allMovements.push(unresolvedSpec);
//             }
//         }
//     }
//     let movementTracker = new MovementTracker(roleMgr.mod, allMovements);

//     while (movementTracker.hasUnresolvedMovements()) {
//         const newMovementTracker = movementTracker.resolveNextMovement();
//         if (newMovementTracker === movementTracker)
//             throw new Error(`Could not resolve all relative movements, likely due to circular dependencies.`);
//     }

//     throw new Error("Not yet implemented");

//     // // translate relative movements from roles to passer indices
//     // const relativeMovementsByPasserIdx: MovementSpec[][] = roleMgr.roles.map(_ => [])
//     // const unresolvedSpecs: UnresolvedRelativeMovementSpec[] = []
//     // for (const relMove of relativeMovements) {
//     //     const passerIdx = roleMgr._getPasserIdx(relMove.onBeat, relMove.role);
//     //     const targetBeat = (relMove.onBeat + relMove.duration) % relMove.mod;
//     //     const unresolvedSpec: UnresolvedRelativeMovementSpec = {
//     //         passerIdx,
//     //         onBeat: relMove.onBeat,
//     //         dependencies: _getRelevantTargetRoles(relMove).map(role => [roleMgr._getPasserIdx(relMove.onBeat, role), targetBeat]),
//     //         spec: relMove
//     //     }
//     //     relativeMovementsByPasserIdx[passerIdx].push(unresolvedSpec);
//     //     unresolvedSpecs.push(unresolvedSpec);
//     // }
//     // // add the base movements for each passer
//     // for (const movement of baseMovements.movements) {
//     //     const passerIdx = movement.passerIdx;
//     //     relativeMovementsByPasserIdx[passerIdx].push(movement);
//     // }
//     // // sort each array in relativeMovementsByPasserIdx by onBeat
//     // relativeMovementsByPasserIdx.forEach(movements => movements.sort((a, b) => a.onBeat - b.onBeat))


//     // for (let maxIterations = unresolvedSpecs.length; maxIterations > 0; maxIterations--) {

//     //     for (const unresolvedSpec of unresolvedSpecs.slice()) {
//     //         // check if all dependencies are resolved
//     //         const dependencies: MovementSpec[] = _getDependentSpecs(unresolvedSpec, relativeMovementsByPasserIdx);
//     //         if (dependencies.every(dep => "segment" in dep )) {
//     //             const resolvedSpec = resolveRelativeMovementSpec(unresolvedSpec, dependencies, relativeMovementsByPasserIdx);
//     //             unresolvedSpecs.splice(unresolvedSpecs.indexOf(unresolvedSpec), 1);
//     //             // replace in relativeMovementsByPasserIdx
//     //             const movements = relativeMovementsByPasserIdx[unresolvedSpec.passerIdx];
//     //             movements[movements.indexOf(unresolvedSpec)] = resolvedSpec;
//     //         }
//     // }
//     // }

//     // if (unresolvedSpecs.length > 0) {
//     //     throw new Error(`Could not resolve all relative movements, likely due to circular dependencies: ${unresolvedSpecs}`);
//     // }






// }

// // function _computeRelativeMovements(relativeMovements: RelativeMovementSpec[], locationMgr: LocationManager): [DirectMovementAnimation[], LocationManager] {
// //     const directMovementAnimations: DirectMovementAnimation[] = [];
// //     for (let startTime = 0; startTime < locationMgr.mod; startTime++) {
// //         for (const relativeMovementSpec of relativeMovements) {
// //             if (startTime % relativeMovementSpec.mod === Math.floor(relativeMovementSpec.onBeat)) {
// //                 // we need to compute the position of the manipulator at this time
// //                 let toX: number, toY: number;
// //                 const arrivalTime = Math.floor((startTime + relativeMovementSpec.onBeat % 1 + relativeMovementSpec.duration) % locationMgr.mod);
// //                 const roleTime = relativeMovementSpec.targetRoleTime === "onBeat" ? startTime : arrivalTime
// //                 // const roleAtArrival = pattern

// //                 // console.log("computeRelativeMovement", time, locationTime, relativeMovementSpec)
// //                 let takeRelativeMovementFrom: [number, Role] | undefined = undefined
// //                 if (relativeMovementSpec.positionSpec.type === "take") {
// //                     [toX, toY] = locationMgr.getFutureLocationByRole(arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
// //                     // after we "take" a position, we continue that animation if it is moving on an animation -- we record the role+beat of that animation to find it in the frontend
// //                     takeRelativeMovementFrom = locationMgr.findOngoingAnimationByRole(roleTime, relativeMovementSpec.positionSpec.toRole)
// //                 } else if (relativeMovementSpec.positionSpec.type === "between") {
// //                     [toX, toY] = computePositionBetween(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec)
// //                 } else if (relativeMovementSpec.positionSpec.type === "infront") {
// //                     [toX, toY] = computePositionInFrontOf(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
// //                 } else { throw new Error(`Unknown position spec type: ${relativeMovementSpec.positionSpec}`); }

// //                 directMovementAnimations.push({
// //                     onBeat: startTime + relativeMovementSpec.onBeat % 1, // onBeat
// //                     role: relativeMovementSpec.role,//TODO this is the role when the passer is leaving. we need the role when they arrive, because that's what we are tracking here
// //                     roleAtArrival: relativeMovementSpec.roleAtMovementEnd,
// //                     duration: relativeMovementSpec.duration,
// //                     toX,
// //                     toY,
// //                     bend: relativeMovementSpec.bend,
// //                     takeRelativeMovementFrom
// //                 })
// //             }
// //         }
// //     }

// //     // get the set of distinct roles in directMovementAnimations.role that are not yet included in locationMgr.initialPositions
// //     const existingRoles = new Set(locationMgr.initialPositions.map(pos => pos[0]));
// //     const newRoles = new Set(
// //         directMovementAnimations
// //             .map(anim => anim.role)
// //             .filter(role => !existingRoles.has(role))
// //     )
// //     const newInitialPositions: [Role, number, number][] = [...locationMgr.initialPositions]
// //     const manipulatorPositions = new Map<Role, [number, number, number][]>()
// //     // initial position of the manipulator is where their first movement ended (starting there, not moving to there from another position)
// //     for (const role of newRoles) {
// //         const roleMovementsByArrival = directMovementAnimations.filter(anim => anim.roleAtArrival === role).slice().sort((a, b) => (a.onBeat + a.duration) % locationMgr.mod - (b.onBeat + b.duration) % locationMgr.mod)
// //         // get the first position as starting position
// //         const firstArrival = roleMovementsByArrival[0]
// //         newInitialPositions.push([role, firstArrival.toX, firstArrival.toY])
// //         // store all other positions for later lookup
// //         manipulatorPositions.set(role, roleMovementsByArrival.map(anim => [(anim.onBeat + anim.duration) % locationMgr.mod, anim.toX, anim.toY]))
// //     }

// //     return [directMovementAnimations, new LocationMgr(
// //         newInitialPositions,
// //         locationMgr.mod,
// //         locationMgr.movements,
// //         locationMgr.basePatternRoles,
// //         locationMgr.fullPatternRoles,
// //         manipulatorPositions
// //     )]
// // }



// function createUnresolvedRelativeMovementSpec(relMove: RelativeMovementSpec, onBeat: number, roleMgr: RoleTracker): MovementSpec {
//     const passerIdentificationBeat = relMove.targetRoleTime === "onBeat" ? onBeat : (onBeat + relMove.duration) % relMove.mod;
//     const passerIdx = roleMgr._getPasserIdx(passerIdentificationBeat, relMove.role);
//     const targetBeat = (onBeat + relMove.duration) % relMove.mod;
//     let positionSpec;
//     if (relMove.positionSpec.type === "take") {
//         positionSpec = {
//             type: "take",
//             toPasserIdx: roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.toRole)
//         } as UnresolvedTakePositionSpec;
//     } else if (relMove.positionSpec.type === "between") {
//         positionSpec = {
//             type: "between",
//             between: [
//                 roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.between[0]),
//                 roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.between[1])
//             ],
//             side: relMove.positionSpec.side,
//             offset: relMove.positionSpec.offset,
//             direction: relMove.positionSpec.direction
//         } as UnresolvedBetweenPositionSpec;
//     } else if (relMove.positionSpec.type === "infront") {
//         positionSpec = {
//             type: "infront",
//             toPasserIdx: roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.toRole)
//         } as UnresolvedInFrontOfPositionSpec;
//     } else throw new Error(`Unknown position spec type: ${relMove.positionSpec}`);
//     return {
//         passerIdx,
//         onBeat,
//         duration: relMove.duration,
//         action: {
//             type: "unresolved",
//             bend: relMove.bend,
//             positionSpec
//         }
//     }
// }


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
    readonly skipInFirstIteration?: boolean // usually false/undefined; if true, skip this movement in the first iteration if also doNotStartPassersMidWalk, like movement from the previous round

    constructor(passerIdx: PasserIdx, onBeat: number, duration: number, skipInFirstIteration?: boolean) {
        this.passerIdx = passerIdx;
        this.onBeat = onBeat;
        this.duration = duration;
        this.skipInFirstIteration = skipInFirstIteration;
    }

    abstract isResolved(): boolean
    abstract isTeleport(): boolean

    /**
     * function that produces the format used for animations, where
     * all paths are resolved
     */
    abstract getAnimation(): DirectMovementAnimation

    abstract getTargetLocation(): [number, number]
}

export class ResolvedMovementSegment extends MovementSegment {
    readonly seg: MovementSegmentSpec

    constructor(passerIdx: PasserIdx, onBeat: number, duration: number, seg: MovementSegmentSpec, skipInFirstIteration?: boolean) {
        super(passerIdx, onBeat, duration, skipInFirstIteration);
        this.seg = seg;
    }
    isResolved(): boolean { return true }
    isTeleport(): boolean { return false }
    getAnimation(): DirectMovementAnimation {
        return {
            passerIdx: this.passerIdx,
            onBeat: this.onBeat,
            duration: this.duration,
            movementSpec: this.seg,
            skipInFirstIteration: this.skipInFirstIteration
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

    constructor(passerIdx: PasserIdx, onBeat: number, duration: number, spec: UnresolvedRelativeMovementSpec, fromPosition?: [number, number], toPosition?: [number, number], skipInFirstIteration?: boolean) {
        super(passerIdx, onBeat, duration, skipInFirstIteration);
        this.spec = spec;
        this.fromPosition = fromPosition;
        this.toPosition = toPosition;
    }
    isResolved(): boolean { return false; }
    isTeleport(): boolean { return false; }
    getAnimation(): DirectMovementAnimation {
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
    getAnimation(): DirectMovementAnimation {
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
                const resolvedMovement = this._tryResolveMovement(mov as UnresolvedMovementSegment);
                if (resolvedMovement !== mov) {
                    const newMovements = this.movements.slice();
                    newMovements[i] = resolvedMovement
                    return new MovementTracker(this.mod, newMovements);
                }
            }
        }
        return this; // nothing resolved
    }

    hasUnresolvedMovements(): boolean {
        return !this.movements.every(mov => mov.isResolved());
    }

    /**
     * need to resolve the position where we start and the position where we are going. if any of that fails, 
     * because those are not resolved yet, we return undefined and expect them to be resolved first
     */
    private _tryResolveMovement(mov: UnresolvedMovementSegment): MovementSegment {
        // get start position
        if (!mov.fromPosition) {
            const startLocation = this._resolveLocation(mov.onBeat, mov.passerIdx);
            if (startLocation)
                mov = new UnresolvedMovementSegment(mov.passerIdx, mov.onBeat, mov.duration, mov.spec, startLocation, mov.toPosition, mov.skipInFirstIteration);
        }

        if (!mov.toPosition) {
            const endTime = (mov.onBeat + mov.duration) % this.mod;
            if (mov.spec.positionSpec.type === "take") {
                assert(mov.toPosition !== undefined, "assuming end position is always defined for Take position spec, as it comes from the base pattern");
            }
            else if (mov.spec.positionSpec.type === "between") {
                const loc0 = this._resolveLocation(endTime, mov.spec.positionSpec.between[0]);
                const loc1 = this._resolveLocation(endTime, mov.spec.positionSpec.between[1]);
                if (loc0 && loc1)
                    mov = new UnresolvedMovementSegment(mov.passerIdx, mov.onBeat, mov.duration, mov.spec, mov.fromPosition, computeLocationInBetween(loc0, loc1, mov.spec.positionSpec), mov.skipInFirstIteration);
            } else if (mov.spec.positionSpec.type === "infront") {
                const refLocation = this._resolveLocation(endTime, mov.spec.positionSpec.toPasserIdx);
                if (refLocation)
                    mov = new UnresolvedMovementSegment(mov.passerIdx, mov.onBeat, mov.duration, mov.spec, mov.fromPosition, computeLocationInFrontOf(refLocation), mov.skipInFirstIteration);
            }
        }

        if (mov.fromPosition && mov.toPosition)
            return new ResolvedMovementSegment(
                mov.passerIdx,
                mov.onBeat,
                mov.duration,
                createDirectMovementSpec(mov.fromPosition, mov.toPosition, mov.spec.bend),
                mov.skipInFirstIteration
            )
        return mov
    }

    /**
     * computing the actual location, whether stationary or currently moving for a passer (not role)
     * at a given time (0<=time).
     * 
     * If `doNotStartPassersMidWalk` is true, all passers start at the position from where
     * they first walk. -- That is, if a passer would have been walking at time 0, they start
     * at the position where they would have arrived after that walk.
     * 
     * 
     * @param time Time at which to get the location (0<=time)
     * @param passerIdx Id of a physical passer, can be looked up by role at a given time if needed
     * @returns location [x,y]
     */
    _getLocation(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean = true): [number, number] {
        const mov = this._getOngoingOrPriorMovement(time, passerIdx);

        const timeSinceMoveStart = (time - mov.onBeat + this.mod) % this.mod;
        if (mov.isTeleport())
            return [(mov as TeleportMovementSegment).toX, (mov as TeleportMovementSegment).toY];
        if (mov.isResolved()) {
            const spec = (mov as ResolvedMovementSegment).seg;

            if (timeSinceMoveStart >= mov.duration) {
                // the last move has completed, so we know where we are
                return [spec.toX, spec.toY]
            } else {
                // if we are mid-walk in the first iteration from a walk that would have started in the prior iteration, we start at the end position of that walk
                if (doNotStartPassersMidWalk && time < this.mod && mov.onBeat > time)
                    return [spec.toX, spec.toY]
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

    findOngoingAnimation(time: number, passerIdx: PasserIdx): MovementSegment | undefined {
        const mov = this._getOngoingOrPriorMovement(time, passerIdx);
        if (mov.isResolved()) {
            const timeSinceMoveStart = (time - mov.onBeat + this.mod) % this.mod;
            if (timeSinceMoveStart < mov.duration)
                return mov;
        }
        return undefined
    }

    _getOngoingOrPriorMovement(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean = false): MovementSegment {

        assert(!doNotStartPassersMidWalk, "doNotStartPassersMidWalk not yet implemented in MovementTracker");


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
            return mov
        }
        throw new Error("Could not find prior movement to determine location");
    }

    private _resolveLocation(time: number, passerIdx: PasserIdx): [number, number] | undefined {
        try {
            return this._getLocation(time, passerIdx);
        } catch (e) {
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
    const absoluteRotation = (angleDegrees + betweenSpec.direction) % 360

    //  Compute perpendicular direction for the offset
    const perpendicularAngle = angleDegrees + 90
    const perpendicularRad = perpendicularAngle * (Math.PI / 180)
    const offsetX = betweenSpec.offset * Math.cos(perpendicularRad)
    const offsetY = betweenSpec.offset * Math.sin(perpendicularRad)

    // return [x + offsetX, y + offsetY, absoluteRotation]
    return [x + offsetX, y + offsetY];


}

