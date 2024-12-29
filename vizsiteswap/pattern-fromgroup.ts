import assert from "node:assert";
import { alt, apply, buildLexer, expectEOF, expectSingleResult, kleft, kright, opt, Parser, rep, rule, seq, tok } from "npm:typescript-parsec";
import { altHands, convertToLabel, crossingPasses, parseSyncPattern, PSequence, straightSelfs, SyncPatternConfig, TokenKind, TSequence } from "./pattern-fromsync.ts";
import { BackgroundLayout, GroupPattern, GroupPatternLayout, Hand, MovementSegment, MovementSequence, MovementTrigger, PassAnimation, PassLayout, PositionLayout, Role, Throw } from "./pattern-structure.ts";
import { Relabel } from "./pattern-structure.ts";



type TLayout =
    { type: "standard", shape: TShape, roles: Role[] } |
    { type: "free", pos: [Role, number, number][] }
export type TShape =
    'Trapezoid' |
    'V' |
    'Circle' |
    'Box'

type TMovement = TMovementStep[]
type TMovementStep = {
    type: TMovementType,
    role: Role,
    when: number,
    duration: number
}
type TMovementType = 'Vmove' | 'Bmove'

type TGroupPattern = {
    roles: Role[],
    throws: TSequence[],
    layout: TLayout,
    movement?: TMovement
}


//grammar
// row = Role: Pattern [-> Role]
// positions = "positions:" [Shape(Role [, Role]*)]+
// Shape = Trapezoid | V | Circle
// pattern = (row \n)+ Positions


export enum MoreTokenKind {
    Colon,
    //     NL,
    Role,
    //     Positions,
    //     Shape,
    //     Free,
    //     Number
}
type Tok = TokenKind | MoreTokenKind
export const tokenizer = buildLexer<Tok>([
    [true, /^(\d(p)?(x)?[A-Z]?)/g, TokenKind.Throw],
    //     [true, /^positions/g, MoreTokenKind.Positions],
    //     [true, /^(Circle|V|Trapezoid|Box)/g, MoreTokenKind.Shape],
    //     [true, /^Free/g, MoreTokenKind.Free],
    [true, /^[A-Z0_]/g, MoreTokenKind.Role],
    [true, /^o/g, TokenKind.Empty],
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
// const PNumber = rule<Tok, number>();
// PNumber.setPattern(apply(tok(MoreTokenKind.Number), v => Number(v.text)))
export const PRow = rule<Tok, [Role, TSequence, Role?]>();
PRow.setPattern(
    seq(kleft(PRole, tok(MoreTokenKind.Colon)), PSequence, opt(kright(tok(TokenKind.Arrow), PRole))),
)
// export const PRows = rule<Tok, [Role, TSequence][]>();
// PRows.setPattern(
//     apply(seq(PRow, rep(kright(tok(MoreTokenKind.NL), PRow))),
//         v => [v[0], ...v[1]])
// )

// const PLocation = rule<Tok, [Role, number, number]>();
// PLocation.setPattern(
//     apply(seq(PRole, tok(TokenKind.Comma), PNumber, tok(TokenKind.Comma), PNumber),
//         v => [v[0], v[2], v[4]])
// )
// export const PShapes = rule<Tok, TLayout>();
// PShapes.setPattern(
//     //either standard pattern or Free pattern
//     rep(
//         alt(
//             apply(
//                 seq(tok(MoreTokenKind.Shape), tok(TokenKind.LParen), seq(PRole, rep(kright(tok(TokenKind.Comma), PRole))), tok(TokenKind.RParen)),
//                 v => { return { type: 'standard', shape: (v[0].text === "Circle" ? TShape.Circle : v[0].text === "V" ? TShape.V : v[0].text === "Box" ? TShape.Box : TShape.Trapezoid), roles: [v[2][0], ...v[2][1]] } }
//             ),
//             apply(
//                 seq(tok(MoreTokenKind.Free), tok(TokenKind.LParen), seq(PLocation, rep(kright(tok(TokenKind.Comma), PLocation))), tok(TokenKind.RParen)),
//                 v => { return { type: 'free', pos: [v[2][0], ...v[2][1]] } })
//         )
//     )
// )
// export const PLayout = rule<Tok, TLayout>();
// PLayout.setPattern(
//     kright(seq(tok(MoreTokenKind.Positions), tok(MoreTokenKind.Colon)), PShapes)
// )

// const PGroupSyncPattern = rule<Tok, [[Role, TSequence][], TLayout]>();
// PGroupSyncPattern.setPattern(
//     ignoreNL(seq(kleft(PRows, tok(MoreTokenKind.NL)), PLayout))
// )


// function ignoreNL<TResult>(p: Parser<Tok, TResult>): Parser<Tok, TResult> {
//     return kleft(kright(rep(tok(MoreTokenKind.NL)), p), rep(tok(MoreTokenKind.NL)))
// }


export function parseGroupSyncPattern(input: string): [[Role, TSequence, Role?][], TLayout, TMovement?] {
    const patternLines = input.split("\n")
    let positionsLine: string = ""
    let movementLine: string | null = null
    const positionsLineIdx = patternLines.findIndex(l => l.trimStart().startsWith("positions:"))
    if (positionsLineIdx !== -1) {
        positionsLine = patternLines[positionsLineIdx].split(":")[1]
        patternLines.splice(positionsLineIdx, 1);
    } else throw new Error("missing positions line")

    const movementLineIdx = patternLines.findIndex(l => l.trimStart().startsWith("move:"))
    if (movementLineIdx !== -1) {
        movementLine = patternLines[movementLineIdx].split(":")[1]
        patternLines.splice(movementLineIdx, 1);
    }

    const rows = patternLines.filter(l => l.trim().length > 0).map(l => expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(l)))))
    const layout: TLayout = parseLayout(positionsLine)
    const movement = movementLine ? parseMovements(movementLine) : undefined

    return [rows, layout, movement]
}

