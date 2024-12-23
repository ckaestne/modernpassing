import assert from "node:assert";
import { apply, buildLexer, expectEOF, expectSingleResult, kleft, kright, Parser, rep, rule, seq, tok } from "typescript-parsec";
import { altHands, convertToLabel, crossingPasses, PSequence, straightSelfs, SyncPatternConfig, TokenKind, TSequence } from "./pattern-fromsync.ts";
import { GroupPattern, GroupPatternLayout, Hand, PassLayout, PositionLayout, Throw } from "./pattern-structure.ts";


type TLayout = TPosition[]
type TRole = string
type TPosition = { shape: TShape, roles: TRole[] }
export enum TShape {
    Trapezoid,
    V,
    Circle,
    Box
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
    [true, /^(Circle|V|Trapezoid|Box)/g, MoreTokenKind.Shape],
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
        v => { return { shape: (v[0].text === "Circle" ? TShape.Circle : v[0].text === "V" ? TShape.V  : v[0].text === "Box" ? TShape.Box : TShape.Trapezoid), roles: [v[2][0], ...v[2][1]] } }
    ))
)
export const PLayout = rule<Tok, TLayout>();
PLayout.setPattern(
    kright(seq(tok(MoreTokenKind.Positions), tok(MoreTokenKind.Colon)), PShapes)
)

const PGroupSyncPattern = rule<Tok, [[TRole, TSequence][], TLayout]>();
PGroupSyncPattern.setPattern(
    ignoreNL(seq(kleft(PRows, tok(MoreTokenKind.NL)), PLayout))
)


function ignoreNL<TResult>(p: Parser<Tok, TResult>): Parser<Tok, TResult> {
    return kleft(kright(rep(tok(MoreTokenKind.NL)), p), rep(tok(MoreTokenKind.NL)))
}


export function parseGroupSyncPattern(input: string): [[TRole, TSequence][], TLayout] {
    const p = expectSingleResult(expectEOF(PGroupSyncPattern.parse(tokenizer.parse(input))));
    return p
}

export function parseLayout(input: string): TLayout {
    const p = expectSingleResult(expectEOF(PShapes.parse(tokenizer.parse(input))));
    return p
}

export function createLayout(input: string): GroupPatternLayout {
    return genLayout(parseLayout(input), [])
}

type SyncGroupPatternConfig = {
    useSimpleLabels: boolean // use s and p instead of 3 and 3p, etc.
}
const defaultSyncPatternConfig: SyncGroupPatternConfig = { useSimpleLabels: true }

