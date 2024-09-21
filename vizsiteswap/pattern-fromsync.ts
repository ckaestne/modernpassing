import { alt, apply, betterError, buildLexer, expectEOF, expectSingleResult, kright, list, nil, opt, ParseError, Parser, ParseResult, ParserOutput, rep, resultOrError, rule, seq, tok, Token } from "typescript-parsec";
import { Hand, Pattern, Throw } from "./pattern-structure";
import assert from "node:assert";
import { start } from "node:repl";


export const defaultSyncPatternConfig: SyncPatternConfig = {
    startingHands: [0, 0],
    flipStraightCrossing: false,
    gallop: false
}
export type SyncPatternConfig = {
    startingHands: number[], // one number per passer, 0 for right hand, 1 for left hand
    flipStraightCrossing: boolean,
    gallop: boolean
}


enum TokenKind {
    Throw, Comma, Arrow, Empty, Hurry,
    LParen,
    RParen,
    Space,
}
const tokenizer = buildLexer([
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

type TThrow = string | [string, string] // single throw or multiplex
type TSequence = TThrow[] // one passer's sequence of throws
type TPattern = TSequence[] // a sequence for each passer

const PFullPattern = rule<TokenKind, [TPattern, TPattern]>();
const PPattern = rule<TokenKind, TPattern>();
const PSequence = rule<TokenKind, TSequence>();
const PThrow = rule<TokenKind, TThrow>();

PThrow.setPattern(
    alt(
        apply(seq(tok(TokenKind.LParen), tok(TokenKind.Throw), tok(TokenKind.Comma), tok(TokenKind.Throw), tok(TokenKind.RParen)),
            v => [v[1].text, v[3].text]),
        apply(alt(tok(TokenKind.Throw), tok(TokenKind.Empty)), v => v.text)
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
            let result: ParseResult<TKind, TResult>[] = [];
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
const straightPasses = ["1p", "2px", "3p", "4px", "5p", "6px", "7p", "8px", "9p"]
const crossingPasses = ["1px", "2p", "3px", "4p", "5px", "6p", "7px", "8p", "9px"]
const straightSelfs = ["1x","2","3x","4","5x","6","7x","8","9x"] // R to R or L to L (even if it's the other person's hand)
const crossingSelfs = ["1","2x","3","4x","5","6x","7","8x","9"] // R to L or L to R


export function createSyncPattern(sw: string, config: Partial<SyncPatternConfig>): Pattern {
    const {
        flipStraightCrossing,
        gallop,
        startingHands
    } = { ...defaultSyncPatternConfig, ...config }

    const [prefix, pattern] = parseSyncPattern(sw)


    assert(prefix.length === 0 || prefix.length == pattern.length, "prefix must have same length for both passers")
    assert(pattern.length === 2, "only two passers supported for now")
    assert(pattern[0].length === pattern[1].length, "pattern must have same length for both passers")
    const sequenceLength = pattern[0].length;
    const prefixLength = prefix.length > 0 ? prefix[0].length : 0

    const crossingPass = flipStraightCrossing ? straightPasses : crossingPasses
    const toSameHandThrows = straightSelfs.concat(crossingPass)



    function genThrows(iterations: number): [Throw, boolean][] {
        const throws: [Throw, boolean][] = [];
        const handSequence: (0 | 1)[][] = altHands([startingHands[0], (startingHands[1] + (flipStraightCrossing ? 1 : 0)) % 2], prefixLength + iterations * sequenceLength+9);

        for (let time = 0; time < prefixLength + iterations * sequenceLength; time++)
            for (const passerIdx of [0, 1]) {
                const t = time < prefixLength ? prefix[passerIdx][time] :
                    pattern[passerIdx][(time - prefixLength) % sequenceLength];
                if (typeof t === "string" && t !== "o") {
                    const [value, isPass, isCrossing] = parseThrow(t)
                    const causeTime = time + value - 2;
                    const rethrowTime = time + value;
                    const toPasserIdx = isPass ? (passerIdx + 1) % 2 : passerIdx;
                    const fromHandIdx: Hand = handSequence[passerIdx][time];
                    const toHand: Hand = toSameHandThrows.includes(t) ? fromHandIdx : (fromHandIdx + 1) % 2
                    const expectedToHandIdx: Hand = handSequence[toPasserIdx][causeTime];
                    let annotation = isPass ? (crossingPass.includes(t) ? "X" : "||") : ""
                    if (toHand !== expectedToHandIdx) {
                        //found hurry, swapping handsequence at caused time
                        swapHands(handSequence, toPasserIdx, causeTime)
                        // console.log(`found hurry at ${time} (${t}) in ${sw} from (${passerIdx},${fromHandIdx}) to hand (${toPasserIdx},${toHand}); expected (${toPasserIdx},${expectedToHandIdx})`) 
                        annotation+="H"
                    }
                    throws.push([{
                        throwTime: time,
                        causeTime,
                        rethrowTime,
                        fromPasserIdx: passerIdx,
                        toPasserIdx,
                        fromHandIdx,
                        toHandIdx:toHand,
                        label: t,
                        annotation
                    }, true])
                } else if (t === "o") {
                    //push fake throw, that is only needed for starting hands computation, but ignored filtered out otherwise
                    throws.push([{
                        throwTime: time,
                        causeTime: time,
                        rethrowTime: time,
                        fromPasserIdx: passerIdx,
                        toPasserIdx: passerIdx,
                        fromHandIdx: handSequence[passerIdx][time],
                        toHandIdx: handSequence[passerIdx][time],
                        label: "o",
                        annotation: ""
                    }, false])
                }
            }
        return throws
    }


    return {
        passerNames: ["A", "B"],
        startingHands: getStartingHands(genThrows(2).map(v => v[0]), prefixLength + sequenceLength * 2),
        prefixPeriod: prefixLength,
        period: sequenceLength,
        getThrows(n: number) {
            return genThrows(n).filter(v => v[1]).map(v => v[0])
        }
    }
}


function altHands(startingHands: Hand[], sequenceLength: number): Hand[][] {
    const result = []
    for (let s of startingHands) {
        const seq: Hand[] = []
        let hand = s
        for (let i = 0; i < sequenceLength; i++) {
            seq.push(s)
            s = (s + 1) % 2
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

function getStartingHands(throws: Throw[], beats: number): [number, number][] {
    // console.log(throws)
    const starts: number[][] = [Array(beats).fill(1), Array(beats).fill(1)];
    const handOrder: (Hand | undefined)[][] = [Array(beats).fill(undefined), Array(beats).fill(undefined)];
    for (const t of throws) {
        assert(handOrder[t.fromPasserIdx][t.throwTime] === undefined, `two or more throws from the same passer on the same beat ${t.rethrowTime} not yet supported`)
        handOrder[t.fromPasserIdx][t.throwTime] = t.fromHandIdx
        if (t.rethrowTime < beats) {
            assert(starts[t.toPasserIdx][t.rethrowTime] === 1, `two or more throws landing on the same beat ${t.rethrowTime}, ${starts}`)
            starts[t.toPasserIdx][t.rethrowTime] = 0
        }
    }

    assert(handOrder[0].filter(v => v === undefined).length === 0, `missing throws from passer A ${handOrder[0]}`)
    assert(handOrder[1].filter(v => v === undefined).length === 0, `missing throws from passer B ${handOrder[1]}`)

    const result: [number, number][] = [[0, 0], [0, 0]]
    for (let i = 0; i < beats; i++) {
        for (let passerIdx = 0; passerIdx < 2; passerIdx++) {
            result[passerIdx][handOrder[passerIdx][i]!] += starts[passerIdx][i]
        }
    }
    return result
}

function swapHands(handSequence: Hand[][], toPasserIdx: number, causeTime: number) {
    const seq=handSequence[toPasserIdx]
    for (let i = causeTime; i < seq.length; i++) {
        seq[i] = (seq[i] + 1) % 2
    }
}
