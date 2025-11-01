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

import { Pattern, Role } from "@modernpassing/pattern";
import { AnimationSpec, MovementSegmentSpec } from "../animation-spec.ts";
import assert from "node:assert";
import { createPasserIdx, genPath, helperSvg, same, same2, getAnimationMod } from "./helpers.ts";
import type { PasserIdx } from "./helpers.ts";
import { truncateAnimation } from "./truncate-svg-path.ts";
import { createBaseLocationManager, LocationManager } from "./base-location-manager.ts";
import { aborted } from "node:util";



export type LocationMgrMovement = {
    passerIdx: PasserIdx,
    onBeat: number,
    duration: number,
    segment: MovementSegmentSpec | TeleportSpec
    skipInFirstIteration?: boolean // usually false/undefined; if true, skip this movement in the first iteration if also doNotStartPassersMidWalk, like movement from the previous round
}

// Teleport is used temporarily, internally before modeling the manipulator's movement
// -- in the base pattern, we assume that they always teleport to the manipulatee's
// position on the intercept
export type TeleportSpec = {
    toX: number,
    toY: number
}


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
    let movements: LocationMgrMovement[] = []
    const isManipulator = (role: Role) => !animationSpec.basePatternRelabeling.initial.includes(role);

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

                // if any manipulators are no longer manipulators they need to teleport
                relabel.changes.map(([fromRole, toRole]: [Role, Role]) => {
                    if (isManipulator(fromRole) && !isManipulator(toRole)) {
                        const relabelTime = time + relabel.onBeat % 1;
                        const ongoingAnimation = baseLocationManager.findOngoingAnimationByRole(relabelTime+baseLocationManager.mod, toRole);
                        if (!ongoingAnimation)
                            movements.push({
                                passerIdx: createPasserIdx(currentRoles.indexOf(toRole)),
                                onBeat: relabelTime,
                                duration: 0,
                                segment: {
                                    toX: baseLocationManager.getLocationByRole(time, toRole)[0],
                                    toY: baseLocationManager.getLocationByRole(time, toRole)[1],
                                } as TeleportSpec
                            })
                        else {
                            const skipAnimationBeginning = (relabelTime - ongoingAnimation.onBeat + baseLocationManager.mod) % baseLocationManager.mod;
                            movements.push({
                                passerIdx: createPasserIdx(currentRoles.indexOf(toRole)),
                                onBeat: relabelTime,
                                duration: ongoingAnimation.duration - skipAnimationBeginning,
                                segment: truncateAnimation(ongoingAnimation.segment as MovementSegmentSpec, skipAnimationBeginning / ongoingAnimation.duration),
                                skipInFirstIteration: ongoingAnimation.onBeat > time
                            })
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
                movements.push({
                    passerIdx: currPasserIdx, // passerId
                    onBeat: time + movementTrigger.onBeat % 1, // onBeat
                    duration: movementTrigger.duration,
                    segment: animationSpec.baseMovementSegments[nextSegment] // the actual movement spec
                })
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

    return new LocationManager(
        initialRoles,
        animationSpec.initialPositions.map(p => [p.role, p.x, p.y]),
        time,
        movements,
        roleMapping
    )
}



