import assert from "node:assert";
import { alt, alt_sc, apply, betterError, buildLexer, expectEOF, expectSingleResult, kright, opt, ParseError, Parser, ParseResult, ParserOutput, rep, resultOrError, rule, seq, tok, Token } from "npm:typescript-parsec";
import { Hand, Pattern, Throw } from "./pattern-structure.ts";


export const defaultSyncPatternConfig: SyncPatternConfig = {
    startingHands: [0, 0],
    flipStraightCrossing: false,
    gallop: false,
    useSimpleLabels: true
}
export type SyncPatternConfig = {
    startingHands: number[], // one number per passer, 0 for right hand, 1 for left hand
    flipStraightCrossing: boolean,
    gallop: boolean,
    useSimpleLabels: boolean // use s and p instead of 3 and 3p, etc.
}


export enum TokenKind {
    Throw=0, Comma=1, Arrow=2, Empty=3, Hurry=4,
    LParen=5,
    RParen=6,
    Space=7,
}
export const tokenizer = buildLexer([
    [true, /^(\d(p)?(x)?)/g, TokenKind.Throw],
    [true, /^o/g, TokenKind.Empty],
    [true, /^\,/g, TokenKind.Comma],
    [true, /^\(/g, TokenKind.LParen],
    [true, /^\)/g, TokenKind.RParen],
    [true, /^->/g, TokenKind.Arrow],
    [false, /^\s+/g, TokenKind.Space]
]);



/**
PatternWithPrefix = (Pair "->")? Pair
Pair = Pattern ("," Pattern)?
Pattern = Multiplex | SimplePattern
Multiplex = "(" SimplePattern ("," SimplePattern)* ")"
SimplePattern = Throw+
 */

export type TThrow = string | [string, string] // single throw or sync throw with both hands
export type TSequence = TThrow[] // one passer's sequence of throws
export type TPattern = TSequence[] // a sequence for each passer

export const PFullPattern = rule<TokenKind, [TPattern, TPattern]>();
export const PPattern = rule<TokenKind, TPattern>();
export const PSequence = rule<TokenKind, TSequence>();
export const PThrow = rule<TokenKind, TThrow>();

PThrow.setPattern(
    alt(
        apply(seq(tok(TokenKind.LParen), tok(TokenKind.Throw), tok(TokenKind.Comma), tok(TokenKind.Throw), tok(TokenKind.RParen)),
            v => [v[1].text, v[3].text]),
        alt_sc(apply(tok(TokenKind.Throw), v => v.text), apply(tok(TokenKind.Empty), () => ".")),
    )
)

PSequence.setPattern(
    apply(seq(PThrow, rep(PThrow)),
        v => [v[0], ...v[1]])
)

PPattern.setPattern(
    check(
        apply(seq(PSequence, opt(kright(tok(TokenKind.Comma), PSequence))),
            v => v[1] ? [v[0], v[1]] : [v[0], v[0]]
        ), validatePattern)
)

PFullPattern.setPattern(
    apply(seq(PPattern, opt(kright(tok(TokenKind.Arrow), PPattern))),
        v => v[1] ? [v[0], v[1]] : [[], v[0]]
    )
)

/**
 * 
 * @param p parser
 * @param checker returns an error message if the result is not valid, otherwise undefined
 * @returns succeeding or failing parser
 */
function check<TKind, TResult>(p: Parser<TKind, TResult>, checker: (v: TResult) => string | undefined): Parser<TKind, TResult> {
    return {
        parse(token: Token<TKind> | undefined): ParserOutput<TKind, TResult> {
            let error: ParseError | undefined;
            const result: ParseResult<TKind, TResult>[] = [];
            let successful = false;
            const output = p.parse(token);
            error = betterError(error, output.error);

            if (output.successful) {
                for (const c of output.candidates) {
                    const e = checker(c.result);
                    if (!e) {
                        result.push(c);
                        successful = true;
                    }
                    else {
                        error = {
                            kind: 'Error',
                            pos: c.firstToken?.pos,
                            message: e
                        }
                    }
                }
            }
            return resultOrError(result, error, successful);

        }
    };
}

function validatePattern(pattern: TPattern): string | undefined {
    if (pattern.length === 0) return undefined
    const l = pattern[0].length;
    const r = pattern[1].length;
    if (l !== r) return "Pattern is of different length for both passers: " + JSON.stringify(pattern)
    return undefined
}

