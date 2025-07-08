/**
 * runtime library for animations
 */

import { type Element, type G, SVG, Svg, Text, Line, type Path, Marker, Runner, Circle } from "@svgdotjs/svg.js";
import type { DirectMovementAnimation, MovementSegmentSpec, PassAnimation, RelabelAnimation, SegmentMovementAnimation } from "@modernpassing/layout";
import { assert } from "node:console";
import { posix } from "node:path";

type Role = string
// export type MovementSegmentSpec = {
//     fromX: number,
//     fromY: number,
//     path: (number | string)[], // path instructions using C or A for curves and arches in SVG path notation
//     toX: number,
//     toY: number,
// }
export enum Hand {
    Right, Left
}

/** position relates to a physical passer, with possibly changing roles */
type Position = {
    role: Role,
    x: number, // absolute coordinates in the SVG
    y: number,
    svgCircle: G,
    svgLabel: Text,
    currentAnimation?: CustomMovementRunner // current animation for this passer, if any
}
export type Data = {
    mod: number,
    positions: Position[],
    segments: MovementSegmentSpec[],
    canvas: Svg,
    timers: Timer[],
    speed: number,
    beatIndicator?: {
        indicator: Element, // optional element to indicate the current beat with a vertical line
        xoffsets: number[] // x offsets for the beat indicators for each beat of the pattern
    },
    beatLabel?: Text, // optional label to indicate the current beat
    intervalId?: number, // interval ID for the animation loop, when running
    animationRunners: Map<string, CustomMovementRunner> // map of animation runners for each role at each beat, used to take over animations
    roleColors: Map<Role, string>
}
type Timer = {
    beat: number, // the beat on which the timer is scheduled
    delay: number, // delay in fraction of a beat (e.g. 0.5 for half a beat)
    priority: number, // the priority of the timer (lower is earlier)
    fn: (delay: number) => void // the function to execute, delay is expressed as fraction of a beat
    firstIteration?: boolean // if true, this timer is only executed in the first iteration of the animation, if false only in all other rounds, if undefined (default) it is executed in all iterations
}

/**
 * initialize the runtime code for a given SVG image. all relevant
 * data is stored in the returned object.
 * @param svgId Id of the SVG canvas element (starting with `#`)
 * @param speed Relative speed of the animation, 1 by default
 * @param beatIndicatorId Id of the vertical line in the pattern description that can be moved during the animation, optional
 * @param beatIndicatorXOffsets x Coordinates of where the indicator line should be placed for each beat of the pattern, e.g. [0, 50, 100] for a pattern with 3 beats
 * @param beatLabelId Id of a text element that indicates the current beat of the pattern, optional
 * @returns 
 */
export function initialize(svgId: string, mod: number, speed: number = 1, roleColors: [Role, string][], beatIndicatorId?: string, beatIndicatorXOffsets?: number[], beatLabelId?: string): Data {
    const beatIndicator = beatIndicatorId && beatIndicatorXOffsets ? {
        indicator: SVG(beatIndicatorId) as Element,
        xoffsets: beatIndicatorXOffsets
    } : undefined;
    if (beatIndicator) {
        beatIndicator.indicator.x(beatIndicator.xoffsets[0])
        beatIndicator.indicator.show()
    }
    const beatLabel = beatLabelId ? SVG(beatLabelId) as Text : undefined;
    return {
        mod,
        positions: [],
        segments: [],
        canvas: SVG(svgId) as Svg,
        timers: [],
        speed,
        beatIndicator,
        beatLabel,
        animationRunners: new Map(),
        roleColors: new Map(roleColors),
    }


}

/**
 * Initialize the data for a passer -- role, location, id of circle and label elements, and the sequence of segments to move on.
 * 
 * Manipulates the `data` object 
 * @param data 
 * @param role 
 * @param x 
 * @param y 
 * @param svgCircleId 
 * @param svgLabelId 
 * @param segmentSequence 
 */
export function addPosition(data: Data, _: number, role: Role, x: number, y: number, svgCircleId: string, svgLabelId: string) {
    data.positions.push({ role, x, y, svgCircle: SVG(svgCircleId) as G, svgLabel: SVG(svgLabelId) as Text });
}

