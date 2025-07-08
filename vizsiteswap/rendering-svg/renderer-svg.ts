import type { BackgroundLayout, GroupPattern } from "@modernpassing/layout";
import { type AnimationPlan, createAnimationPlan } from "@modernpassing/layout";
import { Hand, Role, type Pattern } from "@modernpassing/pattern";
import { customRendererConfigDefaults, getThrowsFromManipulatorPattern, getThrowsFromPattern, type RenderedThrow, RendererConfig } from "@modernpassing/rendering-core";
import { scaleup } from "@modernpassing/svg-utils";
import { type Containable, type Container, type G, type Line, registerWindow, SVG, type Svg } from '@svgdotjs/svg.js';
import { createSVGWindow } from 'svgdom';



export function renderGroupPattern(gp: GroupPattern, config: Partial<RendererConfig>): [Svg, string] {

    let javascript = ""
    const changedRenderDefaults: Partial<RendererConfig> = { iterations: 1, showPasserRoles: true }
    const renderConfig: RendererConfig = { ...customRendererConfigDefaults(gp.pattern), ...changedRenderDefaults, ...config }

    // there are three parts that we may render: the pattern, the aiden notation, and the layout
    // not every pattern has aiden notation, and not every group pattern has a layout
    // in addition, the configuration could specify only to render a subset of these
    const size = getRenderPatternSize(gp.pattern, renderConfig)
    const withPattern: boolean = renderConfig.components.includes("pattern")
    const withAiden: boolean = renderConfig.components.includes("aiden") && gp.aidenNotation !== undefined && (gp.aidenNotation[1].length > 0)
    const withTabs: boolean = withPattern && withAiden
    const withTurntable: boolean = renderConfig.showTurntable && gp.pattern.mapRows.some((v, i) => v !== i)
    const turntableHeight = withTurntable ? TURNTABLE_HEIGHT : 0
    const tabHeight = withTabs ? TAB_HEIGHT + TAB_BORDER_WIDTH : 0
    const withLayout: boolean = renderConfig.components.includes("layout") && gp.layout !== undefined
    const layoutSize = withLayout ? renderConfig.layoutSize || size.height : 0

    const width = size.width + layoutSize
    const height = Math.max(size.height + tabHeight + turntableHeight, layoutSize)
    const svg = createSVG(width, height).viewbox(0, 0, width, height)
    let patternCanvas: G | undefined = undefined, aidenCanvas: G | undefined = undefined, layoutCanvas: G | undefined = undefined
    if (withTabs) {
        let tabJs
        [patternCanvas, aidenCanvas, tabJs] = createTabs(svg, size.width, size.height, renderConfig.components.indexOf("aiden") < renderConfig.components.indexOf("pattern"))
        javascript += tabJs
    }
    if (withPattern) {
        if (!patternCanvas) patternCanvas = svg.group().addClass("pattern-canvas")
        javascript += renderPattern(patternCanvas, gp.pattern, getThrowsFromPattern(gp.pattern, renderConfig.iterations, renderConfig),
            { ...renderConfig, showRoleColorBackground: true })
        if (tabHeight > 0)
            patternCanvas.transform({ translate: [0, tabHeight] })
    }
    if (withAiden) {
        if (!aidenCanvas) aidenCanvas = svg.group().addClass("aiden-canvas")
        javascript += renderPattern(aidenCanvas, gp.pattern, getThrowsFromManipulatorPattern(gp.aidenNotation![0], gp.aidenNotation![1], gp.pattern.getInitialRoles(), renderConfig.iterations, renderConfig),
            { ...renderConfig, showRoleColorBackground: false })
        if (tabHeight > 0)
            aidenCanvas.transform({ translate: [0, tabHeight] })
    }
    if (withLayout) {
        layoutCanvas = svg.group().addClass("layout-canvas")
        if (gp.layout!.background)
            renderBackground(gp.layout!.background, size.height, size.height, layoutCanvas, defaultRenderLayoutConfig)
        const beatIndicator = renderConfig.layoutSize ? undefined : svg.line(0, 0, 0, size.height + tabHeight).stroke({ color: "lightgrey", width: 4 }).back().hide() // TODO: make this configurable
        const beatXOffsets: number[] = [...Array(gp.pattern.getLength() + 1).keys()].map((i) => getXOffset(size, i))
        const animationPlan = createAnimationPlan(gp.layout!.animation)
        javascript += renderAnimation(animationPlan, size.height, size.height, layoutCanvas, { ...defaultRenderLayoutConfig, ...renderConfig }, gp.pattern.getLength(), beatIndicator, beatXOffsets, gp.pattern.nrHands / 2)
        layoutCanvas.transform({ translate: [size.width, tabHeight] })
    }
    if (withTurntable) {
        const turntableCanvas = svg.group().addClass("turntable")
        renderTurntable(turntableCanvas, gp.pattern, renderConfig)
        turntableCanvas.transform({ translate: [0, size.height + tabHeight] })
    }

    return [svg, javascript]

}






