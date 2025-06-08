/**
 * takes an animation spec and produces an animation plan
 * 
 * that is, translate relative role-based positions and actions
 * into specific passer-based coordinates that can be executed
 * with little computation in the frontend.
 */

import { assert } from "node:console";
import { Role } from "../pattern/pattern.ts";
import type { AnimationPlan, PassAnimation } from "./animation-plan.ts";
import type { AnimationSpec, PassSpec } from "./animation-spec.ts";
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
    const passAnimations = animationSpec.passAnimations.map(convertPassAnimation(locationMgr))



    // return {
    //     initialPositions,
    //     passAnimations,
    //     movementSegments,
    //     segmentMovementAnimations,
    //     directMovementAnimations,
    //     relabeling
    // }

    throw new Error("createAnimationPlan not implemented yet");
}

function convertPassAnimation(locationMgr: LocationMgr): (passSpec: PassSpec) => PassAnimation {
    return (passSpec: PassSpec): PassAnimation => {
        // locationMgr.

        // const [fromX, fromY] = getLocation(passSpec.onBeat, passSpec.mod, passSpec.pass.fromRole)
        // // get location for the "to" position, at the beat that the pass arrives
        // const [toX, toY] = getLocation(passSpec.onBeat + passSpec.duration, passSpec.mod, passSpec.pass.toRole)

        // return {
        //     onBeat: passSpec.onBeat,
        //     mod: passSpec.mod,
        //     duration: passSpec.duration,

        //     fromX,
        //     toX,
        //     fromY,
        //     toY,
        //     label: passSpec.pass.label
        // }
        throw new Error("convertPassAnimation not implemented yet");
    }
}



export class LocationMgr {
    initialPositions: [Role, number, number][]
    mod: number
    movements: [number/*passerId*/, number/*onBeat*/, number/*duration*/, MovementSegmentSpec][]
    roles: [number/*onBeat*/, Role[]][]
    constructor(initialPositions: [Role, number, number][], mod: number, movements: [number, number, number, MovementSegmentSpec][], roles: [number/*onBeat*/, Role[]][]) {
        this.initialPositions = initialPositions;
        this.mod = mod;
        this.movements = movements;
        this.roles = roles;
    }


    getLocation(time: number, role: Role): [number, number] {
        const rolesAtTime = this.roles.findLast(r => r[0] <= time % this.mod)![1]
        const passerIdx = rolesAtTime.indexOf(role);
        let lastMoveBeforeTime = this.movements.findLast(m => m[0] === passerIdx && m[1] <= time % this.mod)
        if (!lastMoveBeforeTime)
            lastMoveBeforeTime = this.movements.findLast(m => m[0] === passerIdx); // let's assume there are no conflicting/overlapping walking instructions, so we are just looking for the last pass before the move before the pattern wraps if there was no move yet
        assert(lastMoveBeforeTime, `No movement found for role ${role} at time ${time} in animation mod ${this.mod}.`);

        const segment = lastMoveBeforeTime![3/*MovementSegmentSpec*/];
        if ((lastMoveBeforeTime![1/*onBeat*/] + lastMoveBeforeTime![2/*duration*/]) % this.mod < time % this.mod) {
            // the last move has completed, so we know where we are
            return [segment.toX, segment.toY]
        } else {
            // we are currently moving, so we need to find where on the path we are
            const progress = (time - lastMoveBeforeTime![1/*onBeat*/] + this.mod) % this.mod / lastMoveBeforeTime![2/*duration*/];
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


    const movements: [number/*passerId*/, number/*onBeat*/, number/*duration*/, MovementSegmentSpec][] = []

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
                movements.push([
                    passerIdx, // passerId
                    time + movementTrigger.onBeat % 1, // onBeat
                    movementTrigger.duration,
                    animationSpec.baseMovementSegments[nextSegment] // the actual movement spec
                ])
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