/**
 * sets the movement segments for the animation.
 * @param data mutable data object to store the segments in
 * @param segments 
 */
export function setSegments(data: Data, segments: MovementSegmentSpec[]) {
    data.segments = segments
}

/**
 * starting the animation loop after all setup
 * @param data 
 * @param patternLength 
 */
export function startAnimation(data: Data, patternLength: number) {
    const timeline = data.canvas.timeline();
    data.timers.sort((a, b) => a.beat - b.beat || a.priority - b.priority); // sort by beat and priority

    let time = -1;

    function step() {
        time++;
        const beatIdx = time % patternLength;
        data.beatLabel?.text((beatIdx + 1).toString());

        const actions = data.timers.filter(t => (time % data.mod) === t.beat && !firstIterationException(t, time < data.mod))
        actions.forEach(action => action.fn(action.delay))
        if (data.beatIndicator) {
            data.beatIndicator.indicator.
                animate(1000 / data.speed, 0, 'now').x(data.beatIndicator.xoffsets[(beatIdx + 1)]).
                after(() => data.beatIndicator?.indicator.x(data.beatIndicator.xoffsets[(beatIdx + 1) % patternLength]));
        }
    }

    if (data.intervalId) clearInterval(data.intervalId);
    data.intervalId = setInterval(step, 1000 / data.speed)

    timeline.play();
}

function firstIterationException(timer: Timer, isFirstIteration: boolean): boolean {
    if (timer.firstIteration === undefined) return false; // default is to run in all iterations
    if (timer.firstIteration && isFirstIteration) return false; // run only in first iteration
    if (!timer.firstIteration && !isFirstIteration) return false; // run only in all other iterations
    return true; // run in all iterations
}

function getPositionByRole(data: Data, role: Role): Position {
    const pos = data.positions.find(p => p.role === role);
    if (!pos) {
        throw Error(`Role ${role} not found in data.positions`);
    }
    return pos;
}

/**
 * sets up the default movement along the movement segments of the role.
 */
export function setSegmentMovements(data: Data, movementSpecs: SegmentMovementAnimation[]): void {
    for (const spec of movementSpecs) {
        schedule(data, spec.onBeat, (delay: number) => {
            const pos = getPositionByRole(data, spec.role)
            const seg = data.segments[spec.segmentIdx]
            const path = genPath(data.canvas, seg) // TODO: precompute this in the backend
            // console.log(`${spec.role} moving on ${spec.onBeat} from ${seg.fromX}, ${seg.fromY} to ${seg.toX}, ${seg.toY} with delay ${delay} and duration ${spec.duration}`);
            const animation = animateMoveOnPath(data, pos, path, delay, spec.duration);
            data.animationRunners.set(spec.onBeat + spec.role, animation)
        })
    }
}

export function setDirectMovements(data: Data, directMovementAnimations: DirectMovementAnimation[]): void {
    for (const spec of directMovementAnimations) {
        schedule(data, spec.onBeat, (delay: number) => {
            const pos = getPositionByRole(data, spec.role)
            const path = directPath(data.canvas, pos.x, pos.y, spec.toX, spec.toY, spec.bend);
            // console.log(`${spec.role} moving directly on ${spec.onBeat} from ${pos.x}, ${pos.y} to ${spec.toX}, ${spec.toY} with delay ${delay} and duration ${spec.duration}`);
            const directMoveAnimation = animateMoveOnPath(data, pos, path, delay, spec.duration);

            if (spec.takeRelativeMovementFrom) {
                const id = spec.takeRelativeMovementFrom[0] + spec.takeRelativeMovementFrom[1]
                if (!data.animationRunners.has(id)) {
                    console.warn(`No animation runner found for ${spec.takeRelativeMovementFrom[1]} at beat ${spec.takeRelativeMovementFrom[0]}, cannot take relative movement from it.`);
                    return;
                }
                directMoveAnimation.runner.after(() => {
                    data.animationRunners.get(id)?.takeover(pos)
                })
            }
        })
    }
}


