import type { Hand, Role } from "@modernpassing/pattern";

/**
 * This is the abstract specification of layouts and movements, derived from
 * user specifications (pattern, positions, and movements) and manipulator actions.
 * 
 * Movements are expressed as repeating movements on paths for base roles and
 * as relative positions between other roles for manipulators. Passes are
 * also expressed relative to positions of roles.
 * (The relative positions may be expressed as where somebody holding a specific
 * role will be in the future, which requires non-trivial computations to
 * translate into concrete positions in the animation plan.)
 * 
 * Relabeling is integral to the specification, as it is necessary to compute
 * who has which role at any given time in the pattern.
 * 
 * The specification is generally tied to roles, not passers.
 * Initial positions and segments contain coordinates, all other specifications
 * are relative to those positions/roles.
 * 
 * 
 * Specific animations to be executed or individual frames are derived from 
 * this with derive-animations.ts
 */




/**
 * all animations run on a timer that's continuously counting up
 * animations are triggered at a time identified by `onBeat` and `mod` 
 * when `(time % mod) == onBeat`. In many cases, `mod` is the number of beats in a pattern
 * (which is also the default if mod is not provided)
 * so onBeat identifies triggers that happen at every iteration. However movement may
 * happen distributed across many iterations, so larger mods are possible to express that.
 * OnBeat does not have to be an integer, fractional values are allowed
 * 
 * relabeling is always performed first, so a passer on beat x is the 
 * person who has that role after the relabeling on beat x.
 * 
 * animations of movement may be much longer than the number of beats in a pattern
 * 
 */
export type AnimationSpec = {
    initialPositions: PositionSpec[],
    passAnimations: PassSpec[],
    baseMovementSegments: MovementSegmentSpec[],
    baseMovementSequences: MovementSequenceSpec[], // segment indices for each jugger (not role), by the order of initial roles
    baseMovementTriggers: MovementTriggerSpec[],
    relativeMovements: RelativeMovementSpec[], // for manipulators, relative to other roles
    basePatternRelabeling: RelabelSpec[], // relabeling of base roles, ignoring manipulators -- this is needed to determine the proper movement of the base roles
    relabeling: RelabelSpec[],
}



export type PositionSpec = {
    x: number,
    y: number,
    role: Role
}
export type PassLayoutSpec = {
    fromRole: Role,
    fromHand: Hand,
    toRole: Role,
    toHand: Hand,
    label: string
}

/**
 * passes are easy -- they are lines between the positions of two roles
 * and are shown for a certain time, identified by beats
 */

export type PassSpec = {
    pass: PassLayoutSpec,
    onBeat: number,
    mod: number, // default to length of the pattern
    duration: number,
}
/**
 * movement is more complex -- 
 * segments describe possible movement paths in the pattern; 
 * a juggler/role may go through or all a subset of these segments in any order
 * 
 * locations are absolute, not relative to the previous location
 * animations should be created such that the start position of the triggered segment
 * is where the role is actually positioned to avoid jumps
 */
export type MovementSegmentSpec = {
    fromX: number,
    fromY: number,
    path: (number | string)[], // path instructions using C or A for curves and arches in SVG path notation
    toX: number,
    toY: number,
}

/**
 * a movement sequence is a list of segment indices that an 
 * unmanipulated jugger (not role) goes through
 * 
 * a sequence corresponds to a starting position. each juggler
 * tracks which part of the sequence they are on. a trigger identifies
 * when a role is moving, which identifies the corresponding juggler
 * and the next step in this sequence
 * 
 * the first segment is always the movement from the starting position
 */
export type MovementSequenceSpec = number[]
/**
 * a trigger identifies the time when a role should start moving
 * with a provided duration
 * 
 * the juggler in the identified role will always walk the next
 * segment in their current sequence
 * 
 * for example in scrambled V, role B starts walking after beat
 * 5; the walk animation may start at 5.5 for 3.5 beats.
 */
export type MovementTriggerSpec = {
    onBeat: number,
    mod: number,
    role: Role,
    duration: number,
}


/** 
 * movement relative to positions of base passers at a given moment in the future 
 **/
export type RelativeMovementSpec = {
    onBeat: number,
    mod: number,
    role: Role, // the manipulator role that is moving, identified on beat onBeat (not arrival beat)
    duration: number, // length of the movement
    positionSpec: TakePositionSpec | BetweenPositionSpec | InFrontOfPositionSpec  // positions are computed relative to where base roles fromRole and toRole (identified on time of beat) would be be at the end of the movement at the time (ie., onBeat+duration) -- note, the passer is identified by a role at an earlier time than where the passer's (not role's) position is computed
    targetRoleTime: "onBeat" | "arrival" // whether a passer is identified by their roles given RelativeMovementSpec is identified at the start of the movement (onBeat) or at the end of the movement (onBeat + duration)
    bend?: "↻"|"↺"
    //TODO: we could consider handling dependencies among relative movements, where position of M must be computed before the position of N because it is relative to M, as long as there are no circular dependencies
}

export type TakePositionSpec = {
    type: "take",
    toRole: Role, // base role who's position to take 
}
export type BetweenPositionSpec = {
    type: "between",
    between: [Role, Role], // from/to of the base roles at a given time (possibly in the future)
    side: number, // relative distance: .5 is in the middle, 0.1 near the second role, 0 is where the second role is, ...
    offset: number, // absolute distance: 0 is in the passing lane between the roles, .2 is further to the outside of the righthand pass, -.2 is further to the outside of the lefthand pass
    direction: number // in degree; 0 is facing the second role, 90 (clockwise) is facing sideways to substitute a righthand pass to 
}
export type InFrontOfPositionSpec = {
    type: "infront",
    toRole: Role, // position in front of this role (possibly in the future), where front is between the role and the center of the pattern
}



export type RelabelSpec = {
    onBeat: number,
    mod: number,
    changes: [Role, Role][] // oldRole, newRole
}
