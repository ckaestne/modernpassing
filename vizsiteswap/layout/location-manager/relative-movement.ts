import { MovementSegmentSpec, RelativeMovementSpec } from "../animation-spec.ts";
import { DirectMovementAnimation } from "@modernpassing/layout";
import { Role } from "@modernpassing/pattern";
import { createPasserIdx, genPath, helperSvg, PasserIdx } from "./helpers.ts";
import assert from "node:assert";


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



function _getRelevantTargetRoles(relMove: RelativeMovementSpec): Role[] {
    if (relMove.positionSpec.type === "take" || relMove.positionSpec.type === "infront") {
        return [relMove.positionSpec.toRole];
    } else if (relMove.positionSpec.type === "between") {
        return relMove.positionSpec.between;
    } else {
        throw new Error(`Unknown position spec type: ${relMove.positionSpec}`);
    }
}


function computeRelativeMovements(relativeMovements: RelativeMovementSpec[], roleMgr: RoleTracker, baseMovements: MovementTracker): [DirectMovementAnimation[], ResolvedMovementTracker] {

    //TODO model initial positions as teleportation
    assert(roleMgr.mod === baseMovements.mod, "Role tracker and movement tracker must have the same mod");

    // first let's create a movement tracker with all relative movements marked as unresolved
    const allMovements: MovementSpec[] = baseMovements.movements.slice();
    for (let startTime = 0; startTime < baseMovements.mod; startTime++) {
        for (const relMove of relativeMovements) {
            if (startTime % relMove.mod === Math.floor(relMove.onBeat)) {
                const passerIdx = roleMgr._getPasserIdx(relMove.onBeat, relMove.role);
                const targetBeat = (relMove.onBeat + relMove.duration) % relMove.mod;
                const unresolvedSpec = createUnresolvedRelativeMovementSpec(relMove, startTime + relMove.onBeat % 1, roleMgr);
                allMovements.push(unresolvedSpec);
            }
        }
    }
    let movementTracker = new MovementTracker(roleMgr.mod, allMovements);

    while (movementTracker.hasUnresolvedMovements()) {
        const newMovementTracker = movementTracker.resolveNextMovement();
        if (newMovementTracker === movementTracker)
            throw new Error(`Could not resolve all relative movements, likely due to circular dependencies.`);
    }

    throw new Error("Not yet implemented");

    // // translate relative movements from roles to passer indices
    // const relativeMovementsByPasserIdx: MovementSpec[][] = roleMgr.roles.map(_ => [])
    // const unresolvedSpecs: UnresolvedRelativeMovementSpec[] = []
    // for (const relMove of relativeMovements) {
    //     const passerIdx = roleMgr._getPasserIdx(relMove.onBeat, relMove.role);
    //     const targetBeat = (relMove.onBeat + relMove.duration) % relMove.mod;
    //     const unresolvedSpec: UnresolvedRelativeMovementSpec = {
    //         passerIdx,
    //         onBeat: relMove.onBeat,
    //         dependencies: _getRelevantTargetRoles(relMove).map(role => [roleMgr._getPasserIdx(relMove.onBeat, role), targetBeat]),
    //         spec: relMove
    //     }
    //     relativeMovementsByPasserIdx[passerIdx].push(unresolvedSpec);
    //     unresolvedSpecs.push(unresolvedSpec);
    // }
    // // add the base movements for each passer
    // for (const movement of baseMovements.movements) {
    //     const passerIdx = movement.passerIdx;
    //     relativeMovementsByPasserIdx[passerIdx].push(movement);
    // }
    // // sort each array in relativeMovementsByPasserIdx by onBeat
    // relativeMovementsByPasserIdx.forEach(movements => movements.sort((a, b) => a.onBeat - b.onBeat))


    // for (let maxIterations = unresolvedSpecs.length; maxIterations > 0; maxIterations--) {

    //     for (const unresolvedSpec of unresolvedSpecs.slice()) {
    //         // check if all dependencies are resolved
    //         const dependencies: MovementSpec[] = _getDependentSpecs(unresolvedSpec, relativeMovementsByPasserIdx);
    //         if (dependencies.every(dep => "segment" in dep )) {
    //             const resolvedSpec = resolveRelativeMovementSpec(unresolvedSpec, dependencies, relativeMovementsByPasserIdx);
    //             unresolvedSpecs.splice(unresolvedSpecs.indexOf(unresolvedSpec), 1);
    //             // replace in relativeMovementsByPasserIdx
    //             const movements = relativeMovementsByPasserIdx[unresolvedSpec.passerIdx];
    //             movements[movements.indexOf(unresolvedSpec)] = resolvedSpec;
    //         }
    // }
    // }

    // if (unresolvedSpecs.length > 0) {
    //     throw new Error(`Could not resolve all relative movements, likely due to circular dependencies: ${unresolvedSpecs}`);
    // }






}

