import { RendererConfig as RendererConfig, defaultRendererConfig as defaultRendererConfig } from './renderer-config.js';
import { checkValidPattern, Pattern, repeatThrows, Throw } from './pattern-structure.js';


export function renderPattern(p: Pattern, config?: Partial<RendererConfig>): string {
    if (checkValidPattern(p).length !== 0)
        throw new Error(`Invalid pattern: ${p}: ${checkValidPattern(p)}`);



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
        emphasizeLineDash
    } = { ...defaultRendererConfig, ...config };
    

    let result = ""
    result += '\\begin{tikzpicture}[yscale=-.5,xscale=.5]\n'

    const hasAnnotation = showStraightCross || showLeftRight;
    const annotationMargin = hasAnnotation ? annotationTextSize : 0;

    const maxTime = p.prefixPeriod + p.period * iterations;



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
        (p.prefixPeriod + p.period * iterations - 1) * xDist
    const height = yMargin * 2 + (hasAnnotation ? annotationMargin : 0) * 2 + throwCircleSize + yDist


    // returns a window with a document and an svg root node
    result += `\\clip (0,0) rectangle (${width}pt,${height}pt);\n`
    // result += `\\draw (0,0) rectangle (${width}pt,${height}pt);\n`
    // svg.rect("100%", "100%").fill("white").stroke("black")


    const ladderOffset = lineKind === "ladder" ? 4 : 0
    function causalLine(t: Throw) {
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
            result += `\\draw[${color}, line width=${width}pt] (${xo(startTime)}pt, ${yo(t.fromPasserIdx, t.fromHandIdx)}pt) -- (${xo(endTime)}pt, ${yo(t.toPasserIdx, t.toHandIdx)}pt);\n`
        } else {
            // self throws are curved
            const dir = lineBendOrientation[t.fromPasserIdx];
            const xDiff = xo(endTime) - xo(startTime)
            //backward arrows are straight, the rest follows some heuristic
            const bendOffset = xDiff<=0 ? 0 : yDist / 5.5 * xDiff/xDist * bendAdjustment

            result += `\\draw[${color}, line width=${width}pt] `+
                `(${xo(startTime)}pt, ${yo(t.fromPasserIdx, t.fromHandIdx)}pt) .. controls (${xo(startTime) + bendOffset}pt, ${yo(t.fromPasserIdx, t.fromHandIdx) + dir * bendOffset}pt) and (${xo(endTime) - bendOffset}pt, ${yo(t.toPasserIdx, t.toHandIdx) + dir * bendOffset}pt) .. (${xo(endTime)}pt, ${yo(t.toPasserIdx, t.toHandIdx)}pt);`
            // svg.path(`M ${xo(startTime)} ${yo(t.fromPasserIdx, t.fromHandIdx)} C ${xo(startTime) + bendOffset} ${yo(t.fromPasserIdx, t.fromHandIdx) + dir * bendOffset}, ${xo(endTime) - bendOffset} ${yo(t.toPasserIdx, t.toHandIdx) + dir * bendOffset}, ${xo(endTime)} ${yo(t.toPasserIdx, t.toHandIdx)}`).
            //     stroke({ color: color, width: width, dasharray: dash }).fill("transparent")
        }
    }

    const allThrows: Throw[] = p.getThrows(iterations)

    if (showLines || emphasizeLines.length>0) {
        const maxIdx = maxTime
        for (let idx = 0; idx < allThrows.length; idx++)
            if (showLines&&(selectLinesForThrows === undefined || selectLinesForThrows.includes(idx)) || emphasizeLines.includes(idx))
                causalLine(allThrows[idx])
    }

    // for (let idx = 0; idx < maxTime + (showExtraThrows ? beyondMax(p.period) : 0); idx++) {
    for (let throwIdx = 0; throwIdx < allThrows.length; throwIdx++) {
        const t = allThrows[throwIdx]
        const circleColor = emphasizeThrows.includes(throwIdx) ? emphasizeCircleColor : throwCircleColor
        // (t.throwTime >= maxTime ? throwExtraCircleColor : throwCircleColor)
        const circleTextColor = emphasizeThrows.includes(throwIdx) ? emphasizeTextColor : throwTextColor
        // t.throwTime >= maxTime ? throwExtraTextColor : throwTextColor


        result += `\\draw[fill=${circleColor}] (${xo(t.throwTime)}pt, ${yo(t.fromPasserIdx, t.fromHandIdx)}pt) `+
                 `circle (${throwCircleSize/2}pt) node [text=${circleTextColor}, font=\\Large]{${t.label}};\n`


        if (showLeftRight || (showStraightCross && t.annotation !== "")) {
            let text = []
            if (showLeftRight)
                text.push(t.fromHandIdx ? "L" : "R")

            if ((showStraightCross && t.annotation !== "")) {
                text.push(t.annotation)
            }

            // TODO make this configurable where the labels are printed
            const offset = t.fromPasserIdx === 0 ? -throwCircleSize / 2 : throwCircleSize / 2;
            const dir = t.fromPasserIdx === 0 ? "-" : "+"

            result += `\\draw (${xo(t.throwTime)}pt, ${yo(t.fromPasserIdx, t.fromHandIdx) + offset}pt ${dir} 1em) node [text=${annotationTextColor},font=\\small] {${text.join(" ")}};\n`
        }

    }

    if (showStartingHands) {
        const hands = p.startingHands
        for (let passerIdx = 0; passerIdx < p.passerNames.length; passerIdx++) {
            let startingHands = hands[passerIdx]

            result += `\\draw (${xMargin + startingHandsOffset / 2}pt, ${yo(passerIdx, null)}pt) node [text=${annotationTextColor},font=\\small] {${startingHands.join("|")}};\n`
        }
    }

    result += '\\end{tikzpicture}\n'

    return result
}

