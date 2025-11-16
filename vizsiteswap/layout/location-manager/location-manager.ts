/**
 * Location Manager
 * 
 * Identifies where everybody is on each beat, based on an animation specification.
 * 
 * The challenging part is that animations are expressed in terms of roles at different
 * times and the roles change. Also manipulator positions are expressed relative to other
 * positions (e.g., between A and B). Worst case, a manipulator's position may be expressed
 * relatively in terms of another manipulator's relative position.
 * In addition, positions at the very beginning of the pattern may be simplified
 * (e.g., at the end of the walk in scrambled V, even though technically the pattern starts
 * halfway through the walk).
 * 
 * In a nutshell, the positions of the base pattern are fairly directly extractable from the
 * specification. Manipulator positions should be computed next based on those, but with a 
 * dependency DAG to ensure that relative positions are resolved in the correct order.
 *  
 * Locations are generally internally tracked by physical people, not by roles, but there is
 * a lookup mechanism to identify the person ID from a role at a given time.
 */

import type { Role } from "@modernpassing/pattern";
import assert from "node:assert";
import type { AnimationSpec, MovementSegmentSpec, RelativeMovementSpec } from "../animation-spec.ts";
import { createBaseLocationManager, LocationManager } from "./base-location-manager.ts";
import { createPasserIdx, getAnimationMod, same, same2 } from "./helpers.ts";
import { MovementSegment, MovementTracker, ResolvedMovementSegment, ResolvedMovementTracker, RoleTracker, TeleportMovementSegment, UnresolvedMovementSegment, type UnresolvedBetweenPositionSpec, type UnresolvedInFrontOfPositionSpec, type UnresolvedTakePositionSpec } from "./relative-movement.ts";
import { truncateAnimation } from "./truncate-svg-path.ts";




/**
 * The full location manager computes locations of passers including manipulators and thus
 * relative movements.
 * @param animationSpec 
 */
export function createFullLocationManager(animationSpec: AnimationSpec): LocationManager {
    const overallMod = getAnimationMod(animationSpec);

    const baseLocationManager = createBaseLocationManager(animationSpec)
    assert(animationSpec.basePatternRelabeling.initial.every(role => animationSpec.relabeling.initial.includes(role)), 'Base pattern roles must be subset of full pattern roles')

    const initialRoles = animationSpec.relabeling.initial
    let currentRoles = initialRoles.slice()
    let currentBaseRoles = animationSpec.basePatternRelabeling.initial.slice()
    let roleMapping: [number/*onBeat*/, Role[]][] = [[0, currentRoles]]

    const currentSequences = animationSpec.baseMovementSequences.slice()
    assert(currentSequences.length === animationSpec.basePatternRelabeling.initial.length, "Base movement sequences must match number of base pattern roles");
    // while (currentSequences.length < currentRoles.length) currentSequences.push([]); // extend with manipulators (who have no walking instructions)
    let movements: MovementSegment[] = []
    const isManipulator = (role: Role) => !animationSpec.basePatternRelabeling.initial.includes(role);

    // initial positions modeled as teleportations at time 0
    for (let i = 0; i < animationSpec.initialPositions.length; i++) {
        const pos = animationSpec.initialPositions[i];
        assert(initialRoles.indexOf(pos.role) === i, `Initial position role ${pos.role} must be in the same order as base pattern roles ${initialRoles}`);
        movements.push(new TeleportMovementSegment(createPasserIdx(i), 0, pos.x, pos.y))
    }

    let time = 0
    while (true) {
        // relabeling
        for (const relabel of animationSpec.relabeling.relabelActions) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentRoles = currentRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                roleMapping.push([time, currentRoles]);

                // if any manipulators are no longer manipulators they need to teleport (will be replaced with real movement later)
                relabel.changes.map(([fromRole, toRole]: [Role, Role]) => {
                    if (isManipulator(fromRole) && !isManipulator(toRole)) {
                        const relabelTime = time + relabel.onBeat % 1;
                        const ongoingAnimation = baseLocationManager.findOngoingAnimationByRole(relabelTime + baseLocationManager.mod, toRole);

                        //TODO: this is probably broken. teleport is not needed but okay; however, the remaining walk below may be overwritten with some other relative move and it's not currently considered
                        if (!ongoingAnimation)
                            movements.push(new TeleportMovementSegment(createPasserIdx(currentRoles.indexOf(toRole)), relabelTime, baseLocationManager.getLocationByRole(time, toRole)[0], baseLocationManager.getLocationByRole(time, toRole)[1]))
                        else {
                            const skipAnimationBeginning = (relabelTime - ongoingAnimation.onBeat + baseLocationManager.mod) % baseLocationManager.mod;
                            assert(ongoingAnimation.isResolved(), "Ongoing animation must be resolved");
                            movements.push(new ResolvedMovementSegment(
                                createPasserIdx(currentRoles.indexOf(toRole)),
                                relabelTime,
                                ongoingAnimation.duration - skipAnimationBeginning,
                                truncateAnimation((ongoingAnimation as ResolvedMovementSegment).seg, skipAnimationBeginning / ongoingAnimation.duration),
                                ongoingAnimation.onBeat > time,
                            ))
                        }
                    }
                })
            }
        }
        for (const relabel of animationSpec.basePatternRelabeling.relabelActions) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentBaseRoles = currentBaseRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                // baseRoleMapping.push([time, currentBaseRoles]);
            }
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
                const basePasserIdx = createPasserIdx(currentBaseRoles.indexOf(movementTrigger.role));
                const currPasserIdx = createPasserIdx(currentRoles.indexOf(movementTrigger.role));


                const nextSegment = currentSequences[basePasserIdx][0]
                currentSequences[basePasserIdx] = currentSequences[basePasserIdx].slice(1)
                currentSequences[basePasserIdx].push(nextSegment)
                movements.push(new ResolvedMovementSegment(
                    currPasserIdx, // passerId
                    time + movementTrigger.onBeat % 1, // onBeat
                    movementTrigger.duration,
                    animationSpec.baseMovementSegments[nextSegment]
                ))
            }
        }


        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(currentRoles, initialRoles))
            break



        time++;

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.");
    }

    // assert(time % baseLocationManager.mod ===0, "Full location manager mod needs to be multiple of base location manager mod");





    roleMapping = roleMapping.filter(r => r[0] < time);
    movements = movements.filter(m => m.onBeat < time);

    const roleTracker = new RoleTracker(initialRoles, time, roleMapping);

    // and now add all the relative movements
    movements.push(...convertRelativeMovements(time, animationSpec.relativeMovements, roleTracker))
    movements.sort((a, b) => a.onBeat - b.onBeat);

    const movementTracker = new MovementTracker(time, movements);
    // const resolvedMovementTracker = movementTracker.resolve();
    // assert(!resolvedMovementTracker.hasUnresolvedMovements(), "All relative movements must be resolved in full location manager.");

    return new LocationManager(roleTracker, movementTracker)

}