//TODO: with animations at odd period patterns, L and R annotations should change at runtime
//TODO: compute starting hands for walking patterns

/**
 * Calculate role ranges for background rendering
 * @param p Pattern with roles defined
 * @returns Array of [fromBeat, toBeat, passerIdx, Role] tuples
 */
function calculateRoleRanges(p: Pattern): [number, number, number, string][] {
    const roleRanges: [number, number, number, string][] = []

    for (let beat = 0; beat < p.getLength(); beat++) {
        // Find the active role change for this beat
        const activeRoleChange = p.roles.findLast(([roleBeat]) => roleBeat <= beat)
        if (!activeRoleChange) continue

        const [fromBeat, roles] = activeRoleChange

        // Find the next role change beat
        const nextRoleChange = p.roles.find(([roleBeat]) => roleBeat > beat)
        const toBeat = nextRoleChange ? nextRoleChange[0] : p.getLength()

        // Only add range for the start of each role period
        if (beat === fromBeat) {
            for (let passerIdx = 0; passerIdx < p.nrRows; passerIdx++) {
                roleRanges.push([fromBeat, toBeat, passerIdx, roles[passerIdx]])
            }
        }
    }

    return roleRanges
}

export function renderPattern(canvas: G, p: Pattern, renderedThrows: RenderedThrow[], config: RendererConfig): string {
    if (!p.isValid())
        throw new Error(`Invalid pattern: ${p.getValidationError()}\n${p.prettyPrintThrows()}`);




    const hasAnnotation = config.showStraightCross || config.showLeftRight;
    const annotationMargin = hasAnnotation ? config.annotationTextSize : 0;

    const maxTime = p.getPrefixLength() + p.getLength() * config.iterations;


    // while (lineBendOrientation.length <= p.nrRows)
    //     lineBendOrientation.push(-1)


    // x offset of any point in the pattern (negative numbers for prefix)
    function xo(time: number): number {
        return getXOffset(size, time)
    }

    // y offset of a throw
    function yo(passerIdx: number, handIdx: 0 | 1 | null): number {
        // TODO: support rendering synchronous throws with both hands
        const r = config.yMargin + (hasAnnotation ? annotationMargin : 0) + config.throwCircleSize / 2 +
            passerIdx * config.yDist +
            (config.separateleftRightRows && handIdx == 1 ? config.yHandDist : 0) + (config.separateleftRightRows ? passerIdx * config.yHandDist : 0);
        if (isNaN(r)) throw new Error(`yo(${passerIdx}, ${handIdx}) is NaN`)
        return r
    }

    const anyRelabel = p.mapRows.some((v, i) => v !== i)
    const relabelWidth = config.passerRolesOffset
    const size = getRenderPatternSize(p, config)

    // debugDrawPatternRenderSize(canvas, size)

    const ladderOffset = config.lineKind === "ladder" ? 4 : 0
    function causalLine(canvas: G, t: RenderedThrow) {
        //no lines for 0s
        if (t.throwLength === 0 || t.rethrowTime < 0 || t.toPasserIdx < 0) return

        const startTime = t.throwTime
        const endTime = config.lineKind === "ladder" ? t.rethrowTime : t.causeTime
        const bendAdjustment = config.lineKind === "ladder" ? .6 : 1

        let color = config.lineColor
        let width = config.lineWidth
        let dash = config.lineDash
        // if (startTime < 0 || endTime < 0)
        //     color = earlyCausalLineColor
        // if (startTime > maxTime)
        //     color = extraCausalLineColor
        if (config.emphasizeLines.includes(startTime)) {
            color = config.emphasizeLineColor
            width = config.emphasizeLineWith
            dash = config.emphasizeLineDash
        }


        if (yo(t.fromPasserIdx, t.fromHand) !== yo(t.toPasserIdx, t.toHand)) {
            // diagonal lines are straight
            canvas.line(xo(startTime), yo(t.fromPasserIdx, t.fromHand), xo(endTime), yo(t.toPasserIdx, t.toHand)).
                stroke({ color: color, width: width, dasharray: dash })
        } else {
            // self throws are curved
            const dir = config.lineBendOrientation[t.fromPasserIdx];
            const xDiff = xo(endTime) - xo(startTime)
            //backward arrows are straight, the rest follows some heuristic
            const bendOffset = xDiff <= 0 ? 0 : config.yDist / 5.5 * xDiff / config.xDist * bendAdjustment

            canvas.path(`M ${xo(startTime)} ${yo(t.fromPasserIdx, t.fromHand)} C ${xo(startTime) + bendOffset} ${yo(t.fromPasserIdx, t.fromHand) + dir * bendOffset}, ${xo(endTime) - bendOffset} ${yo(t.toPasserIdx, t.toHand) + dir * bendOffset}, ${xo(endTime)} ${yo(t.toPasserIdx, t.toHand)}`).
                stroke({ color: color, width: width, dasharray: dash }).fill("transparent")
        }
    }

    if (config.showRoleColorBackground && config.roleColors) {
        const roleRanges = calculateRoleRanges(p)
        const relabelingColorX = size.relabelingX + size.relabelingWidth / 4
        const height = config.separateleftRightRows ? config.yDist + config.yHandDist : config.yDist

        // Draw background rectangles for each role range
        for (const [fromBeat, toBeat, passerIdx, role] of roleRanges) {
            const x = fromBeat === 0 ? size.roleLabelX : xo(fromBeat)
            const y = yo(passerIdx, Hand.Right) - config.throwCircleSize / 2
            const toX = toBeat === p.getLength() ? relabelingColorX : xo(toBeat)
            const width = toX - x

            // Get color for this role, cycling through available colors
            const roleIndex = p.getInitialRoles().indexOf(role)
            const color = config.roleColors![roleIndex % config.roleColors!.length]

            canvas.rect(width, height)
                .move(x, y)
                .fill(color)
                .back() // Send to back so throws appear on top
        }
        // colors for end-of-iteration relabeling
        for (let rowIdx = 0; rowIdx < p.nrRows; rowIdx++) {
            const color = config.roleColors![p.mapRows[rowIdx]]
            const x = relabelingColorX
            const toX = size.width- config.xMargin
            const y = yo(rowIdx, Hand.Right) - config.throwCircleSize / 2
            const width = toX - x
            canvas.rect(width, height)
                .move(x, y)
                .fill(color)
                .back() // Send to back so throws appear on top
        }
    }

    if (config.showLines || config.emphasizeLines.length > 0) {
        const maxIdx = maxTime
        for (let idx = 0; idx < renderedThrows.length; idx++)
            if (config.showLines && (config.selectLinesForThrows === undefined || config.selectLinesForThrows.includes(idx)) || config.emphasizeLines.includes(idx))
                causalLine(canvas, renderedThrows[idx])
    }

    for (let throwIdx = 0; throwIdx < renderedThrows.length; throwIdx++) {
        const t = renderedThrows[throwIdx]
        const circleColor = config.emphasizeThrows.includes(throwIdx) ? config.emphasizeCircleColor : config.throwCircleColor
        // (t.throwTime >= maxTime ? throwExtraCircleColor : throwCircleColor)
        const circleTextColor = config.emphasizeThrows.includes(throwIdx) ? config.emphasizeTextColor : config.throwTextColor
        // t.throwTime >= maxTime ? throwExtraTextColor : throwTextColor

        canvas.circle(config.throwCircleSize).
            center(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand)).
            fill(circleColor)
        canvas.text("").plain(t.label).
            amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand)).
            font({ size: config.throwTextSize, 'text-anchor': "middle", fill: circleTextColor, 'dominant-baseline': "central", 'font-weight': "bold" })

        if (config.showLeftRight || (config.showStraightCross && t.annotation !== "")) {
            const text = []
            if (config.showLeftRight)
                text.push(t.fromHand ? "L" : "R")

            if ((config.showStraightCross && t.annotation !== "")) {
                text.push(t.annotation)
            }

            // TODO make this configurable where the labels are printed
            const offset = t.fromPasserIdx === 0 ? -config.throwCircleSize / 2 : config.throwCircleSize / 2;
            const baseline = t.fromPasserIdx === 0 ? "text-after-edge" : "text-before-edge"

            canvas.text("").tspan(text.join(" ")).
                amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand) + offset).
                addClass("throw-label").
                font({ size: config.annotationTextSize, 'text-anchor': "middle", fill: config.annotationTextColor, 'dominant-baseline': baseline })

        }

    }

    if (config.showPasserRoles) {
        // console.log(p.relabel)
        for (let passerIdx = 0; passerIdx < p.nrRows; passerIdx++) {
            canvas.text("").plain(p.getRole(0, passerIdx) + ":").
                addClass("passer-roles").
                font({ size: config.passerRolesTextSize, 'text-anchor': "end", fill: config.annotationTextColor, 'dominant-baseline': "central" }).
                amove(0, yo(passerIdx, null)).cx(config.xMargin + config.passerRolesOffset / 2)
            if (anyRelabel) {
                const newLabel = p.getInitialRoles()[p.mapRows[passerIdx]]
                if (newLabel) {
                    canvas.text("").plain("→ " + p.getRole(p.getLength(), passerIdx)).
                        addClass("passer-roles-relabel").
                        font({ size: config.passerRolesTextSize, 'text-anchor': "end", fill: config.annotationTextColor, 'dominant-baseline': "central" }).
                        amove(0, yo(passerIdx, null)).cx(size.relabelingX + size.relabelingWidth / 2)
                }
            }
        }

    }

    if (config.showStartingHands) {
        const hands = p.getStartingHands()
        if (!config.separateleftRightRows) {
            for (let passerIdx = 0; passerIdx < p.nrRows; passerIdx++) {
                const startingHands = hands[passerIdx]
                canvas.text("").plain(startingHands.join("|")).
                    amove(config.xMargin + config.startingHandsOffset / 2 + (config.showPasserRoles ? config.passerRolesOffset : 0), yo(passerIdx, null)).
                    addClass("starting-hands").
                    font({ size: config.startingHandsTextSize, 'text-anchor': "middle", fill: config.annotationTextColor, 'dominant-baseline': "central" })
            }
        } else {
            for (let passerIdx = 0; passerIdx < p.nrRows; passerIdx++)
                for (const handIdx of [0, 1]) {
                    const startingHand = hands[passerIdx][handIdx]
                    canvas.text("").plain((handIdx === 0 ? "R: " : "L: ") + startingHand).
                        amove(config.xMargin + config.startingHandsOffset / 2 + (config.showPasserRoles ? config.passerRolesOffset : 0), yo(passerIdx, handIdx as 0 | 1)).
                        addClass("starting-hands").
                        font({ size: config.startingHandsTextSize, 'text-anchor': "middle", fill: config.annotationTextColor, 'dominant-baseline': "central" })
                }
        }
    }
    return "" //no javascript
}


