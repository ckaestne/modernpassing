import { alt, apply, betterError, buildLexer, expectEOF, expectSingleResult, kleft, kright, list, nil, opt, ParseError, Parser, ParseResult, ParserOutput, rep, resultOrError, rule, seq, tok, Token } from "typescript-parsec";
import { GroupPattern, Hand, Pattern, Throw } from "./pattern-structure.js";
import assert from "node:assert";
import { altHands, convertToLabel, crossingPasses, PSequence, straightSelfs, TokenKind, TPattern, TSequence } from "./pattern-fromsync.js";


type TLayout = TPosition[]
type TRole = string
type TPosition = { shape: TShape, roles: TRole[] }
export enum TShape {
    Trapezoid,
    V,
    Circle
}
type TGroupPattern = {
    roles: TRole[],
    throws: TSequence[],
    layout: TLayout
}


//grammar
// row = Role: Pattern [-> Role]
// positions = "positions:" [Shape(Role [, Role]*)]+
// Shape = Trapezoid | V | Circle
// pattern = (row \n)+ Positions


export enum MoreTokenKind {
    Colon,
    NL,
    Role,
    Positions,
    Shape
}
type Tok = TokenKind | MoreTokenKind
export const tokenizer = buildLexer<Tok>([
    [true, /^(\d(p)?(x)?[A-Z]?)/g, TokenKind.Throw],
    [true, /^positions/g, MoreTokenKind.Positions],
    [true, /^(Circle|V|Trapezoid)/g, MoreTokenKind.Shape],
    [true, /^[A-Z0]/g, MoreTokenKind.Role],
    [true, /^o/g, TokenKind.Empty],
    [true, /^\,/g, TokenKind.Comma],
    [true, /^:/g, MoreTokenKind.Colon],
    [true, /^\(/g, TokenKind.LParen],
    [true, /^\)/g, TokenKind.RParen],
    [true, /^->/g, TokenKind.Arrow],
    [true, /^\n/g, MoreTokenKind.NL],
    [false, /^\s/g, TokenKind.Space]
]);


const PRole = rule<Tok, TRole>();
PRole.setPattern(apply(tok(MoreTokenKind.Role), v => v.text))
export const PRow = rule<Tok, [TRole, TSequence]>();
PRow.setPattern(
    seq(kleft(PRole, tok(MoreTokenKind.Colon)), PSequence)
)
export const PRows = rule<Tok, [TRole, TSequence][]>();
PRows.setPattern(
    apply(seq(PRow, rep(kright(tok(MoreTokenKind.NL), PRow))),
        v => [v[0], ...v[1]])
)
export const PShapes = rule<Tok, TLayout>();
PShapes.setPattern(
    rep(apply(
        seq(tok(MoreTokenKind.Shape), tok(TokenKind.LParen), seq(PRole, rep(kright(tok(TokenKind.Comma), PRole))), tok(TokenKind.RParen)),
        v => { return { shape: (v[0].text === "Circle" ? TShape.Circle : v[0].text === "V" ? TShape.V : TShape.Trapezoid), roles: [v[2][0], ...v[2][1]] } }
    ))
)
export const PLayout = rule<Tok, TLayout>();
PLayout.setPattern(
    kright(seq(tok(MoreTokenKind.Positions), tok(MoreTokenKind.Colon)), PShapes)
)

const PGroupSyncPattern = rule<Tok, [[TRole, TSequence][], TLayout]>();
PGroupSyncPattern.setPattern(
    seq(kleft(PRows, tok(MoreTokenKind.NL)), PLayout)
)



export function parseGroupSyncPattern(input: string): [[TRole, TSequence][], TLayout] {
    const p = expectSingleResult(expectEOF(PGroupSyncPattern.parse(tokenizer.parse(input))));




    return p

}



type SyncGroupPatternConfig = {
    useSimpleLabels: boolean // use s and p instead of 3 and 3p, etc.
}
const defaultSyncPatternConfig: SyncGroupPatternConfig = { useSimpleLabels: true }

