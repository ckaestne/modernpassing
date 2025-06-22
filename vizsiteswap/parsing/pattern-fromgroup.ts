import { applyManipulations, applyManipulatorLayout, fillPatternGaps } from "@modernpassing/manipulation";
import { baseMarker, type Beat, createPattern, createThrow, Hand, type ManipulatorAction, type Pattern, type Throw } from "@modernpassing/pattern";
import assert from "node:assert";
import { HandSwap, parseGroupPattern, parseThrow, type THandSwap, type TPatternRow, type TThrow } from "./pattern-fromgroup-parser.ts";
import { addPassAnimations, setLayoutRelabeling } from "../layout/pattern-layout.ts";
import { type TLayout, type TMovement, createShapeLayout, type GroupPattern, type GroupPatternLayoutSpec } from "@modernpassing/layout";
import { MovementTriggerSpec } from "../layout/animation-spec.ts";
import { parseLayout } from "./parse-layout.ts";

/**
 * parsing of multi-line patterns, pretty much anything but vanilla siteswaps (and fromsync has simpler shorthands
 * that are translated into this group format) 
 * 
 * Supports roles, line changes, 2 and 4 hands, and various remapping (positions, hands, ...) to wrap
 * around.
 * 
 * See `pattern-notation.md` for details.
 * 
 */