function animateMoveOnPath(data: Data, pos: Position, path: Path, delay: number, duration: number): CustomMovementRunner {
    // gray arrow for the moving path in the background
    path.stroke({ color: 'lightgrey', width: 4 }).marker('end', 5, 5, function (add: Marker) { add.path('M0,0 L5,2.5 L0,5').fill('lightgrey') }).fill('none').
        after(pos.svgCircle).back().hide();

    // if already animating, stop the previous animation
    pos.currentAnimation?.abort()

    const animation: Runner = pos.svgCircle.animate(duration * 1000 / data.speed, delay * 1000 / data.speed, 'now');
    (animation as any).on('start', (function () { path.show(); }))

    // this is what moves the circle along the path, can be aborted and taken over
    const moveAnimation = new CustomMovementRunner(animation, path, pos)
    animation.after(function () {
        path.remove();
    })
    pos.currentAnimation = moveAnimation
    return moveAnimation
}

/**
 * sets up a pass between two roles at a given time.
 */
export function setPasses(data: Data, passes: PassAnimation[]): void {
    for (const p of passes)
        schedule(data, p.onBeat, (delay: number) => {
            let v: G | undefined = undefined;
            const animation = data.canvas.animate(p.duration * 1000 / data.speed, delay * 1000 / data.speed, 'now');
            (animation as any).on('start', function () { v = renderPass(data, p) })
            animation.after(function () { v?.remove() });
        }, 1, p.firstIteration)
}

/**
 * sets up a relabeling of roles at a given time.
 * @param data 
 * @param when 
 * @param mod 
 * @param changes 
 */
export function setRelabeling(data: Data, relabelAnimations: RelabelAnimation[]) {
    let first = true
    for (const r of relabelAnimations) {
        schedule(data, r.onBeat, (delay: number) => {
            if (first) first = false;
            else relabel(data, r.changes);
        }, 0/*highest priority, should happen first*/)
    }
}


// /**
//  * Schedules a movement relative to locations of the base passers
//  * @param data 
//  * @param when 
//  * @param mod 
//  * @param role 
//  * @param targetSpec 
//  * @param duration 
//  */
// export function animateRelativeMovement(data: Data, when: number, mod: number, role: Role, targetSpec: RelativeMovementSpec, duration: number): void {

// }


// ================== helper functions ==================




// function getLocationByRole(data: Data, role: Role): [number, number] {
//     const r = getPositionByRole(data, role)
//     return [r.x, r.y]
// }
// function getPositionByRole(data: Data, role: Role): Position {
//     const r = data.positions.find(r => r.role === role)
//     if (!r)
//         throw Error(`role ${role} not found in data.positions`)
//     return r
// }
// function getCircleByRole(data: Data, role: Role): Element {
//     return getPositionByRole(data, role).svgCircle
// }


function updateLocation(pos: Position, x: number, y: number) {
    pos.x = x
    pos.y = y
}

function relabel(data: Data, changes: [Role, Role][]) {
    // console.log("relabel", changes)
    const idxs = changes.map(c => [data.positions.findIndex(p => p.role === c[0]), c[1]] as [number, Role]);
    for (const change of idxs) {
        data.positions[change[0]].role = change[1]
        data.positions[change[0]].svgLabel.text(change[1])
        // const color = data.roleColors.get(change[1]) || "white";
        // console.log(`relabeling ${change[0]} to ${change[1]} with color ${color}`);
        // (data.positions[change[0]].svgCircle.first() as Circle).fill(color)
        
    }
}

function renderPass(data: Data, pass: PassAnimation): G {
    // console.log(`renderPass from ${fromRole} to ${toRole} with label ${label}`)
    const canvas = data.canvas
    const g = canvas.group()
    const a = arrow(canvas, pass.fromX, pass.fromY, pass.toX, pass.toY, "black")
    g.add(a)
    if (pass.label)
        g.add(canvas.text(pass.label).font({ size: 8 }).cx(pass.labelX).cy(pass.labelY).fill("black"))
    return g
}

function arrow(canvas: Svg, x1: number, y1: number, x2: number, y2: number, color: string = 'blue'): Line {
    const line = canvas.line(x1, y1, x2, y2).stroke({ color })
    line.marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill(color))
    return line
}

// function computePass(x1: number, y1: number, hand1: Hand, x2: number, y2: number, hand2: Hand, armLength: number = 25, labelDistance: number = 4): [number, number, number, number, number, number] {
//     //angle between the two points
//     const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
//     //move 20 pixel 45 degree from that angle from the first point
//     const armAngle = 40 //todo make this configurable
//     const throwOutside = 1

