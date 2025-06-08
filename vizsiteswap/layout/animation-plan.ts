/**
 * Where specifications are abstract and tied to roles, animation plans
 * are concrete executable instructions for the frontend 
 * and for computing frames. The goal is to have minimal computations
 * in the frontend. This is analogous to byte code.
 * 
 * An animation repeats all the way back to the original positions.
 * 
 * Animations are expressed for individual passers, not roles.
 * 
 * 
 */




import type { Role } from "@modernpassing/pattern";
import type { MovementSegmentSpec } from "./animation-spec.ts";

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
    passerId: number, // unique id for this passer (base or manipulator) in the animation
    x: number,
    y: number,
    initialRole: Role // initial label in the first frame
}


export type PassAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    duration: number,

    fromX: number,
    toX: number,
    fromY: number,
    toY: number,
    labelX: number,
    labelY: number,
    label: string
}


export type SegmentMovementAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    passerId: number,
    duration: number,

    segmentIdx: number,
    fraction: number // if < 1 only part of the segment is animated (e.g., when the passer is replaced mid-walk)
}

export type DirectMovementAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that
    passerId: number,
    duration: number,

    toX: number,
    toY: number,
}


export type RelabelAnimation = {
    onBeat: number, // the entire animation has a length (mod), this is relative to that

    changes: [number, Role][] // passerId, newRole
}