export function renderPattern_(p: Pattern, config?: Partial<RendererConfig>): Svg {

    const changedRenderDefaults: Partial<RendererConfig> = { iterations: 1, showPasserRoles: true }
    const renderConfig: RendererConfig = { ...customRendererConfigDefaults(p), ...changedRenderDefaults, ...config }

    // there are three parts that we may render: the pattern, the aiden notation, and the layout
    // not every pattern has aiden notation, and not every group pattern has a layout
    // in addition, the configuration could specify only to render a subset of these
    const size = getRenderPatternSize(p, renderConfig)
    const svg = createSVG(size.width, size.height).viewbox(0, 0, size.width, size.height)
    const patternCanvas = svg.group()
    renderPattern(patternCanvas, p, getThrowsFromPattern(p, renderConfig.iterations, renderConfig), renderConfig)


    return svg

}


export function createSVG(width?: number, height?: number): Svg {
    const window = createSVGWindow();
    const document = window.document;
    registerWindow(window, document);

    const svg: any = SVG(document.documentElement);
    if (width && height)
        svg.size(width, height)
    return svg;
}




type RenderLayoutConfig = {
    positionCircle: number
    roleLabelFontSize: number
    roleColors?: string[]
}
export const defaultRenderLayoutConfig: RenderLayoutConfig = { positionCircle: 40, roleLabelFontSize: 28, roleColors: undefined }


