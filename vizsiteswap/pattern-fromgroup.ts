import assert from "node:assert";
import { alt, alt_sc, apply, buildLexer, expectEOF, expectSingleResult, kleft, kright, opt, Parser, rep, rule, seq, str, tok } from "npm:typescript-parsec";
import { altHands, convertToLabel, crossingPasses, parseSyncPattern, PSequence, straightSelfs, SyncPatternConfig, TokenKind, TSequence, TThrow } from "./pattern-fromsync.ts";
import { BackgroundLayout, GroupPattern, GroupPatternLayout, Hand, MovementSegment, MovementSequence, MovementTrigger, PassAnimation, PassLayout, PositionLayout, Role, Throw } from "./pattern-structure.ts";
import { Relabel } from "./pattern-structure.ts";
import { PatternPaths } from "./pattern-paths.ts";
import { createShapeLayout, defaultLayoutForTwo, parseLayout, parseMovements, TLayout, TMovement } from "./pattern-shapes.ts";



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


//grammar
// row = Role: Pattern [-> Role]
// positions = "positions:" [Shape(Role [, Role]*)]+
// Shape = Trapezoid | V | Circle
// pattern = (row \n)+ Positions


export enum MoreTokenKind {
    Colon=8,
    //     NL,
    Role=9,
    ManipulatorAction=10,
    //     Positions,
    //     Shape,
    //     Free,
    //     Number
}
type Tok = TokenKind | MoreTokenKind
export const tokenizer = buildLexer<Tok>([
    [true, /^([0-9a-z](p)?(x)?[A-Z]?)|^,/g, TokenKind.Throw],
    [true, /^[A-Z0_]/g, MoreTokenKind.Role],
    [true, /^(S[A-Z]{1,2}(e[ox\[\]]?|l[ox\[\]]?|[ox\[\]]|v|c|d)?|I[A-Z]{1,2}(e|l|v[oxb\[\]]|v|c)?|C[A-Z]{0,2}f?|zf?|[o\.-])/g, MoreTokenKind.ManipulatorAction],
    //     [true, /^positions/g, MoreTokenKind.Positions],
    //     [true, /^(Circle|V|Trapezoid|Box)/g, MoreTokenKind.Shape],
    //     [true, /^Free/g, MoreTokenKind.Free],
    [true, /^[\.-]/g, TokenKind.Empty],
    [true, /^\,/g, TokenKind.Comma],
    [true, /^:/g, MoreTokenKind.Colon],
    [true, /^\(/g, TokenKind.LParen],
    [true, /^\)/g, TokenKind.RParen],
    [true, /^->/g, TokenKind.Arrow],
    //     [true, /^\n/g, MoreTokenKind.NL],
    [false, /^\s/g, TokenKind.Space],
    //     [true, /^\d\.\d+/g, MoreTokenKind.Number]
]);


const PRole = rule<Tok, Role>();
PRole.setPattern(apply(tok(MoreTokenKind.Role), v => v.text))

const PAtomicManipulatorAction = rule<Tok, string>();
PAtomicManipulatorAction.setPattern(alt_sc(
    apply(tok<Tok>(MoreTokenKind.ManipulatorAction), t=>t.text), 
    apply(tok<Tok>(TokenKind.Throw),t=>t.text),
    apply(str("C"),t=>t.text)
))

export const PManipulatorAction = rule<Tok, TThrow>();
PManipulatorAction.setPattern(
    alt_sc(
        apply(seq(tok(TokenKind.LParen), PAtomicManipulatorAction, str(","), PAtomicManipulatorAction, tok(TokenKind.RParen)),
            v => [v[1], v[3]]),
        PAtomicManipulatorAction
    )
)
export const PManipulatorSequence = rule<Tok, TThrow[]>();
PManipulatorSequence.setPattern(
    apply(seq(PManipulatorAction, rep(PManipulatorAction)),
        v => [v[0], ...v[1]])
)

