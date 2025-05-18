/**
 * crude, not-customizable rendering similar to pattern.prettyPrintThrows
 */

import { Hand, Pattern, Throw, ThrowType } from "@modernpassing/pattern"
import { createSVG } from "@modernpassing/svg-utils";
import { G, Svg } from "@svgdotjs/svg.js";
import { PatternImpl } from "../pattern/pattern-impl.ts";
import assert from "node:assert";
import { Path } from "@svgdotjs/svg.js";



export function prettyPrintThrowsSvg(pattern: Pattern): string {

    const dist = 60
    const width = (pattern.getLength() + pattern.getPrefixLength() + 4) * dist
    const height = (pattern.nrRows + 2) * dist

    const svg: Svg = createSVG(width, height).viewbox(0, 0, width, height)




    let result = ""

    function getX(beat: number): number {
        return (beat + pattern.getPrefixLength() + 2) * dist
    }
    function getY(rowIdx: number, hand: Hand): number {
        return (rowIdx + 2) * dist + (hand === Hand.Left ? 5 : -5)
    }
    function getXY(beat: number, rowIdx: number, hand: Hand): [number, number] {
        return [getX(beat), getY(rowIdx, hand)]
    }

    const printThrow = (t: Throw): string => {
        // if (['S', 'C', 'I', 'P'].includes(t.note[0])) return `${t.throwLength}${pattern.getRole(t.throwBeat, t.toPasserIdx)}|${t.note}`
        // const fromRole = pattern.getRole(t.throwBeat, t.fromPasserIdx)
        const toRole = pattern.getToPasserRole(t)
        // const printRole = fromRole !== toRole ? toRole : ""
        const markers = t.markers ? t.markers.filter(m => m !== ThrowType.Base && m !== ThrowType.BaseManipulator) : []
        const printType = markers.length === 0 ? "" : "/" + markers.join("")
        const hand = pattern.getThrowHand(t, 0)
        const isCrossing = pattern.isSelfThrow(t) ? "" : (pattern.isCrossingPass(t, 0) ? "‖" : "X")
        const targetFirstIteration = (pattern as PatternImpl).getToPasserIdxOnCausal(t) + (pattern.getTargetHandFirstIteration(t) === Hand.Left ? "L" : "R") + pattern.getThrowCauseBeat(t)
        const str = `${t.throwLength}${toRole}${isCrossing}${(targetFirstIteration)}${printType}`
        return hand === Hand.Left ? (str) : (str)
    }

    const showHeader = true
    // header
    if (showHeader) {
        svg.text("Beat").move(dist, dist)

        for (let beat = -pattern.getPrefixLength(); beat < 0; beat++) {
            svg.text(beat.toString()).move(getX(beat), dist)
        }
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            // const newRoles = pattern.roles.find(r => r[0] === beat)
            // if (beat !== 0 && newRoles)
            //     result += `\t`
            // result += beat + "\t"
            svg.text(beat.toString()).move(getX(beat), dist)
        }
        result += "\n"
    }


    for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
        const myThrows = pattern.throws.filter(t => t.fromPasserIdx === rowIdx).sort((a, b) => a.throwBeat - b.throwBeat)
        // row heading
        svg.text(`${rowIdx} (${pattern.getRole(0, rowIdx)})`).move(dist, getY(rowIdx, 0))

        // prefix throws
        for (let beat = -pattern.getPrefixLength(); beat < 0; beat++) {
            const ts = myThrows.filter(t => t.throwBeat === beat)
            for (const t of ts)
                svg.text(printThrow(t)).move(getX(beat), getY(rowIdx, pattern.getThrowHand(t, 0)))
        }
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            // const newRoles = pattern.roles.find(r => r[0] === beat)
            // if (beat !== 0 && newRoles)
            //     result += `(${newRoles[1][rowIdx]})\t`

            const ts = myThrows.filter(t => t.throwBeat === beat)
            for (const t of ts) {
                const hand = pattern.getThrowHand(t, 0)
                svg.circle(4).move(getX(beat) - 2, getY(rowIdx, Hand.Right) - 2).fill("blue")
                svg.circle(4).move(getX(beat) - 2, getY(rowIdx, Hand.Left) - 2).fill("green")
                svg.text(printThrow(t)).move(getX(beat), getY(rowIdx, hand)).fill(hand ? "green" : "blue")
            }
        }
        const l = `-> ${pattern.mapRows[rowIdx]} [${pattern.getRole(pattern.getLength(), rowIdx)}]${pattern.mapHands[rowIdx][0] ? "⇆" : ""}${pattern.mapCrossing[rowIdx][0] ? "X" : ""}`
        svg.text(l).move(getX(pattern.getLength()), getY(rowIdx, 0))
    }






    function error(x: number, y: number, message: string): void {
        svg.circle(10).move(x - 5, y - 5).fill("red").stroke({ color: "black", width: 1 })
        svg.text(message).move(x + 10, y - 5).fill("red").font({ size: 12 })
    }

    function causal(x1: number, y1: number, x2: number, y2: number, throwLength: number): Path {
        let dir = 1
        // if (x1 > x2) {
        //     dir = -3
        //     const tmp = x1
        //     x1 = x2
        //     x2 = tmp
        //     const tmpY = y1
        //     y1 = y2
        //     y2 = tmpY
        // }
        const xDiff = x2 - x1
        //backward arrows are straight, the rest follows some heuristic
        const bendOffset = xDiff > 0 ? 0 : dist / 5.5 * xDiff / dist * .9

        const path = svg.path(`M ${x1} ${y1} C ${x1 + bendOffset} ${y1 + dir * bendOffset}, ${x2 - bendOffset} ${y2 + dir * bendOffset}, ${x2} ${y2}`).
            fill("transparent")
        if (throwLength < 0)
            path.stroke({ dasharray: '2,2' });

        
        return path

    }



    const foundThrown: (Throw | undefined)[/*row*/][/*hand*/][/*beat*/] = Array.from({ length: pattern.nrRows }, () => Array.from({ length: 2 }, () => Array(pattern.getLength()).fill(undefined)))
    const foundCaught: (Throw | undefined)[/*row*/][/*hand*/][/*beat*/] = Array.from({ length: pattern.nrRows }, () => Array.from({ length: 2 }, () => Array(pattern.getLength()).fill(undefined)))

    // ignore prefix throws for indexing
    for (const t of pattern.throws) if (t.throwBeat >= 0) {
        const hand = pattern.getThrowHand(t, 0)
        if (foundThrown[t.fromPasserIdx][hand][t.throwBeat]) {
            error(getX(t.throwBeat), getY(t.fromPasserIdx, hand), "multiple throws")
        } else
            foundThrown[t.fromPasserIdx][hand][t.throwBeat] = t

        const causeBeat = pattern.getThrowCauseBeat(t)
        // if we cross the pattern boundary, consider a pass from a previous period to be the incoming one to get the hands right in the wraparound
        const targetHandInFirstIteration = pattern.getTargetHandFirstIteration(t)
        // const from = pattern.samePasserNBeatsLater(t.fromPasserIdx, t.throwBeat, iteration*pattern.getLength())
        // const to = pattern.samePasserNBeatsLater(t.toPasserIdx, t.throwBeat, Math.max(iteration,0)*pattern.getLength()+t.throwLength-pattern.nrHands)
        const from = t.fromPasserIdx
        const to = (pattern as PatternImpl).getToPasserIdxOnCausal(t)
        // console.log(`${from}/${hand?"L":"R"} @ ${t.throwBeat} -> ${to}/${targetHand?"L":"R"} @ ${causeBeat} (${pattern.getThrowCauseTime(t)}, ${iteration})`)
        if (foundCaught[to][targetHandInFirstIteration][causeBeat]) {
            error(getX(causeBeat), getY(to, targetHandInFirstIteration), "multiple catches")
        } else
            foundCaught[to][targetHandInFirstIteration][causeBeat] = t

        const path = causal(getX(t.throwBeat), getY(from, hand), getX(causeBeat), getY(to, targetHandInFirstIteration), pattern.getThrowCauseLength(t))
            .stroke({ width: 2, color: targetHandInFirstIteration ? "green" : "blue" })

        if (t.throwBeat!==causeBeat || from!==to || hand!==targetHandInFirstIteration) 
        path.marker('end', 10, 10, add => 
                add.polygon('0,0 7.5,5 0,10').fill(targetHandInFirstIteration ? "green" : "blue").scale(.5,.5)
            );
    
    }
    for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            for (const hand of [Hand.Right, Hand.Left]) {
                if (foundThrown[rowIdx][hand][beat] && !foundCaught[rowIdx][hand][beat]) {
                    error(getX(beat), getY(rowIdx, hand), `throw without catch`)
                }
                if (foundCaught[rowIdx][hand][beat] && !foundThrown[rowIdx][hand][beat]) {
                    const c = foundCaught[rowIdx][hand][beat]
                    error(getX(beat), getY(rowIdx, hand), `catch without throw`)
                }
            }
        }
    }
    // // check prefix throws
    // const foundPrefixThrown: (Throw | undefined)[/*row*/][/*hand*/][/*-beat*/] = Array.from({ length: pattern.nrRows }, () => Array.from({ length: 2 }, () => Array(pattern.getPrefixLength()).fill(undefined)))
    // for (const t of pattern.throws) if (t.throwBeat < 0) {
    //     // for simplicity let's not allow prefix throws to land before the pattern
    //     const causeTime = pattern.getThrowCauseTime(t)
    //     if (causeTime<0) {
    //         pattern.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand} lands before the start of the pattern; for now such prefix throws are not supported`
    //         return false
    //     }
    //     // should land on a hand that throws
    //     const causeBeat = pattern.getThrowCauseBeat(t)
    //     const targetHand = pattern.getTargetHand(t, 0)
    //     const targetPasserIdx = pattern.adjustRowIdxByTime(causeTime, t.toPasserIdxAtThrow)
    //     if (!foundThrown[targetPasserIdx][targetHand][causeBeat]) {
    //         pattern.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand} lands on a hand that does not throw on that beat`
    //         return false
    //     }

    //     // should land on a hand where the catching throw is a wraparound throw
    //     const competingWraparoundThrow = foundCaught[targetPasserIdx][targetHand][causeBeat] 
    //     if (!competingWraparoundThrow || pattern.getThrowCauseTime(competingWraparoundThrow)< pattern.getLength()) {
    //         pattern.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand} lands on a hand that already catches a pass in the first iteration of the pattern`
    //         return false
    //     }

    //     //should not have multiple throws on the same beat+hand
    //     if (foundPrefixThrown[t.fromPasserIdx][t.fromHand][-t.throwBeat]) {
    //         pattern.validationError = `more than one prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand}: \n\t${JSON.stringify(foundPrefixThrown[t.fromPasserIdx][t.fromHand])} and \n\t${JSON.stringify(t)}`
    //         return false
    //     }
    //     foundPrefixThrown[t.fromPasserIdx][t.fromHand][-t.throwBeat]= t
    // }
    // check crossing/straight is actually correct with the handswitches
    for (const t of pattern.throws) {
        const fromHand = pattern.getThrowHand(t, 0)
        const causeTime = pattern.getThrowCauseTime(t)
        if (causeTime < pattern.getLength()) continue
        const causeBeat = pattern.getThrowCauseBeat(t)
        const toHand = pattern.getTargetHand(t, 0)
        const causedThrow = foundThrown[t.toPasserIdxAtCausal][pattern.getTargetHandFirstIteration(t)][causeBeat]
        if (causedThrow) {
            const causedThrowHand = pattern.getThrowHand(causedThrow, Math.floor(causeTime / pattern.getLength()))
            if (toHand !== causedThrowHand) {
                error(getX(causeBeat), getY(t.toPasserIdxAtCausal, toHand), `inconsistent crossing/straight`)
            }
        }
    }

















    return svg.svg()
}
