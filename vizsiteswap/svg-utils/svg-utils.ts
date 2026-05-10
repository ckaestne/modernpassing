import { registerWindow, SVG, type Svg } from "@svgdotjs/svg.js"
import { createSVGWindow } from "svgdom"
import { MovementAnimation, MovementSegmentSpec, PassAnimation } from "@modernpassing/layout"

export function createSVG(width?: number, height?: number): Svg {
    const window = createSVGWindow()
    const document = window.document
    registerWindow(window, document)

    const svg: any = SVG(document.documentElement)
    if (width && height) {
        svg.size(width, height)
    }
    return svg
}

type Scaler = {
    scale(x: number, y: number): [number, number]
    scalep(p: [number, number]): [number, number]
    scalex(x: number): number
    scaley(y: number): number
    scaleSegment(seg: MovementSegmentSpec): MovementSegmentSpec
    scalePath(path: (number | string)[]): (number | string)[]
    scalePass(pass: PassAnimation): PassAnimation
    scaleDirectMovement(spec: MovementAnimation): MovementAnimation
}

export function scaleup(left: number, top: number, s: number): Scaler {
    function scalex(x: number): number {
        return Math.round(left + x * s)
    }
    function scaley(y: number): number {
        return Math.round(top + y * s)
    }
    return scaler(scalex, scaley, (l) => s * l)
}

export function scaledown(width: number, height: number): Scaler {
    function scalex(x: number): number {
        return Math.round(1000 * x / width) / 1000
    }
    function scaley(y: number): number {
        return Math.round(1000 * y / height) / 1000
    }
    return scaler(scalex, scaley, scalex)
}

export function scaler(scalex: (x: number) => number, scaley: (y: number) => number, scaleLength: (l: number) => number): Scaler {
    const o = {
        scale: function (x: number, y: number): [number, number] {
            return [scalex(x), scaley(y)]
        },
        scalep(p: [number, number]): [number, number] {
            return [scalex(p[0]), scaley(p[1])]
        },
        scalex,
        scaley,
        scaleSegment(seg: MovementSegmentSpec): MovementSegmentSpec {
            const fromX = scalex(seg.fromX)
            const fromY = scaley(seg.fromY)
            const p = o.scalePath([...seg.path, seg.toX, seg.toY])
            return {
                fromX,
                fromY,
                path: p.slice(0, -2),
                toX: p[p.length - 2] as number,
                toY: p[p.length - 1] as number,
            }
        },
        scalePath(path: (number | string)[]): (number | string)[] {
            if (path.length === 0) return []
            const lm: (number | string)[] = ["M", "L"]
            const c: (number | string)[] = ["C"]
            const a: (number | string)[] = ["A"]
            if (path.length >= 5 && path[0] === "M" && path[3] === "V") {
                return o.scalePath([...path.slice(0, 3), "L", path[1], path[4], ...path.slice(5)])
            }
            if (path.length >= 5 && path[0] === "M" && path[3] === "H") {
                return o.scalePath([...path.slice(0, 3), "L", path[4], path[2], ...path.slice(5)])
            }
            if (path.length === 1 && path[0] === "L") {
                return path
            }
            if (lm.includes(path[0]) && path.length >= 3) {
                return [path[0], scalex(Number(path[1])), scaley(Number(path[2])), ...o.scalePath(path.slice(3))]
            }
            if (c.includes(path[0]) && path.length >= 7) {
                return ["C", scalex(path[1] as number), scaley(path[2] as number), scalex(path[3] as number), scaley(path[4] as number), scalex(path[5] as number), scaley(path[6] as number), ...o.scalePath(path.slice(7))] //, scalex(path[5] as number), scaley(path[6] as number)]
            }
            if (a.includes(path[0]) && path.length >= 8) {
                return ["A", scaleLength(path[1] as number), scaleLength(path[2] as number), path[3], path[4], path[5], scalex(path[6] as number), scaley(path[7] as number), ...o.scalePath(path.slice(8))]
            }
            if (path.length === 2 && !isNaN(Number(path[0])) && !isNaN(Number(path[0]))) {
                return [scalex(path[0] as number), scaley(path[1] as number)]
            }
            throw new Error(`invalid path ${path}`)
        },
        scalePass(pass: PassAnimation): PassAnimation {
            return {
                ...pass,
                fromX: scalex(pass.fromX),
                toX: scalex(pass.toX),
                fromY: scaley(pass.fromY),
                toY: scaley(pass.toY),
                labelX: scalex(pass.labelX),
                labelY: scaley(pass.labelY),
            }
        },
        scaleDirectMovement(spec: MovementAnimation): MovementAnimation {
            return {
                ...spec,
                movementSpec: o.scaleSegment(spec.movementSpec),
            }
        },
    }
    return o
}