export const PRow = rule<Tok, TPatternRow>();
PRow.setPattern(
    alt_sc(
        apply(seq(kleft(PRole, tok(MoreTokenKind.Colon)), PSequence, opt(kright(tok(TokenKind.Arrow), PRole))), createPatternRow(false)),
        apply(seq(kleft(PRole, tok(MoreTokenKind.Colon)), PManipulatorSequence, opt(kright(tok(TokenKind.Arrow), PRole))), createPatternRow(true))
    )
)

function createPatternRow(isManipulator: boolean) {
    return function (v: [Role, TSequence, Role?]): TPatternRow {
        return { role: v[0], sequence: v[1], relabel: v[2], isManipulator }
    }
}

export function parseGroupSyncPattern(input: string): [TPatternRow[], TLayout, TMovement?] {
    const patternLines = input.split("\n")
    let positionsLine: string = ""
    let movementLine: string[] = []
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
    const layout: TLayout = (positionsLineIdx !== -1) ? parseLayout(positionsLine) : defaultLayoutForTwo(rows.filter(r => !r.isManipulator).map(r => r.role))

    const movement = movementLine ? parseMovements(movementLine, rows.map((x) => x.role)) : undefined


    return [rows, layout, movement]
}


function getCirclePosition(degree: number): [number, number] {
    const x = Math.cos(degree * Math.PI / 180) * 0.5 + 0.5
    const y = Math.sin(degree * Math.PI / 180) * 0.5 + 0.5
    return [x, y]
}



export function createLayout(input: string, patternLength: number = 0): GroupPatternLayout {
    return genLayout(parseLayout(input), undefined, [], 0, ['A', 'B', 'C', 'D', 'E'], [], patternLength)
}

type SyncGroupPatternConfig = {
    useSimpleLabels: boolean // use s and p instead of 3 and 3p, etc.
}
const defaultSyncPatternConfig: SyncGroupPatternConfig = { useSimpleLabels: true }

