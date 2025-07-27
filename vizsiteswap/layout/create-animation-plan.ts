/**
 * takes an animation spec and produces an animation plan
 * 
 * that is, translate relative role-based positions and actions
 * into specific passer-based coordinates that can be executed
 * with little computation in the frontend.
 */

import assert from "node:assert";
import { Hand, Role } from "../pattern/pattern.ts";
import type { AnimationPlan, DirectMovementAnimation, PassAnimation, RelabelAnimation, SegmentMovementAnimation } from "./animation-plan.ts";
import type { AnimationSpec, BetweenPositionSpec, MovementTriggerSpec, PassSpec, RelabelSpec, RelativeMovementSpec } from "./animation-spec.ts";
import { MovementSegmentSpec } from "./layout.ts";
import { createSVG } from "../svg-utils/svg-utils.ts";
import { Path, Svg } from "@svgdotjs/svg.js";



/**
 * creates the animation plan
 * @param animationSpec 
 * @param canvasSizeByPasserCircle Size of the canvas relative to the size of a circle representing a passer
 *      for example, a 200px canvas with a passer circle of 20px would be 10.
 *      While all animations are rendered on relative locations from 0 to 1, this is needed to scale animations to the circle size, especially the length of arms for passes
 * @returns 
 */
export function createAnimationPlan(animationSpec: AnimationSpec, canvasSizeByPasserCircle: number): AnimationPlan {
    // all roles, this is used to create ids
    const roles = animationSpec.initialPositions.map(pos => pos.role)
    function passerId(role: Role): number { return roles.indexOf(role) }

    const locationMgr = computeBaseAnimations(animationSpec);



    const movementSegments = animationSpec.baseMovementSegments
    // segments are already computed as a side effect of indexing locations in the locationMgr
    const segmentMovementAnimations: SegmentMovementAnimation[] = convertBaseMovement(locationMgr, animationSpec)

    // relative movements add manipulator movements; creating animations and also adding computed manipulator positions to the location manager
    const [directMovementAnimations, updateLocationMgr]: [DirectMovementAnimation[], LocationMgr] = computeRelativeMovements(animationSpec.relativeMovements, locationMgr, animationSpec.passAnimations)

    const passAnimations: PassAnimation[] = animationSpec.passAnimations.flatMap(convertPassAnimation(updateLocationMgr, canvasSizeByPasserCircle))
    const relabeling: RelabelAnimation[] = convertRelabeling(locationMgr, animationSpec.relabeling)

    // initial positions is trivial
    const initialPositions = updateLocationMgr.initialPositions.map(i => ({
        passerId: passerId(i[0]),
        x: i[1],
        y: i[2],
        initialRole: i[0]
    }))

    return {
        mod: locationMgr.mod,
        initialPositions,
        passAnimations,
        movementSegments,
        segmentMovementAnimations,
        directMovementAnimations,
        relabeling
    }

}

