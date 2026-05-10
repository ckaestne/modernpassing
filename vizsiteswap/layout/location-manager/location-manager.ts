/**
 * Location Manager
 *
 * Identifies where everybody is on each beat, based on an animation specification.
 *
 * Consists of two parts, a role tracker that identifies which passer has which role at
 * any time, and a movement tracker that identifies how passers are moving. Movements
 * may initially depend on other movements until they are resolved.
 * The resolution mechanism is in relative-movements.ts
 *
 * Two functions are provided to create the location manager solely
 * based on a layout specification (AnimationSpec), no access to the actual pattern
 * is needed.
 *
 * Due to the ability to "take a position" of the base pattern, manipulator patterns
 * often need a separate location manager for the base pattern to compute where roles
 * would be in the base pattern.
 */

import type { Role } from "@modernpassing/pattern"
import type { AnimationSpec, RelativeMovementSpec } from "../animation-spec.ts"
import assert from "node:assert"
import { createPasserIdx, getAnimationMod, same, same2, same3 } from "./helpers.ts"
import type { PasserIdx } from "./helpers.ts"
import { createResolvedMovementSegmentFromSegmentSpec, createUnresolvedMovementSegment, MovementSegment, MovementTracker, RoleTracker, type UnresolvedBetweenPositionSpec, type UnresolvedInFrontOfPositionSpec } from "./relative-movement.ts"
import type { MovementAnimation } from "../animation-plan.ts"
import { truncateAnimation } from "./truncate-svg-path.ts"
import { time } from "node:console"
import { A } from "@svgdotjs/svg.js"

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
        this.roleTracker = roleTracker
        assert(roleTracker.mod === movementTracker.mod, `Role tracker mod ${roleTracker.mod} and movement tracker mod ${movementTracker.mod} must be the same.`)
        this.mod = roleTracker.mod
        this.movementTracker = movementTracker //.resolve();
        // assert(!this.movementTracker.hasUnresolvedMovements(), "Location manager cannot resolve all movements.");
        this.doNotStartPassersMidWalk = doNotStartPassersMidWalk
    }

    getFutureLocationByRole(timeOfLocation: number, timeOfRoleIdentification: number, role: Role): [number, number] {
        assert(this.roleTracker.roles.includes(role), `Role ${role} not found in roles ${this.roleTracker.roles}`)
        const passerIdx = this.roleTracker._getPasserIdx(timeOfRoleIdentification, role)
        return this.movementTracker._getLocation(timeOfLocation, passerIdx)
    }

    getLocationByRole(time: number, role: Role): [number, number] {
        return this.getFutureLocationByRole(time, time, role)
    }

    findOngoingAnimationByRole(time: number, role: Role): MovementSegment | undefined {
        return this.findFutureOngoingAnimationByRole(time, time, role)
    }

    findFutureOngoingAnimationByRole(timeOfLocation: number, timeOfRoleIdentification: number, role: Role): MovementSegment | undefined {
        const passerIdx = this.roleTracker._getPasserIdx(timeOfRoleIdentification, role)
        return this.movementTracker.findOngoingAnimation(timeOfLocation, passerIdx)
    }

    getInitialPositions(): [PasserIdx, number, number, Role][] {
        return this.roleTracker.roles.map((role) => {
            const passerIdx = this.roleTracker._getPasserIdx(0, role)
            const [x, y] = this.movementTracker._getLocation(0, passerIdx)
            return [passerIdx, x, y, role]
        })
    }

    /** export all resolved movements as Animation objects */
    getAnimations(): MovementAnimation[] {
        return this.movementTracker.movements.flatMap((movement) => movement.getAnimations())
    }
}

