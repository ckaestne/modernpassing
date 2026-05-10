import { createFourHandedPattern, createPattern, Hand, Pattern, Throw } from "@modernpassing/pattern"
import { FourHandedSiteswap } from "./siteswap.ts"
import assert from "node:assert"

export const defaultSiteswapPatternConfig: SiteswapPatternConfig = {
    startingJuggler: 0,
}
export type SiteswapPatternConfig = {
    /**
     * 0 = juggler A starts, both right handed
     * 1 = juggler B starts right handed, A follows left handed (i.e., one beat later than usual)
     */
    startingJuggler: 0 | 1
}

function getStraightCrossText(juggler: number, t: number): string {
    const p = (t - 1) / 2 % 2
    return (p ^ juggler) ? /*"∥"*/ "||" : "X"
}

export function createSiteswapPattern(sw: string, config: Partial<SiteswapPatternConfig>): Pattern {
    const s = new FourHandedSiteswap(sw)
    return createSiteswapPatternImpl(s, config)
}

function createSiteswapPatternImpl(sw: FourHandedSiteswap, config: Partial<SiteswapPatternConfig>): Pattern {
    const {
        startingJuggler,
    } = { ...defaultSiteswapPatternConfig, ...config }

    // let startingHands = sw.getStartingHands();
    // if (startingJuggler === 1)
    //     startingHands = [[startingHands[1][1],startingHands[1][0]],startingHands[0] ];

    const ts: Throw[] = []
    for (let beat = 0; beat < sw.length(); beat++) {
        const passerIdx = beat % 2
        // const isCrossing = ((passerIdx+ startingJuggler)%2===0 ? [2,3] : [1,2]).includes(sw.throwAt(beat)%4)
        const t: Throw = {
            throwBeat: beat,
            throwLength: sw.throwAt(beat),
            fromPasserIdx: (passerIdx + startingJuggler) % 2,
            toPasserIdxAtCausal: (sw.jugglerAt((sw.causes(beat) + sw.length()) % sw.length()) + startingJuggler) % 2,
            // fromHand: (beat + startingJuggler) % 4 < 2 ? 0 /*R*/ : 1 /*L*/,
            // isCrossing,
            fromOppositeHand: false,
            flipCrossing: false,
            note: sw.throwLetterAt(beat),
        }
        ts.push(t)
    }

    const handOrder = startingJuggler === 0 ? [Hand.Right, Hand.Right, Hand.Left, Hand.Left] : [Hand.Right, Hand.Left, Hand.Left, Hand.Right]

    const swapSides = sw.length() % 2 == 1

    return createPattern(ts, 4, swapSides ? [1, 0] : [0, 1], ["A", "B"], handOrder, sw.length())
}