export function parseLayout(input: string): TLayout {
    // simple parser
    // assert single pair of parentheses
    assert(input.indexOf('(') >= 0 && input.indexOf(')') > input.indexOf('('), "expecting a single pair of parentheses")
    //remove whitespace
    input = input.replace(/\s/g, "")

    //split at commas and parentheses
    const parts = input.split(/[\(\),]/).filter(p => p.length > 0)

    if (['Circle', 'V', 'Box', 'Trapezoid'].includes(parts[0])) {
        //standard layout
        const shape = parts[0] as TShape
        const roles = parts.slice(1)
        roles.map(r => assert(/^[A-Z]$/.test(r), "role names must be single uppercase letters"))
        return { type: 'standard', shape, roles }
    } else if (parts[0] === 'Free') {
        //free layout
        const pos = parts.slice(1)
        assert(pos.length % 3 === 0, "free layout must have 3 entries per role (role, x, y)")
        const r: [Role, number, number][] = []
        for (let i = 0; i < pos.length; i += 3) {
            const x = Number(pos[i + 1]);
            const y = Number(pos[i + 2]);
            const role = pos[i]
            assert(!isNaN(x) && x >= 0 && x <= 1, "x coordinate must be a number between 0 and 1");
            assert(!isNaN(y) && y >= 0 && y <= 1, "y coordinate must be a number between 0 and 1");
            assert(/^[A-Z]$/.test(role), "role names must be single uppercase letters")
            r.push([role, x, y]);
        }

        return { type: 'free', pos: r }
    }

    throw new Error(`invalid layout ${input}`)
}

function parseMovements(input: string): TMovement {
    //split after closing parenthesis
    const parts = input.split(')').filter(p => p.length > 0).map(s => s + ')')
    return parts.map(parseMovement)
}

