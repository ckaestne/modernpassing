import type { GroupPattern, MovementSegmentSpec } from "@modernpassing/layout";
import { type AnimationPlan, createAnimationPlan, apFindOngoingMovement, apFindPosition, apGetRole, type PassAnimation } from "@modernpassing/layout";
import type { Role } from "@modernpassing/pattern";
import { customRendererConfigDefaults, type RendererConfig } from "@modernpassing/rendering-core";
import { getRenderPatternSize } from "@modernpassing/rendering-svg";
import { scaleup } from "@modernpassing/svg-utils";
import type { Containable, G, Line, Path, Svg, Text } from '@svgdotjs/svg.js';



export function renderGroupPatternLayoutFrames(gp: GroupPattern, config: Partial<RendererConfig & RenderLayoutConfig>, svg: Svg): G[] {

    const changedRenderDefaults: Partial<RendererConfig> = { iterations: 1, showPasserRoles: true }
    const renderConfig: RendererConfig & RenderLayoutConfig = { ...defaultRenderLayoutConfig, ...customRendererConfigDefaults(gp.pattern), ...changedRenderDefaults, ...config }

    // there are three parts that we may render: the pattern, the aidan notation, and the layout
    // not every pattern has aidan notation, and not every group pattern has a layout
    // in addition, the configuration could specify only to render a subset of these
    const size = getRenderPatternSize(gp.pattern, renderConfig)
    const animationPlan = createAnimationPlan(gp.layout!.animation, size.height / renderConfig.positionCircle)
    return renderAnimationFrames(animationPlan, svg, size.height, size.height, renderConfig)

}






type RenderLayoutConfig = {
    positionCircle: number
    roleLabelFontSize: number
    roleColors?: string[]
    animateRoleColors: boolean // whether to show colors for passers in the animation corresponding to their role
    showAnimationCounter: boolean
}
export const defaultRenderLayoutConfig: RenderLayoutConfig = {
    positionCircle: 40,
    roleLabelFontSize: 28,
    roleColors: undefined,
    animateRoleColors: false, // this is pretty confusing
    showAnimationCounter: false
}




export function renderAnimationFrames(
    layout: AnimationPlan,
    svg: Svg, width: number, height: number,
    config: RenderLayoutConfig
): G[] {

    const timesOfInterest : Set<number> = new Set([0, layout.mod])
    for (const move of layout.movementAnimations) 
        timesOfInterest.add(move.onBeat)
    for (const pass of layout.passAnimations) 
        timesOfInterest.add(pass.onBeat)

    return [...Array.from(timesOfInterest).sort((a, b) => a - b).map(t=>
        renderAnimationFrame(layout, t, svg, width, height, config),
    ) , ...Array.from(timesOfInterest).sort((a, b) => a - b).map(t=>
        renderAnimationFrame(layout, t+layout.mod, svg, width, height, config),
    )]
}
const strokeWidth = 3

export function renderAnimationFrame(
    layout: AnimationPlan, time: number,
    svg: Svg, width: number, height: number,
    config: RenderLayoutConfig
): G {

    const canvas = svg.group().width(width).height(height)
    canvas.rect(width, height).fill("white").stroke("black").back()

    // console.log(config.showAnimationCounter + " " + time)
    const counter: Text | undefined = config.showAnimationCounter ? canvas.text('_').cx(10).cy(10).fill("black").text("" + time) : undefined

    const roleColors: [Role, string][] = createRoleColorMappings(config, layout);

    const s = Math.min(width, height) - config.positionCircle
    let left = config.positionCircle / 2
    let top = config.positionCircle / 2
    const scale = scaleup(left, top, s)


    // if somebody is walking, render the path
    for (let jugglerIdx = 0; jugglerIdx < layout.initialPositions.length; jugglerIdx++) {
        const mov = apFindOngoingMovement(layout, jugglerIdx, time)
        if (mov) renderMovePath(canvas, scale.scaleSegment(mov.movementSpec))

    }

    // render jugglers
    for (let jugglerIdx = 0; jugglerIdx < layout.initialPositions.length; jugglerIdx++) {
        const pos = apFindPosition(layout, jugglerIdx, time);
        const loc = scale.scalep(pos)
        const role = apGetRole(layout, jugglerIdx, time);
        renderJuggler(canvas, loc, jugglerIdx, role, config);
    }

    // render passes
    for (const pass of layout.passAnimations)
        if (pass.onBeat <= time%layout.mod && time%layout.mod < pass.onBeat + pass.duration) 
            if (pass.firstIteration===undefined || pass.firstIteration === (time < layout.mod))
              renderPass(canvas, scale.scalePass(pass))


    return canvas
    // // //shift the layout to the center
    // // const topMost = layout.initialPositions.reduce((acc, pos) => Math.min(acc, pos.y * s), 0)
    // // const bottomMost = layout.initialPositions.reduce((acc, pos) => Math.max(acc, pos.y * s), 0)
    // // top = top + (s - (bottomMost - topMost)) / 2
    // // console.log(`rendering background ${width} ${height} ${s} ${left} ${top}`)



    // // canvas.circle(s).center(left + s / 2, top + s / 2).fill("none").stroke("lightgrey")
    // // canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
    // // const positions: Map<number/*passerIdx*/, [number, number, Element, Text]> = new Map()
    // for (let roleIdx = 0; roleIdx < layout.initialPositions.length; roleIdx++) {
    //     const pos = layout.initialPositions[roleIdx]
    //     const [x, y] = scale.scale(pos.x, pos.y)
    //     // const c = canvas.circle(config.positionCircle - strokeWidth).center(x, y).fill("white").stroke({ color: config.colors[roleIdx], width: strokeWidth })        
    //     // const l = canvas.text(pos.label).font({ size: config.roleLabelFontSize }).cx(x).cy(y).fill("black")
    //     const g = canvas.group()
    //     const c = canvas.circle(config.positionCircle - strokeWidth).stroke({ color: "black", width: strokeWidth })
    //     if (config.animateRoleColors && config.roleColors && config.roleColors[roleIdx])
    //         c.fill(config.roleColors[roleIdx]);
    //     else
    //         c.fill("white")
    //     c.center(x, y)
    //     const l = canvas.text(pos.initialRole).
    //         font({ size: config.roleLabelFontSize, 'text-anchor': "middle", fill: 'black', 'dominant-baseline': "middle", 'font-weight': "bold" }).
    //         center(x, y)
    //     g.add(c).add(l)
    //     //no idea why this is needed; it sets x for the tspan attribute (not y) and then doesn't move sideways
    //     l.children()[0].attr({ x: null })

    //     // positions.set(pos.passerIdx, [pos.x, pos.y, g, l])

    //     // addPosition(data: Data, role: Role, x: number, y: number, svgCircleId: string, svgLabelId: string, segmentSequence: number[])
    //     javascript += `addPosition(data, ${pos.passerId}, '${pos.initialRole}', ${x}, ${y}, '#${g.id()}', '#${l.id()}');\n`
    // }

    // // TODO: scale all coordinates
    // javascript += `setSegments(data, ${JSON.stringify(layout.movementSegments.map(scale.scaleSegment))});\n`
    // javascript += `setPasses(data, ${JSON.stringify(layout.passAnimations.map(scale.scalePass))});\n`
    // javascript += `setSegmentMovements(data, ${JSON.stringify(layout.segmentMovementAnimations)});\n`
    // javascript += `setDirectMovements(data, ${JSON.stringify(layout.directMovementAnimations.map(scale.scaleDirectMovement))});\n`
    // javascript += `setRelabeling(data, ${JSON.stringify(layout.relabeling)});\n`
    // javascript += `startAnimation(data, ${patternLength});\n`


    // canvas.rect(width, height).fill('none').stroke("none")

    // return `(function(){ ${javascript} })();`
}

