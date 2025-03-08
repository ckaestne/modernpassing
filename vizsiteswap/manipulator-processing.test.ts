import assert from "node:assert";
import test from "node:test";
import { applyInterceptCarry, applyManipulatorThrow, applySubstitution, Pattern, patternToThrows, prettyPrintManipulatorActions, Throw } from "./manipulator-processing.ts";
import { parseGroupSyncPattern } from "./pattern-fromgroup.ts";


test('test parsing four-count', async () => {
    const r = parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )
    const [t, m] = patternToThrows(r[0], 2)

    console.log(t.prettyPrintThrows())
    const A = 0, B = 1

    assertThrow(t, 0, 3, A, B)
    assertThrow(t, 0, 3, B, A)
    assertThrow(t, 1, 3, A, A)
    assertThrow(t, 1, 3, B, B)
    assertThrow(t, 2, 3, A, A)
    assertThrow(t, 2, 3, B, B)
    assertThrow(t, 3, 3, A, A)
    assertThrow(t, 3, 3, B, B)
})

test('test parsing four-count in different notations', async () => {
    // with p and target
    const [t1,] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )[0], 2)
    // implied target
    const [t2,] = patternToThrows(parseGroupSyncPattern(
        `A: 3p 3 3 3 -> B
        B: 3p 3 3 3 -> A`
    )[0], 2)
    // target without p
    const [t3,] = patternToThrows(parseGroupSyncPattern(
        `A: 3B 3 3 3 -> B
        B: 3A 3 3 3 -> A`
    )[0], 2)
    // extra self-targets
    const [t4,] = patternToThrows(parseGroupSyncPattern(
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


test('test parsing 867', async () => {
    const p = parseGroupSyncPattern(
        `A:  7 6 8 7 6 -> B
         B: , 8 7 6 8 -> A`
    )
    const [t,] = patternToThrows(p[0], 4)

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
test('test parsing 867 notation variations', async () => {
    // default notation without annotations
    const [t1,] = patternToThrows(parseGroupSyncPattern(
        `A:  7 6 8 7 6 -> B
         B: , 8 7 6 8 -> A`
    )[0], 4)
    // implied target with p
    const [t2,] = patternToThrows(parseGroupSyncPattern(
        `A:  7p 6 8 7p 6 -> B
         B: , 8 7p 6 8 -> A`
    )[0], 4)
    // target without p
    const [t3,] = patternToThrows(parseGroupSyncPattern(
        `A:  7B 6 8 7B 6 -> B
         B: , 8 7A 6 8 -> A`
    )[0], 4)
    // extra self-targets
    const [t4,] = patternToThrows(parseGroupSyncPattern(
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

test('test parsing chopabout', async () => {
    const p = parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33   3pA3 33 -> A
         M: SBcz SAlz SAcz SAlz IAv]. CA`
    )
    const [t, a] = patternToThrows(p[0], 2)

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


test('test parsing manege', async () => {
    const p = parseGroupSyncPattern(
        `A: 7pB   6    8  7pB  6-> B
         B: ,   8   7pA  6    8 -> A
         M: IB    , CAf `
    )
    const [t, a] = patternToThrows(p[0], 4)

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


test('intercept rewrite: basic', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA CA`
    )[0], 2)

    assert(manipulations && manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
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

})



test('intercept rewrite: 456about should be easy', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 5 4 6 5 4 -> B
         B: ,6 5 4 6 -> A
        M: .IA`
    )[0], 4)

    assert(manipulations[0].kind === 'I' && manipulations.length === 1) // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0])
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



test('intercept rewrite: manege', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 7 6 8 7 6 -> B
         B: ,8 7 6 8 -> A
        M: IB, CA`
    )[0], 4)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
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



test('intercept rewrite: basic two beat carry', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA . CA`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
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

test('intercept rewrite: basic three beat carry', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA . . CA`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
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


test('intercept rewrite: two carry on a pass', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . CA`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
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


test('intercept rewrite: three-beat carry over a pass', async () => {
    //this creates counterintuitive behavior where both M and B have a flip because they are missing a pass that gets carried later
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . . C`
    )[0], 2)

    assert(manipulations[0].kind === 'I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, A, 'remove intercepted')
    assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')

    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 3, 3, A, B, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')
    assertThrow(rewritten, 3, 2, B, B, 'carry-induced flip at old manipulator')

})




test('intercept rewrite: intercept over pattern boundary', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: C..IB`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
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



test('intercept rewrite: intercept over pattern boundary with three passers', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> C
        C: 3333 -> A
        M: C..IB
        positions: V(A,B,C)`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 2, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
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




test('intercept rewrite: two-beat intercept/carry over pattern boundary', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: .C.IB`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
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



test('intercept rewrite: high intercept throw over pattern boundary', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 2 3pB 3 4 -> B
        B: 2 3pA 3 4 -> A
        M: .C.IB`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
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



test('intercept rewrite: two independent intercepts', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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


test('intercept rewrite: intercepting a carry', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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

    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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



test('apply substitution: basics', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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


test('apply substitution: substituting the first beat requires reverse wraparound', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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



test('apply substitution: substituting right person after relabel', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, 'intercept')
    assertThrow(rewritten, 1, 3, B, M, 'carry')


    assertNoThrow(rewritten, 4, M, M, 'remove substituted throw')
    assertThrow(rewritten, 4, 1, M, B, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 4, 3, B, M, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 3, 0, B, B, 'catching pelf with an empty hand')
})



test('manipulator throw: basics', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
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


test('manipulator throw: zip after substitution', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3  3 3 -> B
         B: 3pA 3  3 3 -> A
         M: .   SB z`
    )[0], 2)

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === 'S') // just making sure parsing is stable
    assert(manipulations[1].kind === 'T') // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    rewritten= applyManipulatorThrow(rewritten, manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 1, B, B, 'remove substituted throw')
    assertThrow(rewritten, 1, 1, B, M, 'pelf: taking out the substituted throw')
    assertThrow(rewritten, 1, 3, M, B, 'putting in the replacement for the substituted throw')
    assertThrow(rewritten, 0, 0, M, M, 'catching pelf with an empty hand')

    assertThrow(rewritten, 2, 1, M, M, 'new manipulator throw')
})



test.only('roundabout', async () => {
    const [p, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33  -> A
         M: iA . cA z sB z sB`
    )[0], 2)
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)


})



/**
 * throws are identified by passer index (i.e. stable, not affected by relabeling)
 */
function assertThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwTime === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw ${beat} ${length} ${fromPasserIdx} ${toPasserIdx} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwTime === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${t.toPasserIdx}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
}
function assertNoThrow(pattern: Pattern, beat: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = pattern.throws.filter(t => t.throwTime === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length === 0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdx}, expected none [${msg}]`)
}



// test('shifting chopabout', async (t) => {
//     const chopabout = `A: 3pB3 33   3pB3 33   3pB3 33 -> B
// B: 3pA3 33   3pA3 33   3pA3 33 -> A
// M: SBcz sAlz SAcz SAlz iAv]. CA`
//     const p = parseGroupSyncPattern(chopabout)

//     //shifting all the way around yields the same pattern
// assert.deepStrictEqual(p[0], shiftPattern(p[0], 24, 12))

//     //shifting once by the length yields the same passing sequence but the opposite takeout sequence
//     assert.deepStrictEqual(p[0][0], shiftPattern(p[0], 12, 12)[0])
//     assert.deepStrictEqual(p[0][1], shiftPattern(p[0], 12, 12)[1])
//     assert.notDeepStrictEqual(p[0][2], shiftPattern(p[0], 12, 12)[2])

//     // printPattern(p[0])
//     // printPattern(shiftPattern(p[0], 2, 12))
//     // printPattern(shiftPattern(p[0], 12, 12))
//     // printPattern(shiftPattern(p[0], 24, 12))

// })

// test('shifting manege', async (t) => {
// //786786786
// //I  C

//     const manege = `A: 7pB 0 6 0   8 0 7pB 0 6-> B
//                     B: 0   8 0 7pA 0 6 0   8 0-> A
//                     M: IB  . . cAf `
//     const p = parseGroupSyncPattern(manege)

//     assert.deepStrictEqual(p[0], shiftPattern(p[0], 18, 9))


//     // printPattern(p[0])
//     // printPattern(shiftPattern(p[0], 3, 9))
//     // printPattern(shiftPattern(p[0], 9, 9))
//     // printPattern(shiftPattern(p[0], 18, 9))

// })

// function printPattern(p: TPatternRow[]) {
//     for (const row of p) {
//         console.log(row.role+":", row.sequence.join("\t"), "\t->", row.relabel)
//     }
// }

// // test('convert chopabout as basic manipulator', async (t) => {
// //     const chopabout = `A: 3pB3 33   3pB3 33   3pB3 33 -> B
// // B: 3pA3 33   3pA3 33   3pA3 33 -> A
// // M: SBcz sAlz SAcz SAlz iAv]. CA`
// //     const p = parseGroupSyncPattern(chopabout)

// //     convertManipulatorPatternToLocal(p[0])
// // })
// test('convert roundabout as basic manipulator', async (t) => {
//     const roundabout = `A: 3pB3 33   3pB3 33 -> B
// B: 3pA3 33   3pA3 33  -> A
// M: iA . cA z sB z sB`
//     const p = parseGroupSyncPattern(roundabout)

//     convertManipulatorPatternToLocal(p[0])
// })

// test('convert fast-carry roundabout as basic manipulator', async (t) => {
//     const roundabout = `A: 3pB3 33   3pB3 33 -> B
// B: 3pA3 33   3pA3 33  -> A
// M: iA cA z z sB z sB`
//     const p = parseGroupSyncPattern(roundabout)

//     convertManipulatorPatternToLocal(p[0])
// })

// test('convert 456-about as basic manipulator', async (t) => {
//     const chopabout = `A: 5pB040605pB04 -> B
//                        B: 0605pA04060 -> A
//                        M: ..iA`
//     const p = parseGroupSyncPattern(chopabout)

//     convertManipulatorPatternToLocal(p[0])

// })

// test('convert manege as basic manipulator', async (t) => {
//     const manege = `A: 7pB 0 6 0   8 0 7pB 0 6-> B
//     B: 0   8 0 7pA 0 6 0   8 0-> A
//     M: IB  . . cAf `
//     const p = parseGroupSyncPattern(manege)

//     convertManipulatorPatternToLocal(p[0])

// })

// test('manipulator pattern parsing of opernball', async (t) => {
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




// test('relabeling: basic', async () => {
//     const r = relabelRaw(parseGroupSyncPattern(
//         `A: 3pB 3 3 3 -> B
//         B: 3pA 3 3 3 -> A`
//     )[0], 2)

//     assert.equal(r(0)('A'), 'A')
//     assert.equal(r(0)('B'), 'B')
//     assert.equal(r(1)('A'), 'A')
//     assert.equal(r(1)('B'), 'B')
//     assert.equal(r(4)('A'), 'B')
//     assert.equal(r(4)('B'), 'A')
//     assert.equal(r(5)('A'), 'B')
//     assert.equal(r(5)('B'), 'A')
//     assert.equal(r(8)('A'), 'A')
//     assert.equal(r(8)('B'), 'B')
// })

// test('relabeling: basic with intercept', async () => {
//     const r = relabelRaw(parseGroupSyncPattern(
//         `A: 3pB 3 3 3 -> B
//         B: 3pA 3 3 3 -> A
//         M: IA CA`
//     )[0], 2)

//     assert.equal(r(0)('A'), 'A')
//     assert.equal(r(0)('B'), 'B')
//     assert.equal(r(0)('M'), 'M')
//     assert.equal(r(1)('A'), 'M')
//     assert.equal(r(1)('B'), 'B')
//     assert.equal(r(1)('M'), 'A')

//     assert.equal(r(4)('A'), 'M')
//     assert.equal(r(4)('B'), 'A')
//     assert.equal(r(4)('M'), 'B')

//     assert.equal(r(5)('A'), 'A')
//     assert.equal(r(5)('B'), 'M')
//     assert.equal(r(5)('M'), 'B')

//     assert.equal(r(8)('A'), 'B')
//     assert.equal(r(8)('B'), 'M')
//     assert.equal(r(8)('M'), 'A')

//     assert.equal(r(12)('A'), 'A')
//     assert.equal(r(12)('B'), 'B')
//     assert.equal(r(12)('M'), 'M')

// })


// test('relabeling: intercept across pattern boundary', async () => {
//     {
//         const r = relabelRaw(parseGroupSyncPattern(
//             `A: 2 3pB 3 4 -> B
//         B: 2 3pA 3 4 -> A
//         M: . CB . IA`
//         )[0], 2)

//         assert.equal(r(0)('A'), 'A')
//         assert.equal(r(0)('B'), 'B')
//         assert.equal(r(0)('M'), 'M')
//         //M switches with B, because that's where the 4 from A lands
//         assert.equal(r(1)('A'), 'A')
//         assert.equal(r(1)('B'), 'M')
//         assert.equal(r(1)('M'), 'B')
//         //just relabeling at the end
//         assert.equal(r(4)('A'), 'B')
//         assert.equal(r(4)('B'), 'M')
//         assert.equal(r(4)('M'), 'A')
//         //now again B switches with M
//         assert.equal(r(5)('A'), 'M')
//         assert.equal(r(5)('B'), 'B')
//         assert.equal(r(5)('M'), 'A')

//         assert.equal(r(12)('A'), 'A')
//         assert.equal(r(12)('B'), 'B')
//         assert.equal(r(12)('M'), 'M')

//     }
//     {
//         // same thing but the intercept is landing on beat 0
//         const r = relabelRaw(parseGroupSyncPattern(
//             `A: 3pB 3 4 2 -> B
//         B: 3pA 3 4 2 -> A
//         M:  CB . IA`
//         )[0], 2)

//         //this is messed up, but applying intercept relabeling immediately
//         assert.equal(r(0)('A'), 'A')
//         assert.equal(r(0)('B'), 'M')
//         assert.equal(r(0)('M'), 'B')
//         assert.equal(r(1)('A'), 'A')
//         assert.equal(r(1)('B'), 'M')
//         assert.equal(r(1)('M'), 'B')
//         //same combo relabel again
//         assert.equal(r(4)('A'), 'M')
//         assert.equal(r(4)('B'), 'B')
//         assert.equal(r(4)('M'), 'A')
//         assert.equal(r(5)('A'), 'M')
//         assert.equal(r(5)('B'), 'B')
//         assert.equal(r(5)('M'), 'A')

//         assert.equal(r(12)('A'), 'A')
//         assert.equal(r(12)('B'), 'M')
//         assert.equal(r(12)('M'), 'B')

//     }
// })