export function createBaseLocationManager(animationSpec: AnimationSpec): LocationManager {
    const overallMod = getAnimationMod(animationSpec, true)

    let movements: MovementSegment[] = []

    const currentSequences = animationSpec.baseMovementSequences.slice()
    const initialRoles = animationSpec.basePatternRelabeling.initial

    // physical passers are identified by numbers 0..n-1 in the order of initialRoles
    // `roleMapping` identifies for each passerIdx (row) what role they have at each time (column)

    let currentRoles = initialRoles
    let roleMapping: [number, /*onBeat*/ Role[]][] = [[0, initialRoles]]

    // initial positions modeled as teleportations at time 0
    const startingPositions: [number, number][] = []
    for (let i = 0; i < animationSpec.initialPositions.length; i++) {
        const pos = animationSpec.initialPositions[i]
        // movements.push(new TeleportMovementSegment(createPasserIdx(i), 0, pos.x, pos.y));
        startingPositions.push([pos.x, pos.y])
    }

    let time = 0
    while (true) {
        // track relabeling and create a map from passerRole to Role over time
        for (const relabel of animationSpec.basePatternRelabeling.relabelActions) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentRoles = currentRoles.map((r) => {
                    const change = relabel.changes.find((c) => c[0] === r)
                    if (change) return change[1]
                    else return r
                })
                roleMapping.push([time, currentRoles])
            }
        }

        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(currentRoles, initialRoles)) {
            break
        }

        // collect a list of movements
        for (const movementTrigger of animationSpec.baseMovementTriggers) {
            if (time % movementTrigger.mod === Math.floor(movementTrigger.onBeat)) {
                // movement is identified by a role, here we identify which passer this is
                // since we are unrolling this until the pattern fully repeats, not just until it relabels,
                // this the role identifies a specific passer at this point in time
                const passerIdx = createPasserIdx(currentRoles.indexOf(movementTrigger.role))
                const nextSegment = currentSequences[passerIdx][0]
                currentSequences[passerIdx] = currentSequences[passerIdx].slice(1)
                currentSequences[passerIdx].push(nextSegment)

                movements.push(createResolvedMovementSegmentFromSegmentSpec(
                    passerIdx,
                    time + movementTrigger.onBeat % 1, // onBeat
                    movementTrigger.duration,
                    animationSpec.baseMovementSegments[nextSegment], // the actual movement spec
                    false,
                ))
            }
        }

        time++

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.")
    }

    roleMapping = roleMapping.filter((r) => r[0] < time)
    movements = movements.filter((m) => m.onBeat < time)
    movements.sort((a, b) => a.onBeat - b.onBeat)
    movements = movements.map(skipMovementsAcrossIterationBoundaries(time))

    const roleTracker = new RoleTracker(initialRoles, time, roleMapping)
    const movementTracker = new MovementTracker(time, movements, startingPositions)

    return new LocationManager(roleTracker, movementTracker)
}

/**
 * The full location manager computes locations of passers including manipulators and thus
 * relative movements.
 * @param animationSpec
 */
