import assert from "node:assert";
import { alt, alt_sc, apply, buildLexer, expectEOF, expectSingleResult, kleft, kright, opt, rep, rule, seq, str, tok } from "npm:typescript-parsec";
import { createPattern, GroupPatternLayout, Role } from "@modernpassing/pattern"
import { defaultLayoutForTwo, parseLayout, parseMovements, TLayout, TMovement } from "./pattern-shapes.ts";

/**
 * parsec parser (and some simpler hacky things)
 * 
 * see `pattern notation.md` for syntax specifcation
 */


//grammar
// row = Role: Pattern [-> Role]
// positions = "positions:" [Shape(Role [, Role]*)]+
// Shape = Trapezoid | V | Circle
// pattern = (row \n)+ Positions


// data structures for raw parsing results
type TGroupPattern = {
    roles: Role[],
    throws: TSequence[],
    layout: TLayout,
    movement?: TMovement
}
export type TPatternRow = {
    role: Role,
    sequence: TSequence,
    relabel?: Role,
    isManipulator: boolean
}
export type TThrow = string | [string, string] // single throw or sync throw with both hands
export type TSequence = TThrow[] // one passer's sequence of throws
export type TPattern = TSequence[] // a sequence for each passer


export enum TokenKind {
    Throw=0, Comma=1, Arrow=2, Empty=3, Hurry=4,
    LParen=5,
    RParen=6,
    Space=7,
    Colon=8,
    //     NL,
    Role=9,
    ManipulatorAction=10,
    //     Positions,
    //     Shape,
    //     Free,
    //     Number
}
export const tokenizer = buildLexer<TokenKind>([
    [true, /^([0-9a-y](p)?[A-Z]?(x)?)|^,/g, TokenKind.Throw],
    [true, /^[A-Z0_]/g, TokenKind.Role],
    [true, /^(S[A-Z]{1,2}(e[ox\[\]]?|l[ox\[\]]?|[ox\[\]]|v|c|d[1-9]?)?|I[A-Z]{1,2}(e|l|v[oxb\[\]]|v|c)?|C[A-Z]{0,2}f?|zf?|[o\.-])/g, TokenKind.ManipulatorAction],
    //     [true, /^positions/g, TokenKind.Positions],
    //     [true, /^(Circle|V|Trapezoid|Box)/g, TokenKind.Shape],
    //     [true, /^Free/g, TokenKind.Free],
    [true, /^[\.-]/g, TokenKind.Empty],
    [true, /^\,/g, TokenKind.Comma],
    [true, /^:/g, TokenKind.Colon],
    [true, /^\(/g, TokenKind.LParen],
    [true, /^\)/g, TokenKind.RParen],
    [true, /^--|→/g, TokenKind.Arrow],
    //     [true, /^\n/g, TokenKind.NL],
    [false, /^\s/g, TokenKind.Space],
    //     [true, /^\d\.\d+/g, TokenKind.Number]
]);




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
        apply(seq(PSequence, opt(kright(tok(TokenKind.Comma), PSequence))),
            v => v[1] ? [v[0], v[1]] : [v[0], v[0]]
        )
)

PFullPattern.setPattern(
    apply(seq(PPattern, opt(kright(tok(TokenKind.Arrow), PPattern))),
        v => v[1] ? [v[0], v[1]] : [[], v[0]]
    )
)


const PRole = rule<TokenKind, Role>();
PRole.setPattern(apply(tok(TokenKind.Role), v => v.text))

const PAtomicManipulatorAction = rule<TokenKind, string>();
PAtomicManipulatorAction.setPattern(alt_sc(
    apply(tok<TokenKind>(TokenKind.ManipulatorAction), t=>t.text), 
    apply(tok<TokenKind>(TokenKind.Throw),t=>t.text),
    apply(str("C"),t=>t.text)
))

export const PManipulatorAction = rule<TokenKind, TThrow>();
PManipulatorAction.setPattern(
    alt_sc(
        apply(seq(tok(TokenKind.LParen), PAtomicManipulatorAction, str(","), PAtomicManipulatorAction, tok(TokenKind.RParen)),
            v => [v[1], v[3]]),
        PAtomicManipulatorAction
    )
)
export const PManipulatorSequence = rule<TokenKind, TThrow[]>();
PManipulatorSequence.setPattern(
    apply(seq(PManipulatorAction, rep(PManipulatorAction)),
        v => [v[0], ...v[1]])
)

