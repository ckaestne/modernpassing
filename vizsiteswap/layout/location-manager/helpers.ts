import type { Role } from "@modernpassing/pattern";
import { createSVG } from "@modernpassing/svg-utils";
import type { Svg } from "@svgdotjs/svg.js";
import type { AnimationSpec, MovementSegmentSpec } from "../animation-spec.ts";
import PathProp from "npm:svg-path-properties"
import { assert } from "node:console";

type Brand<T, B> = T & { __brand: B }

export type PasserIdx = Brand<number, 'PasserIndex'>

export const createPasserIdx = (value: number): PasserIdx => value as PasserIdx



export function genPathStr(segment: MovementSegmentSpec): string {
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return p.join(' ')
}

export type PathLike = {
    length(): number
    pointAt(distance: number): { x: number; y: number }
}

export function genPath(_: Svg, segment: MovementSegmentSpec): PathLike {
    const properties = new PathProp.svgPathProperties(genPathStr(segment))
    return {
        length: () => properties.getTotalLength(),
        pointAt: (distance: number) => properties.getPointAtLength(distance)
    }
}



/** Helper functions */
export function same(a: number[][], b: number[][]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i].length !== b[i].length) return false
        for (let j = 0; j < a[i].length; j++) {
            if (a[i][j] !== b[i][j]) return false
        }
    }
    return true
}

export function same2(a: Role[], b: Role[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

export const helperSvg = createSVG()


export function getAnimationMod(animationSpec: AnimationSpec, ignoreRelativeMovements: boolean = false): number {
    const passMods = animationSpec.passAnimations.map(p => p.mod)
    const movementMods = animationSpec.baseMovementTriggers.map(m => m.mod);
    const directMovementMods = animationSpec.baseMovementTriggers.map(m => m.mod);
    const relativeMovementMods = ignoreRelativeMovements ? [] : animationSpec.relativeMovements.map(m => m.mod);

    // find the least common multiple of all mods
    const lcm = (a: number, b: number): number => {
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        return (a * b) / gcd(a, b);
    }
    const allMods = [...passMods, ...movementMods, ...directMovementMods, ...relativeMovementMods];
    return allMods.reduce((acc, mod) => lcm(acc, mod), 1);
}