export function createFullLocationManager(animationSpec: AnimationSpec, skipValidationForDebugging: boolean = false): LocationManager {
    const overallMod = getAnimationMod(animationSpec)

    const baseLocationManager = createBaseLocationManager(animationSpec)
    assert(animationSpec.basePatternRelabeling.initial.every((role) => animationSpec.relabeling.initial.includes(role)), "Base pattern roles must be subset of full pattern roles")

    const initialRoles = animationSpec.relabeling.initial
    let currentRoles = initialRoles.slice()
    let currentBaseRoles = animationSpec.basePatternRelabeling.initial.slice()
    let roleMapping: [number, /*onBeat*/ Role[]][] = [[0, currentRoles]]

    const currentSequences = animationSpec.baseMovementSequences.slice()
    assert(currentSequences.length <= animationSpec.basePatternRelabeling.initial.length, "Base movement sequences must match number of base pattern roles")
    // while (currentSequences.length < currentRoles.length) currentSequences.push([]); // extend with manipulators (who have no walking instructions)
    let movements: MovementSegment[] = []
    const isManipulator = (role: Role) => !animationSpec.basePatternRelabeling.initial.includes(role)

    const initialLoc: number[] = currentRoles.map((_role, idx) => idx)
    const currentLoc = initialLoc.slice()

    let time = 0
    while (true) {
        // relabeling
        for (const relabel of animationSpec.relabeling.relabelActions) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentRoles = currentRoles.map((r) => {
                    const change = relabel.changes.find((c) => c[0] === r)
                    if (change) return change[1]
                    else return r
                })
                roleMapping.push([time, currentRoles])

                // if any manipulators are no longer manipulators they need to teleport (will be replaced with real movement later)
                relabel.changes.map(([fromRole, toRole]: [Role, Role]) => {
                    if (isManipulator(fromRole) && !isManipulator(toRole)) {
                        const relabelTime = time + relabel.onBeat % 1
                        const ongoingAnimation = baseLocationManager.findOngoingAnimationByRole(relabelTime + baseLocationManager.mod, toRole)

                        // switching location index between manipulator and manipulated
                        const lIdx = currentLoc[createPasserIdx(currentRoles.indexOf(fromRole))]
                        currentLoc[createPasserIdx(currentRoles.indexOf(fromRole))] = currentLoc[createPasserIdx(currentRoles.indexOf(toRole))]
                        currentLoc[createPasserIdx(currentRoles.indexOf(toRole))] = lIdx
                    }
                })
            }
        }
        for (const relabel of animationSpec.basePatternRelabeling.relabelActions) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentBaseRoles = currentBaseRoles.map((r) => {
                    const change = relabel.changes.find((c) => c[0] === r)
                    if (change) return change[1]
                    else return r
                })
                // baseRoleMapping.push([time, currentBaseRoles]);
            }
        }

        // check after relabeling, but before moving on that beat
        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(currentRoles, initialRoles) && same2(currentLoc, initialLoc)) {
            break
        }

        // collect a list of movements
        for (const movementTrigger of animationSpec.baseMovementTriggers) {
            if (time % movementTrigger.mod === Math.floor(movementTrigger.onBeat)) {
                // a movement trigger identifies the role of the passer moving at a certain time
                // however, movement specs are per passerIdx in the base pattern(!), so we need
                // to identify which passerIdx would have walked in the base pattern, but assign
                // the walk to potentially a different passer with that role in the full pattern

                // since we are unrolling this until the pattern fully repeats, not just until it relabels,
                // this the role identifies a specific passer at this point in time
                assert(animationSpec.basePatternRelabeling.initial.includes(movementTrigger.role), `Movement triggers are only defined for the base pattern, never for manipulators, but role ${movementTrigger.role} was triggered at time ${time}.`)
                const basePasserIdx = createPasserIdx(currentBaseRoles.indexOf(movementTrigger.role))
                const currPasserIdx = createPasserIdx(currentRoles.indexOf(movementTrigger.role))

                const nextSegment = currentSequences[basePasserIdx][0]
                currentSequences[basePasserIdx] = currentSequences[basePasserIdx].slice(1)
                currentSequences[basePasserIdx].push(nextSegment)
                // if it crosses the segment boundary, skip in the first iteration
                movements.push(createResolvedMovementSegmentFromSegmentSpec(
                    currPasserIdx, // passerId
                    time + movementTrigger.onBeat % 1, // onBeat
                    movementTrigger.duration,
                    animationSpec.baseMovementSegments[nextSegment],
                    false,
                ))
            }
        }

        time++

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.")
    }

    // assert(time % baseLocationManager.mod ===0, "Full location manager mod needs to be multiple of base location manager mod");

    roleMapping = roleMapping.filter((r) => r[0] < time)
    movements = movements.filter((m) => m.onBeat < time)

    const roleTracker = new RoleTracker(initialRoles, time, roleMapping)

    const startingPositions: ([number, number] | undefined)[] = Array(initialRoles.length).fill(undefined)
    for (let i = 0; i < animationSpec.initialPositions.length; i++) {
        const pos = animationSpec.initialPositions[i]
        const passerIdx = roleTracker._getPasserIdx(0, pos.role)
        // assert(initialRoles.indexOf(pos.role) === i, `Initial position role ${pos.role} in ${initialRoles} must be in the same order as base pattern roles ${animationSpec.initialPositions.map(p => p.role)}`);
        // movements.push(new TeleportMovementSegment(createPasserIdx(initialRoles.indexOf(pos.role)), 0, pos.x, pos.y))
        startingPositions[passerIdx] = [pos.x, pos.y]
    }

    // and now add all the relative movements
    movements.push(...convertRelativeMovements(time, animationSpec.relativeMovements, roleTracker, baseLocationManager))
    movements.sort((a, b) => a.onBeat - b.onBeat)

    movements = truncateInterruptedMovements(movements, time)
    movements = movements.map(skipMovementsAcrossIterationBoundaries(time))

    const movementTracker = new MovementTracker(time, movements, startingPositions)
    const resolvedMovementTracker = movementTracker.resolve()
    resolvedMovementTracker.resolve()
    assert(skipValidationForDebugging || !resolvedMovementTracker.hasUnresolvedMovements(), "Unresolved movements in full location manager: " + JSON.stringify(resolvedMovementTracker.movements.filter((m) => !m.isResolved())))
    assert(skipValidationForDebugging || !resolvedMovementTracker.hasJumpsInMovement(), "Resolved movements must not have jumps in movement.")

    return new LocationManager(roleTracker, resolvedMovementTracker)
}

