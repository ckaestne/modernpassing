import assert from "node:assert";
import test from "node:test";
import { applyInterceptCarry, applyManipulations, applyManipulatorThrow, applySubstitution, Pattern, createPatternFromRaw, prettyPrintManipulatorActions, Throw, ManipulatorAction } from "./manipulator-processing.ts";
import { parseGroupSyncPattern } from "./pattern-fromgroup.ts";


const basicFourCountWithoutManipulator =
    `A: 3pB 3 3 3 -> B
     B: 3pA 3 3 3 -> A`


Deno.test('shift: basic', async () => {
    const r = parseGroupSyncPattern(basicFourCountWithoutManipulator)
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())

    const A = 0, B = 1
    assertThrow(t, 0, 3, A, B)
    assertThrow(t, 0, 3, B, A)
    assertThrow(t, 1, 3, A, A)
    assertThrow(t, 1, 3, B, B)
    assertThrow(t, 2, 3, A, A)
    assertThrow(t, 2, 3, B, B)
    assertThrow(t, 3, 3, A, B)
    assertThrow(t, 3, 3, B, A)

    const [t2, m2] = shiftPattern(t, m)

    console.log(t2.prettyPrintThrows())
    assertThrow(t2, 0, 3, A, A)
    assertThrow(t2, 0, 3, B, B)
    assertThrow(t2, 1, 3, A, A)
    assertThrow(t2, 1, 3, B, B)
    assertThrow(t2, 2, 3, A, A)
    assertThrow(t2, 2, 3, B, B)
    assertThrow(t2, 3, 3, A, A)
    assertThrow(t2, 3, 3, B, B)

    const [t3, m3] = shiftPattern(t2, m2)

    console.log(t3.prettyPrintThrows())
    assertThrow(t3, 0, 3, A, A)
    assertThrow(t3, 0, 3, B, B)
    assertThrow(t3, 1, 3, A, A)
    assertThrow(t3, 1, 3, B, B)
    assertThrow(t3, 2, 3, A, B)
    assertThrow(t3, 2, 3, B, A)
    assertThrow(t3, 3, 3, A, B)
    assertThrow(t3, 3, 3, B, A)

    const [t4, m4] = shiftPattern(t3, m3)

    console.log(t4.prettyPrintThrows())
    assertThrow(t4, 0, 3, A, A)
    assertThrow(t4, 0, 3, B, B)
    assertThrow(t4, 1, 3, A, B)
    assertThrow(t4, 1, 3, B, A)
    assertThrow(t4, 2, 3, A, A)
    assertThrow(t4, 2, 3, B, B)
    assertThrow(t4, 3, 3, A, B)
    assertThrow(t4, 3, 3, B, A)

    const [t5, m5] = shiftPattern(t4, m4)
    assertThrow(t5, 0, 3, A, B)
    assertThrow(t5, 0, 3, B, A)
    assertThrow(t5, 1, 3, A, A)
    assertThrow(t5, 1, 3, B, B)
    assertThrow(t5, 2, 3, A, A)
    assertThrow(t5, 2, 3, B, B)
    assertThrow(t5, 3, 3, A, B)
    assertThrow(t5, 3, 3, B, A)


    assertEqualPattern(shiftPattern(t5, m5, 4)[0], t)

})


const basicFour42CountWithoutManipulator =
    `A: 3pB 4 2 3 -> B
     B: 3pA 3 3 3 -> A`


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


function assertEqualThrows(pattern1:Pattern, pattern2: Pattern) {
    function s(a: Throw, b: Throw): number {
        const x = a.throwBeat - b.throwBeat
        if (x !== 0) return x
        return a.fromPasserIdx - b.fromPasserIdx
    }

    const t1 = pattern1.throws.map(t => { return `${t.throwBeat} ${pattern1.getRole(t.throwBeat, t.fromPasserIdx)} ${t.throwLength} ${pattern1.getRole(t.throwBeat, t.toPasserIdx)}` }).sort()
    const t2 = pattern2.throws.map(t => { return `${t.throwBeat} ${pattern2.getRole(t.throwBeat, t.fromPasserIdx)} ${t.throwLength} ${pattern2.getRole(t.throwBeat, t.toPasserIdx)}` }).sort()

    assert.deepStrictEqual(t1, t2)
}

