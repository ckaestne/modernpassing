import { Hand, Pattern, Throw } from "../pattern/pattern.ts";
import { RendererConfig } from "./renderer-config.ts";


/**
 * these are throws for rendering. they do not wrap around or are relabeled in any way.
 * they are hence much simpler to deal with
 * 
 * they can be derived from a pattern
 */
export type RenderedThrow = {
    throwTime: number
    rethrowTime: number
    causeTime: number
    fromPasserIdx: number
    fromHand: Hand
    toPasserIdx: number
    toHand: Hand
    throwLength: number
    label: string // text in the circle representing the throw, usually p/s or 6/7
    annotation: string // text shown above a throw. e.g. L, R, X, or ||
}

export function getThrowsFromPattern(pattern: Pattern, iterations: number, rendererConfig: RendererConfig): RenderedThrow[] {
    let prefixTimeOffset = pattern.getPrefixLength()
    let iterationTimeOffset = 0

    function gallopOffset(time: number, hand: Hand): number {
        if (!rendererConfig.gallop) return time
        const offset = 0.1
        return hand === Hand.Right ? time + offset : time - offset
    }

    const result: RenderedThrow[] = []
    for (let iteration = 0; iteration < iterations; iteration++) {
        for (const t of pattern.throws) if (t.throwBeat >= 0 || iteration === 0) {
            const fromHand = pattern.getThrowHand(t, iteration)
            const toHand = pattern.getTargetHand(t, iteration)
            const fromPasserIdx = pattern.adjustRowIdxByTime(iterationTimeOffset, t.fromPasserIdx)
            const toPasserIdx = pattern.adjustRowIdxByTime(iterationTimeOffset, t.toPasserIdxAtThrow)
            const targetRoleAtThrow = pattern.getRole(t.throwBeat+iterationTimeOffset, t.toPasserIdxAtThrow)
            result.push({
                throwTime: gallopOffset(prefixTimeOffset + iterationTimeOffset + t.throwBeat, t.fromHand),
                rethrowTime: gallopOffset(prefixTimeOffset + iterationTimeOffset + t.throwBeat + t.throwLength, toHand),
                causeTime: gallopOffset(prefixTimeOffset + iterationTimeOffset + pattern.getThrowCauseTime(t), toHand),
                fromPasserIdx,
                fromHand,
                toPasserIdx,
                toHand,
                throwLength: t.throwLength,
                label: convertToLabel(t.throwLength, fromPasserIdx === toPasserIdx, fromHand !== toHand, targetRoleAtThrow, rendererConfig),
                annotation: getAnnotation(pattern, t, iteration)
            })
        }
        iterationTimeOffset += pattern.getLength()
    }

    return result
}

function getAnnotation(p: Pattern, t: Throw, iteration: number): string {
    const isPass = !p.isSelfThrow(t)
    if (isPass)
        return p.isCrossingPass(t, iteration) ? "∥"/*"||"*/ : "X"

    return ""
}


export function convertToLabel(throwLength: number, isSelf: boolean, isCrossing: boolean, targetRole: string, rendererConfig: RendererConfig): string {
    if (rendererConfig.labelThrows === "none") return ""
    if (rendererConfig.labelThrows === "siteswap") return throwLength.toString() + (rendererConfig.labelPassDestinationRole && !isSelf?targetRole : "")
    const expectCrossing = throwLength % 2 === 1

    if (rendererConfig.labelThrows === "simple" || rendererConfig.labelThrows === "simpleAllSync") {
        const normalizedLabel = "" + throwLength + (!isSelf ? "p" : "") + (isCrossing === expectCrossing ? "" : "x")
        return getSimpleLabel(normalizedLabel, rendererConfig) + (rendererConfig.labelPassDestinationRole && !isSelf?targetRole : "")
    } 
    if (rendererConfig.labelThrows === "classic") 
        return "" + throwLength + (!isSelf ? "p" : "") + (isCrossing === expectCrossing ? "" : "x") + (rendererConfig.labelPassDestinationRole&&!isSelf?targetRole : "")
    throw Error("Unknown labelThrows config: " + rendererConfig.labelThrows)
}

function getSimpleLabel(normalizedLabel: string, rendererConfig: RendererConfig): string {
    //throwToken: string, gallop: boolean, allSync: boolean): string {
        if (rendererConfig.gallop) switch (normalizedLabel) {
            case "4x": return "s*"
            case "4p": return "p*"
            case "4px": return "p*"
            case "5p": return "d*"
            case "5px": return "d*"
            case "6p": return "r*"
            case "6px": return "r*"
            // default: throw Error("no predefined simple label for throw in gallop pattern " + normalizedLabel)
        }
        if (rendererConfig.labelThrows === "simpleAllSync") switch (normalizedLabel) {
            case "2": return ""
            case "4": return "l*"
            case "4x": return "s*"
            case "4p": return "p*"
            case "4px": return "p*"
            case "5p": return "d*"
            case "5px": return "d*"
            case "6": return "h*"
            case "6p": return "d*"
            case "6px": return "d*"
            // default: throw Error("no predefined simple label for throw in allSync pattern " + normalizedLabel)
        }
        switch (normalizedLabel) {
            case "1": return "z"
            case "2": return "f"
            case "3": return "s"
            case "4": return "h"
            case "5": return "t"
            case "3p": return "p"
            case "3px": return "p"
            case "4p": return "d"
            case "4px": return "d"
            case "5p": return "r"
            case "5px": return "r"
        }
        throw Error("no predefined simple label for throw " + normalizedLabel+" in config " + rendererConfig.labelThrows)
}