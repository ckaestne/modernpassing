import { G, Line, registerWindow, SVG, Svg } from '@svgdotjs/svg.js';
import { createSVGWindow } from 'svgdom';
import { checkValidPattern, FrameLayout, GroupPattern, GroupPatternLayout, GroupPatternStaticLayout, Hand, PassLayout, Pattern, Throw } from './pattern-structure.ts';
import { defaultRendererConfig, RendererConfig } from './renderer-config.ts';



export function renderPattern(p: Pattern, config?: Partial<RendererConfig>): Svg {
    if (checkValidPattern(p).length !== 0)
        throw new Error(`Invalid pattern: ${p}: ${checkValidPattern(p)}`);



    let {
        xDist,
        yDist,
        xMargin,
        yMargin,
        throwCircleSize,
        throwCircleColor,
        throwTextColor,
        throwTextSize,
        iterations,
        showStartingHands,
        startingHandsOffset,
        startingHandsTextSize,
        showLeftRight,
        showStraightCross,
        annotationTextColor,
        annotationTextSize,
        showLines,
        lineKind,
        selectLinesForThrows,
        lineColor,
        lineWidth,
        lineDash,
        lineBendOrientation,
        emphasizeThrows,
        emphasizeCircleColor,
        emphasizeTextColor,
        emphasizeLines,
        emphasizeLineColor,
        emphasizeLineWith,
        emphasizeLineDash,
        separateleftRightRows,
        yHandDist,
        showPasserRoles,
        passerRolesOffset,
        passerRolesTextSize,
    } = { ...defaultRendererConfig, ...config };



    const hasAnnotation = showStraightCross || showLeftRight;
    const annotationMargin = hasAnnotation ? annotationTextSize : 0;

    const maxTime = p.prefixPeriod + p.period * iterations;


    if (lineBendOrientation.length <= p.passerNames.length)
        lineBendOrientation = p.passerNames.map(() => -1)


    // x offset of any point in the pattern (negative numbers for prefix)
    function xo(time: number): number {
        return xMargin +
            (showStartingHands ? startingHandsOffset : 0) + (showPasserRoles ? passerRolesOffset : 0) +
            throwCircleSize / 2 + time * xDist;
    }

    // y offset of a throw
    function yo(passerIdx: number, handIdx: 0 | 1 | null): number {
        // TODO: support rendering synchronous throws with both hands
        const r = yMargin + (hasAnnotation ? annotationMargin : 0) + throwCircleSize / 2 +
            passerIdx * yDist +
            (separateleftRightRows && handIdx == 1 ? yHandDist : 0) + (separateleftRightRows ? passerIdx * yHandDist : 0);
        if (isNaN(r)) throw new Error(`yo(${passerIdx}, ${handIdx}) is NaN`)
        return r
    }

    const width = xMargin * 2 + throwCircleSize / 2 +
        (showStartingHands ? startingHandsOffset : 0) + (showPasserRoles ? passerRolesOffset : 0) +
        (p.prefixPeriod + p.period * iterations) * xDist
    const height = yMargin * 2 + (hasAnnotation ? annotationMargin : 0) * 2 + throwCircleSize + yDist * (p.passerNames.length - 1)
        + (separateleftRightRows ? yHandDist * 2 : 0)


    // returns a window with a document and an svg root node
    const svg: Svg = createSVG(width, height);//.viewbox(0, 0, width, height)
    // svg.rect("100%", "100%").fill("white").stroke("black")


    const ladderOffset = lineKind === "ladder" ? 4 : 0
    function causalLine(svg: Svg, t: Throw) {
        //no lines for 0s
        if (t.throwTime === t.rethrowTime) return

        const startTime = t.throwTime
        const endTime = lineKind === "ladder" ? t.rethrowTime : t.causeTime
        const bendAdjustment = lineKind === "ladder" ? .6 : 1

        let color = lineColor
        let width = lineWidth
        let dash = lineDash
        // if (startTime < 0 || endTime < 0)
        //     color = earlyCausalLineColor
        // if (startTime > maxTime)
        //     color = extraCausalLineColor
        if (emphasizeLines.includes(startTime)) {
            color = emphasizeLineColor
            width = emphasizeLineWith
            dash = emphasizeLineDash
        }


        if (yo(t.fromPasserIdx, t.fromHand) !== yo(t.toPasserIdx, t.toHand)) {
            // diagonal lines are straight
            svg.line(xo(startTime), yo(t.fromPasserIdx, t.fromHand), xo(endTime), yo(t.toPasserIdx, t.toHand)).
                stroke({ color: color, width: width, dasharray: dash })
        } else {
            // self throws are curved
            const dir = lineBendOrientation[t.fromPasserIdx];
            const xDiff = xo(endTime) - xo(startTime)
            //backward arrows are straight, the rest follows some heuristic
            const bendOffset = xDiff <= 0 ? 0 : yDist / 5.5 * xDiff / xDist * bendAdjustment

            svg.path(`M ${xo(startTime)} ${yo(t.fromPasserIdx, t.fromHand)} C ${xo(startTime) + bendOffset} ${yo(t.fromPasserIdx, t.fromHand) + dir * bendOffset}, ${xo(endTime) - bendOffset} ${yo(t.toPasserIdx, t.toHand) + dir * bendOffset}, ${xo(endTime)} ${yo(t.toPasserIdx, t.toHand)}`).
                stroke({ color: color, width: width, dasharray: dash }).fill("transparent")
        }
    }

    const allThrows: Throw[] = p.getThrows(iterations)

    if (showLines || emphasizeLines.length > 0) {
        const maxIdx = maxTime
        for (let idx = 0; idx < allThrows.length; idx++)
            if (showLines && (selectLinesForThrows === undefined || selectLinesForThrows.includes(idx)) || emphasizeLines.includes(idx))
                causalLine(svg, allThrows[idx])
    }

    // for (let idx = 0; idx < maxTime + (showExtraThrows ? beyondMax(p.period) : 0); idx++) {
    for (let throwIdx = 0; throwIdx < allThrows.length; throwIdx++) {
        const t = allThrows[throwIdx]
        const circleColor = emphasizeThrows.includes(throwIdx) ? emphasizeCircleColor : throwCircleColor
        // (t.throwTime >= maxTime ? throwExtraCircleColor : throwCircleColor)
        const circleTextColor = emphasizeThrows.includes(throwIdx) ? emphasizeTextColor : throwTextColor
        // t.throwTime >= maxTime ? throwExtraTextColor : throwTextColor

        svg.circle(throwCircleSize).
            center(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand)).
            fill(circleColor)
        svg.text("").plain(t.label).
            amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand)).
            font({ size: throwTextSize, 'text-anchor': "middle", fill: circleTextColor, 'dominant-baseline': "central", 'font-weight': "bold" })

        if (showLeftRight || (showStraightCross && t.annotation !== "")) {
            const text = []
            if (showLeftRight)
                text.push(t.fromHand ? "L" : "R")

            if ((showStraightCross && t.annotation !== "")) {
                text.push(t.annotation)
            }

            // TODO make this configurable where the labels are printed
            const offset = t.fromPasserIdx === 0 ? -throwCircleSize / 2 : throwCircleSize / 2;
            const baseline = t.fromPasserIdx === 0 ? "text-after-edge" : "text-before-edge"

            svg.text("").tspan(text.join(" ")).
                amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand) + offset).
                addClass("throw-label").
                font({ size: annotationTextSize, 'text-anchor': "middle", fill: annotationTextColor, 'dominant-baseline': baseline })

        }

    }

    if (showPasserRoles) {
        for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++) {
            svg.text("").plain(p.passerNames[passerIdx] + ":").
                addClass("passer-roles").
                font({ size: passerRolesTextSize, 'text-anchor': "end", fill: annotationTextColor, 'dominant-baseline': "central" }).
                amove(0, yo(passerIdx, null)).cx(xMargin + passerRolesOffset / 2)
        }
    }

    if (showStartingHands) {
        const hands = p.startingHands
        if (!separateleftRightRows) {
            for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++) {
                const startingHands = hands[passerIdx]
                svg.text("").plain(startingHands.join("|")).
                    amove(xMargin + startingHandsOffset / 2 + (showPasserRoles ? passerRolesOffset : 0), yo(passerIdx, null)).
                    addClass("starting-hands").
                    font({ size: startingHandsTextSize, 'text-anchor': "middle", fill: annotationTextColor, 'dominant-baseline': "central" })
            }
        } else {
            for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++)
                for (const handIdx of [0, 1]) {
                    const startingHand = hands[passerIdx][handIdx]
                    svg.text("").plain((handIdx === 0 ? "R: " : "L: ") + startingHand).
                        amove(xMargin + startingHandsOffset / 2 + (showPasserRoles ? passerRolesOffset : 0), yo(passerIdx, handIdx as 0 | 1)).
                        addClass("starting-hands").
                        font({ size: startingHandsTextSize, 'text-anchor': "middle", fill: annotationTextColor, 'dominant-baseline': "central" })
                }
        }
    }
    return svg
}