export function createSyncGroupPattern(patternStr: string): GroupPattern {
    return createGroupPattern(patternStr, 2)
}
export function createGroupPattern(patternStr: string, nrHands: number, skipRewrite: boolean = false, skipFillDuringRewrite: boolean = false): GroupPattern {

    const [rows, layout, movement] = parseGroupPattern(patternStr)

    // basic checks
    const baseRows = rows.filter(r => !r.isManipulator)
    if (baseRows.length < 2) throw new Error("Need at least two non-manipulator roles in a pattern")

    // parse basic notation and create base pattern
    const [pattern, manipulatorActions] = createPatternFromRaw(rows, nrHands)

    // apply manipulations
    let rewritten = skipRewrite ? pattern : applyManipulations(pattern, manipulatorActions)
    rewritten = skipRewrite || skipFillDuringRewrite ? rewritten : fillPatternGaps(rewritten)

    const patternLayout = !layout ? undefined :
        setLayoutRelabeling(applyManipulatorLayout(addPassAnimations(genLayout(layout, movement, pattern), rewritten), rewritten), pattern, rewritten)



    return {
        pattern: rewritten,
        aidenNotation: [pattern, manipulatorActions],
        layout: patternLayout
    }
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
    const roles = rawPattern.map(row => row.role!)
    const baseRoles = rawPattern.filter(t => !t.isManipulator).map(row => row.role!)
    const baseIdxRelabel: number[] = rawPattern.filter(t => !t.isManipulator).map(t => baseRoles.indexOf(t.relabel ?? t.role!))
    const nrBaseRoles = baseRoles.length
    const throws = allThrowsByBeat(rawPattern, nrHands)
    const patternLength = getPatternLength(throws, nrHands)
    const prefixLength = 0 - throws.map(t => t[1]).reduce((min, v) => v < 0 ? Math.min(min, v) : min, 0)

    // hand ordering is nontrivial unfortunately
    // we assume right-left alternating by default, starting right-handed
    // `!` in the notation indicates a flip from that order, typically at the beginning, but possibly also in the middle
    // unless we have a pair of throws on the beat, the single throw is thrown from the hand
    // where the incoming pass arrived (causal beat). 

    // to not go insane in the implementation, this does not wrap around; that is, the last beat of the pattern
    // does not influence the hand of the first throws of the pattern. those need to be fixed by `!`
    // if something is wrong, this will result in an invalid pattern

    // default hand order is right-left-right-left-right-left...; `!` flips that; those defaults may be changed later as we process throws
    const handSequence: Hand[/*rowIdx*/][/*beat*/] =
        applyHandswaps(
            altHands(Hand.Right, patternLength, rawPattern.length, nrHands),
            rawPattern,
            nrHands)
    const prefixHandSequence: Hand[/*rowIdx*/][/*-beat*/] = altHands(handSequence.map(v => 1 - v[0]), prefixLength, rawPattern.length, nrHands)
    // for now let's assume that everybody starting on even beats is James (straight singles); any other adjustments are doing with `x` for passes
    const isJames: boolean[] = nrHands === 4 ? getJames(rawPattern) : []


    function convert(throwStr: TThrow, who: number, fixedHand: Hand | undefined, when: Beat): Throw {
        assert(!Array.isArray(throwStr))
        assert(throwStr !== ',', `cannot convert ',' into a throw -- this should have been processed elsewhere`)
        // assert(fixedHand === undefined || nrHands === 2, `only supporting sync throws for 2 handed for now`)

        const [throwLength, isPass, targetRole, flipCrossing] = parseThrow(throwStr)
        assert(throwLength < 12, `unlikely high throw ${throwLength} in ${throwStr}`)
        //by default it's a self
        let to = who

        if (targetRole !== undefined) to = roles.indexOf(targetRole)
        // p without a letter in a two person pattern goes to the other
        else if (isPass && !targetRole && nrBaseRoles === 2) to = 1 - who
        // odd number in four-handed siteswap without annotation goes to the other
        else if (isPass && !targetRole) throw Error(`ambiguous target role for pass ${throwStr}`)
        else if (throwStr.length === 1 && nrBaseRoles === 2 && nrHands === 4 && throwLength % 2 === 1) to = 1 - who

        const fromHand = fixedHand ?? (when >= 0 ? handSequence[who][when] : prefixHandSequence[who][-when - 1])
        const isCrossing = flipCrossing !== (nrHands === 2 ? throwLength % 2 === 1 : getCrossing(throwLength, isJames[who]))

        assert(to >= 0, `target role not clear for throw  ${throwStr}`)
        const causeTime = when + throwLength - nrHands
        // next throw from receiving hand
        if (causeTime < patternLength && fixedHand === undefined)
            handSequence[to][causeTime] = isCrossing ? 1 - fromHand : fromHand

        // deal with relabeling (transforming toPasserIdxAtThrow to toPasserIdxAtCausal)
        let toPasserIdxAtCausal = to
        for (let wrap = 0; wrap < Math.floor(causeTime / patternLength); wrap++)
            toPasserIdxAtCausal = baseIdxRelabel[toPasserIdxAtCausal]
        for (let wrap = 0; wrap > Math.floor(causeTime / patternLength); wrap--)
            toPasserIdxAtCausal = baseIdxRelabel.indexOf(toPasserIdxAtCausal)



        return createThrow(
            when,
            who,
            fromHand,
            isCrossing,
            toPasserIdxAtCausal,
            throwLength,
            [baseMarker],
            throwStr
        )
    }


    function getBaseThrows(): Throw[] {
        const result: Throw[] = []
        const allThrows = allThrowsByBeat(rawPattern, nrHands)
        for (const [rowIdx, beat, hand, currentThrow] of allThrows) {
            result.push(convert(currentThrow, rowIdx, hand, beat))
        }
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
            let modifiers = throwStr.slice(1)
            let toPasserRole: string | undefined = undefined
            if (throwStr[1] && throwStr[1].match(/[A-Z]/)) {
                toPasserRole = throwStr[1]
                modifiers = modifiers.slice(1)
            }
            return {
                kind: 'C',
                toPasserRole,
                beat: when,
                manipulatorRole: who,
                modifiers
            }
        } else {
            const t = convert(throwStr, whoIdx, undefined, when)
            return {
                kind: 'T',
                throwLength: t.throwLength,
                toPasserRole: roles[pattern.getToPasserIdxAtThrow(t)],
                fromHand: t.fromHand,
                isCrossing: t.isCrossing,
                beat: t.throwBeat,
                manipulatorRole: who,
            }
        }
    }

    function getManipulatorActions(pattern: Pattern): ManipulatorAction[] {
        const result: ManipulatorAction[] = []
        for (let rowIdx = 0; rowIdx < rawPattern.length; rowIdx++)
            if (rawPattern[rowIdx].isManipulator) {
                const throwsByBeat = throwByBeat(rawPattern[rowIdx], nrHands)
                for (const [beat, currentThrow] of throwsByBeat) {
                    if (Array.isArray(currentThrow))
                        result.push(...currentThrow.map(t => convertManipulatorAction(pattern, t, rowIdx, beat)))
                    else result.push(convertManipulatorAction(pattern, currentThrow, rowIdx, beat))
                }
            }
        return result
    }


    const baseThrows = getBaseThrows()
    const mapHands: boolean[][] = nrHands === 2 ? baseRoles.map((_r) => [patternLength % 2 === 1])
        : baseRoles.map((_r, roleIdx) => [baseThrows.filter(t => t.fromPasserIdx === roleIdx).length % 2 === 1])
    // mapCrossing -- let's guess that somebody going from a James row to a not-James row and vice versa needs to swap crossing and everybody else does not (if this does not work, we try brute force all combinations below)
    const mapCrossing: boolean[][] | undefined = nrHands === 2 ? undefined : baseRoles.map((_r, idx) => {
        const toRow = baseIdxRelabel[idx]
        return [isJames[idx] !== isJames[toRow]]
    })
    const p = tryHandMapping(createPattern(baseThrows, nrHands, baseIdxRelabel, baseRoles, mapHands, mapCrossing, undefined, patternLength))
    const m = getManipulatorActions(p)

    return [p, m]
}