// function _computeRelativeMovements(relativeMovements: RelativeMovementSpec[], locationMgr: LocationManager): [DirectMovementAnimation[], LocationManager] {
//     const directMovementAnimations: DirectMovementAnimation[] = [];
//     for (let startTime = 0; startTime < locationMgr.mod; startTime++) {
//         for (const relativeMovementSpec of relativeMovements) {
//             if (startTime % relativeMovementSpec.mod === Math.floor(relativeMovementSpec.onBeat)) {
//                 // we need to compute the position of the manipulator at this time
//                 let toX: number, toY: number;
//                 const arrivalTime = Math.floor((startTime + relativeMovementSpec.onBeat % 1 + relativeMovementSpec.duration) % locationMgr.mod);
//                 const roleTime = relativeMovementSpec.targetRoleTime === "onBeat" ? startTime : arrivalTime
//                 // const roleAtArrival = pattern

//                 // console.log("computeRelativeMovement", time, locationTime, relativeMovementSpec)
//                 let takeRelativeMovementFrom: [number, Role] | undefined = undefined
//                 if (relativeMovementSpec.positionSpec.type === "take") {
//                     [toX, toY] = locationMgr.getFutureLocationByRole(arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
//                     // after we "take" a position, we continue that animation if it is moving on an animation -- we record the role+beat of that animation to find it in the frontend
//                     takeRelativeMovementFrom = locationMgr.findOngoingAnimationByRole(roleTime, relativeMovementSpec.positionSpec.toRole)
//                 } else if (relativeMovementSpec.positionSpec.type === "between") {
//                     [toX, toY] = computePositionBetween(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec)
//                 } else if (relativeMovementSpec.positionSpec.type === "infront") {
//                     [toX, toY] = computePositionInFrontOf(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
//                 } else { throw new Error(`Unknown position spec type: ${relativeMovementSpec.positionSpec}`); }

//                 directMovementAnimations.push({
//                     onBeat: startTime + relativeMovementSpec.onBeat % 1, // onBeat
//                     role: relativeMovementSpec.role,//TODO this is the role when the passer is leaving. we need the role when they arrive, because that's what we are tracking here
//                     roleAtArrival: relativeMovementSpec.roleAtMovementEnd,
//                     duration: relativeMovementSpec.duration,
//                     toX,
//                     toY,
//                     bend: relativeMovementSpec.bend,
//                     takeRelativeMovementFrom
//                 })
//             }
//         }
//     }

//     // get the set of distinct roles in directMovementAnimations.role that are not yet included in locationMgr.initialPositions
//     const existingRoles = new Set(locationMgr.initialPositions.map(pos => pos[0]));
//     const newRoles = new Set(
//         directMovementAnimations
//             .map(anim => anim.role)
//             .filter(role => !existingRoles.has(role))
//     )
//     const newInitialPositions: [Role, number, number][] = [...locationMgr.initialPositions]
//     const manipulatorPositions = new Map<Role, [number, number, number][]>()
//     // initial position of the manipulator is where their first movement ended (starting there, not moving to there from another position)
//     for (const role of newRoles) {
//         const roleMovementsByArrival = directMovementAnimations.filter(anim => anim.roleAtArrival === role).slice().sort((a, b) => (a.onBeat + a.duration) % locationMgr.mod - (b.onBeat + b.duration) % locationMgr.mod)
//         // get the first position as starting position
//         const firstArrival = roleMovementsByArrival[0]
//         newInitialPositions.push([role, firstArrival.toX, firstArrival.toY])
//         // store all other positions for later lookup
//         manipulatorPositions.set(role, roleMovementsByArrival.map(anim => [(anim.onBeat + anim.duration) % locationMgr.mod, anim.toX, anim.toY]))
//     }

