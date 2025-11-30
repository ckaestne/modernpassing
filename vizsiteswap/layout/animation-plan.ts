/**
 * Where specifications are abstract and tied to roles, animation plans
 * are concrete executable instructions for the frontend 
 * and for computing frames. The goal is to have minimal computations
 * in the frontend. This is analogous to byte code.
 * 
 * An animation repeats all the way back to the original positions.
 * 
 * Animations are expressed for passers, not roles. Roles are indicated as labels
 * for passers. Passers are identified by ids, corresponding to the index in 
 * initialPositions.
 */




import type { Role } from "@modernpassing/pattern";
import type { AnimationSpec, MovementSegmentSpec } from "./animation-spec.ts";
import { genPath, helperSvg, type PasserIdx } from "./location-manager/helpers.ts";

export type AnimationPlan = {
    mod: number, // the length of the animation in beats 
    initialPositions: InitialPosition[],
    passAnimations: PassAnimation[],
    movementAnimations: MovementAnimation[], // for manipulators, relative to other roles
    relabeling: RelabelAnimation[],
}



export type InitialPosition = {
    x: number,
    y: number,
    initialRole: Role // initial label in the first frame
}


export type PassAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    duration: number,
    firstIteration?: boolean, // if true, this is show only in the first iteration of the animation; if false it is shown in all but the first iteration, if undefined (default) it is shown in all iterations

    fromX: number,
    toX: number,
    fromY: number,
    toY: number,
    labelX: number,
    labelY: number,
    label: string,
    debug_center: {
        fromX: number,
        toX: number,
        fromY: number,
        toY: number,
    }
}



export type MovementAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    passerIdx: PasserIdx,
    duration: number,
    movementSpec: MovementSegmentSpec,
    firstIteration?: boolean, // if true, this is show only in the first iteration of the animation; if false it is shown in all but the first iteration, if undefined (default) it is shown in all iterations; first iteration refers to the time that this movement ENDs (e.g., one at the very end going into the next round is considered firstIteration)
}


export type RelabelAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    changes: [PasserIdx, Role][] // assignment of new roles for all or some passers
}



export function apFindPosition(layout: AnimationPlan, jugglerIdx: number, time: number): [number, number] {
    const firstIteration = time < layout.mod
    const lastMovement = layout.movementAnimations.findLast(m => m.onBeat <= time%layout.mod && m.passerIdx === jugglerIdx && ((m.onBeat+m.duration>layout.mod) || m.firstIteration !== !firstIteration)) ??
        layout.movementAnimations.findLast(m => m.passerIdx === jugglerIdx && ((m.onBeat+m.duration>layout.mod) || m.firstIteration !== !firstIteration))
    if (!lastMovement) {
        const pos = layout.initialPositions[jugglerIdx]
        return [pos.x, pos.y]
    }

    const timeSinceMoveStart = (time - lastMovement.onBeat + layout.mod) % layout.mod;
    if (timeSinceMoveStart >= lastMovement.duration)
        return [lastMovement.movementSpec.toX, lastMovement.movementSpec.toY];

    const progress = timeSinceMoveStart / lastMovement.duration;
    const path = genPath(helperSvg, lastMovement.movementSpec); // create the path in the helper SVG to get the length
    const p = path.pointAt(progress * path.length());
    return [p.x, p.y]

}

export function apFindOngoingMovement(layout: AnimationPlan, jugglerIdx: number, time: number): MovementAnimation | undefined {
    const firstIteration = time < layout.mod
    const lastMovement = layout.movementAnimations.findLast(m => m.onBeat <= time%layout.mod && m.passerIdx === jugglerIdx && m.firstIteration !== !firstIteration) ??
        layout.movementAnimations.findLast(m => m.passerIdx === jugglerIdx && m.firstIteration !== !firstIteration)
    if (!lastMovement) return undefined

    const timeSinceMoveStart = (time - lastMovement.onBeat + layout.mod) % layout.mod;
    if (timeSinceMoveStart > lastMovement.duration)
        return undefined

    return lastMovement
}

export function apGetRole(layout: AnimationPlan, passerIdx: number, time: number): Role {
    let role = layout.initialPositions[passerIdx].initialRole
    for (const relabel of layout.relabeling) {
        if (relabel.onBeat <= time%layout.mod)
            for (const change of relabel.changes) {
                if (change[0] === passerIdx) {
                    role = change[1]
                }
            }
    }
    return role
}

