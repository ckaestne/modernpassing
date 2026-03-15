// /**
//  * functions to compute layout/animations for manipulator patterns
//  * 
//  * generally takes a base pattern with a layout and adjusts it for the manipulators
//  */

import { type Pattern, type Role, type CarryMarker, type InterceptMarker, type SubstitutionMarker, Hand, Throw } from "@modernpassing/pattern";
import assert from "node:assert";
import type { GroupPatternLayoutSpec, PositionSpec, RelativeMovementSpec } from "@modernpassing/layout";
import { AnimationSpec } from "../layout/animation-spec.ts";
import { A } from "@svgdotjs/svg.js";
import { setMaxIdleHTTPParsers } from "node:http";




// /**
//  * Computes the location of a passer (identified by a role) at a given beat
//  * 
//  * In a walking pattern that may require finding the location on a path
//  * 
//  * For manipulations between manipulators, locations may depend on each other, so the
//  * order matters. We assume that intercept locations are computed before 
//  * substitution actions.
//  */
// function getLocation(layout: AnimationSpec, beat: number, role: Role): [number, number] {
//     assert(beat === 0 || layout.movementSegments.length===0, "TODO")
//     const initialPosition = layout.initialPositions.find(p => p.role === role)
//     if (!initialPosition) {
//         throw new Error(`No position for role ${role}`)
//     }
//     return [initialPosition.x, initialPosition.y]
// }