export function createSyncGroupPattern(sw: string, config: Partial<SyncGroupPatternConfig>): GroupPattern {
    const {
        // flipStraightCrossing,
        // gallop,
        // startingHands,
        useSimpleLabels
    } = { ...defaultSyncPatternConfig, ...config }

    const [rows, layout] = parseGroupSyncPattern(sw)

    if (rows.length < 3) throw new Error("Not enough rows for a group pattern")
    const sequenceLength = rows[0][1].length
    if (rows.some(([_, s]) => s.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    if (rows.some(([_, s]) => s.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    const roles = rows.map(([r, _]) => r)


    const crossingPass = crossingPasses //flipStraightCrossing ? straightPasses : crossingPasses
    const toSameHandThrows = straightSelfs.concat(crossingPass)

    function genThrows(iterations: number): Throw[] {
        const throws: Throw[] = [];
        const handSequence: (0 | 1)[][] = altHands(roles.map(() => 0), iterations*sequenceLength + 9) // altHands([startingHands[0], (startingHands[1] + (flipStraightCrossing ? 1 : 0)) % 2], prefixLength + iterations * sequenceLength + 9);
        //TODO hand sequence may change in animations when switching segment




        function genThrow(throwToken: string, time: number, passerIdx: number, fromHandIdx: Hand, timeFactor: number = 1): Throw {
            const [value, isPass, isCrossing, passTargetRole] = parseThrow(throwToken)
            const causeTime = time + (value - 2) * timeFactor;
            const rethrowTime = time + value * timeFactor
            assert(!isPass || (passTargetRole && roles.includes(passTargetRole)), `invalid pass target ${passTargetRole} in pass ${throwToken}`)
            const toPasserIdx = isPass ? roles.indexOf(passTargetRole!) : passerIdx;

            const throwLabel = throwToken.replace(/[A-Z]/g, "")
            const labelSubfix = isPass ? throwToken.match(/[A-Z]/g)![0] : ""

            const toHand: Hand = toSameHandThrows.includes(throwLabel) ? fromHandIdx : (fromHandIdx + 1) % 2
            //updates to handsequence do not matter in sync throws, but also
            const expectedToHandIdx: Hand = handSequence[toPasserIdx][causeTime];
            if (toHand !== expectedToHandIdx) {
                //found hurry, swapping handsequence at caused time
                console.log("hurry throw", throwLabel, "from", fromHandIdx, "to", toHand, "expected", expectedToHandIdx, "at", causeTime)
                throw new Error("hurry throws not supported in group patterns")
            }
            let annotation = isPass ? (fromHandIdx === toHand ? "X" : "||") : ""
            let label = (useSimpleLabels ? convertToLabel(throwLabel, false, false) : throwLabel) + labelSubfix
            return {
                throwTime: time, // gallopOffset(time, fromHandIdx),
                fromPasserIdx: passerIdx,
                fromHandIdx,
                causeTime: causeTime, // gallopOffset(causeTime, toHand),
                rethrowTime: rethrowTime, // gallopOffset(rethrowTime, toHand),
                toPasserIdx,
                toHandIdx: toHand,
                label: label,
                annotation
            }
        }


        for (let time = 0; time < iterations * sequenceLength; time++)
            for (let passerIdx = 0; passerIdx < roles.length; passerIdx++) {
                const t =
                    rows[passerIdx][1][time % sequenceLength];

                assert(t && typeof t === "string" && t !== "o")

                //single throw and we keep track of which hand it comes from
                const fromHandIdx: Hand = handSequence[passerIdx][time];
                throws.push(genThrow(t, time, passerIdx, fromHandIdx))
            }
        return throws
    }


    return {
        pattern: {
            passerNames: roles,
            startingHands:  /*TODO*/ roles.map(() => [2, 1]),
            prefixPeriod: 0,
            period: sequenceLength,
            getThrows: genThrows
        }
    }
}


function parseThrow(t: string): [number, boolean, boolean, TRole | null] {
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