function convertPassAnimation(locationMgr: LocationMgr, canvasSizeByPasserCircle: number): (passSpec: PassSpec) => PassAnimation[] {
    const relativeArmLength = 1/ canvasSizeByPasserCircle *.9
    return (passSpec: PassSpec): PassAnimation[] => {

        const result: PassAnimation[] = []
        for (let time = passSpec.onBeat; time < locationMgr.mod; time += passSpec.mod) {
            const [fromX, fromY] = locationMgr.getLocationByRole(time, passSpec.pass.fromRole)
            // get location for the "to" position, at the beat that the pass arrives (role may have changed, we use the role at the time the pass is thrown to identify the target passer)
            const [toX, toY] = locationMgr.getFutureLocationByRole((time + passSpec.duration) % locationMgr.mod, time, passSpec.pass.toRole)

            // in the first iteration, a walking passer might start in the wrong space, we need to handle this separately
            // TODO for now let's just assume the passer is not also walking immediately on beat 0 and is not walking longer to deal with passes on other beats
            let firstIteration = undefined
            if (time == 0) {
                const [r, initialX, initialY] = locationMgr.initialPositions.find(i => i[0] === passSpec.pass.toRole)!
                if (Math.abs(initialX - toX) > 0.001 || Math.abs(initialY - toY) > 0.001) {
                    firstIteration = false
                    const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] =
                        computePass(fromX, toX, passSpec.pass.fromHand, initialX, initialY, passSpec.pass.toHand, relativeArmLength, 0.01)
                    result.push({
                        onBeat: time,
                        duration: passSpec.duration,
                        firstIteration: true,

                        fromX: fromHandX,
                        toX: toHandX,
                        fromY: fromHandY,
                        toY: toHandY,
                        labelX: labelHandX,
                        labelY: labelHandY,
                        label: passSpec.pass.label
                    })
                }
            }

            const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] = 
                computePass(fromX, fromY, passSpec.pass.fromHand, toX, toY, passSpec.pass.toHand, relativeArmLength, 0.01)
            result.push({
                onBeat: time,
                duration: passSpec.duration,
                firstIteration,

                fromX: fromHandX,
                toX: toHandX,
                fromY: fromHandY,
                toY: toHandY,
                labelX: labelHandX,
                labelY: labelHandY,
                label: passSpec.pass.label
            })
        }
        return result
    }

}


function convertBaseMovement(locationMgr: LocationMgr, animationSpec: AnimationSpec): SegmentMovementAnimation[] {
    const result: SegmentMovementAnimation[] = [];
    for (const m of locationMgr.movements) {
        result.push({
            onBeat: m.onBeat % locationMgr.mod,
            role: m.role,//TODO this probably needs to change for animations
            duration: m.duration,

            segmentIdx: animationSpec.baseMovementSegments.indexOf(m.segment),
            fraction: 1
        })
    }

    return result
}

function convertRelabeling(locationMgr: LocationMgr, relabelingSpecs: RelabelSpec[]): RelabelAnimation[] {
    assert(locationMgr.roles[0][0] === 0, "Relabeling must start at beat 0.");

    const result: RelabelAnimation[] = [];
    for (let time = 0; time < locationMgr.mod; time++) {
        for (const relabel of relabelingSpecs) {
            if (time % relabel.mod === Math.floor(relabel.onBeat)) {
                result.push({
                    onBeat: time,
                    changes: relabel.changes
                })
            }
        }
    }
    return result;
}



type LocationMgrMovement = {
    passerIdx: number,
    role: Role, // role at the start of the movement
    onBeat: number,
    duration: number,
    segment: MovementSegmentSpec
}


/**
 * the location manager tracks locations of *roles* over time
 * 
 * it determines how many beats are needed for the pattern to repeat (in space) with the same
 * roles in the same positions. note that the specific jugglers in those roles may change
 * across multiple loops.
 * 
 * locations are generally associated with roles.
 * 
 * 
 * typically, the layout describes the locations and movement of the base roles only, whereas
 * manipulators then add locations for the manipulator roles from relative movements
 * 
 * in the actual plan, a juggler in role X may not necessarily be at the location expected of
 * role X, due to role changes in manipulations, but that is handled in the plan creation. this
 * location manager only tracks the idealized positions
 */
export class LocationMgr {
    initialPositions: [Role, number, number][]
    mod: number
    movements: LocationMgrMovement[]
    manipulatorPositions: Map<Role, [number, number, number][]> // this is used to track manipulator positions that are not part of the base roles: [time, x, y]
    roles: [number/*onBeat*/, Role[]][]
    constructor(initialPositions: [Role, number, number][], mod: number, movements: LocationMgrMovement[], roles: [number/*onBeat*/, Role[]][], manipulatorPositions: Map<Role, [number, number, number][]> = new Map()) {
        this.initialPositions = initialPositions;
        this.mod = mod;
        this.movements = movements;
        this.roles = roles;
        this.manipulatorPositions = manipulatorPositions;
    }

