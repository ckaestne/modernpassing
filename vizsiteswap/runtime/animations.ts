/**
 * runtime library for animations
 */

import { type Element, type G, SVG, Svg, Text, Line, type Path, Marker, Runner } from  "@svgdotjs/svg.js";

type Role = string
export type MovementSegment = {
    fromX: number,
    fromY: number,
    path: (number | string)[], // path instructions using C or A for curves and arches in SVG path notation
    toX: number,
    toY: number,
}
export enum Hand {
    Right, Left
}

type Position = {
    role: Role,
    x: number, // absolute coordinates in the SVG
    y: number,
    svgCircle: G,
    svgLabel: Text,
    segmentSequence: number[]
}
type Data = {
    positions: Position[],
    segments: MovementSegment[],
    segmentOffset: number,
    canvas: Svg,
    timers: Timer[],
    speed: number,
    beatIndicator?: {
        indicator: Element, // optional element to indicate the current beat with a vertical line
        xoffsets: number[] // x offsets for the beat indicators for each beat of the pattern
    },
    beatLabel?: Text, // optional label to indicate the current beat
    intervalId?: number // interval ID for the animation loop, when running
}
type Timer = {
    beat: number, // the beat on which the timer is scheduled
    mod: number, // the modulo of the timer
    delay: number, // delay in fraction of a beat (e.g. 0.5 for half a beat)
    priority: number, // the priority of the timer (lower is earlier)
    fn: (delay: number) => void // the function to execute, delay is expressed as fraction of a beat
}



export function initialize(svgId: string, speed: number = 1, beatIndicatorId?: string, beatIndicatorXOffsets?: number[], beatLabelId?: string): Data {
    const beatIndicator = beatIndicatorId && beatIndicatorXOffsets ? {
        indicator: SVG( beatIndicatorId) as Element,
        xoffsets: beatIndicatorXOffsets
    } : undefined;
    if (beatIndicator) {
        beatIndicator.indicator.x(beatIndicator.xoffsets[0])
        beatIndicator.indicator.show()
    }
    const beatLabel = beatLabelId ? SVG(beatLabelId) as Text : undefined;
    return {
        positions: [],
        segmentOffset: 0,
        segments: [],
        canvas: SVG(svgId) as Svg,
        timers: [],
        speed,
        beatIndicator,
        beatLabel
    }


}
export function addPosition(data: Data, role: Role, x: number, y: number, svgCircleId: string, svgLabelId: string, segmentSequence: number[]) {
    data.positions.push({ role, x, y, svgCircle: SVG(svgCircleId) as G, svgLabel: SVG(svgLabelId) as Text, segmentSequence });
}
export function initializeSegments(data: Data, segments: MovementSegment[]) {
    data.segments = segments
}