function createSVG(width: number, height: number): Svg {
    const window = createSVGWindow();
    const document = window.document;
    registerWindow(window, document);

    const svg: any = SVG(document.documentElement);
    svg.size(width, height)
    return svg;
}

export function renderGroupPattern(gp: GroupPattern, config?: Partial<RendererConfig>): Svg {

    const changedRenderDefaults = { iterations: 1, showPasserRoles: true }
    const svg = renderPattern(gp.pattern, { ...changedRenderDefaults, ...config })
    if (gp.layout) {
        const height: number = Number(svg.height())
        const width: number = Number(svg.width())
        svg.width(width + height)
        const g = svg.group()
        renderLayout(gp.layout.static, height, height, g, { ...defaultRenderLayoutConfig, ...config })
        g.move(width, 0)
    }
    return svg
}


type RenderLayoutConfig = {
    positionCircle: number
    roleLabelFontSize: number
    colors: string[]
}
const defaultRenderLayoutConfig: RenderLayoutConfig = { positionCircle: 40, roleLabelFontSize: 28, colors: ["black", "black", "black", "blue", "black", "black", "black"] }


function renderLayout(layout: GroupPatternStaticLayout, width: number, height: number, canvas: G, config: RenderLayoutConfig) {
    // console.log(layout)
    const s = Math.min(width, height) - config.positionCircle
    let left = config.positionCircle / 2
    let top = config.positionCircle / 2
    const strokeWidth = 3

    //shift the layout to the center
    const topMost = layout.positions.reduce((acc, pos) => Math.min(acc, pos.y * s), 0)
    const bottomMost = layout.positions.reduce((acc, pos) => Math.max(acc, pos.y * s), 0)
    top = top + (s - (bottomMost - topMost)) / 2
    // const leftMost = layout.positions.reduce((acc, pos) => Math.min(acc, pos.x * s), 0)
    // const rightMost = layout.positions.reduce((acc, pos) => Math.max(acc, pos.x * s), 0)
    // left = left + (s - (rightMost - leftMost)) / 2

    canvas.circle(s).center(left + s / 2, top + s / 2).fill("none").stroke("lightgrey")
    // canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
    for (let roleIdx = 0; roleIdx < layout.positions.length; roleIdx++) {
        const pos = layout.positions[roleIdx]
        const [x, y] = [Math.round(left + pos.x * s), Math.round(top + pos.y * s)]
        canvas.circle(config.positionCircle-strokeWidth).center(x,y).fill("white").stroke({ color: config.colors[roleIdx], width: strokeWidth })
        canvas.text(pos.role).font({ size: config.roleLabelFontSize }).cx(x).cy(y).fill("black")
    }
    for (const pass of layout.passes) {
        const [fromX, fromY, toX, toY, labelX, labelY] = computePass(left + pass.fromX * s, top + pass.fromY * s, pass.fromHand, left + pass.toX * s, top + pass.toY * s, pass.toHand)
        arrow(canvas, fromX, fromY, toX, toY, "black")
        // canvas.circle(4).center(labelX, labelY).fill("red")
        canvas.text(pass.label).font({ size: 8 }).cx(labelX).cy(labelY).fill("black")
    }


    canvas.rect(width, height).fill('none').stroke("none")
}

