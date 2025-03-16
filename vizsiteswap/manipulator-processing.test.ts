import assert from "node:assert";
import test from "node:test";
import { applyInterceptCarry, applyManipulations, applyManipulatorThrow, applySubstitution, Pattern, createPatternFromRaw, prettyPrintManipulatorActions, Throw, ThrowType } from "./manipulator-processing.ts";
import { parseGroupSyncPattern } from "./pattern-fromgroup.ts";


Deno.test('test parsing four-count', async () => {
    const r = parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())
    const A = 0, B = 1

    assertThrow(t, 0, 3, A, B)
    assertThrow(t, 0, 3, B, A)
    assertThrow(t, 1, 3, A, A)
    assertThrow(t, 1, 3, B, B)
    assertThrow(t, 2, 3, A, A)
    assertThrow(t, 2, 3, B, B)
    assertThrow(t, 3, 3, A,A)
    assertThrow(t, 3, 3, B,B)
})

Deno.test('test parsing four-count in different notations', async () => {
    // with p and target
    const [t1,] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )[0], 2)
    // implied target
    const [t2,] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3p 3 3 3 -> B
        B: 3p 3 3 3 -> A`
    )[0], 2)
    // target without p
    const [t3,] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3B 3 3 3 -> B
        B: 3A 3 3 3 -> A`
    )[0], 2)
    // extra self-targets
    const [t4,] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3B 3A 3A 3A -> B
        B: 3A 3B 3B 3B -> A`
    )[0], 2)
    const A = 0, B = 1
    for (const t of [t1, t2, t3, t4]) {
        assertThrow(t, 0, 3, A, B)
        assertThrow(t, 0, 3, B, A)
        assertThrow(t, 1, 3, A, A)
        assertThrow(t, 1, 3, B, B)
        assertThrow(t, 2, 3, A, A)
        assertThrow(t, 2, 3, B, B)
        assertThrow(t, 3, 3, A, A)
        assertThrow(t, 3, 3, B, B)
    }
})


Deno.test('test parsing 867', async () => {
    const p = parseGroupSyncPattern(
        `A:  7 6 8 7 6 -> B
         B: , 8 7 6 8 -> A`
    )
    const [t,] = createPatternFromRaw(p[0], 4)

    console.log(t.prettyPrintThrows())


    const A = 0, B = 1

    assertThrow(t, 0, 7, A, B)
    assertThrow(t, 1, 8, B, B)
    assertThrow(t, 2, 6, A, A)
    assertThrow(t, 3, 7, B, A)
    assertThrow(t, 4, 8, A, A)
    assertThrow(t, 5, 6, B, B)
    assertThrow(t, 6, 7, A, B)
    assertThrow(t, 7, 8, B, B)
    assertThrow(t, 8, 6, A, A)

})
Deno.test('test parsing 867 notation variations', async () => {
    // default notation without annotations
    const [t1,] = createPatternFromRaw(parseGroupSyncPattern(
        `A:  7 6 8 7 6 -> B
         B: , 8 7 6 8 -> A`
    )[0], 4)
    // implied target with p
    const [t2,] = createPatternFromRaw(parseGroupSyncPattern(
        `A:  7p 6 8 7p 6 -> B
         B: , 8 7p 6 8 -> A`
    )[0], 4)
    // target without p
    const [t3,] = createPatternFromRaw(parseGroupSyncPattern(
        `A:  7B 6 8 7B 6 -> B
         B: , 8 7A 6 8 -> A`
    )[0], 4)
    // extra self-targets
    const [t4,] = createPatternFromRaw(parseGroupSyncPattern(
        `A:  7B 6A 8A 7B 6A -> B
         B: , 8B 7A 6B 8B -> A`
    )[0], 4)


    const A = 0, B = 1

    for (const t of [t1, t2, t3, t4]) {
        assertThrow(t, 0, 7, A, B)
        assertThrow(t, 1, 8, B, B)
        assertThrow(t, 2, 6, A, A)
        assertThrow(t, 3, 7, B, A)
        assertThrow(t, 4, 8, A, A)
        assertThrow(t, 5, 6, B, B)
        assertThrow(t, 6, 7, A, B)
        assertThrow(t, 7, 8, B, B)
        assertThrow(t, 8, 6, A, A)
    }

})

Deno.test('test parsing chopabout', async () => {
    const p = parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33   3pA3 33 -> A
         M: SBcz SAlz SAcz SAlz IAv]. CA`
    )
    const [t, a] = createPatternFromRaw(p[0], 2)

    const s = t.prettyPrintThrows() + prettyPrintManipulatorActions(t, a)
    console.log(s)

    const A = 0, B = 1, M = 2

    for (const i of [0, 4, 8]) {
        assertThrow(t, i, 3, A, B)
        assertThrow(t, i, 3, B, A)
    }
    for (const i of [1, 2, 3, 5, 6, 7, 9, 10, 11]) {
        assertThrow(t, i, 3, A, A)
        assertThrow(t, i, 3, B, B)
    }


    const expected =
        `M:      SB     1M       SA     1M       SA     1M       SA      1M      IA              C`
    assert.deepEqual(prettyPrintManipulatorActions(t, a).replace(/\s+/g, ''), expected.replace(/\s+/g, ''))
})


