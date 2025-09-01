import { assertEqualPattern, createPatternFromRaw, parseGroupSyncPattern } from "./testutils.ts";
import assert from "node:assert";
import test from "node:test";
import { applyManipulations, fillPatternGaps, prettyPrintManipulatorActions } from "./manipulator-processing.ts";
import { createPattern, Hand, ManipulatorAction, Pattern, Throw } from "@modernpassing/pattern";


const basicFourCountWithoutManipulator =
    `A: 3pB 3 3 3 -- B
     B: 3pA 3 3 3 -- A`


Deno.test('shift: basic', async () => {
    const r = parseGroupSyncPattern(basicFourCountWithoutManipulator)
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())

    const A = 0, B = 1
    assertThrowH(t, 0, 3, A, Hand.Right, B)
    assertThrowH(t, 0, 3, B, Hand.Right, A)
    assertThrowH(t, 1, 3, A, Hand.Left, A)
    assertThrowH(t, 1, 3, B, Hand.Left, B)
    assertThrowH(t, 2, 3, A, Hand.Right, A)
    assertThrowH(t, 2, 3, B, Hand.Right, B)
    assertThrowH(t, 3, 3, A, Hand.Left, B)
    assertThrowH(t, 3, 3, B, Hand.Left, A)

    const [t2, m2] = shiftPattern(t, m)

    console.log(t2.prettyPrintThrows())
    assertThrowH(t2, 0, 3, A, Hand.Left, A)
    assertThrowH(t2, 0, 3, B, Hand.Left, B)
    assertThrowH(t2, 1, 3, A, Hand.Right, A)
    assertThrowH(t2, 1, 3, B, Hand.Right, B)
    assertThrowH(t2, 2, 3, A, Hand.Left, A)
    assertThrowH(t2, 2, 3, B, Hand.Left, B)
    assertThrowH(t2, 3, 3, A, Hand.Right, A)
    assertThrowH(t2, 3, 3, B, Hand.Right, B)

    const [t3, m3] = shiftPattern(t2, m2)

    console.log(t3.prettyPrintThrows())
    assertThrowH(t3, 0, 3, A, Hand.Right, A)
    assertThrowH(t3, 0, 3, B, Hand.Right, B)
    assertThrowH(t3, 1, 3, A, Hand.Left, A)
    assertThrowH(t3, 1, 3, B, Hand.Left, B)
    assertThrowH(t3, 2, 3, A, Hand.Right, B)
    assertThrowH(t3, 2, 3, B, Hand.Right, A)
    assertThrowH(t3, 3, 3, A, Hand.Left, B)
    assertThrowH(t3, 3, 3, B, Hand.Left, A)

    const [t4, m4] = shiftPattern(t3, m3)

    console.log(t4.prettyPrintThrows())
    assertThrowH(t4, 0, 3, A, Hand.Left, A)
    assertThrowH(t4, 0, 3, B, Hand.Left, B)
    assertThrowH(t4, 1, 3, A, Hand.Right, B)
    assertThrowH(t4, 1, 3, B, Hand.Right, A)
    assertThrowH(t4, 2, 3, A, Hand.Left, A)
    assertThrowH(t4, 2, 3, B, Hand.Left, B)
    assertThrowH(t4, 3, 3, A, Hand.Right, B)
    assertThrowH(t4, 3, 3, B, Hand.Right, A)

    const [t5, m5] = shiftPattern(t4, m4)
    assertThrowH(t5, 0, 3, A, Hand.Right, B)
    assertThrowH(t5, 0, 3, B, Hand.Right, A)
    assertThrowH(t5, 1, 3, A, Hand.Left, A)
    assertThrowH(t5, 1, 3, B, Hand.Left, B)
    assertThrowH(t5, 2, 3, A, Hand.Right, A)
    assertThrowH(t5, 2, 3, B, Hand.Right, B)
    assertThrowH(t5, 3, 3, A, Hand.Left, B)
    assertThrowH(t5, 3, 3, B, Hand.Left, A)

    assertEqualPattern(shiftPattern(t5, m5, 4)[0], t)

})

const basicThreeCountWithoutManipulator =
    `A: 3pB 3 3  -- B
     B: 3pA 3 3  -- A`

