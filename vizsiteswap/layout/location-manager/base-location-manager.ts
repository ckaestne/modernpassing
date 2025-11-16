/**
 * Computes locations only of the base pattern, ignoring all manipulations
 * 
 * This operates entirely in terms of roles to the outside, not individual passers
 */

import { Pattern, Role } from "@modernpassing/pattern";
import { AnimationSpec, MovementSegmentSpec } from "../animation-spec.ts";
import assert from "node:assert";
import { createPasserIdx, genPath, getAnimationMod, helperSvg, same, same2 } from "./helpers.ts";
import type { PasserIdx } from "./helpers.ts";
import { MovementSegment, MovementTracker, ResolvedMovementSegment, RoleTracker, TeleportMovementSegment } from "./relative-movement.ts";



export function createBaseLocationManager(animationSpec: AnimationSpec): LocationManager {
    const overallMod = getAnimationMod(animationSpec, true);


    let movements: MovementSegment[] = []

    const currentSequences = animationSpec.baseMovementSequences.slice()
    const initialRoles = animationSpec.basePatternRelabeling.initial

    // physical passers are identified by numbers 0..n-1 in the order of initialRoles
    // `roleMapping` identifies for each passerIdx (row) what role they have at each time (column)

    let currentRoles = initialRoles
    let roleMapping: [number/*onBeat*/, Role[]][] = [[0, initialRoles]]

    // initial positions modeled as teleportations at time 0
    for (let i = 0; i < animationSpec.initialPositions.length; i++) {
        const pos = animationSpec.initialPositions[i];
        assert(initialRoles.indexOf(pos.role) === i, `Initial position role ${pos.role} must be in the same order as base pattern roles ${initialRoles}`);
        movements.push(new TeleportMovementSegment(createPasserIdx(i), 0, pos.x, pos.y));
    }

    let time = 0
    while (true) {
        // track relabeling and create a map from passerRole to Role over time
        for (const relabel of animationSpec.basePatternRelabeling.relabelActions) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentRoles = currentRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                roleMapping.push([time, currentRoles]);
            }
        }

        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(currentRoles, initialRoles))
            break

        // collect a list of movements
        for (const movementTrigger of animationSpec.baseMovementTriggers) {
            if (time % movementTrigger.mod === Math.floor(movementTrigger.onBeat)) {
                // movement is identified by a role, here we identify which passer this is
                // since we are unrolling this until the pattern fully repeats, not just until it relabels, 
                // this the role identifies a specific passer at this point in time
                const passerIdx = createPasserIdx(currentRoles.indexOf(movementTrigger.role));
                const nextSegment = currentSequences[passerIdx][0]
                currentSequences[passerIdx] = currentSequences[passerIdx].slice(1)
                currentSequences[passerIdx].push(nextSegment)
                movements.push(new ResolvedMovementSegment(passerIdx,
                    time + movementTrigger.onBeat % 1, // onBeat
                    movementTrigger.duration,
                    animationSpec.baseMovementSegments[nextSegment], // the actual movement spec
                ))
            }
        }




        time++;

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.");
    }

    roleMapping = roleMapping.filter(r => r[0] < time);
    movements = movements.filter(m => m.onBeat < time);

    const roleTracker = new RoleTracker(initialRoles, time, roleMapping);
    const movementTracker = new MovementTracker(time, movements);

    return new LocationManager(roleTracker, movementTracker)

}


/**
 * location manager is a unifying interface for the movement and role trackers
 * so that locations can be accessed through roles
 */
export class LocationManager {
    readonly roleTracker: RoleTracker
    readonly movementTracker: MovementTracker
    readonly mod: number

    readonly doNotStartPassersMidWalk: boolean
    constructor(roleTracker: RoleTracker, movementTracker: MovementTracker, doNotStartPassersMidWalk: boolean = true) {
        this.roleTracker = roleTracker;
        assert(roleTracker.mod === movementTracker.mod, `Role tracker mod ${roleTracker.mod} and movement tracker mod ${movementTracker.mod} must be the same.`)
        this.mod = roleTracker.mod;
        this.movementTracker = movementTracker//.resolve();
        // assert(!this.movementTracker.hasUnresolvedMovements(), "Location manager cannot resolve all movements.");
        this.doNotStartPassersMidWalk = doNotStartPassersMidWalk;
    }

    getFutureLocationByRole(timeOfLocation: number, timeOfRoleIdentification: number, role: Role): [number, number] {
        assert(role in this.roleTracker.roles, `Role ${role} not found in roles ${this.roleTracker.roles}`)
        const passerIdx = this.roleTracker._getPasserIdx(timeOfRoleIdentification, role);
        return this.movementTracker._getLocation(timeOfLocation, passerIdx);
    }

    getLocationByRole(time: number, role: Role): [number, number] {
        const passerIdx = this.roleTracker._getPasserIdx(time, role);
        return this.movementTracker._getLocation(time, passerIdx, this.doNotStartPassersMidWalk);
    }

    findOngoingAnimationByRole(time: number, role: Role): MovementSegment | undefined {
        const passerIdx = this.roleTracker._getPasserIdx(time, role);
        return this.movementTracker.findOngoingAnimation(time, passerIdx);
    }




    // getMovementByRole(time: number, role: Role): LocationMgrMovement | undefined {
    //     const passerIdx = this.roleTracker._getPasserIdx(time, role);
    //     return this.movementTracker._getMovement(time, passerIdx);
    // }


}