Deno.test('test parsing manege', async () => {
    const p = parseGroupSyncPattern(
        `A: 7pB   6    8  7pB  6-> B
         B: ,   8   7pA  6    8 -> A
         M: IB    , CAf `
    )
    const [t, a] = createPatternFromRaw(p[0], 4)

    const s = t.prettyPrintThrows() + prettyPrintManipulatorActions(t, a)
    console.log(s)

    const A = 0, B = 1, M = 2

    assertThrow(t, 0, 7, A, B)
    assertThrow(t, 1, 8, B, B)
    assertThrow(t, 2, 6, A, A)
    assertThrow(t, 3, 7, B, A)
    assertThrow(t, 4, 8, A, A)
    assertThrow(t, 5, 6, B, B)
    assertThrow(t, 6, 7, A, B)
    assertThrow(t, 7, 8, B, B)
    assertThrow(t, 8, 6, A, A)

    const expected =
        `M:      IB                      C`
    assert.deepEqual(prettyPrintManipulatorActions(t, a).replace(/\s+/g, ''), expected.replace(/\s+/g, ''))
    assert(s.includes(':\tIB\t\t\tC'), 'timing of manipulator actions is wrong')
})


Deno.test('intercept rewrite: basic', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA CA`
    )[0], 2)

    assert(manipulations && manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    // assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 2, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')

    // 1 beat carry is easy, unchanged in this case except for redirecting it
    assertThrow(rewritten, 1, 3, A, M, 'carry')

    assertThrow(rewritten, 1, 3, B, B, 'unmodified self 1')
    assertThrow(rewritten, 2, 3, B, B, 'unmodified self 2')
    assertThrow(rewritten, 3, 3, B, B, 'unmodified self 3')

})



Deno.test('intercept rewrite: 456about should be easy', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 5 4 6 5 4 -> B
         B: ,6 5 4 6 -> A
        M: .IA`
    )[0], 4)

    assert(manipulations[0].kind === 'I' && manipulations.length === 1) // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 5, A, B, 'unmodified')
    assertThrow(rewritten, 2, 4, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 2, A, A, 'remove intercepted')
    assertThrow(rewritten, 2, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 4, 6, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 6, 5, M, B, 'moving original throws from A to M')
    assertThrow(rewritten, 8, 4, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 4, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 6, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 8, A, A, 'moving original throws from A to M')

    //redirect the pass from B to A now to M
    assertThrow(rewritten, 3, 5, B, M, 'redirected pass')


})



Deno.test('intercept rewrite: manege', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 7 6 8 7 6 -> B
         B: ,8 7 6 8 -> A
        M: IB, CA`
    )[0], 4)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 7, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, B, 'remove intercepted')
    assertThrow(rewritten, 3, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 5, 6, M, M, 'moving original throws from B to M')
    assertThrow(rewritten, 7, 8, M, M, 'moving original throws from B to M')
    assertNoThrow(rewritten, 5, B, B, 'moving original throws from B to M')
    assertNoThrow(rewritten, 7, B, B, 'moving original throws from B to M')

    //redirect the pass from B to A now to M
    assertThrow(rewritten, 1, 8, B, M, 'redirected heff')

    // carry is normal
    assertThrow(rewritten, 3, 7, B, A, 'carry')


})



Deno.test('intercept rewrite: basic two beat carry', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA . CA`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    // assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 3, A, M, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')

})

Deno.test('intercept rewrite: basic three beat carry', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA . . CA`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 3, 3, A, M, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')
    assertThrow(rewritten, 3, 2, M, M, 'carry-induced flip at old manipulator')

})


Deno.test('intercept rewrite: two carry on a pass', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . CA`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, A, 'remove intercepted')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 3, A, B, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')

})


Deno.test('intercept rewrite: three-beat carry over a pass', async () => {
    //this creates counterintuitive behavior where both M and B have a flip because they are missing a pass that gets carried later
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . . C`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, A, 'remove intercepted')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, B, 'moving original throws from A to M')

    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 2, A, A, 'carry-induced flip before carry')
    assertThrowRaw(rewritten, 3, 3, A, A, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')
    assertThrow(rewritten, 3, 2, B, B, 'carry-induced flip at old manipulator')

})




Deno.test('intercept rewrite: intercept over pattern boundary', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: C..IA`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 2, B = 1, M = 0

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [2, 0, 1])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 3, B, B, 'remove intercepted')
    assertThrow(rewritten, 3, 3, B, M, 'new throw for intercept')
    assertThrow(rewritten, 0, 0, A, A, 'catching intercept with an empty hand')

    assertThrow(rewritten, 1, 3, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 1, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 2, 3, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 2, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 3, 3, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, M, M, 'moving original throws from A to M')

    assertThrow(rewritten, 0, 3, M, B, 'carry')

})



Deno.test('intercept rewrite: intercept over pattern boundary with three passers', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> C
        C: 3333 -> A
        M: C..IC
        positions: V(A,B,C)`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 2, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    assert.deepEqual(rewritten.mapRows, [1, 2, 3, 0])
    const A = 0, B = 1, M = 2, C = 3

    console.log(rewritten.prettyPrintThrows())

    assertNoThrow(rewritten, 3, B, B, 'remove intercepted')
    assertThrow(rewritten, 3, 3, B, M, 'new throw for intercept')
    assertThrow(rewritten, 0, 0, C, C, 'catching intercept with an empty hand')

    assertThrow(rewritten, 1, 3, C, C, 'moving original throws from A to M')
    assertNoThrow(rewritten, 1, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 2, 3, C, C, 'moving original throws from A to M')
    assertNoThrow(rewritten, 2, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 3, 3, C, C, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, M, M, 'moving original throws from A to M')

    assertThrow(rewritten, 0, 3, M, C, 'carry')
})




Deno.test('intercept rewrite: two-beat intercept/carry over pattern boundary', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: .C.IA`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 2, B = 1, M = 0

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [2, 0, 1])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 3, B, B, 'remove intercepted')
    assertThrow(rewritten, 3, 3, B, M, 'new throw for intercept')
    assertThrow(rewritten, 0, 0, A, A, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 2, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 3, 3, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, M, M, 'moving original throws from A to M')


    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 0, 2, M, M, 'carry-induced flip before carry')
    assertThrow(rewritten, 1, 3, M, B, 'carry')
    assertThrow(rewritten, 1, 2, B, B, 'carry-induced flip at receiver of pass after intercept')

})