export function startAnimation(data: Data, patternLength: number) {
    const timeline = data.canvas.timeline();

    let time = -1;

    function step() {
        time++;
        const beatIdx = time % patternLength;
        data.beatLabel?.text((beatIdx + 1).toString());

        const actions = data.timers.filter(t => (time % t.mod) === t.beat).sort((a, b) => a.priority - b.priority);
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


/**
 * simply move the next segment
 */
export function animateBaseMovement(data: Data, when: number, mod: number, role: Role, duration: number): void {
    return animateMovement(data, when, mod, role, () => nextMove(data, role), duration);
}
// export function animateDirectMovement(data: Data, when: number, mod: number, role: Role, toX: number, toY: number, duration: number): void {
//     return animateMovement(data, when, mod, role, (pos: Position)=>nextMove(data, role), duration);
// }

export function animatePass(data: Data, when: number, mod: number, fromRole: Role, fromHand: Hand, toRole: Role, toHand: Hand, label: string, duration: number): void {
    schedule(data, when, mod, (delay: number) => {
        let v: G | undefined = undefined;
        const animation = data.canvas.animate(duration * 1000 / data.speed, delay * 1000 / data.speed, 'now');
        (animation as any).on('start', function () { v = renderPass(data, fromRole, fromHand, toRole, toHand, label) })
        animation.after(function () { v?.remove() });
    })
}

export function addRelabeling(data: Data, when: number, mod: number, changes: [Role, Role][]) {
    let first = true
    schedule(data, when, mod, (delay: number) => {
        if (first) first = false;
        else relabel(data, changes);
    }, 0/*highest priority, should happen first*/)
}

// ================== helper functions ==================

/**
 * schedule a move of a role on any segment
 * 
 * role is the role on beat onBeat
 */
function animateMovement(data: Data, when: number, mod: number, role: Role, getSeg: (p: Position) => MovementSegment, duration: number): void {
    schedule(data, when, mod, (delay: number) => {
        const pos = getPositionByRole(data, role);
        const seg = getSeg(pos);
        const path = genPath(data.canvas, seg);
        const animatedCircle = pos.svgCircle
        // gray arrow for the moving path in the background
        path.stroke({ color: 'lightgrey', width: 4 }).marker('end', 5, 5, function (add: Marker) { add.path('M0,0 L5,2.5 L0,5').fill('lightgrey') }).fill('none').
            after(pos.svgCircle).back().hide();
        console.log(`${role} moving on ${when} from ${seg.fromX}, ${seg.fromY} to ${seg.toX}, ${seg.toY}`);
        const animation: Runner = animatedCircle.animate(duration * 1000 / data.speed, delay * 1000 / data.speed, 'now');
        (animation as any).on('start', function () { path.show(); })
        animation.during(function (relativeProgress: number) {
            const p = path.pointAt(relativeProgress * path.length());
            animatedCircle.center(p.x, p.y);
        })
        animation.after(function () { updateLocation(pos, seg.toX, seg.toY); path.remove(); });
    })
}

function getSegment(data: Data, idx: number): MovementSegment {
    return data.segments[(idx + data.segmentOffset) % data.segments.length]
}

function getLocationByRole(data: Data, role: Role): [number, number] {
    const r = getPositionByRole(data, role)
    return [r.x, r.y]
}
function getPositionByRole(data: Data, role: Role): Position {
    const r = data.positions.find(r => r.role === role)
    if (!r)
        throw Error(`role ${role} not found in data.positions`)
    return r
}
function getCircleByRole(data: Data, role: Role): Element {
    return getPositionByRole(data, role).svgCircle
}

//get the move and mark it as moved in the sequence
function nextMove(data: Data, role: Role): MovementSegment {
    const p = getPositionByRole(data, role)
    // console.log(p)
    const nextSegment = p.segmentSequence[0]
    //shift the segment sequence
    p.segmentSequence = p.segmentSequence.slice(1)
    p.segmentSequence.push(nextSegment)
    // console.log(nextSegment)
    return data.segments[nextSegment]
}
function updateLocation(pos: Position, x: number, y: number) {
    pos.x = x
    pos.y = y
}   
  
function relabel(data: Data, changes: [Role, Role][]) {
    // console.log("relabel", changes, shiftSegment)
    for (let idx = 0; idx < data.positions.length; idx++) {
        const role = data.positions[idx].role
        const change = changes.find(([from, _]) => from === role)
        if (change) {
            data.positions[idx].role = change[1]
            data.positions[idx].svgLabel.text(change[1])
        }
    }
}

function renderPass(data: Data, fromRole: Role, fromHand: Hand, toRole: Role, toHand: Hand, label: string): G {
    console.log(`renderPass from ${fromRole} to ${toRole} with label ${label}`)
    const [x1, y1] = getLocationByRole(data, fromRole)
    const [x2, y2] = getLocationByRole(data, toRole)
    const [fromX, fromY, toX, toY, labelX, labelY] = computePass(x1, y1, fromHand, x2, y2, toHand)
    const canvas = data.canvas
    const g = canvas.group()
    const a = arrow(canvas, fromX, fromY, toX, toY, "black")
    g.add(a)
    if (label)
        g.add(canvas.text(label).font({ size: 8 }).cx(labelX).cy(labelY).fill("black"))
    return g
}

function arrow(canvas: Svg, x1: number, y1: number, x2: number, y2: number, color: string = 'blue'): Line {
    const line = canvas.line(x1, y1, x2, y2).stroke({ color })
    line.marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill(color))
    return line
}

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


function genPath(canvas: Svg, segment: MovementSegment): Path {
    // console.log(segment)
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return canvas.path(p.join(' '))
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

function schedule(data: Data, when: number, mod: number, fn: (delay: number) => void, priority: number = 1) {
    const beat = Math.floor(when % mod)
    const delay = (when % mod) - beat
    data.timers.push({ beat, mod, delay, priority, fn })
}
