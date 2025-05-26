/**
 * functions to compute layout/animations for manipulator patterns
 * 
 * generally takes a base pattern with a layout and adjusts it for the manipulators
 */

import { assert } from "node:console";
import { type Pattern, type GroupPatternLayout, type ManipulatorAction, type Role, Hand, type AnimationLayout } from "@modernpassing/pattern";
import { findManipulatedThrow } from "./manipulator-processing.ts";


export type ManipulatorPosition = {
    beat: number,
    role: Role,
    between: [Role, Role], // from/to of the base pass
    side: number, // relative distance: .5 is in the middle, 0.1 near the second role, 0 is where the second role is, ...
    offset: number, // absolute distance: 0 is in the passing lane between the roles, .2 is further to the outside of the righthand pass, -.2 is further to the outside of the lefthand pass
    direction: number // in degree; 0 is facing the second role, 90 (clockwise) is facing sideways to substitute a righthand pass to 
}


/**
 * Computes the location of a passer (identified by a role) at a given beat
 * 
 * In a walking pattern that may require finding the location on a path
 */
function getLocation(layout: AnimationLayout, beat: number, role: Role): [number, number] {
    assert(beat===0,"TODO")
    const initialPosition = layout.initialPositions.find(p => p.role === role)
    if (!initialPosition) {
        throw new Error(`No position for role ${role}`)
    }
    return [initialPosition.x, initialPosition.y]
}

/** returns [x, y, absoluteRotationInDegree] (where rotation 0 = facing right) */
export function getManipulatorPositionAndRotation(layout: AnimationLayout, abstractPosition: ManipulatorPosition): [number, number, number] {
    const [fromX, fromY] = getLocation(layout, abstractPosition.beat, abstractPosition.between[0])
    const [toX, toY] = getLocation(layout, abstractPosition.beat, abstractPosition.between[1])

    const x = fromX + (toX - fromX) * (1-abstractPosition.side)
    const y = fromY + (toY - fromY) * (1-abstractPosition.side)

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const angleDegrees = angle * (180 / Math.PI)
    const absoluteRotation = (angleDegrees + abstractPosition.direction) % 360

    //  Compute perpendicular direction for the offset
    const perpendicularAngle = angleDegrees + 90
    const perpendicularRad = perpendicularAngle * (Math.PI / 180)
    const offsetX = abstractPosition.offset * Math.cos(perpendicularRad)
    const offsetY = abstractPosition.offset * Math.sin(perpendicularRad)

    return [x+offsetX, y+offsetY, absoluteRotation]
}

export function applyManipulatorLayout(pattern: Pattern, manipulations: ManipulatorAction[], rewritten: Pattern, layout: AnimationLayout): AnimationLayout {
    const newLayout: AnimationLayout = JSON.parse(JSON.stringify(layout));

    const manipulatorPositions: ManipulatorPosition[] = []
    // on each manipulation beat, compute the location of the manipulators
    for (const m of manipulations) {
        if (m.kind === "S") {
            const t = findManipulatedThrow(pattern, m)
            const from = m.fromPasserRole ?? pattern.getRole(t.throwBeat, t.fromPasserIdx)
            const to = m.toPasserRole
            // let's handle left hand passes, crossing passes, and alternating hands later
            assert(t.fromHand === Hand.Right)
            assert(pattern.getTargetHand(t, 0) === Hand.Left)
            assert(pattern.getThrowHand(t, 0) === pattern.getThrowHand(t, 1))

            manipulatorPositions.push({
                beat: m.beat,
                role: m.manipulatorRole,
                between: [from, to],
                side: 0.5,
                offset: 0,
                direction: 90
            })
        }



    }

    // Group manipulator positions by role and find the earliest position for each role
    const earliestPositionsByRole = manipulatorPositions.reduce<Record<Role, ManipulatorPosition>>((acc, position) => {
        const currentRole = position.role;
        if (!acc[currentRole] || position.beat < acc[currentRole].beat) {
            acc[currentRole] = position;
        }
        return acc;
    }, {});

    for (const role in earliestPositionsByRole) {
        const position = earliestPositionsByRole[role];
        const [x, y, rotation] = getManipulatorPositionAndRotation(newLayout, position);
        newLayout.initialPositions.push({
            role: position.role,
            x: x,
            y: y,
            direction: rotation,
        })
    }

    // newLayout.initialPositions.push

    console.log(manipulatorPositions)

    return newLayout
}