Deno.test('shift: odd length, need hand switch', async () => {
    const r = parseGroupSyncPattern(basicThreeCountWithoutManipulator)
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())

    const A = 0, B = 1
    assertThrowH(t, 0, 3, A, Hand.Right, B)
    assertThrowH(t, 0, 3, B, Hand.Right, A)
    assertThrowH(t, 1, 3, A, Hand.Left, A)
    assertThrowH(t, 1, 3, B, Hand.Left, B)
    assertThrowH(t, 2, 3, A, Hand.Right, B)
    assertThrowH(t, 2, 3, B, Hand.Right, A)

    const [t2, m2] = shiftPattern(t, m)

    console.log(t2.prettyPrintThrows())
    assertThrowH(t2, 0, 3, A, Hand.Left, A)
    assertThrowH(t2, 0, 3, B, Hand.Left, B)
    assertThrowH(t2, 1, 3, A, Hand.Right, A)
    assertThrowH(t2, 1, 3, B, Hand.Right, B)
    assertThrowH(t2, 2, 3, A, Hand.Left, A)
    assertThrowH(t2, 2, 3, B, Hand.Left, B)

    const [t3, m3] = shiftPattern(t2, m2)

    console.log(t3.prettyPrintThrows())
    assertThrowH(t3, 0, 3, A, Hand.Right, A)
    assertThrowH(t3, 0, 3, B, Hand.Right, B)
    assertThrowH(t3, 1, 3, A, Hand.Left, B)
    assertThrowH(t3, 1, 3, B, Hand.Left, A)
    assertThrowH(t3, 2, 3, A, Hand.Right, B)
    assertThrowH(t3, 2, 3, B, Hand.Right, A)

    const [t4, m4] = shiftPattern(t3, m3)
    assertThrowH(t4, 0, 3, A, Hand.Left, B)
    assertThrowH(t4, 0, 3, B, Hand.Left, A)
    assertThrowH(t4, 1, 3, A, Hand.Right, A)
    assertThrowH(t4, 1, 3, B, Hand.Right, B)
    assertThrowH(t4, 2, 3, A, Hand.Left, B)
    assertThrowH(t4, 2, 3, B, Hand.Left, A)

    assertEqualPattern(shiftPattern(t4, m4, 3)[0], t)

})

const basicFour42CountWithoutManipulator =
    `A: 3pB 4 2 3 -- B
     B: 3pA 3 3 3 -- A`


Deno.test('shift: nonsymetric', async () => {
    const r = parseGroupSyncPattern(basicFour42CountWithoutManipulator)
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())

    const A = 0, B = 1
    assertThrow(t, 0, 3, A, B)
    assertThrow(t, 0, 3, B, A)
    assertThrow(t, 1, 4, A, A)
    assertThrow(t, 1, 3, B, B)
    assertThrow(t, 2, 2, A, A)
    assertThrow(t, 2, 3, B, B)
    assertThrow(t, 3, 3, A, B)
    assertThrow(t, 3, 3, B, A)

    const [t2, m2] = shiftPattern(t, m)

    console.log(t2.prettyPrintThrows())
    assertThrow(t2, 0, 4, A, A)
    assertThrow(t2, 0, 3, B, B)
    assertThrow(t2, 1, 2, A, A)
    assertThrow(t2, 1, 3, B, B)
    assertThrow(t2, 2, 3, A, A)
    assertThrow(t2, 2, 3, B, B)
    assertThrow(t2, 3, 3, A, A)
    assertThrow(t2, 3, 3, B, B)

    const [t3, m3] = shiftPattern(t2, m2)

    console.log(t3.prettyPrintThrows())
    assertThrow(t3, 0, 2, A, A)
    assertThrow(t3, 0, 3, B, B)
    assertThrow(t3, 1, 3, A, A)
    assertThrow(t3, 1, 3, B, B)
    assertThrow(t3, 2, 3, A, B)
    assertThrow(t3, 2, 3, B, A)
    assertThrow(t3, 3, 3, A, B)
    assertThrow(t3, 3, 4, B, A)

    const [t4, m4] = shiftPattern(t3, m3)

    console.log(t4.prettyPrintThrows())
    assertThrow(t4, 0, 3, A, A)
    assertThrow(t4, 0, 3, B, B)
    assertThrow(t4, 1, 3, A, B)
    assertThrow(t4, 1, 3, B, A)
    assertThrow(t4, 2, 3, A, A)
    assertThrow(t4, 2, 4, B, A)
    assertThrow(t4, 3, 3, A, B)
    assertThrow(t4, 3, 2, B, B)

    const [t5, m5] = shiftPattern(t4, m4)
    console.log(t5.prettyPrintThrows())

    assertThrow(t5, 0, 3, A, B)
    assertThrow(t5, 0, 3, B, A)
    assertThrow(t5, 1, 3, A, A)
    assertThrow(t5, 1, 4, B, B)
    assertThrow(t5, 2, 3, A, A)
    assertThrow(t5, 2, 2, B, B)
    assertThrow(t5, 3, 3, A, B)
    assertThrow(t5, 3, 3, B, A)


    assertEqualPattern(shiftPattern(t, m, 8)[0], t)

})

