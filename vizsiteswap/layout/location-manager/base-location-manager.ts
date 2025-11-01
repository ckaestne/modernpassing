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
import type { LocationMgrMovement } from "./location-manager.ts";



export function createBaseLocationManager(animationSpec: AnimationSpec): LocationManager {
    const overallMod = getAnimationMod(animationSpec, true);


    let movements: LocationMgrMovement[] = []

    const currentSequences = animationSpec.baseMovementSequences.slice()
    const initialRoles = animationSpec.basePatternRelabeling.initial

    // physical passers are identified by numbers 0..n-1 in the order of initialRoles
    // `roleMapping` identifies for each passerIdx (row) what role they have at each time (column)

    let currentRoles = initialRoles
    let roleMapping: [number/*onBeat*/, Role[]][] = [[0, initialRoles]]
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
                movements.push({
                    passerIdx, // passerId
                    onBeat: time + movementTrigger.onBeat % 1, // onBeat
                    duration: movementTrigger.duration,
                    segment: animationSpec.baseMovementSegments[nextSegment] // the actual movement spec
                })
            }
        }




        time++;

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.");
    }

    roleMapping = roleMapping.filter(r => r[0] < time);
    movements = movements.filter(m => m.onBeat < time);

    return new LocationManager(initialRoles,
        animationSpec.initialPositions.map(p => [p.role, p.x, p.y]),
        time,
        movements, roleMapping
    )

}


export class LocationManager {
    readonly initialPositions: [Role, number, number][]
    readonly mod: number
    readonly movements: LocationMgrMovement[]
    readonly roleMapping: [number/*onBeat*/, Role[]][]
    readonly roles: Role[]
    readonly doNotStartPassersMidWalk: boolean
    constructor(roles: Role[], initialPositions: [Role, number, number][], mod: number, movements: LocationMgrMovement[], roleMapping: [number/*onBeat*/, Role[]][], doNotStartPassersMidWalk: boolean = true) {
        this.roles = roles;
        this.initialPositions = initialPositions;
        this.mod = mod;
        this.movements = movements;
        this.roleMapping = roleMapping;
        this.doNotStartPassersMidWalk = doNotStartPassersMidWalk;
    }

    getFutureLocationByRole(timeOfLocation: number, timeOfRoleIdentification: number, role: Role): [number, number] {
        assert(role in this.roles, `Role ${role} not found in roles ${this.roles}`)
        const passerIdx = this._getPasserIdx(timeOfRoleIdentification, role);
        return this._getLocation(timeOfLocation, passerIdx);
    }

    getLocationByRole(time: number, role: Role): [number, number] {
        const passerIdx = this._getPasserIdx(time, role);
        return this._getLocation(time, passerIdx);
    }

    findOngoingAnimationByRole(time: number, role: Role): LocationMgrMovement | undefined {
        const passerIdx = this._getPasserIdx(time, role);
        return this.findOngoingAnimation(time, passerIdx);
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
    _getLocation(time: number, passerIdx: PasserIdx): [number, number] {
        // let's find the last movement before the time of interest

        // while movement can potentially overlap, whenever a new movement starts, the previous one is aborted, 
        // so we only need to look at the one that started the most recently.
        // Also movements are on fixed paths in the base pattern, so we don't care where an aborted walk was aborted

        const lastMoveBeforeTime = this.findLastMovementBeforeTime(time, passerIdx);
        // if this passer never moves, return the initial position
        if (!lastMoveBeforeTime)
            return this.initialPositions[passerIdx].slice(1) as [number, number];


        const segment = lastMoveBeforeTime!.segment;
        const timeSinceMoveStart = (time - lastMoveBeforeTime!.onBeat + this.mod) % this.mod;
        if (timeSinceMoveStart >= lastMoveBeforeTime!.duration) {
            // the last move has completed, so we know where we are
            return [segment.toX, segment.toY]
        } else {
            // we are currently moving, so we need to find where on the path we are
            const progress = timeSinceMoveStart / lastMoveBeforeTime!.duration;
            const path = genPath(helperSvg, segment); // create the path in the helper SVG to get the length
            const p = path.pointAt(progress * path.length());
            return [p.x, p.y]
        }
    }

    getMovementByRole(time: number, role: Role): LocationMgrMovement | undefined {
        const passerIdx = this._getPasserIdx(time, role);
        return this._getMovement(time, passerIdx);
    }

    _getMovementByRole(time: number, role: Role): LocationMgrMovement | undefined {
        const passerIdx = this._getPasserIdx(time, role);
        return this._getMovement(time, passerIdx);
    }

    _getMovement(time: number, passerIdx: PasserIdx): LocationMgrMovement | undefined {
        return this.movements.find(m => m.passerIdx === passerIdx && m.onBeat === time);
    }

    private findLastMovementBeforeTime(time: number, passerIdx: PasserIdx): LocationMgrMovement | undefined {
        const lastMoveBeforeTime = this.movements.findLast(m => m.passerIdx === passerIdx && m.onBeat <= time % this.mod);
        // if we have a fragmented movement from the previous round that should be skipped, teleport to the end
        if (lastMoveBeforeTime?.skipInFirstIteration && this.doNotStartPassersMidWalk && time < this.mod)
            return {
                ...lastMoveBeforeTime,
                duration: 0,
                segment: {
                    toX: lastMoveBeforeTime.segment.toX,
                    toY: lastMoveBeforeTime.segment.toY
                }
            }
        if (!lastMoveBeforeTime && (!this.doNotStartPassersMidWalk || time >= this.mod))
            return this.movements.findLast(m => m.passerIdx === passerIdx)
        return lastMoveBeforeTime
    }

    private findOngoingAnimation(time: number, passerIdx: PasserIdx): LocationMgrMovement | undefined {
        // find the last movement before the time
        const lastMoveBeforeTime = this.findLastMovementBeforeTime(time, passerIdx);
        if (!lastMoveBeforeTime) return undefined; // no prior or current animation at all

        // if the last move has completed, no ongoing animation
        const timeSinceMoveStart = (time - lastMoveBeforeTime!.onBeat + this.mod) % this.mod;
        if (timeSinceMoveStart >= lastMoveBeforeTime!.duration) {
            return undefined
        } else {
            // we are currently moving, return that movement
            return lastMoveBeforeTime;
        }
    }

}
