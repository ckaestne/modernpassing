import { alt, apply, betterError, buildLexer, expectEOF, expectSingleResult, kright, list, nil, opt, ParseError, Parser, ParseResult, ParserOutput, rep, resultOrError, rule, seq, tok, Token } from "typescript-parsec";
import { Pattern, Throw } from "./pattern-structure";
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

export function createSyncPattern(sw: string, config: Partial<SyncPatternConfig>): Pattern {
    const {
        flipStraightCrossing,
        gallop,
        startingHands
    } = { ...defaultSyncPatternConfig, ...config }

    const [prefix, pattern] = parseSyncPattern(sw)


    assert(prefix.length === 0, "prefix throws not supported yet")
    assert(pattern.length === 2, "only two passers supported for now")
    assert(pattern[0].length === pattern[1].length, "pattern must have same length for both passers")
    const sequenceLength = pattern[0].length;
    const handSequence: (0 | 1)[][] = altHands(startingHands, sequenceLength);

    function getThrows(iterationNr: number): Throw[] {
        const throws: Throw[] = [];

        for (const passerIdx of [0, 1])
            for (let time = (iterationNr - 1) * sequenceLength; time < iterationNr * sequenceLength; time++) {
                const t = pattern[passerIdx][time % sequenceLength];
                if (typeof t === "string") {
                    const [value, isPass, isCrossing] = parseThrow(t)
                    const causeTime = time + value - 2;
                    const rethrowTime = time + value;
                    const toPasserIdx = isPass ? (passerIdx + 1) % 2 : passerIdx;
                    const fromHandIdx: Hand = (handSequence[passerIdx][time % sequenceLength] + (sequenceLength % 2)) % 2;
                    const toHandIdx: Hand = (handSequence[toPasserIdx][time % sequenceLength] + (sequenceLength % 2)) % 2;
                    const annotation = isCrossing ? "X" : ""
                    throws.push({
                        throwTime: time,
                        causeTime,
                        rethrowTime,
                        fromPasserIdx: passerIdx,
                        toPasserIdx,
                        fromHandIdx,
                        toHandIdx,
                        label: t,
                        annotation
                    })
                }


            }
        return throws
    }


    return {
        passerNames: ["A", "B"],
        startingHands: getStartingHands(getThrows(1).concat(getThrows(2)), sequenceLength * 2),
        prefixPeriod: 0,
        prefixThrows: [],
        period: sequenceLength,
        getThrows
    }
}

enum Hand {
    Right, Left
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
    const value = t.replace("p", "").replace("x", "")
    return [parseInt(value), isPass, isCrossing]
}

function getStartingHands(throws: Throw[], beats: number): [number, number][] {
    console.log(throws)
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