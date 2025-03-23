import { Beat, createPattern, GroupPattern, GroupPatternLayout, Hand, ManipulatorAction, MovementTrigger, PassAnimation, PassLayout, Pattern, PositionLayout, RelabelAnimation, Role, Throw, ThrowType, Time } from "@modernpassing/pattern";
import assert from "node:assert";
import { alt_sc, apply, buildLexer, expectEOF, expectSingleResult, kleft, kright, opt, rep, rule, seq, str, tok } from "npm:typescript-parsec";
import { applyManipulations, fillPatternGaps } from "@modernpassing/pattern";
import { PSequence, SyncPatternConfig, TokenKind, TSequence, TThrow } from "./pattern-fromsync.ts";
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
    [true, /^([0-9a-y](p)?(x)?[A-Z]?)|^,/g, TokenKind.Throw],
    [true, /^[A-Z0_]/g, MoreTokenKind.Role],
    [true, /^(S[A-Z]{1,2}(e[ox\[\]]?|l[ox\[\]]?|[ox\[\]]|v|c|d[1-9]?)?|I[A-Z]{1,2}(e|l|v[oxb\[\]]|v|c)?|C[A-Z]{0,2}f?|zf?|[o\.-])/g, MoreTokenKind.ManipulatorAction],
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
    return genLayout(parseLayout(input), undefined, createPattern([],2,[],[]))
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

    // basic checks
    const baseRows = rows.filter(r => !r.isManipulator)
    const manipulatorRows = rows.filter(r => r.isManipulator)
    if (baseRows.length < 2) throw new Error("Need at least two non-manipulator roles in a pattern")
    const sequenceLength = baseRows[0].sequence.length
    if (baseRows.some(r => r.sequence.length !== sequenceLength)) throw new Error("patterns must have the same lengths for all passers")
    if (manipulatorRows.some(r => r.sequence.length > sequenceLength)) throw new Error("manipulator sequence cannot be longer than pattern sequence")

    const [pattern, manipulatorActions] = createPatternFromRaw(rows, 2)

    const rewritten = fillPatternGaps(applyManipulations(pattern, manipulatorActions))

    return {
        pattern: rewritten,
        aidenNotation: [pattern, manipulatorActions],
        layout: genLayout(layout, movement, pattern)// genThrows(adjustedIterations), adjustedIterations * sequenceLength, roles, relabelingAnimation, sequenceLength)
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
function genLayout(layout: TLayout, movement: TMovement | undefined, 
    pattern: Pattern
    /*adjustedThrows: Throw[], adjustedThrowSequenceLength: number, patternRoles: Role[], endOfPatternRelabel: RelabelAnimation[], patternLength: number*/): GroupPatternLayout {

    const [positions, movementSegments, movementSequences, background] = createShapeLayout(pattern.getInitialRoles(), layout, movement)


    function findPosition(passerIdx: number): PositionLayout {
        const p = positions.find(p => p.passerIdx === passerIdx)
        if (!p) throw new Error(`position for passer ${passerIdx} not found`)
        return p
    }

    function pass(t: Throw): PassLayout {
        return {
            fromRole: findPosition(t.fromPasserIdx).role,
            fromHand: Hand.Right,//TODO repair animations t.fromHand,
            toRole: findPosition(t.toPasserIdx).role,
            toHand: Hand.Left,// TODO repair animations: t.toHand,
            label: (t.throwBeat + 1).toString()
        }
    }

    // console.log(throws)
    const passesToRender: Map<[number, number, number, number], PassLayout> = new Map()
    const passesPerBeat: Map<number, PassLayout[]> = new Map()
    const passAnimations: PassAnimation[] = []
    // TODO repair animations
    // for (const t of adjustedThrows) if (t.fromPasserIdx !== t.toPasserIdx) {
    //     // update passes for overall static layout
    //     const p = getOrUpdate4(passesToRender, t.fromPasserIdx, t.fromHand, t.toPasserIdx, t.toHand, () => {
    //         const x = pass(t)
    //         x.label = ""
    //         return x
    //     })
    //     if (p.label !== "") p.label += ", "
    //     p.label += (t.throwTime + 1)

    //     // updated passes for individual frames
    //     const passesOnBeat = getOrUpdate(passesPerBeat, t.throwTime, () => [])
    //     passesOnBeat.push(pass(t))

    //     // passes for animations
    //     if (t.throwTime < adjustedThrowSequenceLength)
    //         passAnimations.push({
    //             pass: {
    //                 fromRole: findPosition(t.fromPasserIdx).role,
    //                 fromHand: t.fromHand,
    //                 toRole: findPosition(t.toPasserIdx).role,
    //                 toHand: t.toHand,
    //                 label: ""
    //             },
    //             onBeat: t.throwTime,
    //             mod: adjustedThrowSequenceLength,
    //             duration: 1
    //         })
    // }
    const endOfPatternRelabel: RelabelAnimation[] = []


    // const [movementSegments, movementSequences, movementTriggers] = animateMovement(movement, layout, patternRoles, patternLength)
    const movementTriggers: MovementTrigger[] = movement ? movement.map(m => ({
        onBeat: m.when,
        mod: pattern.getLength(),
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






function getPatternLength(rawPattern: TPatternRow[], nrHands: number): number {
    function getRowLength(row: TPatternRow): number {
        if (nrHands === 2) {
            assert(!row.sequence.includes(','))
            return row.sequence.length
        }
        if (nrHands === 4) {
            const halfs = row.sequence.filter(t => t === ',').length
            const negs = row.sequence.filter(t => t === '\'').length
            return (row.sequence.length - halfs - negs) * 2 - 1 + halfs - negs
        }
        throw new Error(`only supporting 2 and 4 hands for now`)
    }
    return rawPattern.map(getRowLength).reduce((a, b) => Math.max(a, b), 0)

}



/**
 * turns raw input rows into a pattern that can be manipulated
 * supports sync patterns and 4hsiteswaps
 * 
 * @param rawPattern pattern parsed from input
 * @param nrHands number of hands in the pattern (2 or 4)
 * @returns 
 */
export function createPatternFromRaw(rawPattern: TPatternRow[], nrHands: number): [Pattern, ManipulatorAction[]] {
    const roles = rawPattern.map(row => row.role)
    const baseRoles = rawPattern.filter(t => !t.isManipulator).map(row => row.role)
    const baseIdxRelabel: number[] = rawPattern.filter(t => !t.isManipulator).map(t => baseRoles.indexOf(t.relabel ?? t.role))
    const nrBaseRoles = baseRoles.length
    const patternLength = getPatternLength(rawPattern, nrHands)



    function relabel(time: Time, rowIdx: number): number {
        // no manipulators yet, so relabeling is pretty straightforward for now
        while (time >= patternLength) {
            rowIdx = baseIdxRelabel[rowIdx]
            time -= patternLength
        }
        while (time < 0) {
            rowIdx = baseIdxRelabel.findIndex(r => r === rowIdx)
            time += patternLength
        }
        return rowIdx
    }

    function convert(throwStr: TThrow, who: number, when: Beat): Throw {
        if (Array.isArray(throwStr)) throw Error("not supporting multiple throws on the same beat for base throws")
        assert(throwStr !== ',', `cannot convert ',' into a throw -- this should have been processed elsewhere`)

        //some magic to parse the throw string
        const throwLengthStr = throwStr[0]
        const throwLength = throwLengthStr.match(/[a-z]/i) ? throwLengthStr.charCodeAt(0) - 87 : Number.parseInt(throwLengthStr)
        assert(throwLength < 12, `unlikely high throw ${throwLengthStr} in ${throwStr}`)
        //by default it's a self
        let to = who
        // if it's a letter after a p, that's the target
        if (throwStr[1] === 'p' && throwStr[2]) to = roles.indexOf(throwStr[2])
        // p without a letter in a two person pattern goes to the other
        else if (throwStr[1] === 'p' && !throwStr[2] && nrBaseRoles === 2) to = 1 - who
        // letter without a p goes to that person
        else if (throwStr.length === 2 && throwStr[1] !== 'p') to = roles.indexOf(throwStr[1])
        // odd number in four-handed siteswap without annotation goes to the other
        else if (throwStr.length === 1 && nrBaseRoles === 2 && nrHands === 4 && throwLength % 2 === 1) to = 1 - who

        assert(to >= 0, `target role not clear for throw  ${throwStr}`)
        const causeTime = when + throwLength - nrHands

        return {
            fromPasserIdx: who,
            // fromHand: when % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,//assuming hand order rA, rB, rC... lA, lB, lC...

            throwBeat: when,
            throwLength,

            toPasserIdx: relabel(causeTime, to),
            // toHand: (when + throwLength) % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,

            markers: [ThrowType.Base],
            note: throwStr
        }
    }

    function iterate(c: (currentRowIdx: number, currentRow: TPatternRow, currentThrow: TThrow, beat: Beat) => void): void {
        assert(nrHands === 2 || nrHands === 4, `only supporting 2 and 4 hands for now`)

        for (let currentRowIdx = 0; currentRowIdx < rawPattern.length; currentRowIdx++) {
            const currentRow = rawPattern[currentRowIdx]
            let beat = 0
            for (let seqIdx = 0; seqIdx < currentRow.sequence.length; seqIdx++) {
                const currentThrow = currentRow.sequence[seqIdx]


                if (currentThrow && currentThrow !== ',' && currentThrow !== '.')
                    c(currentRowIdx, currentRow, currentThrow, nrHands === 4 ? beat * 2 : beat)

                beat += currentThrow === ',' ? .5 : 1
            }
        }
    }

    function getBaseThrows(): Throw[] {
        const result: Throw[] = []
        iterate((currentRowIdx, currentRow, currentThrow, beat) => {
            if (!currentRow.isManipulator)
                result.push(convert(currentThrow, currentRowIdx, beat))
        })
        return result
    }

    function convertManipulatorAction(pattern: Pattern, throwStr: string, whoIdx: number, when: Beat): ManipulatorAction {
        if (throwStr[0] === 'z') throwStr = (nrHands / 2).toString()
        const who = roles[whoIdx]

        if (['I', 'S'].includes(throwStr[0])) {
            const firstRole: string | undefined = throwStr[1]
            assert(roles.includes(firstRole), `target role ${firstRole} in ${throwStr} not found in ${roles}`)
            let modifiers = throwStr.slice(2)
            let secondRole: string | undefined = undefined
            if (throwStr[2] && throwStr[2].match(/[A-Z]/)) {
                secondRole = throwStr[2]
                modifiers = modifiers.slice(1)
                assert(roles.includes(secondRole), `target role ${secondRole} in ${throwStr} not found in ${roles}`)
            }
            const fromPasserRole = secondRole ? firstRole : undefined // only defined when both are specified, otherwise single role is assumed to be the target
            const toPasserRole = secondRole ? secondRole : firstRole // 
            checkModifiers(throwStr[0] as 'I' | 'S', modifiers)
            // const manipulatedThrow = pattern.findThrow(when, fromRoleIdx, toRoleIdx) // this is the throw that is manipulated
            // assert(manipulatedThrow, `no throw found from ${firstRole} to ${secondRole} for ${throwStr} at ${when}`)

            return {
                kind: throwStr[0] as 'I' | 'S',
                fromPasserRole,
                toPasserRole,
                beat: when,
                manipulatorRole: who,
                modifiers
            }
        } else if (throwStr[0] === 'C') {
            const toPasserRole = throwStr[1] && throwStr[1].match(/[A-Z]/) ? throwStr[1] : undefined
            return {
                kind: 'C',
                toPasserRole,
                beat: when,
                manipulatorRole: who,
            }
        } else {
            const t = convert(throwStr, whoIdx, when)
            return {
                kind: 'T',
                throwLength: t.throwLength,
                toPasserRole: roles[t.toPasserIdx],
                beat: t.throwBeat,
                manipulatorRole: who,
            }
        }
    }

    function getManipulatorActions(pattern: Pattern): ManipulatorAction[] {
        const result: ManipulatorAction[] = []
        iterate((currentRowIdx, currentRow, currentThrow, beat) => {
            if (currentRow.isManipulator) {
                if (Array.isArray(currentThrow))
                    result.push(...currentThrow.map(t => convertManipulatorAction(pattern, t, currentRowIdx, beat)))
                else result.push(convertManipulatorAction(pattern, currentThrow, currentRowIdx, beat))
            }
        })
        return result
    }



    const p = createPattern(getBaseThrows(), nrHands, baseIdxRelabel, baseRoles)
    const m = getManipulatorActions(p)

    return [p, m]
}





//     `e` -- substitute/intercept **e**arly
// `l` -- substitute/intercept **l**ate (default for substitution)
// `v` -- substitute/intercept **v**ery late (default for intercept)
// `c` -- substitute/intercept as a **c**hop
// `d` -- substitution with **d**elayed placement (like German turn; modeled as a 1p in local)

// `o` or `]` -- substitute/intercept from **o**utside of the passing lane (inside is the default), only for early and late substitutions (`eo`, `lo`) and very late intercepts (`vo`; to the right of the receiver for a right-handed pass). For crossing passes, outside is relative to the receiving side.
// `x` or `[` -- substitute/intercept from outside of the *opposite* passing lane (opposite side of the pattern to x). Used primarily to indicate turning out to the *left* for a right-handed very late intercept (`vx`). For crossing passes, outside is relative to the receiving side.
// `b` -- intercept very late from **b**ehind the target's location

// `f` -- zip with **f**lipping the club (`zf`) / flip only the active club on the carry (`CBf`), by default carry implies flipping both clubs


function checkModifiers(actionKind: 'I' | 'S', modifiers: string) {
    assert(actionKind !== 'I' || !modifiers.includes('d'), `cannot use 'd' modifier for ${actionKind} action`)
    const mutuallyExclusive = ['e', 'l', 'v', 'c']
    for (const a of mutuallyExclusive)
        for (const b of mutuallyExclusive)
            if (a !== b && modifiers.includes(a) && modifiers.includes(b))
                throw new Error(`cannot use both ${a} and ${b} modifiers for ${actionKind} action`)
}