/**
 * aligns the mod and converts roles to passerIdx
 * 
 * actual resolution of locations happens later in the movement tracker
 */
function convertRelativeMovements(mod: number, relativeMovements: RelativeMovementSpec[], roleTracker: RoleTracker): UnresolvedMovementSegment[] {

    const unresolvedRelativeMovementSpecs: UnresolvedMovementSegment[] = [];
    for (let startTime = 0; startTime < mod; startTime++) {
        for (const relativeMovementSpec of relativeMovements) {
            if (startTime % relativeMovementSpec.mod === Math.floor(relativeMovementSpec.onBeat)) {
                // we need to compute the position of the manipulator at this time
                let toX: number, toY: number;
                const leaveTime = startTime + relativeMovementSpec.onBeat % 1
                const arrivalTime = Math.floor((startTime + relativeMovementSpec.onBeat % 1 + relativeMovementSpec.duration) % mod);
                const roleTime = relativeMovementSpec.targetRoleTime === "onBeat" ? startTime : arrivalTime
                const passerIdx = roleTracker._getPasserIdx(roleTime, relativeMovementSpec.role);

                const convertedPositionSpec: UnresolvedTakePositionSpec | UnresolvedBetweenPositionSpec | UnresolvedInFrontOfPositionSpec =
                    relativeMovementSpec.positionSpec.type === "take" ?
                        {
                            type: "take",
                            toPasserIdx: roleTracker._getPasserIdx(leaveTime, relativeMovementSpec.positionSpec.toRole)
                        } :
                        relativeMovementSpec.positionSpec.type === "between" ?
                            {
                                ...relativeMovementSpec.positionSpec,
                                type: "between",
                                between: [
                                    roleTracker._getPasserIdx(leaveTime, relativeMovementSpec.positionSpec.between[0]),
                                    roleTracker._getPasserIdx(leaveTime, relativeMovementSpec.positionSpec.between[1])
                                ]
                            } :
                            {
                                type: "infront",
                                toPasserIdx: roleTracker._getPasserIdx(leaveTime, relativeMovementSpec.positionSpec.toRole)
                            };

                unresolvedRelativeMovementSpecs.push(new UnresolvedMovementSegment(
                    passerIdx,
                    leaveTime, // onBeat
                    relativeMovementSpec.duration,
                    {
                        positionSpec: convertedPositionSpec,
                        bend: relativeMovementSpec.bend,
                    }
                ))
            }
        }
    }

    return unresolvedRelativeMovementSpecs

}
