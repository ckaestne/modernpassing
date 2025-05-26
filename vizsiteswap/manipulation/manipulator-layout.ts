/**
 * functions to compute layout/animations for manipulator patterns
 * 
 * generally takes a base pattern with a layout and adjusts it for the manipulators
 */

import { type Pattern, type GroupPatternLayout, type ManipulatorAction, type Role, Hand, type AnimationLayout, SubstitutionMarker, InterceptMarker, CarryMarker } from "@modernpassing/pattern";
import assert from "node:assert";


export type ManipulatorPosition = {
    beat: number,
    role: Role,
    between: [Role, Role], // from/to of the base pass
    side: number, // relative distance: .5 is in the middle, 0.1 near the second role, 0 is where the second role is, ...
    offset: number, // absolute distance: 0 is in the passing lane between the roles, .2 is further to the outside of the righthand pass, -.2 is further to the outside of the lefthand pass
    direction: number // in degree; 0 is facing the second role, 90 (clockwise) is facing sideways to substitute a righthand pass to 
}
export type TakePosition = {
    beat: number,
    length: number, // how long the swap lasts
    from: Role,
    to: Role
}


/**
 * Computes the location of a passer (identified by a role) at a given beat
 * 
 * In a walking pattern that may require finding the location on a path
 * 
 * For manipulations between manipulators, locations may depend on each other, so the
 * order matters. We assume that intercept locations are computed before 
 * substitution actions.
 */
function getLocation(layout: AnimationLayout, beat: number, role: Role): [number, number] {
    assert(beat === 0 || layout.movementSegments.length===0, "TODO")
    const initialPosition = layout.initialPositions.find(p => p.role === role)
    if (!initialPosition) {
        throw new Error(`No position for role ${role}`)
    }
    return [initialPosition.x, initialPosition.y]
}

/** returns [x, y, absoluteRotationInDegree] (where rotation 0 = facing right) */
/**
 * resolves the location of a manipulator for a given action that is 
 * abstracted as an AbstractPosition object that indicates the location
 * relative to other roles.
 * 
 * @param layout known positions/animations so far
 * @param abstractPosition specification of where to position the manipulator (relative)
 * @returns [x, y, absoluteRotationInDegree]
 */
export function resolveManipulatorPositionAndRotation(layout: AnimationLayout, abstractPosition: ManipulatorPosition): [number, number, number] {
    // TODO maybe redo this to make it relative to a specific pass (i.e. handling crossing/straight,
    //  which indication of whether to stand left/right of the pass and early/middle/late/very late)
    // rather than specific numbers
    const [fromX, fromY] = getLocation(layout, abstractPosition.beat, abstractPosition.between[0])
    const [toX, toY] = getLocation(layout, abstractPosition.beat, abstractPosition.between[1])

    const x = fromX + (toX - fromX) * (1 - abstractPosition.side)
    const y = fromY + (toY - fromY) * (1 - abstractPosition.side)

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const angleDegrees = angle * (180 / Math.PI)
    const absoluteRotation = (angleDegrees + abstractPosition.direction) % 360

    //  Compute perpendicular direction for the offset
    const perpendicularAngle = angleDegrees + 90
    const perpendicularRad = perpendicularAngle * (Math.PI / 180)
    const offsetX = abstractPosition.offset * Math.cos(perpendicularRad)
    const offsetY = abstractPosition.offset * Math.sin(perpendicularRad)

    return [x + offsetX, y + offsetY, absoluteRotation]
}

export function applyManipulatorLayout(pattern: Pattern, initialLayout: GroupPatternLayout): GroupPatternLayout {
    if (initialLayout.animation) {
        return {
            ...initialLayout,
            animation: applyManipulatorAnimationLayout(pattern, initialLayout.animation)
        }
    }
    return initialLayout
}

/**
 * takes a layout of a base pattern (with positions and movement resolved) and a pattern
 * that already includes the manipulator actions (i.e. local notation; relying on
 * markers on throws).
 * 
 * It now adds the manipulator positions to the layout
 * 
 * This works by first finding all the manipulator actions in the pattern, then creating
 * abstract locations for them (relative to other actions), and finally resolving
 * these locations to absolute positions in the layout.
 * 
 * @param pattern pattern with manipulator actions included (i.e. with manipulator markers)
 * @param initialLayout initial layout of the base pattern, with positions and movement, but without manipulators
 * @returns updated layout with manipulator positions/movement added
 */