function createRoleColorMappings(config: RenderLayoutConfig, layout: AnimationPlan) {
    const roleColors: [Role, string][] = [];
    if (config.animateRoleColors && config.roleColors) {
        for (let roleIdx = 0; roleIdx < layout.initialPositions.length; roleIdx++)
            if (config.roleColors && config.roleColors[roleIdx])
                roleColors.push([layout.initialPositions[roleIdx].initialRole, config.roleColors[roleIdx]]);
    }
    return roleColors;
}

// function getXOffset(size: PatternRenderSize, time: number): number {
//     return size.throwsAreaX + size.throwCircleSize / 2 + time * size.xDist
// }



function renderJuggler(canvas: G, pos: [number, number], passerIdx: number, role: Role, config: RenderLayoutConfig): G {
    const [x, y] = pos
    const g = canvas.group()
    const c = canvas.circle(config.positionCircle - strokeWidth).stroke({ color: "black", width: strokeWidth })
    if (config.animateRoleColors && config.roleColors && config.roleColors[passerIdx])
        c.fill(config.roleColors[passerIdx]);
    else
        c.fill("white")
    c.center(x, y)
    const l = canvas.text(role).
        font({ size: config.roleLabelFontSize, 'text-anchor': "middle", fill: 'black', 'dominant-baseline': "middle", 'font-weight': "bold" }).
        center(x, y)
    g.add(c).add(l)
    //no idea why this is needed; it sets x for the tspan attribute (not y) and then doesn't move sideways
    l.children()[0].attr({ x: null })
    return g
}


function renderMovePath(canvas: G, path: MovementSegmentSpec): Path {
    // gray arrow for the moving path in the background
    const color = 'lightgrey';
    const marker = canvas.marker(5, 5, (add) => add.path('M0,0 L5,2.5 L0,5').fill(color))
    return genPath(canvas, path).stroke({ color, width: 4 }).marker('end', marker).fill('none')
}


function genPath(canvas: Containable, segment: MovementSegmentSpec): Path {
    // console.log(segment)
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return canvas.path(p.join(' '))
}


function renderPass(canvas: G, pass: PassAnimation): G {
    // console.log(`renderPass from ${fromRole} to ${toRole} with label ${label}`)
    const g = canvas.group()
    const a = arrow(canvas, pass.fromX, pass.fromY, pass.toX, pass.toY, "black")
    g.add(a)
    if (pass.label)
        g.add(canvas.text(pass.label).font({ size: 8 }).cx(pass.labelX).cy(pass.labelY).fill("black"))
    return g
}


function arrow(canvas: G, x1: number, y1: number, x2: number, y2: number, color: string = 'blue'): Line {
    const line = canvas.line(x1, y1, x2, y2).stroke({ color })
    const marker = canvas.marker(5, 5, (add) => add.path('M0,0 L5,2.5 L0,5').fill(color))
    line.marker('end', marker)
    return line
}