export function createSyncGroupPattern(sw: string, config: Partial<SyncPatternConfig & {iterations: number}>): GroupPattern {
    const {
        // flipStraightCrossing,
        // gallop,
        // startingHands,
        useSimpleLabels,
        iterations = 1
    } = { ...defaultSyncPatternConfig, ...config }

    const [rows, layout] = parseGroupSyncPattern(sw)

    // if (rows.length < 3) throw new Error("Not enough rows for a group pattern")
    const sequenceLength = rows[0][1].length
    if (rows.some(([_, s]) => s.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    if (rows.some(([_, s]) => s.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    const roles = rows.map(([r, _]) => r)


    const crossingPass = crossingPasses //flipStraightCrossing ? straightPasses : crossingPasses
    const toSameHandThrows = straightSelfs.concat(crossingPass)

    function genThrows(iterations: number): Throw[] {
        const throws: Throw[] = [];
        const handSequence: (0 | 1)[][] = altHands(roles.map(() => 0), iterations * sequenceLength + 9) // altHands([startingHands[0], (startingHands[1] + (flipStraightCrossing ? 1 : 0)) % 2], prefixLength + iterations * sequenceLength + 9);
        //TODO hand sequence may change in animations when switching segment




        function genThrow(throwToken: string, time: number, passerIdx: number, fromHand: Hand, timeFactor: number = 1): Throw {
            const [value, isPass, isCrossing, passTargetRole] = parseThrow(throwToken)
            const causeTime = time + (value - 2) * timeFactor;
            const rethrowTime = time + value * timeFactor
            assert(!isPass || (passTargetRole && roles.includes(passTargetRole)), `invalid pass target ${passTargetRole} in pass ${throwToken}`)
            const toPasserIdx = isPass ? roles.indexOf(passTargetRole!) : passerIdx;

            const throwLabel = throwToken.replace(/[A-Z]/g, "")
            const labelSubfix = isPass ? throwToken.match(/[A-Z]/g)![0] : ""

            const toHand: Hand = toSameHandThrows.includes(throwLabel) ? fromHand : (fromHand + 1) % 2
            //updates to handsequence do not matter in sync throws, but also
            const expectedToHandIdx: Hand = handSequence[toPasserIdx][causeTime];
            if (toHand !== expectedToHandIdx) {
                //found hurry, swapping handsequence at caused time
                console.log("hurry throw", throwLabel, "from", fromHand, "to", toHand, "expected", expectedToHandIdx, "at", causeTime)
                throw new Error("hurry throws not supported in group patterns")
            }
            const annotation = isPass ? (fromHand === toHand ? "X" : "||") : ""
            const label = (useSimpleLabels ? convertToLabel(throwLabel, false, false) : throwLabel) + labelSubfix
            return {
                throwTime: time, // gallopOffset(time, fromHandIdx),
                fromPasserIdx: passerIdx,
                fromHand,
                causeTime: causeTime, // gallopOffset(causeTime, toHand),
                rethrowTime: rethrowTime, // gallopOffset(rethrowTime, toHand),
                toPasserIdx,
                toHand: toHand,
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

    const oddLength = (sequenceLength*iterations) % 2 === 1

    return {
        pattern: {
            passerNames: roles,
            startingHands:  /*TODO*/ roles.map(() => [2, 1]),
            prefixPeriod: 0,
            period: sequenceLength,
            getThrows: genThrows
        },
        layout: genLayout(layout, genThrows(oddLength ? iterations*2: iterations))
    }
}

function genLayout(layout: TLayout, throws: Throw[]): GroupPatternLayout {

    const positions: PositionLayout[] = []
    assert(layout.length === 1, "only one shape supported")
    assert([TShape.Circle, TShape.V, TShape.Box, TShape.Trapezoid].includes(layout[0].shape), "only circle supported")
    assert(layout[0].shape !== TShape.V || [3,4].includes(layout[0].roles.length), "V shape requires 3 or 4 roles")
    assert(layout[0].shape !== TShape.Box || layout[0].roles.length===4, "Box shape requires 4 roles")
    assert(layout[0].shape !== TShape.Trapezoid || layout[0].roles.length===5, "Trapezoid shape requires 5 roles")
    const roles = layout[0].roles

    // all x and y positions are relative between 0 and 1; that is on a circle with a radius of 0.5
    if (layout[0].shape === TShape.Circle) {
        let angle = -Math.PI / 2
        for (let i = 0; i < roles.length; i++) {
            const x = Math.cos(angle) * 0.5 + 0.5
            const y = Math.sin(angle) * 0.5 + 0.5
            positions.push({ passerIdx: i, label: roles[i], x, y })
            angle += 2 * Math.PI / roles.length
        }
    } else if (layout[0].shape === TShape.V) {
        const angles = roles.length===3? [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30]: [/*A*/ 270, /*B*/90 - 55, /*C*/90 , /*D*/90 + 55]
        for (let i = 0; i < roles.length; i++) {
            const x = Math.cos(angles[i]* Math.PI / 180) * 0.5 + 0.5
            const y = Math.sin(angles[i]* Math.PI / 180) * 0.5 + 0.5
            positions.push({ passerIdx: i, label: roles[i], x, y })
        }
    } else if (layout[0].shape === TShape.Box) {
        const angles = [-30,30,150,210].map(a => a-90)
        for (let i = 0; i < roles.length; i++) {
            const x = Math.cos(angles[i]* Math.PI / 180) * 0.5 + 0.5
            const y = Math.sin(angles[i]* Math.PI / 180) * 0.5 + 0.5
            positions.push({ passerIdx: i, label: roles[i], x, y })
        }
    } else if (layout[0].shape === TShape.Trapezoid) {
        positions.push({ passerIdx:0, label: roles[0], x: 0.25, y: 0 })
        positions.push({passerIdx:1, label: roles[1], x: 0.75, y: 0 })
        positions.push({ passerIdx:2,label: roles[2], x: 0.0, y: 1 })
        positions.push({ passerIdx:3,label: roles[3], x: 0.5, y: 1 })
        positions.push({ passerIdx:4,label: roles[4], x: 1, y: 1 })
    }

    function pass(t: Throw): PassLayout {
        return { 
            fromX: positions[t.fromPasserIdx].x, 
            fromY: positions[t.fromPasserIdx].y, 
            fromHand: t.fromHand, 
            toX: positions[t.toPasserIdx].x,
            toY: positions[t.toPasserIdx].y,
            toHand: t.toHand, 
            label: (t.throwTime + 1).toString()
        }
    }

    // console.log(throws)
    const passesToRender: Map<[number, number, number, number], PassLayout> = new Map()
    const passesPerBeat: Map<number, PassLayout[]> = new Map()
    for (const t of throws) if (t.fromPasserIdx !== t.toPasserIdx) {
        // update passes for overall static layout
        const p = getOrUpdate4(passesToRender, t.fromPasserIdx, t.fromHand, t.toPasserIdx, t.toHand, () => {
            const x = pass(t)
            x.label = ""
            return x
        })
        if (p.label !== "") p.label += ", "
        p.label += (t.throwTime + 1)

        // updated passes for individual frames
        const passesOnBeat = getOrUpdate(passesPerBeat, t.throwTime, () => [])
        passesOnBeat.push(pass(t))
    }

    return {
        static: { positions: positions, passes: passesToRender.values().toArray() },
        frames: passesPerBeat.keys().map(k => {
            return {
                label: (k + 1).toString(),
                static: { positions, passes: passesPerBeat.get(k)! }
            }
        }).toArray()
    }
}


function getOrUpdate<A, B>(m: Map<A, B>, key: A, def: () => B): B {
    const v = m.get(key)
    if (v === undefined) {
        const nv = def()
        m.set(key, nv)
        return nv
    } else return v
}

function getOrUpdate4<B>(m: Map<[number, number, number, number], B>, key1: number, key2: number, key3: number, key4: number, def: () => B): B {
    const k = m.keys().find(k => k[0] === key1 && k[1] === key2 && k[2] === key3 && k[3] === key4)
    if (k === undefined) {
        const nv = def()
        m.set([key1, key2, key3, key4], nv)
        return nv
    } else return m.get(k)!
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