export function applyManipulatorAnimationLayout(pattern: Pattern, initialLayout: AnimationLayout): AnimationLayout {

    const [abstractPositions, abstractMovements] = getAbstractPositionsFromPattern(pattern);

    const manipulatorRoles: Role[] = [];
    for (const position of abstractPositions) {
        if (!manipulatorRoles.includes(position.role)) {
            manipulatorRoles.push(position.role);
        }
    }
    manipulatorRoles.sort()
    // Group positions by manipulator role
    const abstractPositionsPerManipulator: Record<Role, ManipulatorPosition[]> = manipulatorRoles.reduce((acc, role) => {
        acc[role] = abstractPositions
            .filter(position => position.role === role)
            .sort((a, b) => a.beat - b.beat);
        return acc;
    }, {} as Record<Role, ManipulatorPosition[]>);


    const newLayout: AnimationLayout = {
        ...initialLayout,
        initialPositions: [...initialLayout.initialPositions],
        directMovements: [...(initialLayout.directMovements || [])],
    };

    // first position for each manipulator will be the initial position
    for (const role of manipulatorRoles) {
        const firstPosition = abstractPositionsPerManipulator[role][0];
        if (firstPosition) {
            const [x, y, rotation] = resolveManipulatorPositionAndRotation(initialLayout, firstPosition);
            newLayout.initialPositions.push({
                role: role,
                x: x,
                y: y,
                direction: rotation
            });
        }
        let priorX = -1, priorY = -1, priorRotation = -1;
        for (const abstractPosition of abstractPositionsPerManipulator[role]) {
            const [x, y, rotation] = resolveManipulatorPositionAndRotation(newLayout, abstractPosition);
            if (x !== priorX || y !== priorY || rotation !== priorRotation) {
                priorX = x;
                priorY = y;
                priorRotation = rotation;
                newLayout.directMovements!.push({
                    onBeat: mod(abstractPosition.beat-1, pattern.getLength()),// TODO: this is dangerous, this might be a different role 1 beat earlier
                    mod: pattern.getLength(),
                    role: abstractPosition.role,
                    x: x,
                    y: y,
                    direction: rotation,
                    duration: 1, // TODO: maybe make movement duration dependent on the distance to the next movement?
                });
            }
        }
    }

    for (const abstractMovement of abstractMovements) {
        const [toX, toY] = getLocation(newLayout, abstractMovement.beat, abstractMovement.to)

        // add a movement segment for the take
        newLayout.directMovements!.push({
            onBeat: mod(abstractMovement.beat, pattern.getLength()),
            mod: pattern.getLength(),
            role: abstractMovement.from,
            x: toX,
            y: toY,
            duration: abstractMovement.length,
            direction: 0 // TODO: maybe make this dependent on the direction of the pass
        });
    }



    return newLayout
}


function mod(va: number, len: number): number {
    let v = va;
    while (v < 0) {
        v += len;
    }
    return v % len;
}

export function getAbstractPositionsFromPattern(pattern: Pattern): [ManipulatorPosition[], TakePosition[]] {
    const abstractPositions: ManipulatorPosition[] = [];
    const abstractMovement: TakePosition[] = [];

    for (const t of pattern.throws) {
        for (const kind of ["S", "P", "I", "C"])
            assert(t.markers ? t.markers.filter(m => m.kind === kind).length <= 1 : true, `There should be at most one marker of kind ${kind} per throw`);

        // substitutions (only handling the pelf for now, assuming the substituted hand-in happens from the same location, even if later)
        if (t.markers?.some(m => m.kind === "S" && (m as SubstitutionMarker).throw === 'P')) {
            const marker: SubstitutionMarker = t.markers!.find(m => m.kind === "S") as SubstitutionMarker;
            const manipulatorRole = pattern.getToPasserRole(t);

            abstractPositions.push({
                beat: t.throwBeat,
                role: manipulatorRole,
                between: [marker.fromRole, marker.toRoleAtThrow],
                side: 0.5, // TODO distinguish different substitutions
                offset: 0, // TODO distinguish different substitutions
                direction: 90 // substitutions by facing outside toward the pass // TODO distinguish different substitutions
            });
        }

        // intercepts
        if (t.markers?.some(m => m.kind === "I")) {
            const marker: InterceptMarker = t.markers!.find(m => m.kind === "I") as InterceptMarker;
            const manipulatorRole = pattern.getToPasserRole(t);

            abstractPositions.push({
                beat: t.throwBeat,
                role: manipulatorRole,
                between: [marker.fromRole, marker.originalToRoleAtThrow],
                side: 0.5, // TODO distinguish different intercepts
                offset: 0, // TODO distinguish different intercepts
                direction: 180 // face the origin of the pass
            });
            // once the pass lands, go to the position of the manipulated
            const landingOffset = .25 * pattern.nrHands;
            abstractMovement.push({
                beat: t.throwBeat + t.throwLength - landingOffset,
                length: landingOffset,
                from: manipulatorRole,
                to: marker.originalToRoleAtThrow
            });
        }

        // carry
        if (t.markers?.some(m => m.kind === "C")) {
            const marker: CarryMarker = t.markers!.find(m => m.kind === "C") as CarryMarker;
            const manipulatorRole = pattern.getFromPasserRole(t);

            abstractPositions.push({
                beat: t.throwBeat,
                role: manipulatorRole,
                between: [marker.originalFromRole, marker.toRoleAtThrow],
                side: 0.2, // stand in front of target
                offset: 0, // stand in the passing lane // TODO distinguish different carries
                direction: 0 // face the receiver
            });
        }


    }
    return [abstractPositions, abstractMovement];
}