const basic1BeatIntercept =
    `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
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
    `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IB . C`
const basicLate1BeatIntercept =
    `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: ..IB C`
const hard1beatInterceptOf4 =
    `A: 2 3 3 3 -> B
         B: 3 3 3 4 -> A
         M: .C . IB `
const threeBeatCarry = 
         `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . . C`
const twoIndependentManipulators =
        `A: 3pB 3  3 3 3  3 3 -> B
        B: 3pA 3  3 3 3  3 3 -> A
        M: .   IB C
        N: .   .  . . IB C`


const patterns: { [key: string]: string } = {
    basicFourCountWithoutManipulator,
    basicFour42CountWithoutManipulator,
    basic1BeatIntercept,
    basic2BeatIntercept,
    basicLate1BeatIntercept,
    hard1beatInterceptOf4,
    threeBeatCarry,
    twoIndependentManipulators
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



        for (let shiftOffset = 0; shiftOffset <= pWithManipulator.getLength() * pWithManipulator.nrRows * 2; shiftOffset++) {
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



function throwToString(p: Pattern, t: Throw) {
    return `from ${p.getRole(t.throwBeat, t.fromPasserIdx)} to ${p.getRole(p.getThrowCauseBeat(t), t.toPasserIdx)} - ${t.throwLength}`
}



function assertEqualPattern(p1: Pattern, p2: Pattern) {

    assert.equal(p1.nrHands, p2.nrHands)
    assert.equal(p1.getLength(), p2.getLength())
    assert.equal(p1.nrRows, p2.nrRows)

    // rows may not be in the same order, so let's compare transformations in role changes
    assert.deepEqual(
        p1.mapRows.map((r,i)=>p1.getRole(0,i)+"->"+p1.getRole(0,r)).sort(),
        p2.mapRows.map((r,i)=>p2.getRole(0,i)+"->"+p2.getRole(0,r)).sort()
    )
    assert.deepEqual(normalizeRoles(p1), normalizeRoles(p2))

    assertEqualThrows(p1, p2)
}
function normalizeRoles(pattern: Pattern): string[] {
    const roles: string[] = []
    for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
        const fromRole = pattern.getRole(0, rowIdx)
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            roles.push(`${fromRole}${beat}${pattern.getRole(beat, rowIdx)}`)        
            
        }
    }
    return roles.sort()
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
            throwBeat: (t.throwBeat - 1 + pattern.getLength()) % pattern.getLength(),
            toPasserIdx: throwCauseTime === pattern.getLength() ? pattern.adjustRowIdxByTime(-1, t.toPasserIdx) :
                throwCauseTime === 0 ? pattern.adjustRowIdxByTime(-1, t.toPasserIdx) : t.toPasserIdx,
            fromPasserIdx: t.throwBeat === 0 ? pattern.adjustRowIdxByTime(-1, t.fromPasserIdx) : t.fromPasserIdx,
            note: ""
        }
    })

    // manipulations are easy to shift. they are expressed in terms of roles, not rows 
    // so now row adjustment for any relabeling needed
    const newManipulations = manipulations.map(m => {
        return {
            ...m,
            beat: (m.beat - 1 + pattern.getLength()) % pattern.getLength(),
        }
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

    return [new Pattern(newThrows, pattern.nrHands, pattern.mapRows, newRoles), newManipulations]
}



/**
 * throws are identified by row index (wraparound will change the row of a self!)
 */
export function assertThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdx}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
}
function assertNoThrow(pattern: Pattern, beat: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length === 0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdx}, expected none [${msg}]`)
}