    getFutureLocationByRole(timeOfLocation: number, timeOfRoleIdentification: number, role: Role): [number, number] {
        if (this.manipulatorPositions.has(role)) {
            // console.warn(`Cannot (yet?) get future location for manipulator role ${role}/${timeOfRoleIdentification} at time ${timeOfLocation}. Assuming they do not move`);
            return this.getManipulatorLocation(timeOfLocation, role)
        }

        const passerIdx = this.getBasePasserIdx(timeOfRoleIdentification, role);
        return this.getBaseLocation(timeOfLocation, passerIdx);
    }

    getLocationByRole(time: number, role: Role): [number, number] {
        if (this.manipulatorPositions.has(role))
            return this.getManipulatorLocation(time, role)

        const passerIdx = this.getBasePasserIdx(time, role);
        return this.getBaseLocation(time, passerIdx);
    }

    findOngoingAnimationByRole(time: number, role: Role): [number, Role] | undefined {
        if (this.manipulatorPositions.has(role))
            throw new Error(`findOngoingAnimationByRole cannot be called on manipulator roles (got ${time}, ${role})`);

        const passerIdx = this.getBasePasserIdx(time, role);
        return this.findOngoingAnimation(time, passerIdx);
    }



    private getManipulatorLocation(time: number, role: Role): [number, number] {
        const locations = this.manipulatorPositions.get(role)
        if (!locations) {
            throw new Error(`No manipulator positions found for role ${role} at time ${time}.`);
        }
        // find the last location before the time
        let lastLocation = locations.findLast(([onBeat]) => onBeat <= time % this.mod);
        if (!lastLocation)
            lastLocation = locations[locations.length - 1]; // if no location is found, return the last one (assuming they are sorted)
        return [lastLocation[1], lastLocation[2]];
    }

    /**
     * indexes are only used internally, when figuring out the base locations of roles
     * -- this is not necessarily indexing a passer in a real pattern (especially with manipulators,
     * but possibly also when going over the mod boundary)
     */
    private getBasePasserIdx(time: number, role: Role): number {
        const rolesAtTime = this.roles.findLast(r => r[0] <= time % this.mod)![1]
        const passerIdx = rolesAtTime.indexOf(role);
        assert(passerIdx !== -1, `Role ${role} not found at time ${time} in animation mod ${this.mod}.`);
        return passerIdx;
    }

    private getBaseLocation(time: number, passerIdx: number): [number, number] {
        let lastMoveBeforeTime = this.movements.findLast(m => m.passerIdx === passerIdx && m.onBeat <= time % this.mod)
        if (!lastMoveBeforeTime)
            lastMoveBeforeTime = this.movements.findLast(m => m.passerIdx === passerIdx); // let's assume there are no conflicting/overlapping walking instructions, so we are just looking for the last pass before the move before the pattern wraps if there was no move yet
        // finally if this passer never moves, return the initial position
        if (!lastMoveBeforeTime)
            return this.initialPositions[passerIdx].slice(1) as [number, number];


        const segment = lastMoveBeforeTime!.segment;
        if ((lastMoveBeforeTime!.onBeat + lastMoveBeforeTime!.duration) % this.mod < time % this.mod) {
            // the last move has completed, so we know where we are
            return [segment.toX, segment.toY]
        } else {
            // we are currently moving, so we need to find where on the path we are
            const progress = (time - lastMoveBeforeTime!.onBeat + this.mod) % this.mod / lastMoveBeforeTime!.duration;
            const path = genPath(helperSvg, segment); // create the path in the helper SVG to get the length
            const p = path.pointAt(progress * path.length());
            return [p.x, p.y]
        }
    }