Deno.test('intercept rewrite: high intercept throw over pattern boundary', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 2 3pB 3 4 -> B
        B: 2 3pA 3 4 -> A
        M: .C.IA`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [2, 0, 1])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 3, B, B, 'remove intercepted')
    assertThrow(rewritten, 3, 4, B, A, 'new throw for intercept')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 2, A, A, 'moving original throws from A to M')
    assertThrow(rewritten, 3, 4, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')

    assertThrow(rewritten, 1, 3, A, B, 'carry')

})



Deno.test('intercept rewrite: two-beat intercept/carry over pattern boundary like scrambled v', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: C.IB`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 2, 0])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 2, B, B, 'remove intercepted')
    assertThrow(rewritten, 2, 3, B, M, 'new throw for intercept')
    assertThrow(rewritten, 3, 0, M, M, 'catching intercept with an empty hand')

    // assertThrow(rewritten, 2, 3, A, A, 'moving original throws from A to M')
    // assertNoThrow(rewritten, 2, M, M, 'moving original throws from A to M')
    // assertThrow(rewritten, 3, 3, A, A, 'moving original throws from A to M')
    // assertNoThrow(rewritten, 3, M, M, 'moving original throws from A to M')


    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 3, 2, B, B, 'carry-induced flip before carry')
    assertThrow(rewritten, 0, 3, M, B, 'carry')
    assertThrow(rewritten, 0, 2, A, A, 'carry-induced flip at receiver of pass after intercept')

})


Deno.test('intercept rewrite: two intercepts from same manipulator', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 3  3 3 3-> B
         B: 3pA 3  3 3 3  3 3 3 -> A
         M: .   IB C . IB C`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable
    assert(manipulations[2].kind === 'I' && manipulations[3].kind === 'C') // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [B, A, M])

    assertThrow(rewritten, 1, 3, B, M, 'first intercept')
    assertThrow(rewritten, 2, 3, B, M, 'first carry')

    assertThrow(rewritten, 3, 3, M, M, 'M now has Bs throws')

    assertThrow(rewritten, 4, 3, M, B, 'second intercept')
    assertThrow(rewritten, 5, 3, M, B, 'second carry')

    assertThrow(rewritten, 6, 3, B, B, 'B now has Bs throws again')
    assertNoThrow(rewritten, 6, M, M, 'B now has Bs throws')

})


Deno.test('intercept rewrite: two intercepts from same manipulator, but different targets', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 3  3 3 3-> B
         B: 3pA 3  3 3 3  3 3 3 -> A
         M: .   IB C . IA C`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable
    assert(manipulations[2].kind === 'I' && manipulations[3].kind === 'C') // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [M, B, A])

    assertThrow(rewritten, 1, 3, B, M, 'first intercept')
    assertThrow(rewritten, 2, 3, B, M, 'first carry')

    assertThrow(rewritten, 3, 3, M, M, 'M now has Bs throws')

    assertThrow(rewritten, 4, 3, A, B, 'second intercept')
    assertThrow(rewritten, 5, 3, A, B, 'second carry')

    assertThrow(rewritten, 6, 3, B, B, 'B now has As throws')
    assertNoThrow(rewritten, 6, A, A, 'B now has As throws')

})



Deno.test('intercept rewrite: two independent intercepts', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 3  3 3 -> B
         B: 3pA 3  3 3 3  3 3 -> A
         M: .   IB C
         N: .   .  . . IB C`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable
    assert(manipulations[2].kind === 'I' && manipulations[3].kind === 'C') // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2, N = 3

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 2, 3, 0])

    assertNoThrow(rewritten, 1, B, B, 'remove first intercepted')
    assertThrow(rewritten, 1, 3, B, M, 'new throw for first intercept')
    assertThrow(rewritten, 2, 0, M, M, 'catching first intercept with an empty hand')

    assertNoThrow(rewritten, 4, B, B, 'remove second intercepted')
    assertNoThrow(rewritten, 4, M, M, 'remove second intercepted')
    assertThrow(rewritten, 4, 3, M, N, 'new throw for second intercept')
    assertThrow(rewritten, 5, 0, N, N, 'catching second intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from B to M')
    assertNoThrow(rewritten, 3, B, B, 'moving original throws from B to M')

    assertThrow(rewritten, 6, 3, N, N, 'moving original throws from B to N after second relabel')
    assertNoThrow(rewritten, 6, B, B, 'moving original throws from B to N after second relabel')
    assertNoThrow(rewritten, 6, M, M, 'moving original throws from B to N after second relabel')

    assertThrow(rewritten, 2, 3, B, M, 'first carry')
    assertThrow(rewritten, 5, 3, M, N, 'second carry')

})


Deno.test('intercept rewrite: intercepting a carry', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 3  3 3 -> B
         B: 3pA 3  3 3 3  3 3 -> A
         M: .   IB C
         N: .   .  IB C`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable
    assert(manipulations[2].kind === 'I' && manipulations[3].kind === 'C') // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2, N = 3

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 2, 3, 0])

    assertNoThrow(rewritten, 1, B, B, 'remove first intercepted')
    assertThrow(rewritten, 1, 3, B, M, 'new throw for first intercept')
    assertThrow(rewritten, 2, 0, M, M, 'catching first intercept with an empty hand')

    assertNoThrow(rewritten, 3, B, B, 'remove second intercepted')
    assertNoThrow(rewritten, 3, M, M, 'remove second intercepted')
    assertThrow(rewritten, 2, 3, B, N, 'new throw for second intercept (the previous carry)')
    assertThrow(rewritten, 3, 0, N, N, 'catching second intercept with an empty hand')

    assertThrow(rewritten, 4, 3, N, N, 'moving original throws from B to N after second relabel')
    assertNoThrow(rewritten, 4, B, B, 'moving original throws from B to N after second relabel')

    assertThrow(rewritten, 2, 3, B, N, 'first carry is also second intercept')
    assertThrow(rewritten, 3, 3, M, N, 'second carry')

})


