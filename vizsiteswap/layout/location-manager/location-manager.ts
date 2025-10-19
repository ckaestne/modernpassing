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

import { Role } from "@modernpassing/pattern";
import { AnimationSpec, MovementSegmentSpec } from "../animation-spec.ts";
import { Path, Svg } from "@svgdotjs/svg.js";
import assert from "node:assert";
import { createSVG } from "@modernpassing/svg-utils";

/** Helper functions */
function same(a: number[][], b: number[][]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i].length !== b[i].length) return false
        for (let j = 0; j < a[i].length; j++) {
            if (a[i][j] !== b[i][j]) return false
        }
    }
    return true
}

function same2(a: Role[], b: Role[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

const helperSvg = createSVG()

function getAnimationTotalMod(animationSpec: AnimationSpec): number {
    const passMods = animationSpec.passAnimations.map(p => p.mod)
    const movementMods = animationSpec.baseMovementTriggers.map(m => m.mod);
    const directMovementMods = animationSpec.baseMovementTriggers.map(m => m.mod);
    const relativeMovementMods = animationSpec.relativeMovements.map(m => m.mod);

    // find the least common multiple of all mods
    const lcm = (a: number, b: number): number => {
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        return (a * b) / gcd(a, b);
    }
    const allMods = [...passMods, ...movementMods, ...directMovementMods, ...relativeMovementMods];
    return allMods.reduce((acc, mod) => lcm(acc, mod), 1);
}

type LocationMgrMovement = {
    passerIdx: number,
    role: Role, // role at the start of the movement
    onBeat: number,
    duration: number,
    segment: MovementSegmentSpec
}


export function createBaseLocationManager(animationSpec: AnimationSpec): BaseLocationManager {
    const overallMod = getAnimationTotalMod(animationSpec);


    let movements: LocationMgrMovement[] = []

    const currentSequences = animationSpec.baseMovementSequences.slice()
    const initialRoles = animationSpec.initialPositions.map(p => p.role);
    let basePatternCurrentRoles = initialRoles
    let fullPatternCurrentRoles = initialRoles
    let basePatternRoles: [number/*onBeat*/, Role[]][] = [[0, initialRoles]]
    let fullPatternRoles: [number/*onBeat*/, Role[]][] = [[0, initialRoles]]
    let time = 0
    while (true) {
        // relabeling
        for (const relabel of animationSpec.basePatternRelabeling) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                basePatternCurrentRoles = basePatternCurrentRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                basePatternRoles.push([time, basePatternCurrentRoles]);
            }
        }
        for (const relabel of animationSpec.relabeling) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                fullPatternCurrentRoles = fullPatternCurrentRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                fullPatternRoles.push([time, fullPatternCurrentRoles]);
            }
        }

        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(basePatternCurrentRoles, initialRoles))
            break


        for (const movementTrigger of animationSpec.baseMovementTriggers) {
            if (time % movementTrigger.mod === Math.floor(movementTrigger.onBeat)) {
                const passerIdx = basePatternCurrentRoles.indexOf(movementTrigger.role);
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

    basePatternRoles = basePatternRoles.filter(r => r[0] < time);
    fullPatternRoles = fullPatternRoles.filter(r => r[0] < time);
    movements = movements.filter(m => m.onBeat < time);

    return new BaseLocationManager(
        animationSpec.initialPositions.map(p => [p.role, p.x, p.y]),
        time,
        movements, basePatternRoles, fullPatternRoles
    )

}


export class BaseLocationManager {
    initialPositions: [Role, number, number][]
    mod: number
    movements: LocationMgrMovement[]
    manipulatorPositions: Map<Role, [number, number, number][]> // this is used to track manipulator positions that are not part of the base roles: [time, x, y]
    basePatternRoles: [number/*onBeat*/, Role[]][]
    fullPatternRoles: [number/*onBeat*/, Role[]][]
    constructor(initialPositions: [Role, number, number][], mod: number, movements: LocationMgrMovement[], basePatternRoles: [number/*onBeat*/, Role[]][], fullPatternRoles: [number/*onBeat*/, Role[]][], manipulatorPositions: Map<Role, [number, number, number][]> = new Map()) {
        this.initialPositions = initialPositions;
        this.mod = mod;
        this.movements = movements;
        this.basePatternRoles = basePatternRoles;
        this.fullPatternRoles = fullPatternRoles;
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
        const rolesAtTime = this.basePatternRoles.findLast(r => r[0] <= time % this.mod)![1]
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







class FullLocationManager {
    constructor(baseLocationManager: BaseLocationManager, animationSpec: AnimationSpec) {
    }
}

function genPath(canvas: Svg, segment: MovementSegmentSpec): Path {
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return canvas.path(p.join(' '))
}
