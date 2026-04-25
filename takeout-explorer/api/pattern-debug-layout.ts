/**
 * Pure-data layout for the "debug" pattern view that prettyPrintThrowsSvg
 * renders as SVG. Returns plain JSON-serializable data so the same view can
 * be rendered by a React component (or anything else) without depending on
 * svg.js / svgdom / a server.
 *
 * Geometry is identical to prettyPrintThrowsSvg — same positions, same
 * arrow paths, same colors — just expressed as data.
 */

import { Hand, type Pattern, type Throw } from "@modernpassing/pattern"

export type LabelKind = "beat-header" | "row-start" | "row-end" | "throw"

export type TextSpec = {
    x: number
    y: number
    text: string
    fill?: string
    kind: LabelKind
}

export type DotSpec = {
    cx: number
    cy: number
    fill: string
}

export type ThrowSpec = {
    id: string
    x: number
    y: number
    label: string
    fill: string
    beat: number
    rowIdx: number
    hand: "right" | "left"
}

export type ArrowSpec = {
    id: string
    throwId: string
    d: string
    stroke: string
    dashed: boolean
}

export type ErrorSpec = {
    x: number
    y: number
    message: string
}

export type DebugPatternLayout = {
    width: number
    height: number
    dist: number
    texts: TextSpec[]
    dots: DotSpec[]
    throws: ThrowSpec[]
    arrows: ArrowSpec[]
    errors: ErrorSpec[]
}