const basic1BeatIntercept =
    `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IA C`

Deno.test('shift: with manipulator applied', async () => {
    const r = parseGroupSyncPattern(basic1BeatIntercept)
    const [t, m] = createPatternFromRaw(r[0], 2)
    const p = applyManipulations(t, m)

    console.log(p.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertThrow(p, 0, 3, A, B, "intercept")
    assertThrow(p, 0, 3, B, M)
    assertThrow(p, 1, 3, A, M, "carry")
    assertThrow(p, 1, 3, B, B)
    assertThrow(p, 2, 3, B, B)
    assertThrow(p, 2, 3, M, M)
    assertThrow(p, 3, 3, B, A)
    assertThrow(p, 3, 3, M, B)

    const p1 = shiftPattern(p, [])[0]
    console.log(p1.prettyPrintThrows())
    assertThrow(p1, 3, 3, M, M, "intercept")
    assertThrow(p1, 3, 3, B, B)
    assertThrow(p1, 0, 3, A, M, "carry")
    assertThrow(p1, 0, 3, B, B)
    assertThrow(p1, 1, 3, B, B)
    assertThrow(p1, 1, 3, M, M)
    assertThrow(p1, 2, 3, B, B)
    assertThrow(p1, 2, 3, M, M)

    const p2 = shiftPattern(p1, [])[0]
    console.log(p2.prettyPrintThrows())
    assertThrow(p2, 2, 3, M, A, "intercept")
    assertThrow(p2, 2, 3, B, M)
    assertThrow(p2, 3, 3, B, M, "carry")
    assertThrow(p2, 3, 3, M, B)
    assertThrow(p2, 0, 3, B, B)
    assertThrow(p2, 0, 3, M, M)
    assertThrow(p2, 1, 3, B, B)
    assertThrow(p2, 1, 3, M, M)

})


const basic2BeatIntercept =
    `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IB . C`
const basicLate1BeatIntercept =
    `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: ..IB C`
const hard1beatInterceptOf4 =
    `A: 2 3 3 3 -- B
         B: 3 3 3 4 -- A
         M: .C . IA `
const threeBeatCarry =
    `A: 3 3 3pB 3 -- B
         B: 3 3 3pA 3 -- A
         M: IA . . C`
const twoIndependentManipulators =
    `A: 3pB 3  3 3 3  3 3 -- B
        B: 3pA 3  3 3 3  3 3 -- A
        M: .   IB C
        N: .   .  . . IB C`
const interceptingACarry =
    `A: 3pB 3  3 3 3  3 3 -- B
    B: 3pA 3  3 3 3  3 3 -- A
    M: .   IB C
    N: .   .  IB C`
const delayedHandin1 =
    `A: 3333 -- B
         B: 3333  -- A
         M: . SBd `
const delayedHandin2 =
    `A: 3333 -- B
         B: 3333  -- A
         M: . SBd2 `
const earlyIntercept =
    `A: 3 3pB 3 3 -- B
    B: 3 3pA  3 3 -- A
    M: . IBAe CA`
const scrambedV =
    `A: 3B 3  3C 3  3B 3 -- B
    B: 3A 3  3  3  3A 3  -- C
    C: 3  3  3A 3  3  3  -- A
    M: C  z  SB z  ICe 
    positions: V(A,B,C)`

const ambled3_a =
    `A: 4B 3  4C 3  4B 3  4C -- B
    B: 3  4A 3  3  3  4A 3  -- C
    C: 3  3  3  4A 3  3  3  -- A
    M: C  z  .  SB z  IC 
    positions: V(A,B,C)`
const ambled3_b =
    `A: 4B 3  4C 3  4B 3  4C -- B
    B: 3  4A 3  3  3  4A 3  -- C
    C: 3  3  3  4A 3  3  3  -- A
    M: .  C  z  SCAIAB
    positions: V(A,B,C)`
const ambled3_c =
    `A: 4B 3  4C 3  4B 3  4C -- B
    B: 3  4A 3  3  3  4A 3  -- C
    C: 3  3  3  4A 3  3  3  -- A
    M: .  C  z  (SCAd 3) IABe 
    positions: V(A,B,C)`




const patterns: { [key: string]: string } = {
    basicFourCountWithoutManipulator,
    basicFour42CountWithoutManipulator,
    basic1BeatIntercept,
    basic2BeatIntercept,
    basicLate1BeatIntercept,
    hard1beatInterceptOf4,
    threeBeatCarry,
    twoIndependentManipulators,
    interceptingACarry,
    delayedHandin1,
    delayedHandin2,
    earlyIntercept,
    scrambedV,
    ambled3_a,
    ambled3_b,
    ambled3_c
}

test('invariant: pass labels remain stable over shifts', async () => {

    for (const patternName of Object.keys(patterns)) {
        const pattern = patterns[patternName] as string
        const r = parseGroupSyncPattern(pattern)
        const [t, m] = createPatternFromRaw(r[0], 2)
        const firstP = applyManipulations(t, m)

        let lastP = firstP
        for (let shiftOffset = 1; shiftOffset <= firstP.getLength() * firstP.nrRows * 2; shiftOffset++) {

            const [shiftedP,] = shiftPattern(lastP, m)
            const [shiftedDirectlyP,] = shiftPattern(firstP, m, shiftOffset)

            assertEqualPattern(shiftedP, shiftedDirectlyP)


            for (let beat = 0; beat < shiftedP.getLength(); beat++)
                for (let row = 0; row < shiftedP.nrRows; row++) {
                    // find the same passes shifted by one
                    // the rows might be different but the from-to roles should be stable


                    const t1 = shiftedP.findThrows(beat).map((t) => throwToString(shiftedP, t)).sort()
                    const t2 = lastP.findThrows((beat + 1) % lastP.getLength()).map((t) => throwToString(lastP, t)).sort()

                    assert.deepEqual(t1, t2, `throws on ${beat} should be the same as throws on ${beat + 1} in the previous pattern`)
                }


            lastP = shiftedP
        }
        assertEqualPattern(lastP, firstP)//, `shifting all the way around should be the same as the original`)
    }

})

test('invariant: applying manipulator actions should be stable across shifts', async () => {
    // metamorphic invariant:  shift(apply(p, m)) = apply(shift(p), shift(m))



    for (const patternName of Object.keys(patterns)) {
        const pattern = patterns[patternName] as string
        const r = parseGroupSyncPattern(pattern)
        const [t, m] = createPatternFromRaw(r[0], 2)
        // ignore patterns without manipulators
        if (m.length === 0) continue
        const pWithManipulator = applyManipulations(t, m)



        for (let shiftOffset = 1; shiftOffset <= pWithManipulator.getLength() * pWithManipulator.nrRows * 2; shiftOffset++) {
            let shifted1: Pattern | undefined, shifted2: Pattern | undefined, shiftedT: Pattern | undefined, shiftedM: ManipulatorAction[] | undefined
            try {

                shifted1 = shiftPattern(pWithManipulator, m, shiftOffset)[0]

                const x = shiftPattern(t, m, shiftOffset)
                shiftedT = x[0]; shiftedM = x[1]
                shifted2 = applyManipulations(shiftedT, shiftedM)


                assertEqualPattern(shifted1, shifted2)
            } catch (e) {
                console.error(`## Pattern: ${patternName}`)
                console.error(t.prettyPrintThrows() + prettyPrintManipulatorActions(t, m))
                console.error("Local (without shifting):")
                console.error(pWithManipulator.prettyPrintThrows())


                console.error("## Shifted")
                console.error(`shiftOffset: ${shiftOffset}`)
                console.error("\nShifted manipulator pattern:")
                if (shifted1) console.error(shifted1.prettyPrintThrows())
                console.error("\nShifted input patterns:")
                if (shiftedT && shiftedM) console.error(shiftedT.prettyPrintThrows() + prettyPrintManipulatorActions(shiftedT, shiftedM))
                console.error("\nManipulator applied on shifted input patterns:")
                if (shifted2) console.error(shifted2.prettyPrintThrows())

                throw e
            }

        }
    }
})


const aidanPatterns: { [key: string]: string } = function () {

    const base =
        `A: 3B 3  3C 3  3B 3 -- B
B: 3A 3  3  3  3A 3  -- C
C: 3  3  3A 3  3  3  -- A`
    const positionsLine = `positions: V(A,B,C)`
    const result: { [key: string]: string } = {}

    for (const manipulatorLine of ["IX.CzSYz", "SYzIX.Cz", "CzSYzIX"])
        for (const interceptTarget of ['A', 'B', 'C'])
            for (const substitutionTarget of ['A', 'B', 'C']) {
                const manipulator = manipulatorLine.replace("X", interceptTarget).replace("Y", substitutionTarget)
                const pattern = base + "\nM: " + manipulator + "\n" + positionsLine
                result[manipulator.replaceAll(".", "")] = pattern
            }


    return result
}()



test('generate all aidan patterns', async () => {
    for (const patternName of Object.keys(aidanPatterns)) {
        const pattern = aidanPatterns[patternName] as string
        let pWithManipulator
        try {
            const r = parseGroupSyncPattern(pattern)
            const [t, m] = createPatternFromRaw(r[0], 2)
            pWithManipulator = fillPatternGaps(applyManipulations(t, m))

            console.log(patternName)
            assert.ok(pWithManipulator.isValid(), 'pattern is invalid after filling manipulator actions: ' + pWithManipulator.getValidationError())
            console.log(pWithManipulator.prettyPrintThrows())
        } catch (e) {
            console.error(`## Pattern: ${patternName}`)
            console.error(pattern)
            if (pWithManipulator) console.error(pWithManipulator.prettyPrintThrows())
            throw e
        }
    }
})



function throwToString(p: Pattern, t: Throw) {
    return `from ${p.getRole(t.throwBeat, t.fromPasserIdx)} to ${p.getRole(p.getThrowCauseBeat(t), t.toPasserIdxAtCausal)} - ${t.throwLength}`
}



/**
 * shift the entire pattern to the left by one beat. that is, the first beat becomes the last beat
 * 
 * this is somewhat painful to implement, but hopefully useful for testing all the
 * stuff at the pattern boundary
 */
function shiftPattern(pattern: Pattern, manipulations: ManipulatorAction[], times: number = 1): [Pattern, ManipulatorAction[]] {
    for (let i = 0; i < times; i++) {
        [pattern, manipulations] = shiftPatternOnce(pattern, manipulations)
    }
    return [pattern, manipulations]
}
function shiftPatternOnce(pattern: Pattern, manipulations: ManipulatorAction[]): [Pattern, ManipulatorAction[]] {
    const newThrows = pattern.throws.map(t => {
        const throwCauseTime = pattern.getThrowCauseTime(t)
        return {
            ...t,
            // fromHand: t.throwBeat === 0 ? pattern.getThrowHand(t, 1) : t.fromHand,
            throwBeat: (t.throwBeat - 1 + pattern.getLength()) % pattern.getLength(),
            toPasserIdxAtCausal: throwCauseTime === pattern.getLength() ? pattern.adjustRowIdxByTime(-1, t.toPasserIdxAtCausal) :
                throwCauseTime === 0 ? pattern.adjustRowIdxByTime(-1, t.toPasserIdxAtCausal) : t.toPasserIdxAtCausal,
            fromPasserIdx: t.throwBeat === 0 ? pattern.adjustRowIdxByTime(-1, t.fromPasserIdx) : t.fromPasserIdx,
            note: ""
        }
    })

    // manipulations are easy to shift. they are expressed in terms of roles, not rows 
    // so now row adjustment for any relabeling needed
    // the only exception is the hand of hardcoded manipulator throws -- this is really hacky now, since we don't know the handMapping for the manipulator really
    const newManipulations = manipulations.map(m => {
        const beat = (m.beat - 1 + pattern.getLength()) % pattern.getLength()
        if (m.kind === 'T') {
            // let fromHand = m.fromHand
            // if (m.beat===0 && pattern.mapHands[0][0]) fromHand = 1 - m.fromHand
            return {
                ...m,
                // fromHand,
                beat,
            }
        } else return { ...m, beat }
    })



    function shiftRoles(roles: string[]): string[] {
        return pattern.mapRows.map((r) => roles[r])
    }

    const firstRoles = pattern.roles[0]
    const roles: [number, string[]][] = pattern.roles.map(r => {
        return [(r[0] - 1 + pattern.getLength()) % pattern.getLength(), r[0] === 0 ? shiftRoles(r[1]) : r[1]]
    })
    if (roles.length <= 1 || roles[1][0] !== 0)
        roles.unshift(firstRoles)
    let lastRoles: string[] = []
    const newRoles: [number, string[]][] = []
    for (const r of roles.sort((a, b) => a[0] - b[0])) {
        if (!r[1].every((v, i) => v === lastRoles[i])) newRoles.push(r)
        lastRoles = r[1]
    }

    const globalHandOrder = pattern.globalHandOrder.map((_, i) => 
        pattern.globalHandOrder[(i - 1 + pattern.globalHandOrder.length) % pattern.globalHandOrder.length]
    )

    return [createPattern(newThrows, pattern.nrHands, pattern.mapRows, newRoles, globalHandOrder, pattern.getLength(), pattern.globalHandOrderOffset), newManipulations]
}



/**
 * throws are identified by row index (wraparound will change the row of a self!)
 */
function assertThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtCausal}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected one [${msg}]`)
}
function assertThrowH(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, fromHand: Hand, toPasserIdxAtCausal: number, msg?: string) {
    const isFromOppositeHand = (fromHand !== pattern.getGlobalHand(0, beat))
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.fromOppositeHand === isFromOppositeHand && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(ts.length !== 0, `throw ${length}@${beat} from ${fromPasserIdx}/${fromHand} to ${toPasserIdxAtCausal}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${length}@${beat} from ${fromPasserIdx}/${fromHand} to ${toPasserIdxAtCausal}, expected one [${msg}]`)
}
function assertNoThrow(pattern: Pattern, beat: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(ts.length === 0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected none [${msg}]`)
}