//     const direction1 = hand1 === 0 ? armAngle : -armAngle
//     const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
//     const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

//     const direction2 = hand2 === 0 ? armAngle * throwOutside : -armAngle * throwOutside
//     const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
//     const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

//     const length = Math.sqrt((x3 - x4) ** 2 + (y3 - y4) ** 2)

//     let labelX = (x3 + x4) / 2
//     let labelY = (y3 + y4) / 2

//     const passAngle = Math.atan2(y4 - y3, x4 - x3) * 180 / Math.PI

//     const labelAngle =
//         hand1 === 0 && hand2 === 1 ? 90 : // right hand pass to the right
//             hand1 === 1 && hand2 === 0 ? 90 : // left hand pass to the left
//                 hand1 === 0 && hand2 === 0 ? -90 :
//                     90 // crossing pass toward the target

//     //sideways adjustment for label
//     // if (labelAngle !== 0) {
//     labelX += labelDistance * Math.cos((angle + labelAngle) * Math.PI / 180)
//     labelY += labelDistance * Math.sin((angle + labelAngle) * Math.PI / 180)
//     // }
//     //forward adjustment for label
//     labelX += length / 4 * Math.cos(passAngle * Math.PI / 180)
//     labelY += length / 4 * Math.sin(passAngle * Math.PI / 180)


//     return [Math.round(x3), Math.round(y3), Math.round(x4), Math.round(y4), Math.round(labelX), Math.round(labelY)]
// }


function genPath(canvas: Svg, segment: MovementSegmentSpec): Path {
    // console.log(segment)
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return canvas.path(p.join(' '))
}

function directPath(canvas: Svg, x1: number, y1: number, x2: number, y2: number, bend?: "↻" | "↺"): Path {
    // console.log(`directPath from (${x1}, ${y1}) to (${x2}, ${y2}) with bend ${bend}`)
    if (!bend)
        return canvas.path(`M${x1},${y1} L${x2},${y2}`)
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    const r = distance * 1
    return canvas.path(`M${x1},${y1} A${r},${r} 0 0,${bend === "↻" ? 1 : 0} ${x2},${y2}`) // bend is clockwise for ↻ and counter-clockwise for ↺
}


// const timers: { [speed: number]: (() => void)[] } = {};
// function addTimer(f: () => void, speed: number) {
//     // console.log(speed)
//     if (!timers[speed]) timers[speed] = []
//     timers[speed].push(f)
//     if (timers[speed].length === 1)
//         setInterval(() => {
//             timers[speed].forEach(f => f())
//         }, 1000 / speed)
// }

function schedule(data: Data, when: number, fn: (delay: number) => void, priority: number = 1, firstIteration: boolean | undefined = undefined) {
    console.assert(when >= 0 && when < data.mod, `schedule: when must be in range [0, ${data.mod}), was ${when}`);
    const beat = Math.floor(when)
    const delay = when - beat
    data.timers.push({ beat, delay, priority, fn, firstIteration })
}



/**
 * animation that can be aborted.
 * 
 * when aborted, the during callback will not be called anymore.
 * 
 * the finished callback will be called with a parameter indicating whether the animation was aborted or not.
 */
class CustomMovementRunner {
    private aborted: boolean = false;
    readonly runner: Runner
    private readonly pos: Position
    private readonly path: Path
    constructor(animation: Runner, path: Path, pos: Position) {
        this.runner = animation;
        this.pos = pos
        this.path = path


        animation.during((relativeProgress: number) => {
            if (this.aborted) return
            const p = path.pointAt(relativeProgress * path.length());
            pos.svgCircle.center(p.x, p.y);
        })

        animation.after(() => {
            if (this.aborted) return
            const endPosition = path.pointAt(path.length())
            updateLocation(pos, endPosition.x, endPosition.y);
        })
    }

    abort() {
        this.aborted = true; // mark the animation as aborted
    }
    takeover(pos: Position): CustomMovementRunner {
        this.abort()
        return new CustomMovementRunner(this.runner, this.path, pos);
    }

}