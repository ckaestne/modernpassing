import type { Hand, Pattern, Throw } from "../pattern/pattern.ts";


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

export function getThrowsFromPattern(pattern: Pattern, iterations: number): RenderedThrow[] {
    let prefixTimeOffset = pattern.getPrefixLength()
    let iterationTimeOffset = 0
    const result: RenderedThrow[] = []
    for (let iteration = 0; iteration < iterations; iteration++) {
        for (const t of pattern.throws) if (t.throwBeat >= 0 || iteration===0){
            result.push({
                throwTime: prefixTimeOffset+iterationTimeOffset+t.throwBeat,
                rethrowTime: prefixTimeOffset+iterationTimeOffset+t.throwBeat + t.throwLength,
                causeTime: prefixTimeOffset+iterationTimeOffset+pattern.getThrowCauseTime(t),
                fromPasserIdx: pattern.adjustRowIdxByTime(iterationTimeOffset, t.fromPasserIdx),
                fromHand: pattern.getThrowHand(t, iteration),
                toPasserIdx: pattern.adjustRowIdxByTime(iterationTimeOffset, t.toPasserIdxAtThrow),
                toHand: pattern.getTargetHand(t, iteration),
                throwLength: t.throwLength,
                label: ""+t.throwLength, //TODO
                annotation: getAnnotation(pattern, t, iteration)
            })
        }
        iterationTimeOffset += pattern.getLength()
    }

 return result
}

function getAnnotation(p: Pattern, t: Throw, iteration: number): string {
    const isPass =!p.isSelfThrow(t)
    if (isPass)
        return p.isCrossingPass(t, iteration) ? "||" : "X"

    return ""
}