function skipMovementsAcrossIterationBoundaries(mod: number): (mov: MovementSegment) => MovementSegment {
    return (mov: MovementSegment) => {
        if (mov.onBeat + mov.duration > mod) {
            return mov.doSkipInFirstIteration()
        }
        return mov
    }
}

function getTakeTargetPosition(baseLocationManager: LocationManager, timeOfLocation: number, timeOfRoleIdentification: number, role: Role, mod: number): [number, number] {
    // directly go to end position if the target person is still moving at this point
    const ongoingAnimation = baseLocationManager.findFutureOngoingAnimationByRole(timeOfLocation, timeOfRoleIdentification, role)
    if (ongoingAnimation) {
        return ongoingAnimation.isFirstIterationAt(timeOfLocation, mod) ? ongoingAnimation.toPositionFirstIteration! : ongoingAnimation.toPositionNextIteration!
    }
    // else get wherever we are
    return baseLocationManager.getFutureLocationByRole(timeOfLocation, timeOfRoleIdentification, role)
}

/**
 * aligns the mod and converts roles to passerIdx
 *
 * actual resolution of locations happens later in the movement tracker
 */
function convertRelativeMovements(mod: number, relativeMovements: RelativeMovementSpec[], roleTracker: RoleTracker, baseLocationManager: LocationManager): MovementSegment[] {
    const unresolvedRelativeMovementSpecs: MovementSegment[] = []
    for (let startTime = 0; startTime < mod; startTime++) {
        for (const relativeMovementSpec of relativeMovements) {
            if (startTime % relativeMovementSpec.mod === Math.floor(relativeMovementSpec.onBeat)) {
                // we need to compute the position of the manipulator at this time
                const leaveTime = startTime + relativeMovementSpec.onBeat % 1
                const arrivalTime = Math.floor((startTime + relativeMovementSpec.onBeat % 1 + relativeMovementSpec.duration) % mod)
                // const roleTime = relativeMovementSpec.targetRoleTime === "onBeat" ? startTime : arrivalTime
                const passerIdx = roleTracker._getPasserIdx(leaveTime, relativeMovementSpec.role)
                const crossesIterationBoundary = (leaveTime + relativeMovementSpec.duration) > mod

                if (relativeMovementSpec.positionSpec.type === "take") {
                    // look up the target position in the base pattern(!)
                    const targetLocationFirstIteration = getTakeTargetPosition(baseLocationManager, arrivalTime, leaveTime, relativeMovementSpec.positionSpec.toBasePatternRole, mod)
                    const targetLocationNextIteration = getTakeTargetPosition(baseLocationManager, arrivalTime + mod, leaveTime + mod, relativeMovementSpec.positionSpec.toBasePatternRole, mod)
                    const skipInFirst = (relativeMovementSpec.skipInFirstIteration || crossesIterationBoundary) && (startTime + relativeMovementSpec.duration) % mod < relativeMovementSpec.mod
                    unresolvedRelativeMovementSpecs.push(createUnresolvedMovementSegment(
                        passerIdx,
                        leaveTime,
                        relativeMovementSpec.duration,
                        skipInFirst,
                        {
                            positionSpec: { type: "take" },
                            bend: relativeMovementSpec.bend,
                        },
                        targetLocationFirstIteration,
                        targetLocationNextIteration,
                        targetLocationFirstIteration, // TODO: check if this is correct
                    ))
                } else {
                    const skipInFirst = (relativeMovementSpec.skipInFirstIteration || crossesIterationBoundary) && (startTime + relativeMovementSpec.duration) % mod < relativeMovementSpec.mod
                    const roleIdentificationTime = relativeMovementSpec.targetRoleTime === "arrival" ? arrivalTime : leaveTime
                    const convertedPositionSpec: UnresolvedBetweenPositionSpec | UnresolvedInFrontOfPositionSpec = relativeMovementSpec.positionSpec.type === "between"
                        ? {
                            ...relativeMovementSpec.positionSpec,
                            type: "between",
                            between: [
                                roleTracker._getPasserIdx(roleIdentificationTime, relativeMovementSpec.positionSpec.betweenRoles[0]),
                                roleTracker._getPasserIdx(roleIdentificationTime, relativeMovementSpec.positionSpec.betweenRoles[1]),
                            ],
                        }
                        : {
                            type: "infront",
                            toPasserIdx: roleTracker._getPasserIdx(roleIdentificationTime, relativeMovementSpec.positionSpec.toRole),
                            direction: relativeMovementSpec.positionSpec.direction,
                        }

                    unresolvedRelativeMovementSpecs.push(createUnresolvedMovementSegment(
                        passerIdx,
                        leaveTime, // onBeat
                        relativeMovementSpec.duration,
                        skipInFirst,
                        {
                            positionSpec: convertedPositionSpec,
                            bend: relativeMovementSpec.bend,
                        },
                    ))
                }
            }
        }
    }

    return unresolvedRelativeMovementSpecs
}