// function renderLayout(layout: GroupPatternStaticLayout, width: number, height: number, canvas: G, config: RenderLayoutConfig) {
//     // console.log(layout)
//     const s = Math.min(width, height) - config.positionCircle
//     let left = config.positionCircle / 2
//     let top = config.positionCircle / 2
//     const strokeWidth = 3

//     //shift the layout to the center
//     const topMost = layout.positions.reduce((acc, pos) => Math.min(acc, pos.y * s), 0)
//     const bottomMost = layout.positions.reduce((acc, pos) => Math.max(acc, pos.y * s), 0)
//     top = top + (s - (bottomMost - topMost)) / 2
//     // const leftMost = layout.positions.reduce((acc, pos) => Math.min(acc, pos.x * s), 0)
//     // const rightMost = layout.positions.reduce((acc, pos) => Math.max(acc, pos.x * s), 0)
//     // left = left + (s - (rightMost - leftMost)) / 2
//     function scalep(p: [number, number]): [number, number] {
//         return [Math.round(left + p[0] * s), Math.round(top + p[1] * s)]
//     }

//     canvas.circle(s).center(left + s / 2, top + s / 2).fill("none").stroke("lightgrey")
//     // canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
//     for (let roleIdx = 0; roleIdx < layout.positions.length; roleIdx++) {
//         const pos = layout.positions[roleIdx]
//         const [x, y] = [Math.round(left + pos.x * s), Math.round(top + pos.y * s)]
//         canvas.circle(config.positionCircle - strokeWidth).center(x, y).fill("white").stroke({ color: config.colors[roleIdx], width: strokeWidth })
//         canvas.text(pos.role).font({ size: config.roleLabelFontSize }).cx(x).cy(y).fill("black")
//     }
//     function lookupPosition(role: Role): [number, number] {
//         const r = layout.positions.find(p => p.role === role)!
//         return [r.x, r.y]
//     }
//     for (const pass of layout.passes) {
//         const [fromX, fromY, toX, toY, labelX, labelY] = computePassp(scalep(lookupPosition(pass.fromRole)), pass.fromHand, scalep(lookupPosition(pass.toRole)), pass.toHand)
//         arrow(canvas, fromX, fromY, toX, toY, "black")
//         // canvas.circle(4).center(labelX, labelY).fill("red")
//         canvas.text(pass.label).font({ size: 8 }).cx(labelX).cy(labelY).fill("black")
//     }