export function computeDebugPatternLayout(pattern: Pattern): DebugPatternLayout {
    const dist = 100
    const width = (pattern.getLength() + pattern.getPrefixLength() + 4) * dist
    const height = (pattern.nrRows + 2) * dist

    const getX = (beat: number) => (beat + pattern.getPrefixLength() + 2) * dist
    const getY = (rowIdx: number, hand: Hand) =>
        (rowIdx + 2) * dist + (hand === Hand.Left ? 7 : -7)

    const texts: TextSpec[] = []
    const dots: DotSpec[] = []
    const throws: ThrowSpec[] = []
    const arrows: ArrowSpec[] = []
    const errors: ErrorSpec[] = []

    const printThrow = (t: Throw): string => {
        const toRole = pattern.getToPasserRole(t)
        const markers = t.markers
            ? t.markers.filter((m) => m.kind !== "B" && m.kind !== "M")
            : []
        const printType =
            markers.length === 0 ? "" : markers.map((m) => m.kind).join("")
        const isCrossing = pattern.isSelfThrow(t)
            ? ""
            : pattern.isStraightPass(t, 0)
            ? "‖"
            : "X"
        const targetFirstIteration =
            pattern.getToPasserIdxOnCausal(t) +
            (pattern.getTargetHandFirstIteration(t) === Hand.Left ? "L" : "R") +
            pattern.getThrowCauseBeat(t)
        return `${t.throwLength}${toRole}${isCrossing}${targetFirstIteration}${printType}`
    }

    // Header row: "Beat" plus beat numbers + default hand
    texts.push({
        x: dist,
        y: dist,
        text:
            "Beat" +
            (pattern.globalHandOrderOffset !== 0
                ? " ::" + pattern.globalHandOrderOffset
                : ""),
        kind: "beat-header",
    })
    for (let beat = -pattern.getPrefixLength(); beat < pattern.getLength(); beat++) {
        texts.push({
            x: getX(beat),
            y: dist,
            text:
                beat.toString() +
                " " +
                (pattern.getGlobalHand(0, beat) ? "L" : "R"),
            kind: "beat-header",
        })
    }

    // Per-row labels and throws
    for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
        const myThrows = pattern.throws
            .filter((t) => t.fromPasserIdx === rowIdx)
            .sort((a, b) => a.throwBeat - b.throwBeat)

        texts.push({
            x: dist,
            y: getY(rowIdx, Hand.Right),
            text: `${rowIdx} (${pattern.getRole(0, rowIdx)})`,
            kind: "row-start",
        })

        // prefix throws
        for (let beat = -pattern.getPrefixLength(); beat < 0; beat++) {
            const ts = myThrows.filter((t) => t.throwBeat === beat)
            for (const t of ts) {
                const hand = pattern.getThrowHand(t, 0)
                const fill = hand === Hand.Left ? "green" : "blue"
                throws.push({
                    id: throwId(t),
                    x: getX(beat),
                    y: getY(rowIdx, hand),
                    label: printThrow(t),
                    fill,
                    beat,
                    rowIdx,
                    hand: hand === Hand.Left ? "left" : "right",
                })
            }
        }

        // body throws — also draw the small blue/green dots at both hand positions
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            const ts = myThrows.filter((t) => t.throwBeat === beat)
            for (const t of ts) {
                const hand = pattern.getThrowHand(t, 0)
                dots.push({
                    cx: getX(beat),
                    cy: getY(rowIdx, Hand.Right),
                    fill: "blue",
                })
                dots.push({
                    cx: getX(beat),
                    cy: getY(rowIdx, Hand.Left),
                    fill: "green",
                })
                throws.push({
                    id: throwId(t),
                    x: getX(beat) + 5,
                    y: getY(rowIdx, hand) + 5,
                    label: printThrow(t),
                    fill: hand ? "green" : "blue",
                    beat,
                    rowIdx,
                    hand: hand === Hand.Left ? "left" : "right",
                })
            }
        }

        texts.push({
            x: getX(pattern.getLength()),
            y: getY(rowIdx, Hand.Right),
            text: `-> ${pattern.mapRows[rowIdx]} [${pattern.getRole(
                pattern.getLength(),
                rowIdx,
            )}]`,
            kind: "row-end",
        })
    }

    // Index throws to detect conflicts and draw causal arrows
    const foundThrown: (Throw | undefined)[][][] = Array.from(
        { length: pattern.nrRows },
        () =>
            Array.from({ length: 2 }, () =>
                Array(pattern.getLength()).fill(undefined),
            ),
    )
    const foundCaught: (Throw | undefined)[][][] = Array.from(
        { length: pattern.nrRows },
        () =>
            Array.from({ length: 2 }, () =>
                Array(pattern.getLength()).fill(undefined),
            ),
    )

    for (const t of pattern.throws) {
        if (t.throwBeat < 0) continue
        const hand = pattern.getThrowHand(t, 0)
        if (foundThrown[t.fromPasserIdx][hand][t.throwBeat]) {
            errors.push({
                x: getX(t.throwBeat),
                y: getY(t.fromPasserIdx, hand),
                message: "multiple throws",
            })
        } else {
            foundThrown[t.fromPasserIdx][hand][t.throwBeat] = t
        }

        const causeBeat = pattern.getThrowCauseBeat(t)
        const targetHand = pattern.getTargetHandFirstIteration(t)
        const from = t.fromPasserIdx
        const to = pattern.getToPasserIdxOnCausal(t)

        if (foundCaught[to][targetHand][causeBeat]) {
            errors.push({
                x: getX(causeBeat),
                y: getY(to, targetHand),
                message: "multiple catches",
            })
        } else {
            foundCaught[to][targetHand][causeBeat] = t
        }

        const x1 = getX(t.throwBeat)
        const y1 = getY(from, hand)
        const x2 = getX(causeBeat)
        const y2 = getY(to, targetHand)
        const xDiff = x2 - x1
        const dir = 1
        const bendOffset = xDiff > 0 ? 0 : (dist / 5.5) * (xDiff / dist) * 0.9
        const flipOffset = 20
        const d =
            xDiff !== 0
                ? `M ${x1} ${y1} C ${x1 + bendOffset} ${y1 + dir * bendOffset}, ${x2 - bendOffset} ${y2 + dir * bendOffset}, ${x2} ${y2}`
                : `M ${x1} ${y1} C ${x1 - flipOffset} ${y1 - flipOffset}, ${x2 + flipOffset} ${y2 - flipOffset}, ${x2} ${y2}`
        const stroke = targetHand ? "green" : "blue"
        arrows.push({
            id: `arrow-${arrows.length}`,
            throwId: throwId(t),
            d,
            stroke,
            dashed: pattern.getThrowCauseLength(t) < 0,
        })
    }

    // throws / catches without their counterpart
    for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            for (const hand of [Hand.Right, Hand.Left]) {
                if (
                    foundThrown[rowIdx][hand][beat] &&
                    !foundCaught[rowIdx][hand][beat]
                ) {
                    errors.push({
                        x: getX(beat),
                        y: getY(rowIdx, hand),
                        message: "throw without catch",
                    })
                }
                if (
                    foundCaught[rowIdx][hand][beat] &&
                    !foundThrown[rowIdx][hand][beat]
                ) {
                    errors.push({
                        x: getX(beat),
                        y: getY(rowIdx, hand),
                        message: "catch without throw",
                    })
                }
            }
        }
    }

    // crossing/straight consistency check
    for (const t of pattern.throws) {
        const causeTime = pattern.getThrowCauseTime(t)
        if (causeTime < pattern.getLength()) continue
        const causeBeat = pattern.getThrowCauseBeat(t)
        const toHand = pattern.getTargetHand(t, 0)
        const causedThrow =
            foundThrown[t.toPasserIdxAtCausal][
                pattern.getTargetHandFirstIteration(t)
            ][causeBeat]
        if (causedThrow) {
            const causedThrowHand = pattern.getThrowHand(
                causedThrow,
                Math.floor(causeTime / pattern.getLength()),
            )
            if (toHand !== causedThrowHand) {
                errors.push({
                    x: getX(causeBeat),
                    y: getY(t.toPasserIdxAtCausal, toHand),
                    message: "inconsistent crossing/straight",
                })
            }
        }
    }

    return { width, height, dist, texts, dots, throws, arrows, errors }
}

function throwId(t: Throw): string {
    return `throw-${t.fromPasserIdx}-${t.throwBeat}-${t.toPasserIdxAtCausal}-${t.throwLength}`
}
