import { Pattern, Throw } from "./pattern-structure";
import { FourHandedSiteswap } from "./siteswap";


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


    const pattern = {
        passerNames: ["A", "B"],
        startingHands: startingHands,
        prefixPeriod: 0,
        period: sw.length()/2,
        getThrows(iterationNr: number): Throw[] {
            if (iterationNr < 1) throw new Error("iterationNr must be >= 1");
            const ts: Throw[] = [];
            for (let idx = 0; idx < iterationNr* sw.length(); idx++) {
                const passerIdx = (idx + startingJuggler) % 2;
        
                const t: Throw = {
                    throwTime: idx/2,
                    causeTime: sw.causes(idx)/2,
                    rethrowTime: sw.thrownNext(idx)/2,
                    fromPasserIdx: passerIdx,
                    toPasserIdx: (sw.jugglerAt(sw.thrownNext(idx))+ startingJuggler) % 2,
                    fromHandIdx: (idx + startingJuggler) % 4 < 2 ? 0 /*R*/ : 1 /*L*/,
                    toHandIdx: (sw.thrownNext(idx) + startingJuggler) % 4 < 2 ? 0 /*R*/ : 1 /*L*/,
                    label: sw.throwLetterAt(idx),
                    annotation: getStraightCrossText(passerIdx, sw.throwAt(idx))
                }
                ts.push(t);
            }
            return ts
        }
    };
    return pattern;
}
