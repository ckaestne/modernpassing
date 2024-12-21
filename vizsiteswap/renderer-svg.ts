import { createSVGWindow } from 'svgdom'
import { SVG, registerWindow, Svg, G } from '@svgdotjs/svg.js'
import { FourHandedSiteswap } from './siteswap.js'
import { JSDOM } from 'jsdom'; // Import the JSDOM class
import { RendererConfig as RendererConfig, defaultRendererConfig as defaultRendererConfig } from './renderer-config.js';
import { checkValidPattern, GroupPattern, GroupPatternLayout, Pattern, repeatThrows, Throw } from './pattern-structure.js';
import { sep } from 'node:path';
import assert from 'node:assert';



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
    const window = createSVGWindow()
    const document = window.document

    // register window and document
    registerWindow(window, document)
    // @ts-ignore
    const svg: Svg = SVG(document.documentElement)
    svg.size(width, height)//.viewbox(0, 0, width, height)
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


        if (yo(t.fromPasserIdx, t.fromHandIdx) !== yo(t.toPasserIdx, t.toHandIdx)) {
            // diagonal lines are straight
            svg.line(xo(startTime), yo(t.fromPasserIdx, t.fromHandIdx), xo(endTime), yo(t.toPasserIdx, t.toHandIdx)).
                stroke({ color: color, width: width, dasharray: dash })
        } else {
            // self throws are curved
            const dir = lineBendOrientation[t.fromPasserIdx];
            const xDiff = xo(endTime) - xo(startTime)
            //backward arrows are straight, the rest follows some heuristic
            const bendOffset = xDiff <= 0 ? 0 : yDist / 5.5 * xDiff / xDist * bendAdjustment

            svg.path(`M ${xo(startTime)} ${yo(t.fromPasserIdx, t.fromHandIdx)} C ${xo(startTime) + bendOffset} ${yo(t.fromPasserIdx, t.fromHandIdx) + dir * bendOffset}, ${xo(endTime) - bendOffset} ${yo(t.toPasserIdx, t.toHandIdx) + dir * bendOffset}, ${xo(endTime)} ${yo(t.toPasserIdx, t.toHandIdx)}`).
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
            center(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHandIdx)).
            fill(circleColor)
        svg.text("").plain(t.label).
            amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHandIdx)).
            font({ size: throwTextSize, 'text-anchor': "middle", fill: circleTextColor, 'dominant-baseline': "central", 'font-weight': "bold" })

        if (showLeftRight || (showStraightCross && t.annotation !== "")) {
            let text = []
            if (showLeftRight)
                text.push(t.fromHandIdx ? "L" : "R")

            if ((showStraightCross && t.annotation !== "")) {
                text.push(t.annotation)
            }

            // TODO make this configurable where the labels are printed
            const offset = t.fromPasserIdx === 0 ? -throwCircleSize / 2 : throwCircleSize / 2;
            const baseline = t.fromPasserIdx === 0 ? "text-after-edge" : "text-before-edge"

            svg.text("").tspan(text.join(" ")).
                amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHandIdx) + offset).
                addClass("throw-label").
                font({ size: annotationTextSize, 'text-anchor': "middle", fill: annotationTextColor, 'dominant-baseline': baseline })

        }

    }

    if (showPasserRoles) {
        for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++) {
            svg.text("").plain(p.passerNames[passerIdx]+":").
                addClass("passer-roles").
                font({ size: passerRolesTextSize, 'text-anchor': "end", fill: annotationTextColor, 'dominant-baseline': "central" }).
                amove(0,yo(passerIdx, null)).cx(xMargin+passerRolesOffset/2)                
            }
    }

    if (showStartingHands) {
        const hands = p.startingHands
        if (!separateleftRightRows) {
            for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++) {
                let startingHands = hands[passerIdx]
                svg.text("").plain(startingHands.join("|")).
                    amove(xMargin + startingHandsOffset / 2 + (showPasserRoles ? passerRolesOffset : 0), yo(passerIdx, null)).
                    addClass("starting-hands").
                    font({ size: startingHandsTextSize, 'text-anchor': "middle", fill: annotationTextColor, 'dominant-baseline': "central" })
            }
        } else {
            for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++)
                for (let handIdx of [0, 1]) {
                    let startingHand = hands[passerIdx][handIdx]
                    svg.text("").plain((handIdx === 0 ? "R: " : "L: ") + startingHand).
                        amove(xMargin + startingHandsOffset / 2 + (showPasserRoles ? passerRolesOffset : 0), yo(passerIdx, handIdx as 0 | 1)).
                        addClass("starting-hands").
                        font({ size: startingHandsTextSize, 'text-anchor': "middle", fill: annotationTextColor, 'dominant-baseline': "central" })
                }
        }
    }
    return svg
}


export function renderGroupPattern(gp: GroupPattern, config?: Partial<RendererConfig>): Svg {

    const svg = renderPattern(gp.pattern, config)
    if (gp.layout){
        const height: number = Number(svg.height())
        const width: number = Number(svg.width())
        svg.width(width + height)
        const g = svg.group()
        const config = { positionCircle: 40, roleLabelFontSize: 28, colors: ["red", "green", "blue"] }
        renderLayout(gp.layout, height, height, g, config)
        g.move(width, 0)
    }
    return svg
}


type RenderLayoutConfig = {
    positionCircle: number
    roleLabelFontSize: number
    colors: string[]
}

function renderLayout(layout: GroupPatternLayout, width: number, height: number, canvas: G, config: RenderLayoutConfig) {
    const left = config.positionCircle/2
    const s = Math.min(width,height) - config.positionCircle
    const top = config.positionCircle/2

    canvas.circle(s).center(left+s/2,top+s/2).fill("none").stroke("lightgrey")
    canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
    for (let roleIdx = 0; roleIdx < layout.positions.length; roleIdx++) {
        const pos = layout.positions[roleIdx]
        const c = canvas.circle(config.positionCircle).center(left + pos.x * s, top + pos.y * s).fill(config.colors[roleIdx])
        canvas.text(pos.role).font({ size: config.roleLabelFontSize }).cx(c.cx()).cy(c.cy()).fill("white")
    }


    canvas.rect(width, height).fill('none').stroke("blue")
}