    private findOngoingAnimation(time: number, passerIdx: number): [number, Role] | undefined {
        // find the last movement before the time
        const lastMoveBeforeTime = this.movements.findLast(m => m.passerIdx === passerIdx && m.onBeat <= time % this.mod);
        if (!lastMoveBeforeTime) return undefined; // no ongoing animation

        // if the last move has completed, no ongoing animation
        if ((lastMoveBeforeTime.onBeat + lastMoveBeforeTime.duration) % this.mod < time % this.mod) {
            return undefined
        } else {
            // we are currently moving, identifying the movement by beat and role at the start of the movement
            return [lastMoveBeforeTime.onBeat, lastMoveBeforeTime.role];
        }
    }

}



export function computeBaseAnimations(animationSpec: AnimationSpec): LocationMgr {
    // assert(animationSpec.passAnimations.length > 0 || animationSpec.baseMovementTriggers.length > 0, "Animation must have at least one pass or movement trigger.");

    const passMods = animationSpec.passAnimations.map(p => p.mod)
    const movementMods = animationSpec.baseMovementTriggers.map(m => m.mod);
    const directMovementMods = animationSpec.baseMovementTriggers.map(m => m.mod);

    // find the least common multiple of all mods
    const lcm = (a: number, b: number): number => {
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        return (a * b) / gcd(a, b);
    }
    const overallMod = passMods.reduce((acc, mod) => lcm(acc, mod), movementMods.reduce((acc, mod) => lcm(acc, mod), directMovementMods.reduce((acc, mod) => lcm(acc, mod), 1)));


    let movements: LocationMgrMovement[] = []

    const currentSequences = animationSpec.baseMovementSequences.slice()
    const initialRoles = animationSpec.initialPositions.map(p => p.role);
    let currentRoles = initialRoles
    let roles: [number/*onBeat*/, Role[]][] = [[0, initialRoles]]
    let time = 0
    while (true) {
        // relabeling
        for (const relabel of animationSpec.basePatternRelabeling) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentRoles = currentRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                roles.push([time, currentRoles]);
            }
        }

        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(currentRoles, initialRoles))
            break


        for (const movementTrigger of animationSpec.baseMovementTriggers) {
            if (time % movementTrigger.mod === Math.floor(movementTrigger.onBeat)) {
                const passerIdx = currentRoles.indexOf(movementTrigger.role);
                const nextSegment = currentSequences[passerIdx][0]
                currentSequences[passerIdx] = currentSequences[passerIdx].slice(1)
                currentSequences[passerIdx].push(nextSegment)
                movements.push({
                    passerIdx, // passerId
                    role: movementTrigger.role,
                    onBeat: time + movementTrigger.onBeat % 1, // onBeat
                    duration: movementTrigger.duration,
                    segment: animationSpec.baseMovementSegments[nextSegment] // the actual movement spec
                })
            }
        }




        time++;

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.");
    }

    roles = roles.filter(r => r[0] < time);
    movements = movements.filter(m => m.onBeat < time);

    return new LocationMgr(
        animationSpec.initialPositions.map(p => [p.role, p.x, p.y]),
        time,
        movements, roles
    )

}


/** from animations.ts */

/**
 *     const [fromX, fromY, toX, toY, labelX, labelY] = computePass(x1, y1, fromHand, x2, y2, toHand)
 * @param x1 
 * @param y1 
 * @param hand1 
 * @param x2 
 * @param y2 
 * @param hand2 
 * @param armLength 
 * @param labelDistance 
 * @returns 
 */