/**
 * brute force approach to try different hand mappings if the pattern is not valid as is
 */
function tryHandMapping(pattern: Pattern): Pattern {
    if (pattern.isValid()) return pattern
    // for 2 passers, aggressively try all combinations
    if (pattern.nrRows === 2) {
        const mapHands = [[[false], [false]], [[true], [true]], [[true], [false]], [[false], [true]]]
        const mapCrossings = [[[false], [false]], [[true], [true]], [[true], [false]], [[false], [true]]]
        for (const mapCrossing of mapCrossings) {
            for (const mapHand of mapHands) {
                const p = createPattern(pattern.throws, pattern.nrHands, pattern.mapRows, pattern.roles, mapHand, mapCrossing, pattern.initialHands)
                if (p.isValid()) return p
            }
        }
    }
    // for more passers, just try switching hands
    if (pattern.nrRows > 2) {
        const combinations = (length: number): boolean[][] => {
            if (length === 0) return [[]];
            const smaller = combinations(length - 1);
            return smaller.flatMap(c => [c.concat(true), c.concat(false)]);
        };

        const mappingCombinations = combinations(pattern.nrRows).map(c => c.map(v => [v]));
        for (const mapCrossing of mappingCombinations) {
            for (const mapHands of mappingCombinations) {
                const p = createPattern(pattern.throws, pattern.nrHands, pattern.mapRows, pattern.roles, mapHands, mapCrossing, pattern.initialHands);
                if (p.isValid()) return p;
            }
        }
    }
    // I guess nothing worked, so just return the original invalid pattern
    return pattern
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


function getCirclePosition(degree: number): [number, number] {
    const x = Math.cos(degree * Math.PI / 180) * 0.5 + 0.5
    const y = Math.sin(degree * Math.PI / 180) * 0.5 + 0.5
    return [x, y]
}




function altHands(startingHand: Hand | Hand[], sequenceLength: number, rows: number, nrHands: number): Hand[][] {
    const result = []
    for (let row = 0; row < rows; row++) {
        const seq: Hand[] = []
        let c = 0
        for (let i = 0; i < sequenceLength; i++) {
            const sh = Array.isArray(startingHand) ? startingHand[row] : startingHand
            const hand = nrHands === 2 ? (sh + c) % 2 :
                (sh + c) % 4 < 2 ? Hand.Right : Hand.Left
            seq.push(hand)
            c++
        }
        result.push(seq)
    }
    return result
}


function applyHandswaps(handsequence: Hand[][], rawPattern: TPatternRow[], nrHands: number): Hand[][] {
    const result = handsequence.map(h => [...h])
    for (let rowIdx = 0; rowIdx < rawPattern.length; rowIdx++) {
        const swaps = handswapByBeat(rawPattern[rowIdx], nrHands)
        // for each swap, swap all hands from the beat to the end of the handsequence
        for (const [beat, swap] of swaps) {
            for (let i = beat; i < result[rowIdx].length; i++) {
                result[rowIdx][i] = 1 - result[rowIdx][i]
            }
        }
    }
    return result
}


function throwByBeat(row: TPatternRow, nrHands: number): [Beat, TThrow][] {
    return throwOrHandswapByBeat(row, nrHands).filter(t => t[1] !== HandSwap)
}
function handswapByBeat(row: TPatternRow, nrHands: number): [Beat, THandSwap][] {
    return throwOrHandswapByBeat(row, nrHands).filter(t => t[1] === HandSwap) as [number, THandSwap][]
}

/**
 * handling of `,` and `.` for timing and also `!`
 * 
 * returns a list of throws with their corresponding beats
 */
function throwOrHandswapByBeat(row: TPatternRow, nrHands: number): [Beat, (TThrow | THandSwap)][] {
    assert(nrHands === 2 || nrHands === 4, `only supporting 2 and 4 hands for now`)

    const result: [Beat, (TThrow | THandSwap)][] = []

    assert(row.sequence.filter(t => t === "|").length <= 1, `at most one prefix allowed in a row`)
    const prefixDelimiter = row.sequence.indexOf("|")
    const [sequence, prefix] =
        prefixDelimiter >= 0 ? [row.sequence.slice(prefixDelimiter + 1), row.sequence.slice(0, prefixDelimiter)] : [row.sequence, []]

    let beat = 0
    for (let seqIdx = 0; seqIdx < sequence.length; seqIdx++) {
        const currentThrow = sequence[seqIdx]


        if (currentThrow && currentThrow !== ',' && currentThrow !== '.')
            result.push([nrHands === 4 ? beat * 2 : beat, currentThrow])

        if (currentThrow !== HandSwap)
            beat += currentThrow === ',' ? .5 : 1
        if (Array.isArray(currentThrow) && !row.isManipulator)
            beat += 1
    }
    beat = 0
    for (let seqIdx = 0; seqIdx < prefix.length; seqIdx++) {
        const currentThrow = prefix[prefix.length - 1 - seqIdx]
        if (currentThrow && currentThrow !== ',' && currentThrow !== '.')
            result.push([nrHands === 4 ? beat * 2 : -1 - beat, currentThrow])
        if (currentThrow !== HandSwap)
            beat += currentThrow === ',' ? .5 : 1
        if (Array.isArray(currentThrow) && !row.isManipulator)
            beat += 1
    }
    return result
}


// function getPatternLength(rawPattern: TPatternRow[], nrHands: number): number {
//     return rawPattern.map(r => getRowLength(r, nrHands)).reduce((a, b) => Math.max(a, b), 0)
// }

// // number of beats in the sequence, not counting prefix throws
// function getRowLength(row: TPatternRow, nrHands: number): number {
//     assert(nrHands === 2 || nrHands === 4, `only supporting 2 and 4 hands for now`)

//     let beat = 0
//     for (let seqIdx = 0; seqIdx < row.sequence.length; seqIdx++) {
//         const currentThrow = row.sequence[seqIdx]

//         if (currentThrow !== HandSwap)
//             beat += currentThrow === ',' ? .5 : 1
//         if (Array.isArray(currentThrow) && !row.isManipulator)
//             beat += 1
//     }
//     if (nrHands===2) return beat
//     else return beat*2-1 
// }


/**
 * for all nonmanipulator rows, sorted by beat, then row */
function allThrowsByBeat(rows: TPatternRow[], nrHands: number): [number, Beat, Hand | undefined, string][] {
    const result: [number, Beat, Hand | undefined, string][] = []
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++)
        if (!rows[rowIdx].isManipulator) {
            const throwsByBeat = throwByBeat(rows[rowIdx], nrHands)
            for (const [beat, t] of throwsByBeat) {
                if (Array.isArray(t)) {
                    result.push([rowIdx, beat, Hand.Right, t[0]])
                    result.push([rowIdx, beat, Hand.Left, t[1]])
                }
                else
                    result.push([rowIdx, beat, undefined, t])
            }
        }
    result.sort((a, b) => {
        if (a[1] !== b[1]) return a[1] - b[1]
        return a[0] - b[0]
    })
    return result
}