export const PRow = rule<TokenKind, TPatternRow>();
PRow.setPattern(
    alt_sc(
        apply(seq(kleft(PRole, tok(TokenKind.Colon)), PSequence, opt(kright(tok(TokenKind.Arrow), PRole))), createPatternRow(false)),
        apply(seq(kleft(PRole, tok(TokenKind.Colon)), PManipulatorSequence, opt(kright(tok(TokenKind.Arrow), PRole))), createPatternRow(true))
    )
)


function createPatternRow(isManipulator: boolean) {
    return function (v: [Role, TSequence, Role?]): TPatternRow {
        return { role: v[0], sequence: v[1], relabel: v[2], isManipulator }
    }
}

export function parseGroupPattern(input: string): [TPatternRow[], TLayout?, TMovement?] {
    const patternLines = input.split("\n")
    let positionsLine: string = ""
    const movementLine: string[] = []
    const positionsLineIdx = patternLines.findIndex(l => l.trimStart().startsWith("positions:"))
    if (positionsLineIdx !== -1) {
        positionsLine = patternLines[positionsLineIdx].split(":")[1]
        patternLines.splice(positionsLineIdx, 1);
    }

    let movementLineIdx = patternLines.findIndex(l => l.trimStart().startsWith("move:"))
    while (movementLineIdx !== -1) {
        movementLine.push(patternLines[movementLineIdx].split(":")[1])
        patternLines.splice(movementLineIdx, 1);
        movementLineIdx = patternLines.findIndex(l => l.trimStart().startsWith("move:"))
    }

    const rows = patternLines.filter(l => l.trim().length > 0).map(l => expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(l)))))

    const baseRows = rows.filter(r => !r.isManipulator)
    const manipulatorRows = rows.filter(r => r.isManipulator)
    if (baseRows.length < 2) throw new Error("Need at least two non-manipulator roles in a pattern")
    const sequenceLength = baseRows[0].sequence.length
    if (baseRows.some(r => r.sequence.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    if (manipulatorRows.some(r => r.sequence.length > sequenceLength)) throw new Error("manipulator sequence cannot be longer than pattern sequence")
    for (const mrow of manipulatorRows) 
        while (mrow.sequence.length<sequenceLength) 
            mrow.sequence.push('.')

    if (rows.filter(r => !r.isManipulator).length !== 2 && positionsLineIdx === -1)
        throw new Error("patterns with more than two passers need a `positions:` line")
    const layout = (positionsLineIdx !== -1) ? parseLayout(positionsLine) : undefined //defaultLayoutForTwo(rows.filter(r => !r.isManipulator).map(r => r.role))

    const movement = movementLine ? parseMovements(movementLine, rows.map((x) => x.role)) : undefined


    return [rows, layout, movement]
}




// function getOrUpdate<A, B>(m: Map<A, B>, key: A, def: () => B): B {
//     const v = m.get(key)
//     if (v === undefined) {
//         const nv = def()
//         m.set(key, nv)
//         return nv
//     } else return v
// }

// function getOrUpdate4<B>(m: Map<[number, number, number, number], B>, key1: number, key2: number, key3: number, key4: number, def: () => B): B {
//     const k = m.keys().find(k => k[0] === key1 && k[1] === key2 && k[2] === key3 && k[3] === key4)
//     if (k === undefined) {
//         const nv = def()
//         m.set([key1, key2, key3, key4], nv)
//         return nv
//     } else return m.get(k)!
// }





function parseThrow(t: string): [number, boolean, boolean, Role | null] {
    const isPass = t.includes("p")
    const isCrossing = t.includes("x")
    const roleMatch = t.match(/[A-Z]/g);
    assert(roleMatch === null || roleMatch.length === 1, `invalid throw ${t}, multiple target roles found`);
    const role = roleMatch ? roleMatch[0] : null;
    const value = parseInt(t.replace("p", "").replace("x", "").replace(/[A-Z]/g, ""))
    assert(!isNaN(value), `invalid throw ${t}`)
    assert(!isPass || role, "passing throw without target role")
    return [value, isPass, isCrossing, role]
}

