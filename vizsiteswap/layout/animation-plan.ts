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
import type { MovementSegmentSpec } from "./animation-spec.ts";
import { PasserIdx } from "./location-manager/helpers.ts";

export type AnimationPlan = {
    mod: number, // the length of the animation in beats 
    initialPositions: InitialPosition[],
    passAnimations: PassAnimation[],
    movementSegments: MovementSegmentSpec[],
    segmentMovementAnimations: SegmentMovementAnimation[],
    directMovementAnimations: DirectMovementAnimation[], // for manipulators, relative to other roles
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


export type SegmentMovementAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    passerIdx: PasserIdx,
    duration: number,

    segmentIdx: number,
    fraction: number // if < 1 only part of the segment is animated (e.g., when the passer is replaced mid-walk)
}

export type DirectMovementAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    passerIdx: PasserIdx,
    duration: number,
    movementSpec: MovementSegmentSpec,
    skipInFirstIteration?: boolean
}


export type RelabelAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    changes: [PasserIdx, Role][] // assignment of new roles for all or some passers
}