export function createSyncGroupPattern(sw: string, config: Partial<SyncPatternConfig & { iterations: number }>): GroupPattern {
    const {
        // flipStraightCrossing,
        // gallop,
        // startingHands,
        useSimpleLabels,
        iterations = 1,
    } = { ...defaultSyncPatternConfig, ...config }

    const [rows, layout, movement] = parseGroupSyncPattern(sw)

    // if (rows.length < 3) throw new Error("Not enough rows for a group pattern")
    const baseRows = rows.filter(r => !r.isManipulator)
    const manipulatorRows = rows.filter(r => r.isManipulator)
    if (baseRows.length < 2) throw new Error("Need at least two non-manipulator roles in a pattern")
    const sequenceLength = baseRows[0].sequence.length
    if (baseRows.some(r => r.sequence.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    if (manipulatorRows.some(r => r.sequence.length > sequenceLength)) throw new Error("manipulator sequence cannot be longer than pattern sequence")
    const roles = rows.map(r => r.role)


    const crossingPass = crossingPasses //flipStraightCrossing ? straightPasses : crossingPasses
    const toSameHandThrows = straightSelfs.concat(crossingPass)

    function genThrows(iterations: number): Throw[] {
        const throws: Throw[] = [];
        const handSequence: (0 | 1)[][] = altHands(roles.map(() => 0), iterations * sequenceLength + 9) // altHands([startingHands[0], (startingHands[1] + (flipStraightCrossing ? 1 : 0)) % 2], prefixLength + iterations * sequenceLength + 9);
        //TODO hand sequence may change in animations when switching segment




        function genThrow(throwToken: string, time: number, passerIdx: number, fromHand: Hand, timeFactor: number = 1): Throw {
            const [value, isPass, isCrossing, passTargeRole] = parseThrow(throwToken)
            const causeTime = time + (value - 2) * timeFactor;
            const rethrowTime = time + value * timeFactor
            assert(!isPass || (passTargeRole && roles.includes(passTargeRole)), `invalid pass target ${passTargeRole} in pass ${throwToken}`)
            const toPasserIdx = isPass ? roles.indexOf(passTargeRole!) : passerIdx;

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
                    rows[passerIdx].sequence[time % sequenceLength];

                assert(t && typeof t === "string" && t !== "o")

                //single throw and we keep track of which hand it comes from
                const fromHandIdx: Hand = handSequence[passerIdx][time];
                throws.push(genThrow(t, time, passerIdx, fromHandIdx))
            }
        return throws
    }


    const relabelingAnimation: Relabel[] = []
    const relabel: [Role, Role][] = []
    if (!rows.every(r => r.relabel === undefined)) {
        for (const row of rows) if (row.relabel) relabel.push([row.role, row.relabel])
        relabelingAnimation.push({ onBeat: 0, mod: sequenceLength, changes: relabel })
    }


    const oddLength = (sequenceLength * iterations) % 2 === 1
    const adjustedIterations = oddLength ? iterations + 1 : iterations
    return {
        pattern: {
            passerNames: roles,
            startingHands:  /*TODO*/ roles.map(() => [2, 1]),
            prefixPeriod: 0,
            period: sequenceLength,
            getThrows: genThrows,
            relabel: relabel.length > 0 ? relabel : undefined
        },
        layout: genLayout(layout, movement, genThrows(adjustedIterations), adjustedIterations * sequenceLength, roles, relabelingAnimation, sequenceLength)
    }
}

/**
 * generates a layout from notation and some information about the passing sequence
 * 
 * as a issue, we need the full passing sequence with both left and right hands, so for
 * odd period patterns, we consider a longer sequence that loops all the way around.
 * hence, we have both the patternLength and the adjustedThrowSequenceLength
 * @param layout 
 * @param movement 
 * @param adjustedThrows 
 * @param patternRoles 
 * @param endOfPatternRelabel 
 * @param patternLength 
 * @returns 
 */
function genLayout(layout: TLayout, movement: TMovement | undefined, adjustedThrows: Throw[], adjustedThrowSequenceLength: number, patternRoles: Role[], endOfPatternRelabel: Relabel[], patternLength: number): GroupPatternLayout {

    const [positions, movementSegments, movementSequences, background] = createShapeLayout(patternRoles, layout, movement)


    function findPosition(passerIdx: number): PositionLayout {
        const p = positions.find(p => p.passerIdx === passerIdx)
        if (!p) throw new Error(`position for passer ${passerIdx} not found`)
        return p
    }

    function pass(t: Throw): PassLayout {
        return {
            fromRole: findPosition(t.fromPasserIdx).role,
            fromHand: t.fromHand,
            toRole: findPosition(t.toPasserIdx).role,
            toHand: t.toHand,
            label: (t.throwTime + 1).toString()
        }
    }

    // console.log(throws)
    const passesToRender: Map<[number, number, number, number], PassLayout> = new Map()
    const passesPerBeat: Map<number, PassLayout[]> = new Map()
    const passAnimations: PassAnimation[] = []
    for (const t of adjustedThrows) if (t.fromPasserIdx !== t.toPasserIdx) {
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

        // passes for animations
        if (t.throwTime < adjustedThrowSequenceLength)
            passAnimations.push({
                pass: {
                    fromRole: findPosition(t.fromPasserIdx).role,
                    fromHand: t.fromHand,
                    toRole: findPosition(t.toPasserIdx).role,
                    toHand: t.toHand,
                    label: ""
                },
                onBeat: t.throwTime,
                mod: adjustedThrowSequenceLength,
                duration: 1
            })
    }


    // const [movementSegments, movementSequences, movementTriggers] = animateMovement(movement, layout, patternRoles, patternLength)
    const movementTriggers: MovementTrigger[] = movement ? movement.map(m => ({
        onBeat: m.when,
        mod: patternLength,
        role: m.role,
        duration: m.duration
    })) : []


    return {
        static: { positions: positions, passes: passesToRender.values().toArray() },
        frames: passesPerBeat.keys().map(k => {
            return {
                label: (k + 1).toString(),
                static: { positions, passes: passesPerBeat.get(k)! }
            }
        }).toArray(),
        animation: {
            initialPositions: positions,
            passAnimations: passAnimations,
            movementSegments,
            movementSequences,
            movementTriggers,
            relabeling: endOfPatternRelabel
        },
        background
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