function arrow(svg: G, x1: number, y1: number, x2: number, y2: number, color: string = 'blue'): Line {
    const line = svg.line(x1, y1, x2, y2).stroke({ color })
    line.marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill(color))
    return line
}


// deno-lint-ignore no-explicit-any
export function renderLayoutFrames(frames: FrameLayout[], frameWidth: number, frameHeight: number, _config: any = {}): Svg[] {
    return frames.map((frame) => {
        const svg = createSVG(frameWidth, frameHeight)
        renderLayout(frame.static, frameWidth, frameHeight, svg.group(), defaultRenderLayoutConfig)
        svg.rect(20, 20).fill("black").move(0, 0)
        svg.text(frame.label).font({ size: 16 }).cx(10).cy(10).fill("white")
        return svg
    }
    )
}

export function renderStaticLayout(frame: GroupPatternStaticLayout, frameWidth: number, frameHeight: number, _config: any = {}): Svg {
    const svg = createSVG(frameWidth, frameHeight)
    renderLayout(frame, frameWidth, frameHeight, svg.group(), defaultRenderLayoutConfig)
    return svg
}


function computePass(x1:number, y1:number, hand1: Hand, x2:number, y2:number, hand2: Hand, armLength: number=25, labelDistance:number=4): [number, number, number, number, number, number] {
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
     labelX +=  labelDistance * Math.cos((angle + labelAngle) * Math.PI / 180)
     labelY +=  labelDistance * Math.sin((angle + labelAngle) * Math.PI / 180)
    // }
    //forward adjustment for label
    labelX +=  length/4 * Math.cos(passAngle * Math.PI / 180)
    labelY +=  length/4 * Math.sin(passAngle * Math.PI / 180)


    return [Math.round(x3), Math.round(y3), Math.round(x4), Math.round(y4), Math.round(labelX), Math.round(labelY)]
}