test.skip('intercept rewrite: two interleaved intercepts', async () => {
    // this is not currently supported, because N would intercept a 0 or 1 from M
    // when we support intercepting 0/1s this should probably work

    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3  3 3  3 3 -> B
         B: 3pA 3  3  3 3  3 3 -> A
         M: .   IB .  C
         N: .   .  IB `
    )[0], 2)

    // assert.deepEqual(p.mapRows, [1, 0])
    // assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable
    // assert(manipulations[2].kind === 'I') // just making sure parsing is stable

    // let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    // rewritten = applyInterceptCarry(rewritten, manipulations[2])
    // const A = 0, B = 1, M = 2, N = 3

    // console.log(rewritten.prettyPrintThrows())
    // assert.deepEqual(rewritten.mapRows, [1,2,3,0])

    // assertNoThrow(rewritten, 1, B, B, 'remove first intercepted')
    // assertThrow(rewritten, 1, 3, B, M, 'new throw for first intercept')
    // assertThrow(rewritten, 2, 0, M, M, 'catching first intercept with an empty hand')

    // assertNoThrow(rewritten, 4, B, B, 'remove second intercepted')
    // assertNoThrow(rewritten, 4, M, M, 'remove second intercepted')
    // assertThrow(rewritten, 4, 3, M, N, 'new throw for second intercept')
    // assertThrow(rewritten, 5, 0, N, N, 'catching second intercept with an empty hand')

    // assertThrow(rewritten, 3, 3, M, M, 'moving original throws from B to M')
    // assertNoThrow(rewritten, 3, B, B, 'moving original throws from B to M')

    // assertThrow(rewritten, 6, 3, N, N, 'moving original throws from B to N after second relabel')
    // assertNoThrow(rewritten, 6, B, B, 'moving original throws from B to N after second relabel')
    // assertNoThrow(rewritten, 6, M, M, 'moving original throws from B to N after second relabel')

    // assertThrow(rewritten, 2, 3, B, M, 'first carry')
    // assertThrow(rewritten, 5, 3, M, N, 'second carry')

})



Deno.test('apply substitution: basics', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 -> B
         B: 3pA 3  3 3 -> A
         M: .   SB z`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'S') // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 1, B, B, 'remove substituted throw')
    assertThrow(rewritten, 1, 1, B, M, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 1, 3, M, B, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 0, 0, M, M, 'catching pelf with an empty hand')
})


Deno.test('apply substitution: substituting the first beat requires reverse wraparound', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 -> B
         B: 3pA 3  3 3 -> A
         M: SB  z`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'S') // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 0, A, B, 'remove substituted throw')
    assertThrow(rewritten, 0, 1, A, M, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 0, 3, M, B, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 3, 0, M, M, 'catching pelf with an empty hand')
})


Deno.test('apply substitution: substituting the last beat', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 -> B
         B: 3pA 3  3 3 -> A
         M: . . . SA`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'S') // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 3, B, B, 'remove substituted throw')
    assertThrow(rewritten, 3, 1, B, M, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 3, 3, M, B, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 2, 0, M, M, 'catching pelf with an empty hand')
})



Deno.test('apply substitution: substituting right person after relabel', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 3 3 -> B
         B: 3pA 3  3 3 3 3 -> A
         M: IB  C  . . SB z`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'I') // just making sure parsing is stable
    assert(manipulations[1].kind === 'C') // just making sure parsing is stable
    assert(manipulations[2].kind === 'S') // just making sure parsing is stable
    assert(manipulations[3].kind === 'T') // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applySubstitution(rewritten, manipulations[2])
    rewritten = applyManipulatorThrow(rewritten, manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, 'intercept')
    assertThrow(rewritten, 1, 3, B, M, 'carry')


    assertNoThrow(rewritten, 4, M, M, 'remove substituted throw')
    assertThrow(rewritten, 4, 1, M, B, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 4, 3, B, M, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 3, 0, B, B, 'catching pelf with an empty hand')
})


Deno.test('apply substitution: intercept a substitution', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 3 3 -> B
         B: 3pA 3  3 3 3 3 -> A
         M: SB
         N: IB C`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    const rewritten = applyManipulations(p, manipulations)
    const A = 0, B = 1, M = 2, N =3

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 1, A, M, 'substitution -- steal')
    assertThrow(rewritten, 0, 3, M, N, 'intercept of the placement part of the substitution')
    assertThrow(rewritten, 1, 3, B, N, 'carry')
    assertThrow(rewritten, 1, 0, N, N, 'catching intercept with an empty hand')
})


Deno.test('manipulator throw: basics', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 -> B
         B: 3pA 3  3 3 -> A
         M: .   SB z`
    )[0], 2)

    assert(manipulations[1].kind === 'T') // just making sure parsing is stable

    let rewritten = applyManipulatorThrow(p, manipulations[1])

    console.log(rewritten.prettyPrintThrows())

    const M =2
    assertThrow(rewritten, 2, 1, M, M, 'new manipulator throw')
})


Deno.test('manipulator throw: zip after substitution', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB 3  3 3 -> B
         B: 3pA 3  3 3 -> A
         M: .   SB z`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'S') // just making sure parsing is stable
    assert(manipulations[1].kind === 'T') // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    rewritten= applyManipulatorThrow(rewritten, manipulations[1])

    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')

    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 1, B, B, 'remove substituted throw')
    assertThrow(rewritten, 1, 1, B, M, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 1, 3, M, B, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 0, 0, M, M, 'catching pelf with an empty hand')

    assertThrow(rewritten, 2, 1, M, M, 'new manipulator throw')
})