export function applyManipulatorLayout(initialLayout: GroupPatternLayoutSpec, pattern: Pattern, basePattern: Pattern): GroupPatternLayoutSpec {
    if (initialLayout.animation) {
        return {
            ...initialLayout,
            animation: applyManipulatorAnimationLayout(pattern, basePattern, initialLayout.animation)
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
export function applyManipulatorAnimationLayout(pattern: Pattern, basePattern: Pattern, initialLayout: AnimationSpec): AnimationSpec {

    const relativeMovements = getRelativeMovementsFromPattern(pattern, basePattern);

    const manipulatorRoles: Role[] = [];
    for (const t of pattern.throws)
        if (t.markers?.some(m => m.kind === "I")) {
            const to = pattern.getToPasserRole(t)
            if (!manipulatorRoles.includes(to))
                manipulatorRoles.push(to)

        }
    manipulatorRoles.sort()
    // // Group positions by manipulator role
    // const initialManipulatorPositions: PositionSpec[] = []
    // const firstMovementPerManipulator: Record<Role, RelativeMovementSpec[]> = manipulatorRoles.reduce((acc, role) => {
    //     acc[role] = relativeMovements
    //         .filter(position => position.role === role)
    //         .sort((a, b) => ((a.onBeat + a.duration) % a.mod) - (b.onBeat + b.duration) % b.mod);
    //     return acc;
    // }, {} as Record<Role, RelativeMovementSpec[]>);


    const newLayout: AnimationSpec = {
        ...initialLayout,
        initialPositions: [...initialLayout.initialPositions],
        relativeMovements: [...initialLayout.relativeMovements, ...relativeMovements],
    };

    // // first position for each manipulator will be the initial position
    // for (const role of manipulatorRoles) {
    //     const firstPosition = firstMovementPerManipulator[role][0];
    //     if (firstPosition) {
    //         const [x, y, rotation] = resolveManipulatorPositionAndRotation(initialLayout, firstPosition);
    //         newLayout.initialPositions.push({
    //             role: role,
    //             x: x,
    //             y: y,
    //             direction: rotation
    //         });
    //     }
    //     let priorX = -1, priorY = -1, priorRotation = -1;
    //     for (const abstractPosition of firstMovementPerManipulator[role]) {
    //         const [x, y, rotation] = resolveManipulatorPositionAndRotation(newLayout, abstractPosition);
    //         if (x !== priorX || y !== priorY || rotation !== priorRotation) {
    //             priorX = x;
    //             priorY = y;
    //             priorRotation = rotation;
    //             console.log(`const [${x}, ${y}, ${rotation}] = resolveManipulatorPositionAndRotation(newLayout, ${JSON.stringify(abstractPosition)})`)
    //             newLayout.directMovements!.push({
    //                 onBeat: mod(abstractPosition.beat - 1, pattern.getLength()),// TODO: this is dangerous, this might be a different role 1 beat earlier
    //                 mod: pattern.getLength(),
    //                 role: abstractPosition.role,
    //                 x: x,
    //                 y: y,
    //                 direction: rotation,
    //                 duration: 1, // TODO: maybe make movement duration dependent on the distance to the next movement?
    //             });
    //         }
    //     }
    // }

    // for (const abstractMovement of abstractMovements) {
    //     const [toX, toY] = getLocation(newLayout, abstractMovement.beat, abstractMovement.to)
    //     // console.log(`const [${toX}, ${toY}] = getLocation(newLayout, ${abstractMovement.beat}, ${abstractMovement.to}`)

    //     // add a movement segment for the take
    //     newLayout.directMovements!.push({
    //         onBeat: mod(abstractMovement.beat, pattern.getLength()),
    //         mod: pattern.getLength(),
    //         role: abstractMovement.role,
    //         x: toX,
    //         y: toY,
    //         duration: abstractMovement.length,
    //         direction: 0 // TODO: maybe make this dependent on the direction of the pass
    //     });
    // }



    return newLayout
}


function mod(va: number, len: number): number {
    let v = va;
    while (v < 0) {
        v += len;
    }
    return v % len;
}

export function getRelativeMovementsFromPattern(pattern: Pattern, basePattern: Pattern): RelativeMovementSpec[] {
    const relativeMovements: RelativeMovementSpec[] = [];

    for (const t of pattern.throws) {
        for (const kind of ["S", "P", "I", "C"])
            assert(t.markers ? t.markers.filter(m => m.kind === kind).length <= 1 : true, `There should be at most one marker of kind ${kind} per throw`);

        // substitutions (only handling the pelf for now, assuming the substituted hand-in happens from the same location, even if later)
        if (t.markers?.some(m => m.kind === "S" && (m as SubstitutionMarker).throw === 'P')) {
            const marker: SubstitutionMarker = t.markers!.find(m => m.kind === "S") as SubstitutionMarker;
            const manipulatorRole = pattern.getToPasserRole(t);

            //for a substitution, I want to be there on the substitution beat, so let's move one beat earlier
            //since it's a substitution, we also assume that the manipulator role has not changed since the one beat before
            const duration = pattern.nrHands / 2

            const needToConsiderHandedness = (marker.modifiers.includes("o") || marker.modifiers.includes("x") || marker.modifiers.includes("o")) && differentThrowOrTargetHandAcrossIterations(pattern, t)
            const iterations = needToConsiderHandedness ? pattern.iterationsUntilRepeat() : 1
            const mod = pattern.getLength() * iterations
            for (let iteration = 0; iteration < iterations; iteration++) {

                // handling slightly different positions
                let positionSpec: RelativeMovementSpec["positionSpec"]
                if (marker.fromRole === marker.toRoleAtThrow) {
                    // intercepting a self from in front of the passer
                    positionSpec = {
                        type: "infront",
                        toRole: marker.toRoleAtThrow
                    }
                } else {
                    // intercepting a pass, processing several possible modifiers
                    // default is late intercept, so exactly in the middle, facing outside
                    let side = .5
                    let offset = 0
                    let direction = 90

                    if (marker.modifiers.includes("e")) {
                        // early intercept, standing a bit closer to the passer throwing the pelf
                        side = 0.6
                    }
                    if (marker.modifiers.includes("v")) {
                        // very late subsitution from next to the receiver, facing the incoming pass
                        side = 1
                        offset = pattern.getThrowHand(t, iteration) === Hand.Right ? 0.2 : -0.2
                        direction = 180
                    }
                    // `o` -- substitute/intercept from **o**utside of the passing lane (inside is the default), only for early and late substitutions (`eo`, `lo`) and very late intercepts (`vo`; to the right of the receiver for a right-handed pass). For crossing passes, outside is relative to the receiving side.
                    if (marker.modifiers.includes("o")) {
                        offset = pattern.getThrowHand(t, iteration) === Hand.Right ? 0.2 : -0.2
                        direction = 270 // facing inside
                    }
                    // `x` -- substitute/intercept from outside of the *opposite* passing lane (opposite side of the pattern to x). Used primarily to indicate turning out to the *left* for a right-handed very late intercept (`vx`). For crossing passes, outside is relative to the receiving side.
                    if (marker.modifiers.includes("x")) {
                        // ??
                        assert(false, "TODO: implement opposite side for substitutions");
                    }
                    positionSpec = {
                        type: "between",
                        betweenRoles: [marker.fromRole, marker.toRoleAtThrow],
                        side,
                        offset,
                        direction,
                    }
                }
                // skip movement prior to substitution if prior action was in the previous iteration
                const priorSubstitutionOrCarryAction = findPriorSubstitutionOrCarryAction(pattern, t)
                const skipInFirstIteration = iteration === 0 && (!priorSubstitutionOrCarryAction ||
                    priorSubstitutionOrCarryAction.throwBeat > t.throwBeat)

                const onBeat = (t.throwBeat - duration + iteration * pattern.getLength() + mod) % mod
                relativeMovements.push({
                    onBeat,
                    mod: mod,
                    role: manipulatorRole,
                    duration: duration,
                    targetRoleTime: "arrival",
                    roleAtMovementEnd: manipulatorRole,
                    positionSpec,
                    skipInFirstIteration
                });
            }
        }

        // intercepts
        if (t.markers?.some(m => m.kind === "I")) {
            const marker: InterceptMarker = t.markers!.find(m => m.kind === "I") as InterceptMarker;

            // // for an intercept it is sufficient to be there on the causal beat of the intercept
            // // so typically, we can move on the intercept beat, unless we are intercepting something really short?
            // assert(pattern.getThrowCauseLength(t) >= 1, "TODO: need to rethink how to handle movements before intercepts with very short throws");
            // const moveToInterceptDuration = pattern.getThrowCauseLength(t)-.01 // let's arrive a tiny moment before the actual intercept so that we don't change roles yet

            // TODO for now let's just assume standard 2-beat patterns, where we can move 1 beat before the intercept beat to arrive on the intercept beat (not when the intercept arrives), even though we could move a beat later
            const moveToInterceptDuration = pattern.nrHands / 2 // let's just assume a short movement for now

            const moveToIntercept_intercepteeRoleAtThrow = pattern.getToPasserRole(t);
            const moveToIntercept_intercepteeRoleAtMovementStart = pattern.getRole(t.throwBeat - moveToInterceptDuration, pattern.getToPasserIdxAtThrow(t))


            const needToConsiderHandedness = !marker.modifiers.includes("e") && !marker.modifiers.includes("l") && !marker.modifiers.includes("b") && differentThrowOrTargetHandAcrossIterations(pattern, t)
            const iterations = needToConsiderHandedness ? pattern.iterationsUntilRepeat() : 1
            const mod = pattern.getLength() * iterations
            for (let iteration = 0; iteration < iterations; iteration++) {
                const leavingTime = (t.throwBeat - moveToInterceptDuration + iteration * pattern.getLength() + mod) % mod

                let positionSpec: RelativeMovementSpec["positionSpec"]
                if (marker.fromRole === marker.originalToRoleAtThrow) {
                    // intercepting a self from in front of the passer
                    positionSpec = {
                        type: "infront",
                        toRole: marker.originalToRoleAtThrow
                    }
                } else {
                    // intercepting a pass, processing several possible modifiers
                    let side = 0 // default is very late intercept, so next to the receiver
                    let offset = pattern.getThrowHand(t, iteration) === Hand.Right ? 0.2 : -0.2 // default is very late intercept, standing left of the receiver
                    let direction = 180 // face the origin of the pass

                    if (marker.modifiers.includes("e")) {
                        // early intercept
                        side = 0.6
                        offset = 0 // stand in the passing lane
                    }
                    if (marker.modifiers.includes("l") || marker.modifiers.includes("c")) {
                        // late intercept (i.e., half way through the pass); also for chop (which doesn't really matter for movement)
                        side = 0.5
                        offset = 0 // stand in the passing lane
                    }
                    // `o` or `]` -- substitute/intercept from **o**utside of the passing lane (inside is the default), only for early and late substitutions (`eo`, `lo`) and very late intercepts (`vo`; to the right of the receiver for a right-handed pass). For crossing passes, outside is relative to the receiving side.
                    if (marker.modifiers.includes("o")) {
                        offset = pattern.getThrowHand(t, iteration) === Hand.Right ? 0.2 : -0.2
                    }
                    // `x` or `[` -- substitute/intercept from outside of the *opposite* passing lane (opposite side of the pattern to x). Used primarily to indicate turning out to the *left* for a right-handed very late intercept (`vx`). For crossing passes, outside is relative to the receiving side.
                    if (marker.modifiers.includes("x") || marker.modifiers.includes("[")) {
                        offset = -0.2
                    }
                    // `b` -- intercept very late from **b**ehind the target's location
                    if (marker.modifiers.includes("b")) {
                        side = -.2
                        offset = 0 // stand in the passing lane
                    }
                    positionSpec = {
                        type: "between",
                        betweenRoles: [marker.originalFromRole, marker.originalToRoleAtThrow],
                        side,
                        offset,
                        direction,
                    }
                }
                // skip movement prior to intercept if prior action was in the previous iteration
                const priorSubstitutionOrCarryAction = findPriorSubstitutionOrCarryAction(pattern, t)
                const skipInFirstIteration = iteration === 0 && (!priorSubstitutionOrCarryAction ||
                    priorSubstitutionOrCarryAction.throwBeat > t.throwBeat && t.throwBeat!==0)


                // with an intercept we also assume that the manipulator role has not changed since the intercepted throw has been thrown
                relativeMovements.push({
                    onBeat: leavingTime,
                    mod: mod,
                    role: moveToIntercept_intercepteeRoleAtMovementStart,
                    roleAtMovementEnd: moveToIntercept_intercepteeRoleAtThrow,
                    duration: moveToInterceptDuration,
                    targetRoleTime: "arrival",
                    positionSpec,
                    skipInFirstIteration
                });
            }
            // once the intercepted throw would have landed, the prior manipulator (now in its new role) will go to the position of the manipulated
            const landingOffset = pattern.nrHands;
            const moveAfterInterceptDuration = 1 // let's just assume a short movement to the position
            const when = (t.throwBeat + marker.originalThrowLength - landingOffset + pattern.getLength()) % pattern.getLength()
            const arrivalTime = (t.throwBeat + moveAfterInterceptDuration) % pattern.getLength()


            // skip movement AFTER the intercept if the intercepted throw was thrown in the last cycle
            const skipInFirstIteration = t.throwBeat > arrivalTime
            // figuring out the right role in the base pattern(!) to go to. it is usually the role of the interceptee, but we are moving one beat later
            // so at that time there may have been relabeling already. however, we cannot use relabeling from `pattern` here since
            // this already includes switches with the manipulator
            const moveAfterIntercept_roleOfIntercepteeOnMovementStart = basePattern.samePasserOtherTimeByRole(marker.originalToRoleAtThrow, t.throwBeat, t.throwBeat + marker.originalThrowLength - landingOffset)
            // console.log(`After intercept on ${t.throwBeat} by ${manipulatorRole}, is now ${marker.originalToRoleAtThrow} moving on ${when} to ${marker.originalToRoleAtThrow}'s position`);
            const moveAfterIntercept: RelativeMovementSpec = {
                onBeat: when,
                mod: pattern.getLength(),
                duration: moveAfterInterceptDuration,
                role: moveAfterIntercept_roleOfIntercepteeOnMovementStart, // this is after the role swap
                roleAtMovementEnd: moveAfterIntercept_roleOfIntercepteeOnMovementStart, // we don't expect it to change 
                targetRoleTime: "onBeat",
                positionSpec: {
                    type: "take",
                    toBasePatternRole: assertIsBasePatternRole(moveAfterIntercept_roleOfIntercepteeOnMovementStart, basePattern) // we want to go to the position where this base-pattern role should be on the path if there were no manipulators
                },
                bend: marker.modifiers.includes("↻") ? "↻" : marker.modifiers.includes("↺") ? "↺" : undefined,
                skipInFirstIteration
            }
            relativeMovements.push(moveAfterIntercept)

        }

        // carry
        if (t.markers?.some(m => m.kind === "C")) {
            const marker: CarryMarker = t.markers!.find(m => m.kind === "C") as CarryMarker;
            const manipulatorRole = pattern.getFromPasserRole(t)
            const duration = Math.min(pattern.getThrowCauseLength(t), pattern.nrHands / 2)
            //TODO this should probably be timed relative to the intercept, not the carry pass, but for now, let's just move the beat before the carry
            const actionBeat = t.throwBeat
            const movementBeat = (t.throwBeat - duration + pattern.getLength()) % pattern.getLength();
            // the manipulator changes on the iBeat, which is the earliest possible carry. However if we want to leave 1 beat before the carry, it may still be the original role
            const roleOnAction = manipulatorRole
            const roleIdxOnAction = pattern.getRowIdxByRole(actionBeat, roleOnAction)
            const roleOnMovementStart = pattern.getRole(actionBeat - duration, roleIdxOnAction)

            const movementTime = marker.carryDelay < 1 ? movementBeat + 0.5 : movementBeat
            const actualDuration = marker.carryDelay < 1 ? duration - 0.5 : duration;

            const needToConsiderHandedness = marker.modifiers.includes("o") && differentThrowOrTargetHandAcrossIterations(pattern, t)
            const iterations = needToConsiderHandedness ? pattern.iterationsUntilRepeat() : 1
            const mod = pattern.getLength() * iterations
            for (let iteration = 0; iteration < iterations; iteration++) {
                const leavingTime = (movementTime + iteration * pattern.getLength() + mod) % mod

                // by default stand in the passing lane
                let offset = 0
                if (marker.modifiers.includes("o")) {
                    // console.log('o'+ pattern.getTargetHand(t, iteration))
                    offset = pattern.getTargetHand(t, iteration) === Hand.Left ? 0.2 : -0.2
                }

                const arrivalTime = (t.throwBeat + actualDuration) % pattern.getLength()
                // skip movement prior to carry if the corresponding prior intercept was in the previous cycle
                const skipInFirstIteration = iteration === 0 &&
                    findPriorIntercept(pattern, t).throwBeat > leavingTime

                // console.log(`Carry marker at throw ${t.throwBeat} for role ${manipulatorRole} from ${marker.originalFromRole} to ${marker.toRoleAtThrow}`);
                relativeMovements.push({
                    onBeat: leavingTime,
                    role: roleOnMovementStart,
                    roleAtMovementEnd: manipulatorRole,
                    duration: actualDuration,
                    mod,
                    targetRoleTime: "arrival",
                    positionSpec: {
                        type: "between",
                        betweenRoles: [marker.originalFromRole, marker.toRoleAtThrow],
                        side: marker.originalFromRole === marker.toRoleAtThrow ? 0.6 : 0.4, // stand in front of target
                        offset,
                        direction: 0 // face the receiver
                    },
                    bend: marker.modifiers.includes("↻") ? "↻" : marker.modifiers.includes("↺") ? "↺" : undefined,
                    skipInFirstIteration
                });
            }
        }


    }
    return relativeMovements
}

// type BasePasserLocationRecord = [number/*beat*/, Role, number/*x*/, number/*y*/]
// function getBasePasserPositions(layout: AnimationLayout): [BasePasserLocationRecord[], number/*mod*/] {

// }


function differentThrowOrTargetHandAcrossIterations(pattern: Pattern, t: Throw): boolean {
    // if the throw hand is different across iterations, we need to consider handedness
    const throwHand = pattern.getThrowHand(t, 0);
    const targetHand = pattern.getTargetHand(t, 0)
    for (let i = 1; i < pattern.iterationsUntilRepeat(); i++) {
        if (pattern.getThrowHand(t, i) !== throwHand || pattern.getTargetHand(t, i) !== targetHand) {
            return true;
        }
    }
    return false;

}

function isSubstitutedThrow(t: Throw): boolean {
    return t.markers?.some(m => m.kind === "S" && (m as SubstitutionMarker).throw === 'P') ?? false
}
function isInterceptedThrow(t: Throw): boolean {
    return t.markers?.some(m => m.kind === "I") ?? false
}
function isCarriedThrow(t: Throw): boolean {
    return t.markers?.some(m => m.kind === "C") ?? false
}   

/**
 * given a throw with a manipulator action (substitution or intercept), find the throw with the prior
 * manipulator action of the same passer (there has to be at least one carry before to start the 
 * manipulator sequence).
 * 
 * note that the prior action may be in a prior iteration of the pattern in a different row
 * 
 * some patterns may not have any carry or substitution (e.g., 456-about) and will return undefined
 * 
 * @param pattern 
 * @param t throw with a substitution or intercept marker 
 * @returns throw with a substitution or carry marker
 */
export function findPriorSubstitutionOrCarryAction(pattern: Pattern, t: Throw): Throw | undefined {
    assert(isSubstitutedThrow(t) || isInterceptedThrow(t), "throw must have substitution or intercept marker");

    const manipulatorPasserIdx = pattern.getToPasserIdxAtThrow(t)
    const beat = t.throwBeat
    const priorIterationManipulatorPasserIdx = pattern.samePasserNBeatsLater(manipulatorPasserIdx, beat, -pattern.getLength())

    for (let offset = 1; offset < pattern.getLength(); offset++) {
        const priorBeat = (beat - offset + pattern.getLength()) % pattern.getLength()
        const passerIdx = priorBeat > beat ? priorIterationManipulatorPasserIdx : manipulatorPasserIdx
        const priors = pattern.findThrows(priorBeat)
        for (const priorThrow of priors) {
            if (isSubstitutedThrow(priorThrow) && pattern.getToPasserIdxAtThrow(priorThrow) === passerIdx) return priorThrow
            if (isCarriedThrow(priorThrow) && priorThrow.fromPasserIdx === passerIdx) return priorThrow
        }
    }
    return undefined;
}

/**
 * similar to findPriorSubstitutionOrCarryAction, but now we receive a carry throw
 * and need to find the intercept that triggered this carry. this is a bit more complicated
 * since the carry comes from the original target of the intercepted throw
 * 
 * again, we need to handle wrapping around the pattern length
 * 
 * @param pattern 
 * @param t carry throw
 * @returns throw with intercept marker that triggered this carry
 */
export function findPriorIntercept(pattern: Pattern, t: Throw): Throw {
    assert(isCarriedThrow(t), "throw must have carry marker")

    const manipulatorPasserIdx = t.fromPasserIdx
    const priorIterationManipulatorPasserIdx = pattern.samePasserNBeatsLater(manipulatorPasserIdx, t.throwBeat, -pattern.getLength())
    for (let offset = 1; offset < pattern.getLength(); offset++) {
        const priorBeat = (t.throwBeat - offset + pattern.getLength()) % pattern.getLength()
        const passerIdx = priorBeat > t.throwBeat ? priorIterationManipulatorPasserIdx : manipulatorPasserIdx
        // find a throw TO the manipulator
        const interceptThrows = pattern.findThrows(priorBeat).filter(tt => tt.markers?.some(m => m.kind === "I"))
        for (const interceptThrow of interceptThrows) {
            const interceptMarker = interceptThrow.markers!.find(m => m.kind === "I") as InterceptMarker
            const intercepteeRoleAtThrow = interceptMarker.originalToRoleAtThrow
            const intercepteePasserIdxAtThrow = pattern.getRowIdxByRole(interceptThrow.throwBeat, intercepteeRoleAtThrow)
            if (intercepteePasserIdxAtThrow === passerIdx)
                return interceptThrow
        }
    }
    throw new Error(`Could not find prior intercept for carry throw at beat ${t.throwBeat} by passer idx ${manipulatorPasserIdx}`)
}


function assertIsBasePatternRole(role: Role, basePattern: Pattern): Role {
    if (!basePattern.hasRole(role)) {
        throw new Error(`Role ${role} is not a role in the base pattern; base pattern roles are ${basePattern.roles[0][1].join(", ")}`)
    }
    return role
}