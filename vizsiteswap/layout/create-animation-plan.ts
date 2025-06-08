/**
 * takes an animation spec and produces an animation plan
 * 
 * that is, translate relative role-based positions and actions
 * into specific passer-based coordinates that can be executed
 * with little computation in the frontend.
 */

import { assert } from "node:console";
import { Hand, Role } from "../pattern/pattern.ts";
import type { AnimationPlan, DirectMovementAnimation, PassAnimation, RelabelAnimation, SegmentMovementAnimation } from "./animation-plan.ts";
import type { AnimationSpec, MovementTriggerSpec, PassSpec, RelabelSpec } from "./animation-spec.ts";
import { MovementSegmentSpec } from "./layout.ts";
import { createSVG } from "../svg-utils/svg-utils.ts";
import { Path, Svg } from "@svgdotjs/svg.js";



function createAnimationPlan(animationSpec: AnimationSpec): AnimationPlan {
    // all roles, this is used to create ids
    const roles = animationSpec.initialPositions.map(pos => pos.role)
    function passerId(role: Role): number { return roles.indexOf(role) }

    const locationMgr = computeBaseAnimations(animationSpec);


    // initial positions is trivial
    const initialPositions = animationSpec.initialPositions.map(i => ({
        passerId: passerId(i.role),
        x: i.x,
        y: i.y,
        initialRole: i.role
    }))
    const passAnimations: PassAnimation[] = animationSpec.passAnimations.flatMap(convertPassAnimation(locationMgr))
    const movementSegments = animationSpec.baseMovementSegments
    // segments are already computed as a side effect of indexing locations in the locationMgr
    const segmentMovementAnimations: SegmentMovementAnimation[] = convertBaseMovement(locationMgr, animationSpec)

    const directMovementAnimations: DirectMovementAnimation[] = []
    const relabeling: RelabelAnimation[] = convertRelabeling(locationMgr, animationSpec.relabeling)

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

function convertPassAnimation(locationMgr: LocationMgr): (passSpec: PassSpec) => PassAnimation[] {
    return (passSpec: PassSpec): PassAnimation[] => {

        const result: PassAnimation[] = []
        for (let time = passSpec.onBeat; time < locationMgr.mod; time += passSpec.mod) {
            const [fromX, fromY] = locationMgr.getLocation(time, passSpec.pass.fromRole)
            // get location for the "to" position, at the beat that the pass arrives
            const [toX, toY] = locationMgr.getLocation((time + passSpec.duration) % locationMgr.mod, passSpec.pass.toRole)

            const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] = computePass(fromX, fromY, passSpec.pass.fromHand, toX, toY, passSpec.pass.toHand)


            result.push({
                onBeat: passSpec.onBeat,
                duration: passSpec.duration,

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
            onBeat: m.onBeat,
            passerId: m.passerIdx,//TODO this probably needs to change for animations
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
    for (const r of locationMgr.roles) {
        result.push({
            onBeat: r[0],
            changes: r[1].map((r, i) => ([i, r]))
        })
    }
    return result;
}



type LocationMgrMovement = {
    passerIdx: number,
    role: Role,
    onBeat: number,
    duration: number,
    segment: MovementSegmentSpec
}

export class LocationMgr {
    initialPositions: [Role, number, number][]
    mod: number
    movements: LocationMgrMovement[]
    roles: [number/*onBeat*/, Role[]][]
    constructor(initialPositions: [Role, number, number][], mod: number, movements: LocationMgrMovement[], roles: [number/*onBeat*/, Role[]][]) {
        this.initialPositions = initialPositions;
        this.mod = mod;
        this.movements = movements;
        this.roles = roles;
    }


    getLocation(time: number, role: Role): [number, number] {
        const rolesAtTime = this.roles.findLast(r => r[0] <= time % this.mod)![1]
        const passerIdx = rolesAtTime.indexOf(role);
        let lastMoveBeforeTime = this.movements.findLast(m => m.passerIdx === passerIdx && m.onBeat <= time % this.mod)
        if (!lastMoveBeforeTime)
            lastMoveBeforeTime = this.movements.findLast(m => m.passerIdx === passerIdx); // let's assume there are no conflicting/overlapping walking instructions, so we are just looking for the last pass before the move before the pattern wraps if there was no move yet
        assert(lastMoveBeforeTime, `No movement found for role ${role} at time ${time} in animation mod ${this.mod}.`);

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

}



export function computeBaseAnimations(animationSpec: AnimationSpec): LocationMgr {
    assert(animationSpec.passAnimations.length > 0 || animationSpec.baseMovementTriggers.length > 0, "Animation must have at least one pass or movement trigger.");

    const passMods = animationSpec.passAnimations.map(p => p.mod)
    const movementMods = animationSpec.baseMovementTriggers.map(m => m.mod);

    // find the least common multiple of all mods
    const lcm = (a: number, b: number): number => {
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        return (a * b) / gcd(a, b);
    }
    const overallMod = passMods.reduce((acc, mod) => lcm(acc, mod), movementMods.reduce((acc, mod) => lcm(acc, mod), 1));


    const movements: LocationMgrMovement[] = []

    const currentSequences = animationSpec.baseMovementSequences.slice()
    const initialRoles = animationSpec.initialPositions.map(p => p.role);
    let currentRoles = initialRoles
    const roles: [number/*onBeat*/, Role[]][] = [[0, initialRoles]]
    let time = 0
    while (true) {
        // relabeling
        for (const relabel of animationSpec.relabeling) {
            if (time !== 0 && time % relabel.mod === Math.floor(relabel.onBeat)) {
                currentRoles = currentRoles.map(r => {
                    const change = relabel.changes.find(c => c[0] === r);
                    if (change) return change[1]; else return r
                })
                roles.push([time, currentRoles]);
            }
        }

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



        if (time % overallMod === 0 && time > 0 && same(currentSequences, animationSpec.baseMovementSequences) && same2(currentRoles, initialRoles))
            break

        time++;

        if (time > 10000) throw new Error("Animation length computation exceeded 10,000 iterations, likely infinite loop.");
    }


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
function computePass(x1: number, y1: number, hand1: Hand, x2: number, y2: number, hand2: Hand, armLength: number = 25, labelDistance: number = 4): [number, number, number, number, number, number] {
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


    return [Math.round(x3), Math.round(y3), Math.round(x4), Math.round(y4), Math.round(labelX), Math.round(labelY)]
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