function truncateInterruptedMovements(movements: MovementSegment[], mod: number): MovementSegment[] {
    // assert movements are sorted
    assert(movements.every((m, idx) => idx === 0 || movements[idx - 1].onBeat <= m.onBeat), "Movements must be sorted by onBeat to truncate interrupted movements.")

    // movements start onBeat and have a duration. They may go over the mod boundary and wrap around
    // when a movement gets interrupted by another movement of the same passer, it needs to be truncated

    const result: MovementSegment[] = []
    for (let i = 0; i < movements.length; i++) {
        const currentMovement = movements[i]
        let nextMovement = movements.find((m) => m.onBeat > currentMovement.onBeat && m.passerIdx === currentMovement.passerIdx)
        // if there is none after this, check if it wraps around
        if (!nextMovement) {
            nextMovement = movements.find((m) => m.onBeat < currentMovement.onBeat && m.passerIdx === currentMovement.passerIdx)
        }
        assert(nextMovement, "I would expect at least two movements per passer?!")

        const timeBetweenMovements = (nextMovement.onBeat - currentMovement.onBeat + mod) % mod
        if (timeBetweenMovements < currentMovement.duration - 0.00001) { // tolerance for floating point errors
            // console.log(`truncating movement of ${currentMovement.passerIdx} on ${currentMovement.onBeat} duration ${currentMovement.duration} to ${timeBetweenMovements}`)
            result.push(currentMovement.truncateToDuration(timeBetweenMovements))
        } else {
            result.push(currentMovement)
        }
    }
    return result
}