//     return [directMovementAnimations, new LocationMgr(
//         newInitialPositions,
//         locationMgr.mod,
//         locationMgr.movements,
//         locationMgr.basePatternRoles,
//         locationMgr.fullPatternRoles,
//         manipulatorPositions
//     )]
// }



function createUnresolvedRelativeMovementSpec(relMove: RelativeMovementSpec, onBeat: number, roleMgr: RoleTracker): MovementSpec {
    const passerIdentificationBeat = relMove.targetRoleTime === "onBeat" ? onBeat : (onBeat + relMove.duration) % relMove.mod;
    const passerIdx = roleMgr._getPasserIdx(passerIdentificationBeat, relMove.role);
    const targetBeat = (onBeat + relMove.duration) % relMove.mod;
    let positionSpec;
    if (relMove.positionSpec.type === "take") {
        positionSpec = {
            type: "take",
            toPasserIdx: roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.toRole)
        } as UnresolvedTakePositionSpec;
    } else if (relMove.positionSpec.type === "between") {
        positionSpec = {
            type: "between",
            between: [
                roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.between[0]),
                roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.between[1])
            ],
            side: relMove.positionSpec.side,
            offset: relMove.positionSpec.offset,
            direction: relMove.positionSpec.direction
        } as UnresolvedBetweenPositionSpec;
    } else if (relMove.positionSpec.type === "infront") {
        positionSpec = {
            type: "infront",
            toPasserIdx: roleMgr._getPasserIdx(targetBeat, relMove.positionSpec.toRole)
        } as UnresolvedInFrontOfPositionSpec;
    } else throw new Error(`Unknown position spec type: ${relMove.positionSpec}`);
    return {
        passerIdx,
        onBeat,
        duration: relMove.duration,
        action: {
            type: "unresolved",
            bend: relMove.bend,
            positionSpec
        }
    }
}


export type MovementSpec = {
    passerIdx: PasserIdx,
    onBeat: number,
    duration: number,
    action: ResolvedMovementSpec | UnresolvedRelativeMovementSpec | TeleportSpec,
    skipInFirstIteration?: boolean // usually false/undefined; if true, skip this movement in the first iteration if also doNotStartPassersMidWalk, like movement from the previous round
}

// Teleport is used temporarily, internally before modeling the manipulator's movement
// -- in the base pattern, we assume that they always teleport to the manipulatee's
// position on the intercept
export type TeleportSpec = {
    toX: number,
    toY: number,
    type: "teleport"
}

export type ResolvedMovementSpec = MovementSegmentSpec & {
    type: "resolved"
}

type UnresolvedRelativeMovementSpec = {
    positionSpec: UnresolvedTakePositionSpec | UnresolvedBetweenPositionSpec | UnresolvedInFrontOfPositionSpec  // positions are computed relative to where base roles fromRole and toRole (identified on time of beat) would be be at the end of the movement at the time (ie., onBeat+duration) -- note, the passer is identified by a role at an earlier time than where the passer's (not role's) position is computed
    bend?: "↻" | "↺"
    type: "unresolved",
}



type UnresolvedTakePositionSpec = {
    type: "take",
    toPasserIdx: PasserIdx,
}
type UnresolvedBetweenPositionSpec = {
    type: "between",
    between: [PasserIdx, PasserIdx],
    side: number, // relative distance: .5 is in the middle, 0.1 near the second role, 0 is where the second role is, ...
    offset: number, // absolute distance: 0 is in the passing lane between the roles, .2 is further to the outside of the righthand pass, -.2 is further to the outside of the lefthand pass
    direction: number // in degree; 0 is facing the second role, 90 (clockwise) is facing sideways to substitute a righthand pass to 
}
type UnresolvedInFrontOfPositionSpec = {
    type: "infront",
    toPasserIdx: PasserIdx,
}