function computePass(x1: number, y1: number, hand1: Hand, x2: number, y2: number, hand2: Hand, armLength: number, labelDistance: number): [number, number, number, number, number, number] {
    //angle between the two points
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
    //move 20 pixel 45 degree from that angle from the first point
    const armAngle = 40 //todo make this configurable
    const throwOutside = 1

    const direction1 = hand1 === 0 ? armAngle : -armAngle
    const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
    const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

    const direction2 = hand2 === 0 ? armAngle * throwOutside : -armAngle * throwOutside
    const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
    const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

    const length = Math.sqrt((x3 - x4) ** 2 + (y3 - y4) ** 2)

    let labelX = (x3 + x4) / 2
    let labelY = (y3 + y4) / 2

    const passAngle = Math.atan2(y4 - y3, x4 - x3) * 180 / Math.PI

    const labelAngle =
        hand1 === 0 && hand2 === 1 ? 90 : // right hand pass to the right
            hand1 === 1 && hand2 === 0 ? 90 : // left hand pass to the left
                hand1 === 0 && hand2 === 0 ? -90 :
                    90 // crossing pass toward the target

    //sideways adjustment for label
    // if (labelAngle !== 0) {
    labelX += labelDistance * Math.cos((angle + labelAngle) * Math.PI / 180)
    labelY += labelDistance * Math.sin((angle + labelAngle) * Math.PI / 180)
    // }
    //forward adjustment for label
    labelX += length / 4 * Math.cos(passAngle * Math.PI / 180)
    labelY += length / 4 * Math.sin(passAngle * Math.PI / 180)


    return [x3, y3, x4, y4, labelX, labelY]
}