Deno.test('roundabout', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33  -> A
         M: SB z SB z  IB . CB z `
    )[0], 2)
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertThrowRaw(rewritten, 0, 1, A, M, 'sub pass -- steal')
    assertThrow(rewritten, 0, 3, M, B, 'sub pass -- place')

    assertThrow(rewritten, 2, 1, B, M, 'sub self -- steal')
    assertThrow(rewritten, 2, 3, M, B, 'sub self -- place')

    assertThrow(rewritten, 4, 3, A, M, 'intercept')
    assertThrow(rewritten, 5, 0, M, M, 'empty hand to catch intercept')
    assertThrow(rewritten, 5, 2, B, B, 'hold before carry')
    assertThrow(rewritten, 6, 2, M, M, 'hold due to carry')

    assertThrow(rewritten, 6, 3, B, M, 'carry')

    assertThrow(rewritten, 1, 1, M, M, 'zip 1')
    assertThrow(rewritten, 3, 1, M, M, 'zip 2')
    assertThrow(rewritten, 7, 1, B, B, 'zip 3')
})


Deno.test('chopabout', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33   3pA3 33 -> A
         M: SBcz SAlz SAcz SAlz IAv]. CA`
    )[0], 2)
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertSub(rewritten, 0, 3, A, M, B, 'sub first chop')
    assertSub(rewritten, 2, 3, A, M, A, 'sub self')
    assertSub(rewritten, 4, 3, B, M, A, 'sub second chop')
    assertSub(rewritten, 6, 3, A, M, A, 'sub another self')

    assertThrow(rewritten, 8, 3, B, M, 'intercept')
    assertNoThrow(rewritten, 8, B, A, 'remove intercepted')
    assertThrow(rewritten, 9, 0, M, M, 'empty hand to catch intercept')
    assertThrow(rewritten, 9, 2, A, A, 'hold before carry')
    assertThrow(rewritten, 10, 2, M, M, 'hold due to carry')

    assertThrow(rewritten, 10, 3, A, M, 'carry')

    assertThrow(rewritten, 1, 1, M, M, 'zip 1')
    assertThrow(rewritten, 3, 1, M, M, 'zip 2')
    assertThrow(rewritten, 5, 1, M, M, 'zip 3')
    assertThrow(rewritten, 7, 1, M, M, 'zip 4')
})



Deno.test('phonecian walz', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -> B
        B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -> A
        M: SBloz   zf  SBloz   .   IBvb CA  . `
    )[0], 2)
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertSub(rewritten, 0, 3, A, M, B, 'sub first')
    assertSub(rewritten, 3, 3, A, M, B, 'sub self')
    assertThrow(rewritten, 6, 3, A, M, 'intercept')
    assertNoThrow(rewritten, 6, A, B, 'remove intercepted')
    assertThrow(rewritten, 7, 0, M, M, 'empty hand to catch intercept')
    assertThrow(rewritten, 7, 3, B, A, 'carry')
})


Deno.test('opernball', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB  3pB 3   3pB  3pB 3   3pB  3pB 3 -> B
         B: 3pA  3pA 3   3pA  3pA 3   3pA  3pA 3 -> A
         O: IBvb CA  .   SAlo z   zf  SAlo z   .   
         N: SAlo z   .   IAvb CB  .   SBlo z   zf  
         M: SBlo z   zf  SBlo z   .   IBvb CA  . 
         `
     )[0], 2)
      assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2, N = 3, O = 4
    assertSub(rewritten, 0, 3, A, M, O, 'sub north to intercept')
    assertThrow(rewritten, 1, 0, O, O, 'empty hand to catch intercept')
    assertSub(rewritten, 0, 3,B, N, A, 'sub south')
    
    assertSub(rewritten, 3, 3, O, B, N, 'sub north to intercept 2')
    assertThrow(rewritten, 4, 0, N, N, 'empty hand to catch intercept 2')
    assertSub(rewritten, 3, 3,A, M, O, 'sub south 2')

    assertSub(rewritten, 6, 3, N, A, M, 'sub north to intercept 3')
    assertThrow(rewritten, 7, 0, M, M, 'empty hand to catch intercept 3')
    assertSub(rewritten, 6, 3,O, B, N, 'sub south 3')

})




Deno.test('minued', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 3B 3B 3 3B 3B 3 3B 3B 3 -> B
        B: 3A 3A 3 3A 3A 3 3A 3A 3 -> A
        M: .  SB IB C z  z SB .  SB `
    )[0], 2)
    const A = 0, B = 1, M = 2
    assert.deepEqual(p.mapRows, [B,A])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())


    assertSub(rewritten, 1, 3, A, M, B, 'sub pass')
    assertThrow(rewritten, 2, 3, B, M, 'intercept')
    assertThrow(rewritten, 3, 3, B, A, 'carry')
    assertSub(rewritten, 6, 3, A, B, M, 'sub pass 2')
    assertSub(rewritten, 8, 3, M, B, M, 'sub self')
    // assertThrow(rewritten, 0, 2, A, A, 'flip due to carry')
    // assertNoThrow(rewritten, 4, C, C, 'intercepted')
    // assertThrow(rewritten, 5, 0, M, M, 'catch intercept')
    // assertThrow(rewritten, 5, 2, C, C, 'flip to prepare for carry')
    
})

Deno.test('ambled V', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 4B 3  4C 3  4B 3  4B -> B
        B: 3  4A 3  3  3  4A 3  -> C
        C: 3  3  3  4A 3  3  3  -> A
        M: C  z  .  SB z  IC 
        positions: V(A,B,C)`
    )[0], 2)
    const A = 0, B = 1, C=2, M = 3
    assert.deepEqual(p.mapRows, [B,C,A])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())


    assertThrow(rewritten, 0, 4, M, B, 'carry')
    assertThrow(rewritten, 0, 2, A, A, 'flip due to carry')
    assertSub(rewritten, 3, 3, B, M, B, 'sub self')
    assertThrow(rewritten, 5, 3, C, M, 'intercept')
    assertNoThrow(rewritten, 5, C, C, 'intercepted')
    assertThrow(rewritten, 6, 0, M, M, 'catch intercept')
    assertThrow(rewritten, 6, 2, C, C, 'flip to prepare for carry')
    
})