export function parseSyncPattern(expr: string): [TPattern, TPattern] {
    return expectSingleResult(expectEOF(PFullPattern.parse(tokenizer.parse(expr))));
}


// const crossingThrows
export const straightPasses = ["1p", "2px", "3p", "4px", "5p", "6px", "7p", "8px", "9p"]
export const crossingPasses = ["1px", "2p", "3px", "4p", "5px", "6p", "7px", "8p", "9px"]
export const straightSelfs = ["1x", "2", "3x", "4", "5x", "6", "7x", "8", "9x"] // R to R or L to L (even if it's the other person's hand)
export const crossingSelfs = ["1", "2x", "3", "4x", "5", "6x", "7", "8x", "9"] // R to L or L to R


export function createSyncPattern(sw: string, config: Partial<SyncPatternConfig>): Pattern {
    const {
        flipStraightCrossing,
        gallop,
        startingHands,
        useSimpleLabels
    } = { ...defaultSyncPatternConfig, ...config }

    const [prefix, pattern] = parseSyncPattern(sw)


    assert(prefix.length === 0 || prefix.length == pattern.length, "prefix must have same length for both passers")
    assert(pattern.length === 2, "only two passers supported for now")
    assert(pattern[0].length === pattern[1].length, "pattern must have same length for both passers")
    const sequenceLength = pattern[0].length;
    const prefixLength = prefix.length > 0 ? prefix[0].length : 0

    const crossingPass = flipStraightCrossing ? straightPasses : crossingPasses
    const toSameHandThrows = straightSelfs.concat(crossingPass)

    function gallopOffset(time: number, hand: Hand): number {
        if (!gallop) return time
        const offset = 0.1
        return hand === Hand.Right ? time + offset : time - offset
    }

    let allSync: boolean | undefined = undefined

    function genThrows(iterations: number): Throw[] {
        const throws: Throw[] = [];
        const handSequence: (0 | 1)[][] = altHands([startingHands[0], (startingHands[1] + (flipStraightCrossing ? 1 : 0)) % 2], prefixLength + iterations * sequenceLength + 9);



        function genThrow(throwToken: string, time: number, passerIdx: number, fromHand: Hand, timeFactor: number = 1): Throw {
            const [value, isPass, _isCrossing] = parseThrow(throwToken)
            const causeTime = time + (value - 2)*timeFactor;
            const rethrowTime = time + value*timeFactor;
            const toPasserIdx = isPass ? (passerIdx + 1) % 2 : passerIdx;
            const toHand: Hand = toSameHandThrows.includes(throwToken) ? fromHand : (fromHand + 1) % 2
            //updates to handsequence do not matter in sync throws, but also
            const expectedToHandIdx: Hand = handSequence[toPasserIdx][causeTime];
            if (toHand !== expectedToHandIdx) {
                //found hurry, swapping handsequence at caused time
                swapHands(handSequence, toPasserIdx, causeTime)
                // console.log(`found hurry at ${time} (${t}) in ${sw} from (${passerIdx},${fromHandIdx}) to hand (${toPasserIdx},${toHand}); expected (${toPasserIdx},${expectedToHandIdx})`) 
            }
            const annotation = isPass ? (fromHand===toHand ? "X" : "||") : ""
            const label = useSimpleLabels ? convertToLabel(throwToken, gallop, allSync!) : throwToken
            return { 
                throwTime: gallopOffset(time, fromHand),
                fromPasserIdx: passerIdx,
                fromHand,
                causeTime: gallopOffset(causeTime, toHand),
                rethrowTime: gallopOffset(rethrowTime, toHand),
                toPasserIdx,
                toHand: toHand,
                label: label,
                annotation
            }
        }


        for (let time = 0; time < prefixLength + iterations * sequenceLength; time++)
            for (const passerIdx of [0, 1]) {
                const t = time < prefixLength ? prefix[passerIdx][time] :
                    pattern[passerIdx][(time - prefixLength) % sequenceLength];
                if (typeof t === "string" && t !== "o") {
                    //single throw and we keep track of which hand it comes from
                    assert(allSync === undefined || allSync === false, "found single throw after sync throws")
                    allSync = false
                    const fromHandIdx: Hand = handSequence[passerIdx][time];
                    throws.push(genThrow(t, time, passerIdx, fromHandIdx))
                } else if (typeof t !== "string" && t.length === 2) {                    
                    //two throws at the same time, and we know which hand each comes from
                    assert(allSync === undefined || allSync === true, "found sync throw after single throws")
                    allSync = true
                    const [tRight, tLeft] = t
                    throws.push(genThrow(tRight, time, passerIdx, Hand.Right,0.5))
                    throws.push(genThrow(tLeft, time, passerIdx, Hand.Left,0.5))
                } else {
                    if (t !== "o")
                        throw Error("unexpected throw " + t)
                }
            }
        return throws
    }


    return {
        passerNames: ["A", "B"],
        startingHands: getStartingHands(genThrows(2), prefixLength + sequenceLength * 2,allSync===true),
        prefixPeriod: prefixLength,
        period: sequenceLength,
        getThrows: genThrows
    }
}