/** helper functions */
function same(a: number[][], b: number[][]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].length !== b[i].length) return false;
        for (let j = 0; j < a[i].length; j++) {
            if (a[i][j] !== b[i][j]) return false;
        }
    }
    return true;
}
function same2(a: Role[], b: Role[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

const helperSvg = createSVG()

function genPath(canvas: Svg, segment: MovementSegmentSpec): Path {
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return canvas.path(p.join(' '))
}


function computeRelativeMovements(relativeMovements: RelativeMovementSpec[], locationMgr: LocationMgr, passSpecs: PassSpec[]): [DirectMovementAnimation[], LocationMgr] {

    const directMovementAnimations: DirectMovementAnimation[] = [];
    for (let startTime = 0; startTime < locationMgr.mod; startTime++) {
        for (const relativeMovementSpec of relativeMovements) {
            if (startTime % relativeMovementSpec.mod === Math.floor(relativeMovementSpec.onBeat)) {
                // we need to compute the position of the manipulator at this time
                let toX: number, toY: number;
                const arrivalTime = Math.floor((startTime + relativeMovementSpec.onBeat % 1 + relativeMovementSpec.duration) % locationMgr.mod);
                const roleTime = relativeMovementSpec.targetRoleTime === "onBeat" ? startTime : arrivalTime

                // console.log("computeRelativeMovement", time, locationTime, relativeMovementSpec)
                let takeRelativeMovementFrom: [number, Role] | undefined = undefined
                if (relativeMovementSpec.positionSpec.type === "take") {
                    [toX, toY] = locationMgr.getFutureLocationByRole(arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
                    // after we "take" a position, we continue that animation if it is moving on an animation -- we record the role+beat of that animation to find it in the frontend
                    takeRelativeMovementFrom = locationMgr.findOngoingAnimationByRole(roleTime, relativeMovementSpec.positionSpec.toRole)
                } else if (relativeMovementSpec.positionSpec.type === "between") {
                    [toX, toY] = computePositionBetween(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec)
                } else if (relativeMovementSpec.positionSpec.type === "infront") {
                    [toX, toY] = computePositionInFrontOf(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
                } else { throw new Error(`Unknown position spec type: ${relativeMovementSpec.positionSpec}`); }

                directMovementAnimations.push({
                    onBeat: startTime + relativeMovementSpec.onBeat % 1, // onBeat
                    role: relativeMovementSpec.role,
                    duration: relativeMovementSpec.duration,
                    toX,
                    toY,
                    bend: relativeMovementSpec.bend,
                    takeRelativeMovementFrom
                })
            }
        }
    }

    // get the set of distinct roles in directMovementAnimations.role that are not yet included in locationMgr.initialPositions
    const existingRoles = new Set(locationMgr.initialPositions.map(pos => pos[0]));
    const newRoles = new Set(
        directMovementAnimations
            .map(anim => anim.role)
            .filter(role => !existingRoles.has(role))
    )
    const newInitialPositions: [Role, number, number][] = [...locationMgr.initialPositions]
    const manipulatorPositions = new Map<Role, [number, number, number][]>()
    // initial position of the manipulator is where their first movement ended (starting there, not moving to there from another position)
    for (const role of newRoles) {
        const roleMovementsByArrival = directMovementAnimations.filter(anim => anim.role === role).slice().sort((a, b) => (a.onBeat + a.duration) % locationMgr.mod - (b.onBeat + b.duration) % locationMgr.mod)
        // get the first position as starting position
        const firstArrival = roleMovementsByArrival[0]
        newInitialPositions.push([role, firstArrival.toX, firstArrival.toY])
        // store all other positions for later lookup
        manipulatorPositions.set(role, roleMovementsByArrival.map(anim => [(anim.onBeat + anim.duration) % locationMgr.mod, anim.toX, anim.toY]))
    }

    return [directMovementAnimations, new LocationMgr(
        newInitialPositions,
        locationMgr.mod,
        locationMgr.movements,
        locationMgr.roles,
        manipulatorPositions
    )]
}


export function computePositionInFrontOf(locationMgr: LocationMgr, locationTime: number, roleTime: number, role: Role): [number, number, number] {
    return computePositionBetween(locationMgr, locationTime, roleTime, {
        type: "between",
        between: [role, role],
        side: 0.4,
        offset: 0,
        direction: 0
    })
}

/** returns [x, y, absoluteRotationInDegree] (where rotation 0 = facing right) */
/**
 * resolves the location of a manipulator for a given action that is 
 * abstracted as an AbstractPosition object that indicates the location
 * relative to other roles.
 * 
 * @param layout known positions/animations so far
 * @param abstractPosition specification of where to position the manipulator (relative)
 * @param roleTime time at which the passer with a specified roleis identified
 * @param locationTime time at which the location of a passer is identified (the passer may be identified by a role at an earlier time)
 * @returns [x, y, absoluteRotationInDegree]
 */
export function computePositionBetween(locationMgr: LocationMgr, locationTime: number, roleTime: number, betweenSpec: BetweenPositionSpec): [number, number, number] {
    // TODO maybe redo this to make it relative to a specific pass (i.e. handling crossing/straight,
    //  which indication of whether to stand left/right of the pass and early/middle/late/very late)
    // rather than specific numbers


    const [toX, toY] = locationMgr.getFutureLocationByRole(locationTime, roleTime, betweenSpec.between[1])
    // TODO for positioning relative to a self, for now we assume that the manipulator is facing
    // the manipulated from the middle of the space, as if they were manipulating a pass comming
    // from the point mirror position of the space.
    const [fromX, fromY] = betweenSpec.between[0] !== betweenSpec.between[1] ?
        locationMgr.getFutureLocationByRole(locationTime, roleTime, betweenSpec.between[0]) :
        [1 - toX, 1 - toY]

    const x = fromX + (toX - fromX) * (1 - betweenSpec.side)
    const y = fromY + (toY - fromY) * (1 - betweenSpec.side)

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const angleDegrees = angle * (180 / Math.PI)
    const absoluteRotation = (angleDegrees + betweenSpec.direction) % 360

    //  Compute perpendicular direction for the offset
    const perpendicularAngle = angleDegrees + 90
    const perpendicularRad = perpendicularAngle * (Math.PI / 180)
    const offsetX = betweenSpec.offset * Math.cos(perpendicularRad)
    const offsetY = betweenSpec.offset * Math.sin(perpendicularRad)

    return [x + offsetX, y + offsetY, absoluteRotation]
}