Deno.test('ambled 3 (with late intercept)', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 4B 3  4C 3  4B 3  4B -> B
        B: 3  4A 3  3  3  4A 3  -> C
        C: 3  3  3  4A 3  3  3  -> A
        M: .  C  z  SCAIAB
        positions: V(A,B,C)`
    )[0], 2)
    const A = 0, B = 1, C=2, M = 3
    assert.deepEqual(p.mapRows, [B,C,A])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())


    assertThrow(rewritten, 1, 3, M, C, 'carry')
    // 3 beat carry!
    assertThrow(rewritten, 0, 2, M, M, 'flip due to carry')
    assertThrow(rewritten, 0, 2, C, C, 'flip due to carry')
    assertThrow(rewritten, 1, 2, C, C, 'flip due to carry')
    assertThrow(rewritten, 6, 2, B, B, 'flip due to carry')

    assertSub(rewritten, 3, 4, C, M, A, 'sub pass')
    assertThrow(rewritten, 4, 4, A, M, 'intercept')
    assertNoThrow(rewritten, 4, A, B, 'intercepted')
    assertThrow(rewritten, 6, 0, M, M, 'catch intercept')
    
})



Deno.test('modifiers: delayed placement (for German turn)', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 3 3 3 3 3 -> B
        B: 3 3 3 3 3 -> A
        M: . SBd `
    )[0], 2)
    const A = 0, B = 1, M = 2
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())


    assertThrow(rewritten, 1, 1, B, M, 'steal')
    assertThrow(rewritten, 3, 1, M, B, 'late placement')
})

Deno.test('modifiers: delayed placement with flips (for German turn)', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 3 3 3 3 3 -> B
        B: 3 3 3 3 3 -> A
        M: . (SBd,2) 2 `
    )[0], 2)
    const A = 0, B = 1, M = 2
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())


    assertThrow(rewritten, 1, 1, B, M, 'steal')
    assertThrow(rewritten, 3, 1, M, B, 'late placement')
    assertThrow(rewritten, 1, 2, M, M, 'flip')
    assertThrow(rewritten, 2, 2, M, M, 'flip')
})

test.skip('roundabout with German turn', async () => {
    //TODO the zip after the intercept is weird; it still belongs to the old manipulator to free the hand for the intercept
    //(not sure how to handle this)
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33  -> A
         M: SB z (SBd,2) 2  IB . CB z `
    )[0], 2)
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertThrow(rewritten, 0, 1, A, M, 'sub pass -- steal')
    assertThrow(rewritten, 0, 3, M, B, 'sub pass -- place')

    assertThrow(rewritten, 2, 1, B, M, 'sub self -- steal')
    assertThrow(rewritten,4, 1, M, B, 'sub self -- place delayed with 1p')
    assertThrow(rewritten, 2, 2, M, M, 'flip')
    assertThrow(rewritten, 3, 2, M, M, 'flip')

    assertThrow(rewritten, 4, 3, A, M, 'intercept')
    assertThrow(rewritten, 5, 2, B, B, 'hold before carry')
    assertThrow(rewritten, 6, 2, M, M, 'hold due to carry')

    assertThrow(rewritten, 6, 3, B, M, 'carry')

    assertThrow(rewritten, 1, 1, M, M, 'zip 1')
    assertThrow(rewritten, 5, 1, M, M, 'zip 2') // this one is problematic!
    assertThrow(rewritten, 7, 1, B, B, 'zip 3')
})


Deno.test('modifiers: early intercept', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
        `A: 3 3pB 3 3 -> B
        B: 3 3pA  3 3 -> A
        M: . IBAe CA`
    )[0], 2)

    assert(manipulations && manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 1, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 1, B, A, 'remove intercepted')
    assertThrow(rewritten, 0, 0, M, M, 'catching intercept with an empty hand, really early')

    // TODO: manipulator does nothing (flips) on beat 1 and 2

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')

    // 1 beat carry is easy, unchanged in this case except for redirecting it
    assertThrow(rewritten, 2, 3, A, M, 'carry')

})


Deno.test('ambled 3 (with early intercept and time travel)', async () => {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(
       `A: 4B 3  4C 3  4B 3  4B -> B
        B: 3  4A 3  3  3  4A 3  -> C
        C: 3  3  3  4A 3  3  3  -> A
        M: .  C  z  SCAIABe
        positions: V(A,B,C)`
    )[0], 2)
    const A = 0, B = 1, C=2, M = 3
    assert.deepEqual(p.mapRows, [B,C,A])
    let rewritten = applyManipulations(p, manipulations)
    console.log(rewritten.prettyPrintThrows())


    assertThrow(rewritten, 1, 3, M, C, 'carry')
    // 3 beat carry!
    assertThrow(rewritten, 0, 2, M, M, 'flip due to carry')
    assertThrow(rewritten, 0, 2, C, C, 'flip due to carry')
    assertThrow(rewritten, 1, 2, C, C, 'flip due to carry')
    assertThrow(rewritten, 6, 2, B, B, 'flip due to carry')

    assertSub(rewritten, 3, 4, C, M, A, 'sub pass')
    assertThrow(rewritten, 4, 4, A, M, 'intercept')
    assertNoThrow(rewritten, 4, A, B, 'intercepted')
    assertThrow(rewritten, 6, 0, M, M, 'catch intercept')
    
})