//     canvas.rect(width, height).fill('none').stroke("none")
// }

function arrow(svg: Containable, x1: number, y1: number, x2: number, y2: number, color: string = 'blue'): Line {
    const line = svg.line(x1, y1, x2, y2).stroke({ color })
    line.marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill(color))
    return line
}


// deno-lint-ignore no-explicit-any
// export function renderLayoutFrames(frames: FrameLayout[], frameWidth: number, frameHeight: number, _config: any = {}): Svg[] {
//     return frames.map((frame) => {
//         const svg = createSVG(frameWidth, frameHeight)
//         renderLayout(frame.static, frameWidth, frameHeight, svg.group(), defaultRenderLayoutConfig)
//         svg.rect(20, 20).fill("black").move(0, 0)
//         svg.text(frame.label).font({ size: 16 }).cx(10).cy(10).fill("white")
//         return svg
//     }
//     )
// }

// export function renderStaticLayout(frame: GroupPatternStaticLayout, frameWidth: number, frameHeight: number, _config: any = {}): Svg {
//     const svg = createSVG(frameWidth, frameHeight)
//     renderLayout(frame, frameWidth, frameHeight, svg.group(), defaultRenderLayoutConfig)
//     return svg
// }


function computePassp(p1: [number, number], hand1: Hand, p2: [number, number], hand2: Hand, armLength: number = 25, labelDistance: number = 4): [number, number, number, number, number, number] {
    return computePass(p1[0], p1[1], hand1, p2[0], p2[1], hand2, armLength, labelDistance)
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
        hand1 === Hand.Right && hand2 === Hand.Left ? 90 : // right hand pass to the right
            hand1 === Hand.Left && hand2 === Hand.Right ? 90 : // left hand pass to the left
                hand1 === Hand.Right && hand2 === Hand.Right ? -90 :
                    90 // crossing pass toward the target
    // console.log(`${hand1} ${hand2} ${labelAngle}`)


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

let idCounter = 0
function genId(): string {
    return `id${idCounter++}`
}

export function renderBackground(layouts: BackgroundLayout[], width: number, height: number, canvas: Container, config: RenderLayoutConfig) {
    const w = width - config.positionCircle
    const h = height - config.positionCircle
    const left = config.positionCircle / 2
    const top = config.positionCircle / 2
    // console.log(`rendering background ${width} ${height} ${w} ${left} ${top}`)
    const scale = scaleup(left, top, w)

    for (const layout of layouts) {
        if (layout.type === "circle") {
            canvas.ellipse(layout.r * 2 * w, layout.r * 2 * h).center(scale.scalex(layout.x), scale.scaley(layout.y)).fill(layout.fill).stroke({ color: layout.stroke, width: layout.strokeWidth })
        } else if (layout.type === "line") {
            canvas.line(scale.scalex(layout.x1), scale.scaley(layout.y1), scale.scalex(layout.x2), scale.scaley(layout.y2)).stroke({ color: layout.stroke, width: layout.strokeWidth })
        } else if (layout.type === "path") {
            canvas.path(scale.scalePath(layout.segments).join(" ")).fill('none').stroke({ color: layout.stroke, width: layout.strokeWidth })
        } else
            throw new Error(`unknown background layout type ${layout}`)
    }
}


export function renderAnimation(
    layout: AnimationPlan,
    width: number, height: number, canvas: Container,
    config: RenderLayoutConfig,
    patternLength: number,
    beatIndicator: Line | null = null, beatXOffsets: number[] | null = null,
    speed: number = 1
): string {


    const counter = canvas.text('_').cx(10).cy(10).fill("black")

    const roleColors: [Role, string][] = []
    for (let roleIdx = 0; roleIdx < layout.initialPositions.length; roleIdx++) 
        if (config.roleColors && config.roleColors[roleIdx])
            roleColors.push([layout.initialPositions[roleIdx].initialRole, config.roleColors[roleIdx]])
    let javascript = `const data = initialize('#${canvas.id()}', ${layout.mod}, ${speed}, ${JSON.stringify(roleColors)}, '#${beatIndicator?.id()}', ${beatXOffsets ? JSON.stringify(beatXOffsets) : undefined}, '#${counter.id()}');\n`
    // console.log(layout)
    const s = Math.min(width, height) - config.positionCircle
    let left = config.positionCircle / 2
    let top = config.positionCircle / 2
    const strokeWidth = 3
    const scale = scaleup(left, top, s)

    // //shift the layout to the center
    // const topMost = layout.initialPositions.reduce((acc, pos) => Math.min(acc, pos.y * s), 0)
    // const bottomMost = layout.initialPositions.reduce((acc, pos) => Math.max(acc, pos.y * s), 0)
    // top = top + (s - (bottomMost - topMost)) / 2
    // console.log(`rendering background ${width} ${height} ${s} ${left} ${top}`)



    // canvas.circle(s).center(left + s / 2, top + s / 2).fill("none").stroke("lightgrey")
    // canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
    // const positions: Map<number/*passerIdx*/, [number, number, Element, Text]> = new Map()
    for (let roleIdx = 0; roleIdx < layout.initialPositions.length; roleIdx++) {
        const pos = layout.initialPositions[roleIdx]
        const [x, y] = scale.scale(pos.x, pos.y)
        // const c = canvas.circle(config.positionCircle - strokeWidth).center(x, y).fill("white").stroke({ color: config.colors[roleIdx], width: strokeWidth })        
        // const l = canvas.text(pos.label).font({ size: config.roleLabelFontSize }).cx(x).cy(y).fill("black")
        const g = canvas.group()
        const c = canvas.circle(config.positionCircle - strokeWidth).stroke({ color: "black", width: strokeWidth })
        if (config.roleColors && config.roleColors[roleIdx])
            c.fill(config.roleColors[roleIdx]);
        else
            c.fill("white")
        c.center(x, y)
        const l = canvas.text(pos.initialRole).
            font({ size: config.roleLabelFontSize, 'text-anchor': "middle", fill: 'black', 'dominant-baseline': "middle", 'font-weight': "bold" }).
            center(x, y)
        g.add(c).add(l)
        //no idea why this is needed; it sets x for the tspan attribute (not y) and then doesn't move sideways
        l.children()[0].attr({ x: null })

        // positions.set(pos.passerIdx, [pos.x, pos.y, g, l])

        // addPosition(data: Data, role: Role, x: number, y: number, svgCircleId: string, svgLabelId: string, segmentSequence: number[])
        javascript += `addPosition(data, ${pos.passerId}, '${pos.initialRole}', ${x}, ${y}, '#${g.id()}', '#${l.id()}');\n`
    }

    // TODO: scale all coordinates
    javascript += `setSegments(data, ${JSON.stringify(layout.movementSegments.map(scale.scaleSegment))});\n`
    javascript += `setPasses(data, ${JSON.stringify(layout.passAnimations.map(scale.scalePass))});\n`
    javascript += `setSegmentMovements(data, ${JSON.stringify(layout.segmentMovementAnimations)});\n`
    javascript += `setDirectMovements(data, ${JSON.stringify(layout.directMovementAnimations.map(scale.scaleDirectMovement))});\n`
    javascript += `setRelabeling(data, ${JSON.stringify(layout.relabeling)});\n`
    javascript += `startAnimation(data, ${patternLength});\n`


    canvas.rect(width, height).fill('none').stroke("none")

    return `(function(){ ${javascript} })();`
}

function getXOffset(size: PatternRenderSize, time: number): number {
    return size.throwsAreaX + size.throwCircleSize / 2 + time * size.xDist
}



const TAB_WIDTH = 60
const TAB_HEIGHT = 20
const TAB_BORDER_WIDTH = 2
const TURNTABLE_HEIGHT = 20

function createTabs(svg: Svg, width: any, height: any, aidenFirst: boolean): [G, G, string] {
    // <g id="fig1">
    //     <rect width="600" height="400" x="0" y="0" fill="#fdfdfd" />
    //     <text x="300" y="212" text-anchor="middle" dominant-baseline="central" fill="#888">Aidan content</text>
    // </g>
    // <g id="fig2" style="display: none">
    //     <rect width="600" height="400" x="0" y="0" fill="#fdfdfd" />
    //     <text x="300" y="212" text-anchor="middle" dominant-baseline="central" fill="#888">Local content</text>
    // </g>
    // <g id="tab1" class="tab tab-active">
    //     <rect x="1" y="1" width="60" height="20" />
    //     <text x="30" y="12" text-anchor="middle" dominant-baseline="central">Aidan</text>
    //     <line x1="0" y1="22" x2="62" y2="22" stroke-width="3" />
    // </g>
    // <g id="tab2" class="tab">
    //     <rect x="62" y="1" width="60" height="20" />
    //     <text x="90" y="12" text-anchor="middle" dominant-baseline="central">Local</text>
    //     <line x1="61" y1="22" x2="123" y2="22" stroke-width="3" />
    // </g>
    const patternCanvas = svg.group()
    const aidenCanvas = svg.group()
    if (aidenFirst) patternCanvas.hide(); else aidenCanvas.hide();

    const tab1 = svg.group().addClass("tab tab-active")
    tab1.rect(TAB_WIDTH, TAB_HEIGHT).move(TAB_BORDER_WIDTH / 2, TAB_BORDER_WIDTH / 2)
    tab1.text(aidenFirst ? "Aidan" : "Local")
        .amove(TAB_WIDTH / 2 + TAB_BORDER_WIDTH / 2, TAB_HEIGHT / 2 + TAB_BORDER_WIDTH)
        .font({ size: 8, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    tab1.line(0, TAB_HEIGHT + TAB_BORDER_WIDTH, TAB_WIDTH + TAB_BORDER_WIDTH, TAB_HEIGHT + TAB_BORDER_WIDTH);

    const tab2 = svg.group().addClass("tab");
    tab2.rect(TAB_WIDTH, TAB_HEIGHT).move(TAB_WIDTH + TAB_BORDER_WIDTH, TAB_BORDER_WIDTH / 2);
    tab2.text(aidenFirst ? "Local" : "Aidan")
        .amove(TAB_WIDTH * 1.5 + TAB_BORDER_WIDTH * 1.5, TAB_HEIGHT / 2 + TAB_BORDER_WIDTH)
        .font({ size: 8, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    tab2.line(TAB_WIDTH + TAB_BORDER_WIDTH, TAB_HEIGHT + TAB_BORDER_WIDTH / 2, TAB_WIDTH * 2 + TAB_BORDER_WIDTH * 1.5, TAB_HEIGHT + TAB_BORDER_WIDTH)

    const js = `
        const tabs = [SVG('#${tab1.id()}'), SVG('#${tab2.id()}')];
        const panels = [SVG('#${aidenFirst ? aidenCanvas.id() : patternCanvas.id()}'), SVG('#${aidenFirst ? patternCanvas.id() : aidenCanvas.id()}')];
        tabs.forEach((tab, i) => {
            tab.on('click', () => {
                tabs.forEach(t => t.removeClass('tab-active'));
                tab.addClass('tab-active');
                panels.forEach((p, j) => j === i ? p.show() : p.hide());
            });
        });`


    return [patternCanvas, aidenCanvas, js]
}


type PatternRenderSize = {
    startingHandsX: number
    startingHandsWidth: number
    roleLabelWidth: number
    roleLabelX: number
    throwsAreaX: number
    throwsAreaWidth: number
    relabelingX: number
    relabelingWidth: number
    width: number
    height: number
    xMargin: number
    xDist: number
    throwCircleSize: number
    throwCircleSeparation: number
}
function getRenderPatternSize(p: Pattern, config: RendererConfig): PatternRenderSize {
    const xMargin = config.xMargin

    const roleLabelX = xMargin
    const roleLabelWidth = config.showPasserRoles ? config.passerRolesOffset : 0

    const startingHandsX = roleLabelX + roleLabelWidth
    const startingHandsWidth = config.showStartingHands ? config.startingHandsOffset : 0


    const throwCircleSize = config.throwCircleSize
    const throwCircleSeparation = config.xDist - throwCircleSize
    const nrThrows = p.getPrefixLength() + p.getLength() * config.iterations
    const throwsAreaX = startingHandsX + startingHandsWidth
    const throwsAreaWidth = throwCircleSize * nrThrows + throwCircleSeparation * (nrThrows - 1)

    const anyRelabel = p.mapRows.some((v, i) => v !== i)
    const relabelingX = throwsAreaX + throwsAreaWidth
    const relabelingWidth = anyRelabel ? config.passerRolesOffset * 2 : 0

    const width = relabelingX + relabelingWidth + xMargin


    const hasAnnotation = config.showStraightCross || config.showLeftRight;
    const annotationMargin = hasAnnotation ? config.annotationTextSize : 0;

    // const width = config.xMargin * 2 + config.throwCircleSize / 2 +
    //     (config.showStartingHands ? config.startingHandsOffset : 0) + (config.showPasserRoles ? config.passerRolesOffset : 0) +
    //     (p.getPrefixLength() + p.getLength() * config.iterations) * config.xDist +
    //     (anyRelabel && config.showPasserRoles ? relabelWidth : 0)
    const height = config.yMargin * 2 + (hasAnnotation ? annotationMargin : 0) * 2 + config.throwCircleSize + config.yDist * (p.nrRows - 1)
        + (config.separateleftRightRows ? config.yHandDist * 2 : 0)

    return {
        width, height,
        xMargin, xDist: config.xDist,
        roleLabelWidth, roleLabelX,
        startingHandsX, startingHandsWidth,
        throwsAreaX, throwsAreaWidth,
        relabelingX, relabelingWidth,
        throwCircleSize, throwCircleSeparation
    }
}

function debugDrawPatternRenderSize(canvas: G, size: PatternRenderSize) {
    canvas.rect(size.width, size.height).stroke("black").fill("transparent")
    // margins
    canvas.rect(size.xMargin, size.height).stroke("red").fill("red")
    canvas.rect(size.xMargin, size.height).x(size.width - size.xMargin).stroke("red").fill("red")

    //label box
    canvas.rect(size.roleLabelWidth, size.height).x(size.roleLabelX).stroke("green").fill("transparent")

    //starting hands
    canvas.rect(size.startingHandsWidth, size.height).x(size.startingHandsX).stroke("orange").fill("transparent")

    //throws
    canvas.rect(size.throwsAreaWidth, size.height).x(size.throwsAreaX).stroke("purple").fill("transparent")
    canvas.rect(size.xDist, size.height).x(size.throwsAreaX).stroke("red").fill("transparent")

    // relabeling
    canvas.rect(size.relabelingWidth, size.height).x(size.relabelingX).stroke("green").fill("transparent")


}

function renderTurntable(canvas: G, pattern: Pattern, config: RendererConfig) {
    const roles = pattern.getInitialRoles()
    const todo = pattern.getInitialRoles().slice()
    let turntable = ""
    while (todo.length > 0) {
        let role = todo[0]
        if (turntable.length > 0)
            turntable += "; " 
        turntable += role
        let rowIdx = roles.indexOf(role)
        while (todo.includes(role)) {
            todo.splice(todo.indexOf(role), 1)
            rowIdx = pattern.mapRows[rowIdx]
            role = roles[rowIdx]
            turntable += " → " + role
        }
    }


    canvas.text("").plain(turntable.trim()).
        font({ size: config.turntableTextSize, 'dominant-baseline': "central" }).y(config.turntableTextSize / 2)
}