function parseMovement(input: string): TMovementStep {
    // simple parser
    // assert single pair of parentheses
    assert(input.indexOf('(') >= 0 && input.indexOf(')') > input.indexOf('('), `expecting a single pair of parentheses in ${input}`)
    //remove whitespace
    input = input.replace(/\s/g, "")

    //split at commas and parentheses
    const parts = input.split(/[\(\),]/).filter(p => p.length > 0)

    if (['Vmove', 'Bmove'].includes(parts[0])) {
        //standard layout
        const type = parts[0] as TMovementType
        const role = parts[1]
        const when = Number(parts[2])
        const duration = Number(parts[3])
        assert(/^[A-Z]$/.test(role), "role names must be single uppercase letters")
        assert(!isNaN(when), "when must be a number")
        assert(!isNaN(duration), "duration must be a number")
        return { type, role, when, duration }
    }
    throw new Error(`invalid movement ${input}`)
}


function getCirclePosition(degree: number): [number, number] {
    const x = Math.cos(degree * Math.PI / 180) * 0.5 + 0.5
    const y = Math.sin(degree * Math.PI / 180) * 0.5 + 0.5
    return [x, y]
}

const initialV3Positions = [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30]
const initialV4Positions = [/*A*/ 270, /*B*/90 - 45, /*C*/90, /*D*/90 + 45]


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
                    rows[passerIdx][1][time % sequenceLength];

                assert(t && typeof t === "string" && t !== "o")

                //single throw and we keep track of which hand it comes from
                const fromHandIdx: Hand = handSequence[passerIdx][time];
                throws.push(genThrow(t, time, passerIdx, fromHandIdx))
            }
        return throws
    }


    const relabelingAnimation: Relabel[] = []
    const relabel: [Role, Role][] = []
    if (!rows.every(r => r[2] === undefined)) {
        for (const [from, _, to] of rows) if (to) relabel.push([from, to])
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

    const positions: PositionLayout[] = []
    if (layout.type === "standard") {
        assert(['Circle', 'V', 'Box', 'Trapezoid'].includes(layout.shape), "only circle supported")
        assert(layout.shape !== 'V' || [3, 4].includes(layout.roles.length), "V shape requires 3 or 4 roles")
        assert(layout.shape !== 'Box' || layout.roles.length === 4, "Box shape requires 4 roles")
        assert(layout.shape !== 'Trapezoid' || layout.roles.length === 5, "Trapezoid shape requires 5 roles")
        const roles = layout.roles
        const background: BackgroundLayout[] = []

        // all x and y positions are relative between 0 and 1; that is on a circle with a radius of 0.5
        if (layout.shape === 'Circle') {
            let angle = -Math.PI / 2
            for (let i = 0; i < roles.length; i++) {
                const x = Math.cos(angle) * 0.5 + 0.5
                const y = Math.sin(angle) * 0.5 + 0.5
                assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
                positions.push({ passerIdx: patternRoles.indexOf(roles[i]), role: roles[i], x, y })
                angle += 2 * Math.PI / roles.length
            }
            background.push({ type: "circle", x: 0.5, y: 0.5, r: 0.5, fill: "none", stroke: "lightgrey", strokeWidth: 1 })
        } else if (layout.shape === 'V') {
            const angles = roles.length === 3 ? initialV3Positions : initialV4Positions
            for (let i = 0; i < roles.length; i++) {
                const x = Math.cos(angles[i] * Math.PI / 180) * 0.5 + 0.5
                const y = Math.sin(angles[i] * Math.PI / 180) * 0.5 + 0.5
                assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
                positions.push({ passerIdx: patternRoles.indexOf(roles[i]), role: roles[i], x, y })
            }
            background.push({ type: "circle", x: 0.5, y: 0.5, r: 0.5, fill: "none", stroke: "lightgrey", strokeWidth: 1 })
        } else if (layout.shape === 'Box') {
            const angles = [-30, 30, 150, 210].map(a => a - 90)
            for (let i = 0; i < roles.length; i++) {
                const x = Math.cos(angles[i] * Math.PI / 180) * 0.5 + 0.5
                const y = Math.sin(angles[i] * Math.PI / 180) * 0.5 + 0.5
                assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
                positions.push({ passerIdx: patternRoles.indexOf(roles[i]), role: roles[i], x, y })
            }
        } else if (layout.shape === 'Trapezoid') {
            for (let i = 0; i < 5; i++)
                assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
            positions.push({ passerIdx: patternRoles.indexOf(roles[0]), role: roles[0], x: 0.25, y: 0 })
            positions.push({ passerIdx: patternRoles.indexOf(roles[1]), role: roles[1], x: 0.75, y: 0 })
            positions.push({ passerIdx: patternRoles.indexOf(roles[2]), role: roles[2], x: 0.0, y: 1 })
            positions.push({ passerIdx: patternRoles.indexOf(roles[3]), role: roles[3], x: 0.5, y: 1 })
            positions.push({ passerIdx: patternRoles.indexOf(roles[4]), role: roles[4], x: 1, y: 1 })
            background.push({ type: "path", segments: ['M', 0.25, 0, 'L', .75, 0, 'L', 1, 1, 'L', 0, 1, 'L', 0.25, 0], stroke: "lightgrey", strokeWidth: 1 })
        }
    } else if (layout.type === "free") {
        for (let i = 0; i < layout.pos.length; i += 1) {
            const poss = layout.pos
            const x = poss[i][1]
            const y = poss[i][2]
            assert(!isNaN(x) && x >= 0 && x <= 1, "Invalid x coordinate")
            assert(!isNaN(y) && y >= 0 && y <= 1, "Invalid y coordinate")
            assert(patternRoles.includes(poss[i][0]), `role ${poss[i][0]} not in pattern`)
            positions.push({ passerIdx: patternRoles.indexOf(poss[i][0]), role: poss[i][0], x, y })
        }
    }

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


    const [movementSegments, movementSequences, movementTriggers] = animateMovement(movement, layout, patternRoles, patternLength)

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

// pattern roles is needed to have the right order to identify juggler index from role name
function animateMovement(movement: TMovement | undefined, layout: TLayout, patternRoles: Role[], patternLength: number): [MovementSegment[], MovementSequence[], MovementTrigger[]] {
    if (!movement || movement.length === 0) return [[], [], []]
    function allMovement(type: TMovementType): boolean {
        return movement?.every(m => m.type === type) || false
    }
    // supporting Vmove in V shape
    if (layout.type === 'standard' && layout.shape === 'V' && [3, 4].includes(layout.roles.length) && allMovement('Vmove')) {
        assert(patternRoles.length === layout.roles.length, "number of passer roles must match layout roles")
        // get the movement path of each initial position, moving by 90 degree each
        const initialAngles = layout.roles.length === 3 ? initialV3Positions : initialV4Positions

        const segments: MovementSegment[] = []
        let segmentIdx = 0
        const sequences: MovementSequence[] = []
        for (let passerIdx = 0; passerIdx < patternRoles.length; passerIdx++) {
            const sequence: MovementSequence = []
            const initialAngle = initialAngles[passerIdx]
            for (let walkIdx = 0; walkIdx < 4; walkIdx++) {
                const fromAngle = initialAngle - walkIdx * 90
                const toAngle = initialAngle - (walkIdx + 1) * 90
                const [fromX, fromY] = getCirclePosition(fromAngle)
                const [toX, toY] = getCirclePosition(toAngle)
                const path = ['A', 0.5, 0.5, 0, 0, 0]

                segments.push({
                    fromX,
                    fromY,
                    path,
                    toX,
                    toY
                })
                sequence.push(segmentIdx)

                segmentIdx++
            }
            sequences.push(sequence)
        }

        const triggers: MovementTrigger[] = movement.map(m => ({
            onBeat: m.when,
            mod: patternLength,
            role: m.role,
            duration: m.duration
        }))

        return [segments, sequences, triggers]
        // -- B0 A0 C0 B1 A1 C1 B2 A2 C2 B3 A3 C3
        // 1-0 0-0 2-0 1-1 0-1 2-1 1-2 0-2 2-2 1-3 0-3 2-3
        // V B90, shift 1
        // 
        // miniv
        // B90 A90 shift 1


        // Bruno l1 l0 m r1 r0 m
        // init 0-r0 1-l0 2-l1
        // 1-l0-m 2-l1-l0
        // 1-m-r1
        // 0-r1-m 1-r1-r0
        // 1-m-l1
        //TODO abstract computation for initial positions
    }


    throw new Error("Function not implemented.");
}