Deno.test('intercept: at end of pattern with different base rows', async () => {
    // this really messes with relabeling: the intercept is to the person who is B when the intercept is thrown but is actually A when it arrives, so A and M swap at that point


    const tt = 
    `A: 2 3 3 3 -> B
     B: 3 3 3 4 -> A
     M: .C . IA `
    const r = parseGroupSyncPattern(tt)
    const [t, m] = createPatternFromRaw(r[0], 2)
    const rewritten = applyManipulations(t, m)

    console.log(rewritten.prettyPrintThrows())
    const A = 0, B = 1,M = 2

    assertThrow(rewritten, 3, 4, B, A, 'intercept')
    assertEmpty(rewritten, 1, M, 'catch intercept')
    // 0 beat carry, but later
    assertThrow(rewritten, 1, 3, A, M, 'carry')

    assertThrow(rewritten, 0, 2, A, A, 'original flip')

    assertThrow(rewritten, 2, 3, M, M, 'moved')
    assertNoThrow(rewritten, 2, A, A, 'moved')
    
})




export function assertThrowRaw(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdx}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
}
export function assertIntercept(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg: string="intercept") {
    //uses raw rows, no intelligence for relabeling    
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdx}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
    assert(ts[0].markers.includes(ThrowType.Intercept), `expected intercept, found ${ts[0].markers} [${msg}]`)
}
export function assertCarry(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg: string="carry") {
    //uses raw rows, no intelligence for relabeling    
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdx}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
    assert(ts[0].markers.includes(ThrowType.Carry), `expected carry, found ${ts[0].markers} [${msg}]`)
}


/**
 * throws are identified by passer index (i.e. stable, not affected by relabeling)
 */
export function assertThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    // automated relabel of rows past the end of the pattern
    let toTime = pattern.getThrowCauseTime_(beat, length)
    toPasserIdx = pattern.adjustRowIdxByTime(toTime, toPasserIdx)

    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdx}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
}
function assertNoThrow(pattern: Pattern, beat: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length === 0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdx}, expected none [${msg}]`)
}
function assertSub(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, manipulatorIdx: number, toPasserIdx: number, msg?: string) {
    assertThrowRaw(pattern, beat, pattern.nrHands/2, fromPasserIdx, manipulatorIdx, msg + " -- steal")
    assertThrow(pattern, beat, length, manipulatorIdx, toPasserIdx, msg + " -- place")
    assertNoThrow(pattern, beat, fromPasserIdx, toPasserIdx, msg + " -- replaced")
}
/**
 * empty hand (0) at this time (don't care about the target of the throw)
 */
export function assertEmpty(pattern: Pattern, beat: number, fromPasserIdx: number, msg?: string) {
    // automated relabel of rows past the end of the pattern
    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === 0 && t.fromPasserIdx === fromPasserIdx)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${0}, from: ${fromPasserIdx} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${0} ${fromPasserIdx} expected one [${msg}]`)
}


// Deno.test('manipulator pattern parsing of opernball', async (t) => {
//     const opernball = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -> B
// B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -> A
// M: SBloz   zf  SBloz   .   IBv^CA  . 
// N: SAloz   .   IAv^CB  .   SBloz   zf  
// O: IBv^CA  .   SAloz   zf  SAloz   .   `
//     const p = parseGroupSyncPattern(opernball)
//     // console.log(p)

//     assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3pB', '3', '3pB', '3pB', '3', '3pB', '3pB', '3'])
//     assert.equal(p[0][0].role, 'A')
//     assert.equal(p[0][0].isManipulator, false)
//     assert.equal(p[0][0].relabel, "B")
//     assert.deepStrictEqual(p[0][2].sequence, ["sBlo", "z", "zf", "sBlo", "z", ".", "iBv^", "cA", "."])
//     assert.equal(p[0][2].role, 'M')
//     assert.equal(p[0][2].isManipulator, true)
//     assert.equal(p[0][2].relabel, undefined)
//     assert.deepStrictEqual(p[0][3].sequence, ["sAlo", "z", ".", "iAv^", "cB", ".", "sBlo", "z", "zf"])
//     assert.equal(p[0][3].role, 'N')
//     assert.equal(p[0][3].isManipulator, true)
//     assert.equal(p[0][3].relabel, undefined)

// })





Deno.test('Pattern.findThrowsByRole', async () => {
    const tt = 
       `A: 3 3B 3 3 -> B
        B: 3 3A 3 3 -> A
        M: .C . IB `
    const r = parseGroupSyncPattern(tt)
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())  

    function assertT(ts: Throw[], fromRow: number, toRow: number) {
        assert(ts.length === 1, `expected 1 throw, found ${ts.length}`)
        assert(ts[0].fromPasserIdx === fromRow, `expected throw from ${fromRow}, found ${ts[0].fromPasserIdx}`)
        assert(ts[0].toPasserIdx === toRow, `expected throw to ${toRow}, found ${ts[0].toPasserIdx}`)
    }
    assertT(t.findThrowsByRole(0, 'A', 'A'), 0, 0)
    assertT(t.findThrowsByRole(0, 'A', undefined), 0, 0)
    assertT(t.findThrowsByRole(0, undefined, 'A'), 0, 0)
    assertT(t.findThrowsByRole(0, 'B'), 1, 1)
    assertT(t.findThrowsByRole(1, 'A','B'), 0, 1)
    assertT(t.findThrowsByRole(1, undefined,'B'), 0, 1)
    assertT(t.findThrowsByRole(1, 'A',undefined), 0, 1)
    
    assertT(t.findThrowsByRole(3, 'A','B'), 0, 1)
    assertT(t.findThrowsByRole(3, undefined,'B'), 0, 1)
    assertT(t.findThrowsByRole(3, 'A',undefined), 0, 1)
    assertT(t.findThrowsByRole(3, 'B','A'), 1, 0)
    assertT(t.findThrowsByRole(3, undefined,'A'), 1,0)
    assertT(t.findThrowsByRole(3, 'B', undefined), 1, 0)

    // assertT(t.findThrowsByRole(-2, 'A', 'A'), 0, 0)
    // assertT(t.findThrowsByRole(-1, 'A', 'A'), 1, 0)

})



