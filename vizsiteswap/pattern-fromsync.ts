import { alt, apply, betterError, buildLexer, expectEOF, expectSingleResult, kright, list, opt, ParseError, Parser, ParseResult, ParserOutput, rep, resultOrError, rule, seq, tok, Token } from "typescript-parsec";
import { Pattern, Throw } from "./pattern-structure";


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
    [true, /^h/g, TokenKind.Hurry],
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
        apply(alt(tok(TokenKind.Throw), tok(TokenKind.Hurry), tok(TokenKind.Empty)), v => v.text)
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
    ),validatePattern)
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
    const l = pattern[0].filter(x => x !== "h").length;
    const r = pattern[1].filter(x => x !== "h").length;
    if (l !== r) return "Pattern is of different length for both passers: " + JSON.stringify(pattern)
    return undefined
}

export function parseSyncPattern(expr: string): [TPattern, TPattern] {
    return expectSingleResult(expectEOF(PFullPattern.parse(tokenizer.parse(expr))));
}

export function createSiteswapPattern(sw: string, config: Partial<SyncPatternConfig>): Pattern {
    const {
        flipStraightCrossing,
        gallop
    } = { ...defaultSyncPatternConfig, ...config }

    // let startingHands = sw.getStartingHands();
    // if (startingJuggler === 1)
    //     startingHands = [[startingHands[1][1],startingHands[1][0]],startingHands[0] ];


    // const pattern = {
    //     passerNames: ["A", "B"],
    //     startingHands: startingHands,
    //     prefixPeriod: 0,
    //     prefixThrows: [],
    //     period: sw.length(),
    //     getThrows(iterationNr: number): Throw[] {
    //         if (iterationNr < 1) throw new Error("iterationNr must be >= 1");
    //         const ts: Throw[] = [];
    //         for (let idx = (iterationNr-1)*sw.length(); idx < iterationNr* sw.length(); idx++) {
    //             const passerIdx = (idx + startingJuggler) % 2;

    //             const t: Throw = {
    //                 throwTime: idx,
    //                 causeTime: sw.causes(idx),
    //                 rethrowTime: sw.thrownNext(idx),
    //                 fromPasserIdx: passerIdx,
    //                 toPasserIdx: (sw.jugglerAt(sw.thrownNext(idx))+ startingJuggler) % 2,
    //                 fromHandIdx: (idx + startingJuggler) % 4 < 2 ? 0 /*R*/ : 1 /*L*/,
    //                 toHandIdx: (sw.thrownNext(idx) + startingJuggler) % 4 < 2 ? 0 /*R*/ : 1 /*L*/,
    //                 label: sw.throwLetterAt(idx),
    //                 annotation: getStraightCrossText(passerIdx, sw.throwAt(idx))
    //             }
    //             ts.push(t);
    //         }
    //         return ts
    //     }
    // };
    // return pattern;
    throw Error("not implemented")
}