Deno.test('invariant: all patterns are valid after filling gaps', async () => {


    for (const patternName of Object.keys(patterns)) {
        const pattern = patterns[patternName] as string
        const r = parseGroupSyncPattern(pattern)
        const [t, m] = createPatternFromRaw(r[0], 2)
        // ignore patterns without manipulators
        if (m.length === 0) continue
        const pWithManipulator = applyManipulations(t, m)
        const pWithManipulatorFilled = fillPatternGaps(pWithManipulator)



        try {

            assert.ok(pWithManipulatorFilled.isValid(), 'pattern is invalid after filling manipulator actions: ' + pWithManipulatorFilled.getValidationError())

        } catch (e) {
            console.error(`## Pattern: ${patternName}`)
            console.log(pWithManipulator.prettyPrintThrows())
            console.log(pWithManipulatorFilled.prettyPrintThrows())

            throw e
        }

    }



})



Deno.test('invariant: all patterns are valid after filling gaps, also after all shifts', async () => {



    for (const patternName of Object.keys(patterns)) {
        const pattern = patterns[patternName] as string
        const r = parseGroupSyncPattern(pattern)
        const [t, m] = createPatternFromRaw(r[0], 2)
        // ignore patterns without manipulators
        if (m.length === 0) continue
        const pWithManipulator = fillPatternGaps(applyManipulations(t, m))



        for (let shiftOffset = 1; shiftOffset <= pWithManipulator.getLength() * pWithManipulator.nrRows * 2; shiftOffset++) {
            let shifted1: Pattern | undefined, shifted2: Pattern | undefined, shiftedT: Pattern | undefined, shiftedM: ManipulatorAction[] | undefined
            try {

                shifted1 = shiftPattern(pWithManipulator, m, shiftOffset)[0]

                const x = shiftPattern(t, m, shiftOffset)
                shiftedT = x[0]; shiftedM = x[1]
                shifted2 = fillPatternGaps(applyManipulations(shiftedT, shiftedM))

                assert.ok(shifted1.isValid(), 'pattern is invalid after filling manipulator actions: ' + shifted1.getValidationError())
                assert.ok(shifted2.isValid(), 'pattern is invalid after filling manipulator actions: ' + shifted2.getValidationError())


                assertEqualPattern(shifted1, shifted2)
            } catch (e) {
                console.error(`## Pattern: ${patternName}`)
                console.error(t.prettyPrintThrows() + prettyPrintManipulatorActions(t, m))
                console.error("Local (without shifting):")
                console.error(pWithManipulator.prettyPrintThrows())


                console.error("## Shifted")
                console.error(`shiftOffset: ${shiftOffset}`)
                console.error("\nShifted manipulator pattern:")
                if (shifted1) console.error(shifted1.prettyPrintThrows())
                console.error("\nShifted input patterns:")
                if (shiftedT && shiftedM) console.error(shiftedT.prettyPrintThrows() + prettyPrintManipulatorActions(shiftedT, shiftedM))
                console.error("\nManipulator applied on shifted input patterns:")
                if (shifted2) console.error(shifted2.prettyPrintThrows())

                throw e
            }

        }
    }



})