Deno.test('Pattern.findThrowsByRole2', async () => {
    const tt = 
       `A: 2 3 3 3 -> B
        B: 3 3 3 4 -> A
        M: .C . IB `
    const r = parseGroupSyncPattern(tt)
    const [t, m] = createPatternFromRaw(r[0], 2)

    console.log(t.prettyPrintThrows())  

    function assertT(ts: Throw[], fromRow: number, toRow: number, throwLength?: number) {
        assert(ts.length === 1, `expected 1 throw, found ${ts.length}`)
        assert(ts[0].fromPasserIdx === fromRow, `expected throw from ${fromRow}, found ${ts[0].fromPasserIdx}`)
        assert(ts[0].toPasserIdx === toRow, `expected throw to ${toRow}, found ${ts[0].toPasserIdx}`)
        if (throwLength!==undefined) {
            assert(ts[0].throwLength === throwLength, `expected throw length ${throwLength}, found ${ts[0].throwLength}`)
        }
    }
    assertT(t.findThrowsByRole(0, 'A', 'A'), 0, 0, 2)
    assertT(t.findThrowsByRole(0, 'A', undefined), 0, 0)
    assertT(t.findThrowsByRole(0, undefined, 'A'), 0, 0)
    assertT(t.findThrowsByRole(0, 'B'), 1, 1, 3)
    
    assertT(t.findThrowsByRole(3, 'A','B'), 0, 1, 3)
    assertT(t.findThrowsByRole(3, undefined,'B'), 0, 1)
    assertT(t.findThrowsByRole(3, 'A',undefined), 0, 1)
    assertT(t.findThrowsByRole(3, 'B','A'), 1, 0, 4)
    assertT(t.findThrowsByRole(3, undefined,'A'), 1,0)
    assertT(t.findThrowsByRole(3, 'B', undefined), 1, 0)

})


Deno.test('Pattern.findThrowsByRole with relabel', async () => {
    const tt = 
       `A: 2 3 3 3 -> B
        B: 3 3 3 4 -> A
        M: .C . IB `
    const r = parseGroupSyncPattern(tt)
    const [t2, m] = createPatternFromRaw(r[0], 2)
    const t = t2.swapRoles(3, 'A','B', true)

    console.log(t2.prettyPrintThrows())  
    console.log(t.prettyPrintThrows())  

    function assertT(ts: Throw[], fromRow: number, toRow: number, throwLength?: number) {
        assert(ts.length === 1, `expected 1 throw, found ${ts.length}`)
        assert(ts[0].fromPasserIdx === fromRow, `expected throw from ${fromRow}, found ${ts[0].fromPasserIdx}`)
        assert(ts[0].toPasserIdx === toRow, `expected throw to ${toRow}, found ${ts[0].toPasserIdx}`)
        if (throwLength!==undefined) {
            assert(ts[0].throwLength === throwLength, `expected throw length ${throwLength}, found ${ts[0].throwLength}`)
        }
    }
    assertT(t.findThrowsByRole(0, 'A', 'A'), 0, 0, 2)
    assertT(t.findThrowsByRole(0, 'A', undefined), 0, 0)
    assertT(t.findThrowsByRole(0, undefined, 'A'), 0, 0)
    assertT(t.findThrowsByRole(0, 'B'), 1, 1, 3)
    
    assertT(t.findThrowsByRole(3, 'A','A'), 1, 0, 4)
    assertT(t.findThrowsByRole(3, undefined,'A'), 1, 0)
    assertT(t.findThrowsByRole(3, 'A',undefined), 1, 0)
    assertT(t.findThrowsByRole(3, 'B','B'), 0, 1, 3)
    assertT(t.findThrowsByRole(3, undefined,'B'), 0,1)
    assertT(t.findThrowsByRole(3, 'B', undefined), 0,1)
})



Deno.test('intercept: at end of pattern again after prior relabeling', async () => {
    // this really messes with relabeling: the intercept is to the person who is B when the intercept is thrown but is actually A when it arrives, so A and M swap at that point


    const tt = 
    `A: 3 3 3 3B -> B
     B: 3 3 3 3A -> A
     M: C .. IA `
    const r = parseGroupSyncPattern(tt)
    const [t, m] = createPatternFromRaw(r[0], 2)
    const t2=t.swapRoles(3, 'A','B', true)
    console.log(t2.prettyPrintThrows()+prettyPrintManipulatorActions(t2,m))
    const rewritten = applyManipulations(t2, m)

    console.log(rewritten.prettyPrintThrows())
    const A = 0, B = 1,M = 2

    assertIntercept(rewritten, 3, 3, M, M)
    assertEmpty(rewritten, 0, M, 'catch intercept')
    // // 0 beat carry, but later
    assertCarry(rewritten, 0, 3, A, M)

    assertThrow(rewritten, 2, 3, M, M, 'moved')
    assertNoThrow(rewritten, 2, A, A, 'moved')
    
})
