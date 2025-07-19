import type { Pattern, Throw } from '@modernpassing/pattern'
import { getThrowsFromPattern, RenderedThrow, defaultRendererConfig, type RendererConfig } from "@modernpassing/rendering-core";


export function renderPattern(p: Pattern, config?: Partial<RendererConfig>): string {
    if (!p.isValid())
        throw new Error(`Invalid pattern: ${p}: ${p.getValidationError()}`);


    const cfg:RendererConfig= { ...defaultRendererConfig, ...config }
    const {
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
        } = cfg;
    

    let result = ""
    result += '\\begin{tikzpicture}[yscale=-.5,xscale=.5]\n'

    const hasAnnotation = showStraightCross || showLeftRight;
    const annotationMargin = hasAnnotation ? annotationTextSize : 0;

    const maxTime = p.getPrefixLength() + p.getLength() * iterations;



    // x offset of any point in the pattern (negative numbers for prefix)
    function xo(time: number): number {
        return xMargin +
            (showStartingHands ? startingHandsOffset : 0) +
            throwCircleSize / 2  + time * xDist;
    }

    // y offset of a throw
    function yo(passerIdx: number, handIdx: 0 | 1 | null): number {
        // TODO: support rendering synchronous throws with both hands
        return yMargin + (hasAnnotation ? annotationMargin : 0) + throwCircleSize / 2 +
            (passerIdx % 2) * yDist;
    }

    const width = xMargin * 2 + throwCircleSize +
        (showStartingHands ? startingHandsOffset : 0) +
        (p.getPrefixLength() + p.getLength() * iterations - 1) * xDist
    const height = yMargin * 2 + (hasAnnotation ? annotationMargin : 0) * 2 + throwCircleSize + yDist


    // returns a window with a document and an svg root node
    result += `\\clip (0,0) rectangle (${width}pt,${height}pt);\n`
    // result += `\\draw (0,0) rectangle (${width}pt,${height}pt);\n`
    // svg.rect("100%", "100%").fill("white").stroke("black")


    const ladderOffset = lineKind === "ladder" ? 4 : 0
    function causalLine(t: RenderedThrow) {
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
        const isEmphasized = emphasizeLines.find((el) => el[0] === t.fromPasserIdx && el[1] === startTime) !== undefined
        if (isEmphasized) {
            color = emphasizeLineColor
            width = emphasizeLineWith
            dash = emphasizeLineDash
        }


        if (yo(t.fromPasserIdx, t.fromHand) !== yo(t.toPasserIdx, t.toHand)) {
            // diagonal lines are straight
            result += `\\draw[${color}, line width=${width}pt] (${xo(startTime)}pt, ${yo(t.fromPasserIdx, t.fromHand)}pt) -- (${xo(endTime)}pt, ${yo(t.toPasserIdx, t.toHand)}pt);\n`
        } else {
            // self throws are curved
            const dir = lineBendOrientation[t.fromPasserIdx];
            const xDiff = xo(endTime) - xo(startTime)
            //backward arrows are straight, the rest follows some heuristic
            const bendOffset = xDiff<=0 ? 0 : yDist / 5.5 * xDiff/xDist * bendAdjustment

            result += `\\draw[${color}, line width=${width}pt] `+
                `(${xo(startTime)}pt, ${yo(t.fromPasserIdx, t.fromHand)}pt) .. controls (${xo(startTime) + bendOffset}pt, ${yo(t.fromPasserIdx, t.fromHand) + dir * bendOffset}pt) and (${xo(endTime) - bendOffset}pt, ${yo(t.toPasserIdx, t.toHand) + dir * bendOffset}pt) .. (${xo(endTime)}pt, ${yo(t.toPasserIdx, t.toHand)}pt);`
            // svg.path(`M ${xo(startTime)} ${yo(t.fromPasserIdx, t.fromHandIdx)} C ${xo(startTime) + bendOffset} ${yo(t.fromPasserIdx, t.fromHandIdx) + dir * bendOffset}, ${xo(endTime) - bendOffset} ${yo(t.toPasserIdx, t.toHandIdx) + dir * bendOffset}, ${xo(endTime)} ${yo(t.toPasserIdx, t.toHandIdx)}`).
            //     stroke({ color: color, width: width, dasharray: dash }).fill("transparent")
        }
    }

    const allThrows: RenderedThrow[] = getThrowsFromPattern(p,iterations, cfg)

    if (showLines || emphasizeLines.length>0) {
        const maxIdx = maxTime
        for (let idx = 0; idx < allThrows.length; idx++) {
            const isEmphasized = emphasizeLines.find((el) => el[0] === allThrows[idx].fromPasserIdx && el[1] === allThrows[idx].throwTime) !== undefined
            const isSelected = !selectLinesForThrows || selectLinesForThrows.find((el) => el[0] === allThrows[idx].fromPasserIdx && el[1] === allThrows[idx].throwTime) !== undefined
            if ((showLines && isSelected) || isEmphasized)
                causalLine(allThrows[idx])
        }
    }

    // for (let idx = 0; idx < maxTime + (showExtraThrows ? beyondMax(p.period) : 0); idx++) {
    for (let throwIdx = 0; throwIdx < allThrows.length; throwIdx++) {
        const t = allThrows[throwIdx]
        const isEmphasized: boolean = emphasizeThrows.find((et) => et[0] === t.fromPasserIdx && et[1] === t.throwTime) !== undefined
        const circleColor = isEmphasized ? emphasizeCircleColor : throwCircleColor
        // (t.throwTime >= maxTime ? throwExtraCircleColor : throwCircleColor)
        const circleTextColor = isEmphasized ? emphasizeTextColor : throwTextColor
        // t.throwTime >= maxTime ? throwExtraTextColor : throwTextColor


        result += `\\draw[fill=${circleColor}] (${xo(t.throwTime)}pt, ${yo(t.fromPasserIdx, t.fromHand)}pt) `+
                 `circle (${throwCircleSize/2}pt) node [text=${circleTextColor}, font=\\Large]{${t.label}};\n`


        if (showLeftRight || (showStraightCross && t.annotation !== "")) {
            const text = []
            if (showLeftRight)
                text.push(t.fromHand ? "L" : "R")

            if ((showStraightCross && t.annotation !== "")) {
                text.push(t.annotation)
            }

            // TODO make this configurable where the labels are printed
            const offset = t.fromPasserIdx === 0 ? -throwCircleSize / 2 : throwCircleSize / 2;
            const dir = t.fromPasserIdx === 0 ? "-" : "+"

            result += `\\draw (${xo(t.throwTime)}pt, ${yo(t.fromPasserIdx, t.fromHand) + offset}pt ${dir} 1em) node [text=${annotationTextColor},font=\\small] {${text.join(" ")}};\n`
        }

    }

    if (showStartingHands) {
        const hands = p.getStartingHands()
        for (let passerIdx = 0; passerIdx < p.nrRows; passerIdx++) {
            const startingHands = hands[passerIdx]

            result += `\\draw (${xMargin + startingHandsOffset / 2}pt, ${yo(passerIdx, null)}pt) node [text=${annotationTextColor},font=\\small] {${startingHands.join("|")}};\n`
        }
    }

    result += '\\end{tikzpicture}\n'

    return result
}