export class MovementTracker {
    readonly mod: number
    readonly movements: MovementSpec[]
    constructor(mod: number, movements: MovementSpec[]) {
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
            if (mov.action.type === "unresolved") {
                const resolvedMovement = this._tryResolveMovement(mov);
                if (resolvedMovement) {
                    const newMovements = this.movements.slice();
                    newMovements[i] = resolvedMovement
                    return new MovementTracker(this.mod, newMovements);
                }
            }
        }
        return this; // nothing resolved
    }

    hasUnresolvedMovements(): boolean {
        return !this.movements.every(mov => mov.action.type !== "unresolved");
    }

    /**
     * need to resolve the position where we start and the position where we are going. if any of that fails, 
     * because those are not resolved yet, we return undefined and expect them to be resolved first
     */
    private _tryResolveMovement(mov: MovementSpec): MovementSpec | undefined {
        assert(mov.action.type === "unresolved", "Can only try to resolve unresolved movements");
        // get start position
        const startLocation = this._resolveLocation(mov.onBeat, mov.passerIdx);
        if (!startLocation) return undefined;

        const endTime = (mov.onBeat + mov.duration) % this.mod;
        if (mov.action.positionSpec.type === "take") {
            const endLocation = this._resolveLocation(endTime, mov.action.positionSpec.toPasserIdx);
            if (!endLocation) return undefined;

            return {
                ...mov,
                action: createPathSegment(startLocation, endLocation, mov.action.bend),
            };
        }

        // const startLocation = this._resolveLocationAtTime(mov.onBeat, mov.passerIdx);
        throw new Error("Not yet implemented");
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
    _getLocation(time: number, passerIdx: PasserIdx, doNotStartPassersMidWalk: boolean = false): [number, number] {
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
        if (allMovements.length === 1 && allMovements[0].action.type === "teleport")
            return [allMovements[0].action.toX, allMovements[0].action.toY];

        assert(allMovements.every((mov, i) => i === 0 || allMovements[i - 1].onBeat <= mov.onBeat), "All movements for this passer must be sorted by onBeat")
        // rotate the array so that the first element is the first after time % mod; so we can go from the back
        for (let i = 0; i < allMovements.length && allMovements[0].onBeat <= time % this.mod; i++) {
            // move the first movement to the end
            allMovements.push(allMovements.shift()!)
        }
        for (let i = allMovements.length - 1; i >= 0; i--) {
            const mov = allMovements[i];
            // if a movement starts right now, but it is unresolved, we can look at where the previous one ended
            if (mov.onBeat === time % this.mod && mov.action.type === "unresolved")
                continue
            if (mov.action.type === "unresolved")
                throw new Error("This passer's last movement is not resolved");
            // teleport should not be relevant, let's ignore it
            if (mov.action.type === "teleport")
                continue
            assert(mov.action.type === "resolved", "Movement must be resolved here");
            const timeSinceMoveStart = (time - mov.onBeat + this.mod) % this.mod;
            if (timeSinceMoveStart >= mov.duration) {
                // the last move has completed, so we know where we are
                return [mov.action.toX, mov.action.toY]
            } else {
                // we are currently moving, so we need to find where on the path we are
                const progress = timeSinceMoveStart / mov.duration;
                const path = genPath(helperSvg, mov.action); // create the path in the helper SVG to get the length
                const p = path.pointAt(progress * path.length());
                return [p.x, p.y]
            }
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

function createPathSegment(startLocation: [number, number], endLocation: [number, number], bend: string | undefined): ResolvedMovementSpec {
    assert(bend === undefined, "Bend not yet implemented in createPathSegment");
    return {
        fromX: startLocation[0],
        fromY: startLocation[1],
        path: [],
        toX: endLocation[0],
        toY: endLocation[1],
        type: "resolved"
    }
}