export function altHands(startingHands: Hand[], sequenceLength: number): Hand[][] {
    const result = []
    for (const s of startingHands) {
        const seq: Hand[] = []
        let hand = s
        for (let i = 0; i < sequenceLength; i++) {
            seq.push(hand)
            hand= (hand + 1) % 2
        }
        result.push(seq)
    }
    return result
}

function parseThrow(t: string): [number, boolean, boolean] {
    const isPass = t.includes("p")
    const isCrossing = t.includes("x")
    const value = parseInt(t.replace("p", "").replace("x", ""))
    assert(!isNaN(value), `invalid throw ${t}`)
    return [value, isPass, isCrossing]
}

function getStartingHands(throws: Throw[], _beats: number, allSync:boolean): [number, number][] {
    // console.log(throws)

    // (time, passer, hand) combinations when a throw happens
    // collect all throws
    const throwingHands: [number, number, Hand][] = []
    for (const t of throws) {
        const v: [number, number, Hand] = [t.throwTime, t.fromPasserIdx, t.fromHand]    
        assert(throwingHands.find(x => v[0] === x[0] && v[1] === x[1] && v[2] === x[2]) === undefined,
            `two or more throws from the same passer ${t.fromPasserIdx} and the same hand ${t.fromHand} on the same beat ${t.rethrowTime} not supported`)
        throwingHands.push(v)
    }


    // remove throws that are received
    for (const t of throws) {
        const v: [number, number, Hand] = [t.rethrowTime, t.toPasserIdx, t.toHand]    
        //for only for all-sync patterns we actually check the hands (otherwise hurrys won't work)
        const tIdx = throwingHands.findIndex(x => v[0] === x[0] && v[1] === x[1] && (!allSync||v[2] === x[2])) 
        if (tIdx>=0)
            throwingHands.splice(tIdx, 1)
    }

    // // check that no more than one throw is received by the same hand on the same beat
    // const receivingHands: [number, number, Hand][] = []
    // for (const t of throws) {
    //     const v: [number, number, Hand] = [t.rethrowTime, t.toPasserIdx, t.toHandIdx]    
    //     assert(receivingHands.find(x => v[0] === x[0] && v[1] === x[1] && v[2] === x[2]) === undefined,
    //         `two or more throws arriving to the same passer ${t.fromPasserIdx} and the same hand ${t.fromHandIdx} on the same beat ${t.rethrowTime}`)
    //     receivingHands.push(v)
    // }

    // console.log(throwingHands)
    const result: [number, number][] = [[0, 0], [0, 0]]
    for (const [_, passer, hand] of throwingHands) {
        result[passer][hand] += 1
    }
    return result
}

function swapHands(handSequence: Hand[][], toPasserIdx: number, causeTime: number) {
    const seq = handSequence[toPasserIdx]
    for (let i = causeTime; i < seq.length; i++) {
        seq[i] = (seq[i] + 1) % 2
    }
}
export function convertToLabel(throwToken: string, gallop: boolean, allSync: boolean): string {
    if (gallop) switch (throwToken) {
        case "4x": return "s*"
        case "4p": return "p*"
        case "4px": return "p*"
        case "5p": return "d*"
        case "5px": return "d*"
        case "6p": return "r*"
        case "6px": return "r*"
    }
    if (allSync) switch (throwToken) {
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
    }
    switch (throwToken) {
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
    throw Error("unknown throw " + throwToken)
}

