import { createPattern, Pattern, Throw } from "@modernpassing/pattern";
import { FourHandedSiteswap } from "./siteswap.ts";
import assert from "node:assert";


export const defaultSiteswapPatternConfig: SiteswapPatternConfig = {
    startingJuggler: 0,
}
export type SiteswapPatternConfig = {
    startingJuggler: 0 | 1,
}


function getStraightCrossText(juggler: number, t: number): string {
    const p = (t - 1) / 2 % 2
    return (p ^ juggler) ? /*"∥"*/ "||" : "X";
}

export function createSiteswapPattern(sw: FourHandedSiteswap, config: Partial<SiteswapPatternConfig>): Pattern {
    const {
        startingJuggler
    } = { ...defaultSiteswapPatternConfig, ...config }

    let startingHands = sw.getStartingHands();
    if (startingJuggler === 1)
        startingHands = [[startingHands[1][1],startingHands[1][0]],startingHands[0] ];


    const ts: Throw[] = [];
    for (let beat = 0; beat < sw.length(); beat++) {
        const passerIdx = beat % 2;
        const isCrossing = (passerIdx===0 ? [2,3] : [1,2]).includes(sw.throwAt(beat)%4)
        const t: Throw = {
            throwBeat: beat,
            throwLength: sw.throwAt(beat),
            fromPasserIdx: (passerIdx+ startingJuggler) % 2,
            toPasserIdx: (sw.jugglerAt(sw.thrownNext(beat))+ startingJuggler) % 2,
            fromHand: (beat + startingJuggler) % 4 < 2 ? 0 /*R*/ : 1 /*L*/,
            isCrossing,
            note: sw.throwLetterAt(beat)
        }
        ts.push(t);
    }

    assert.ok(startingJuggler === 0, "not implemented yet: need to flip various mappings below")

    return createPattern(ts, 4, sw.length()%2==0?[0,1]:[1,0],['A','B'],[[[2,1].includes(sw.length()%4)],[[2,3].includes(sw.length()%4)]],[[sw.length()%2==1],[sw.length()%2==1]])

}