function getPatternLength(throws: [number, Beat, Hand | undefined, string][], nrHands: number): number {
    return throws.reduce((max, v) => Math.max(max, v[2] === undefined ? v[1] : v[1] + nrHands / 2), 0) + 1
}

function getJames(rawPattern: TPatternRow[]): boolean[] {
    const result: boolean[] = []
    for (const row of rawPattern) {
        const throwsByBeat = throwByBeat(row, 4)
        const james = throwsByBeat[0][0] % 2 === 0
        result.push(james)
    }
    return result
}

function getCrossing(throwLength: number, isJames: boolean): boolean {
    // assume four handed sw
    return (isJames ? [2, 3] : [1, 2]).includes(throwLength % 4)
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




/**
 * generates a layout from notation and some information about the passing sequence
 * 
 * as a issue, we need the full passing sequence with both left and right hands, so for
 * odd period patterns, we consider a longer sequence that loops all the way around.
 * hence, we have both the patternLength and the completePatternLength
 * @param layout 
 * @param movement 
 * @param adjustedThrows 
 * @returns 
 */
export function genLayout(layout: TLayout, movement: TMovement | undefined, pattern: Pattern): GroupPatternLayoutSpec {

    const [positions, baseMovementSegments, baseMovementSequences, background] = createShapeLayout(pattern.getInitialRoles(), layout, movement)


    // function findPosition(passerIdx: number): PositionLayout {
    //     const p = positions.find(p => p.passerIdx === passerIdx)
    //     if (!p) throw new Error(`position for passer ${passerIdx} not found`)
    //     return p
    // }

    // function pass(t: Throw, iteration: number): PassLayout {
    //     return {
    //         fromRole: findPosition(t.fromPasserIdx).role,
    //         fromHand: pattern.getThrowHand(t, iteration),
    //         toRole: findPosition(pattern.getToPasserIdxAtThrow(t)).role,
    //         toHand: pattern.getTargetHand(t, iteration),
    //         label: (t.throwBeat + 1).toString()
    //     }
    // }




    // const [movementSegments, movementSequences, movementTriggers] = animateMovement(movement, layout, patternRoles, patternLength)
    const baseMovementTriggers: MovementTriggerSpec[] = movement ? movement.map(m => ({
        onBeat: m.when,
        mod: pattern.getLength(),
        role: m.role,
        duration: m.duration
    })) : []


    return {
        // static: { positions: positions, passes: passesToRender.values().toArray() },
        // frames: passesPerBeat.keys().map(k => {
        //     return {
        //         label: (k + 1).toString(),
        //         static: { positions, passes: passesPerBeat.get(k)! }
        //     }
        // }).toArray(),
        animation: {
            initialPositions: positions,
            passAnimations: [],
            baseMovementSegments,
            baseMovementSequences,
            baseMovementTriggers,
            relativeMovements: [],
            basePatternRelabeling: [],
            relabeling: [],
            // speed: pattern.nrHands === 4 ? 2 : 1
        },
        background
    }
}


export function createLayout(input: string, patternLength: number = 0): GroupPatternLayoutSpec {
    return genLayout(parseLayout(input), undefined, createPattern([], 2, [], ['A', 'B', 'C', 'D', 'E']))
}

