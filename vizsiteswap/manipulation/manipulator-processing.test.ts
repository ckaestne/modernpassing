import assert from "node:assert"
import test from "node:test"
import { applyInterceptCarry, applyManipulations, applyManipulatorThrow, applySubstitution, fillPatternGaps, prettyPrintManipulatorActions } from "./manipulator-processing.ts"
import { CarryAction, Hand, InterceptAction, InterceptMarker, type Pattern, SubstitutionAction, SubstitutionMarker, Throw, ThrowMarker } from "@modernpassing/pattern"
import { assertEqualPattern, createPatternFromRaw, parseGroupSyncPattern } from "./testutils.ts"

Deno.test("test parsing chopabout", () => {
    const p = parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33   3pA3 33 -- A
         M: SBcz SAlz SAcz SAlz IAvo. CA`,
    )
    const [t, a] = createPatternFromRaw(p[0], 2)

    const s = t.prettyPrintThrows() + prettyPrintManipulatorActions(t, a)
    // console.log(s)

    const A = 0, B = 1, M = 2

    for (const i of [0, 4, 8]) {
        assertThrow(t, i, 3, A, B)
        assertThrow(t, i, 3, B, A)
    }
    for (const i of [1, 2, 3, 5, 6, 7, 9, 10, 11]) {
        assertThrow(t, i, 3, A, A)
        assertThrow(t, i, 3, B, B)
    }

    const expected = `M:      SB     1M       SA     1M       SA     1M       SA      1M      IA              C`
    assert.deepEqual(prettyPrintManipulatorActions(t, a).replace(/\s+/g, ""), expected.replace(/\s+/g, ""))
})

Deno.test("test parsing manege", () => {
    const p = parseGroupSyncPattern(
        `A: 7pB   6    8  7pB  6-- B
         B: ,   8   7pA  6    8 -- A
         M: IB    , CAf `,
    )
    const [t, a] = createPatternFromRaw(p[0], 4)

    const s = t.prettyPrintThrows() + prettyPrintManipulatorActions(t, a)
    // console.log(s)

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

    const expected = `M:      IB                      C`
    assert.deepEqual(prettyPrintManipulatorActions(t, a).replace(/\s+/g, ""), expected.replace(/\s+/g, ""))
    assert(s.includes(":\tIB\t\t\tC"), "timing of manipulator actions is wrong")
})

Deno.test("intercept rewrite: basic", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IBA CA`,
        )[0],
        2,
    )

    assert(manipulations && manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    // assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, B, M, "new throw for intercept")
    assertNoThrow(rewritten, 0, B, A, "remove intercepted")
    // assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 3, 3, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 2, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, A, A, "moving original throws from A to M")

    // 1 beat carry is easy, unchanged in this case except for redirecting it
    assertThrow(rewritten, 1, 3, A, M, "carry")

    assertThrow(rewritten, 1, 3, B, B, "unmodified self 1")
    assertThrow(rewritten, 2, 3, B, B, "unmodified self 2")
    assertThrow(rewritten, 3, 3, B, B, "unmodified self 3")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid())
    const hands = full.getStartingHands()
    // console.log(full.prettyPrintThrows())
    assert.deepEqual(hands[A], [2, 1])
    assert.deepEqual(hands[B], [2, 1])
    assert.deepEqual(hands[M], [1, 0])
})

Deno.test.ignore("**broken:**intercept rewrite: 456about should be easy", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 5 4 6 5 4 -- B
         B: ,6 5 4 6 -- A
        M: .IA`,
        )[0],
        4,
    )

    // console.log(p.prettyPrintThrows())
    assert(manipulations[0].kind === "I" && manipulations.length === 1) // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 5, A, B, "unmodified")
    assertThrow(rewritten, 2, 4, A, M, "new throw for intercept")
    assertNoThrow(rewritten, 2, A, A, "remove intercepted")
    // assertThrow(rewritten, 2, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 4, 6, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 6, 5, M, B, "moving original throws from A to M")
    assertThrow(rewritten, 8, 4, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 4, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 6, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 8, A, A, "moving original throws from A to M")

    //redirect the pass from B to A now to M
    assertThrow(rewritten, 3, 5, B, M, "redirected pass")

    assert.ok(rewritten.isValid(), rewritten.getValidationError())
})

Deno.test.ignore("**broken:** intercept rewrite: manege", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 7 6 8 7 6 -- B
         B: ,8 7 6 8 -- A
        M: IB, CA`,
        )[0],
        4,
    )

    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 7, A, M, "new throw for intercept")
    assertNoThrow(rewritten, 0, A, B, "remove intercepted")
    // assertThrow(rewritten, 3, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 5, 6, M, M, "moving original throws from B to M")
    assertThrow(rewritten, 7, 8, M, M, "moving original throws from B to M")
    assertNoThrow(rewritten, 5, B, B, "moving original throws from B to M")
    assertNoThrow(rewritten, 7, B, B, "moving original throws from B to M")

    //redirect the pass from B to A now to M
    assertThrow(rewritten, 1, 8, B, M, "redirected heff")

    // carry is normal
    assertThrow(rewritten, 3, 7, B, A, "carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: basic two beat carry", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IBA . CA`,
        )[0],
        2,
    )

    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    // assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, B, M, "new throw for intercept")
    assertNoThrow(rewritten, 0, B, A, "remove intercepted")
    // assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, A, A, "moving original throws from A to M")

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, "carry-induced flip before carry")
    assertThrow(rewritten, 2, 3, A, M, "carry")
    assertThrow(rewritten, 2, 2, M, M, "carry-induced flip at old manipulator")

    const full = fillPatternGaps(rewritten)
    // console.log(full.prettyPrintThrows())
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: basic three beat carry", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IBA . . CA`,
        )[0],
        2,
    )

    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, B, M, "new throw for intercept")
    assertNoThrow(rewritten, 0, B, A, "remove intercepted")
    // assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, "carry-induced flip before carry")
    assertThrow(rewritten, 2, 2, A, A, "carry-induced flip before carry")
    assertThrow(rewritten, 3, 3, A, M, "carry")
    assertThrow(rewritten, 2, 2, M, M, "carry-induced flip at old manipulator")
    assertThrow(rewritten, 3, 2, M, M, "carry-induced flip at old manipulator")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: two carry on a pass", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3 3pB 3 -- B
         B: 3 3 3pA 3 -- A
         M: IA . C`,
        )[0],
        2,
    )

    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, "new throw for intercept")
    assertNoThrow(rewritten, 0, A, A, "remove intercepted")
    // assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, A, A, "moving original throws from A to M")

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, "carry-induced flip before carry")
    assertThrow(rewritten, 2, 3, A, B, "carry")
    assertThrow(rewritten, 2, 2, M, M, "carry-induced flip at old manipulator")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: three-beat carry over a pass", () => {
    //this creates counterintuitive behavior where both M and B have a flip because they are missing a pass that gets carried later
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3 3pB 3 -- B
         B: 3 3 3pA 3 -- A
         M: IA . . C`,
        )[0],
        2,
    )

    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, "new throw for intercept")
    assertNoThrow(rewritten, 0, A, A, "remove intercepted")
    // assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, A, B, "moving original throws from A to M")

    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 1, 2, A, A, "carry-induced flip before carry")
    assertThrow(rewritten, 2, 2, A, A, "carry-induced flip before carry")
    assertThrowRaw(rewritten, 3, 3, A, A, "carry")
    assertThrow(rewritten, 2, 2, M, M, "carry-induced flip at old manipulator")
    assertThrow(rewritten, 3, 2, B, B, "carry-induced flip at old manipulator")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: intercept over pattern boundary", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: C..IB`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "C" && manipulations[1].kind === "I") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 2, B = 1, M = 0

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [2, 0, 1])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 3, B, B, "remove intercepted")
    assertThrow(rewritten, 3, 3, B, M, "new throw for intercept")
    // assertThrow(rewritten, 0, 0, A, A, 'catching intercept with an empty hand')

    assertThrow(rewritten, 1, 3, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 1, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 2, 3, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 2, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 3, 3, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, M, M, "moving original throws from A to M")

    assertThrow(rewritten, 0, 3, M, B, "carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid())
    const hands = full.getStartingHands()
    // console.log(full.prettyPrintThrows())
    assert.deepEqual(hands[A], [1, 1])
    assert.deepEqual(hands[B], [2, 1])
    assert.deepEqual(hands[M], [1, 1])
})

Deno.test("intercept rewrite: intercept over pattern boundary with three passers", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- C
        C: 3333 -- A
        M: C..IB
        positions: V(A,B,C)`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 2, 0])
    assert(manipulations[0].kind === "C" && manipulations[1].kind === "I") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    assert.deepEqual(rewritten.mapRows, [1, 2, 3, 0])
    const A = 0, B = 1, M = 2, C = 3

    // console.log(rewritten.prettyPrintThrows())

    assertNoThrow(rewritten, 3, B, B, "remove intercepted")
    assertThrow(rewritten, 3, 3, B, M, "new throw for intercept")
    // assertThrow(rewritten, 0, 0, C, C, 'catching intercept with an empty hand')

    assertThrow(rewritten, 1, 3, C, C, "moving original throws from A to M")
    assertNoThrow(rewritten, 1, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 2, 3, C, C, "moving original throws from A to M")
    assertNoThrow(rewritten, 2, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 3, 3, C, C, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, M, M, "moving original throws from A to M")

    assertThrow(rewritten, 0, 3, M, C, "carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: two-beat intercept/carry over pattern boundary", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: .C.IB`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "C" && manipulations[1].kind === "I") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 2, B = 1, M = 0

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [2, 0, 1])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 3, B, B, "remove intercepted")
    assertThrow(rewritten, 3, 3, B, M, "new throw for intercept")
    // assertThrow(rewritten, 0, 0, A, A, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 2, M, M, "moving original throws from A to M")
    assertThrow(rewritten, 3, 3, A, A, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, M, M, "moving original throws from A to M")

    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 0, 2, M, M, "carry-induced flip before carry")
    assertThrow(rewritten, 1, 3, M, B, "carry")
    assertThrow(rewritten, 1, 2, B, B, "carry-induced flip at receiver of pass after intercept")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: high intercept throw over pattern boundary", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 2 3pB 3 4 -- B
        B: 2 3pA 3 4 -- A
        M: .C.IB`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "C" && manipulations[1].kind === "I") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [2, 0, 1])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 3, B, B, "remove intercepted")
    assertThrow(rewritten, 3, 4, B, A, "new throw for intercept")
    // assertThrow(rewritten, 1, 0, M, M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 2, A, A, "moving original throws from A to M")
    assertThrow(rewritten, 3, 4, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, A, A, "moving original throws from A to M")

    assertThrow(rewritten, 1, 3, A, B, "carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: two-beat intercept/carry over pattern boundary like scrambled v", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: C.IB`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "C" && manipulations[1].kind === "I") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[1], manipulations[0])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 2, 0])

    // this is stupid to track and unintutive; due to intercept landing on beat 0, the first row corresponds to M, the second to B, and the last to A
    // but this should be the right pattern
    assertNoThrow(rewritten, 2, B, B, "remove intercepted")
    assertThrow(rewritten, 2, 3, B, M, "new throw for intercept")
    // assertThrow(rewritten, 3, 0, M, M, 'catching intercept with an empty hand')

    // assertThrow(rewritten, 2, 3, A, A, 'moving original throws from A to M')
    // assertNoThrow(rewritten, 2, M, M, 'moving original throws from A to M')
    // assertThrow(rewritten, 3, 3, A, A, 'moving original throws from A to M')
    // assertNoThrow(rewritten, 3, M, M, 'moving original throws from A to M')

    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 3, 2, B, B, "carry-induced flip before carry")
    assertThrow(rewritten, 0, 3, M, B, "carry")
    assertThrow(rewritten, 0, 2, A, A, "carry-induced flip at receiver of pass after intercept")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: two intercepts from same manipulator", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3  3 3 3-- B
         B: 3pA 3  3 3 3  3 3 3 -- A
         M: .   IB C . IB C`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable
    assert(manipulations[2].kind === "I" && manipulations[3].kind === "C") // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [B, A, M])

    assertThrow(rewritten, 1, 3, B, M, "first intercept")
    assertThrow(rewritten, 2, 3, B, M, "first carry")

    assertThrow(rewritten, 3, 3, M, M, "M now has Bs throws")

    assertThrow(rewritten, 4, 3, M, B, "second intercept")
    assertThrow(rewritten, 5, 3, M, B, "second carry")

    assertThrow(rewritten, 6, 3, B, B, "B now has Bs throws again")
    assertNoThrow(rewritten, 6, M, M, "B now has Bs throws")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: two intercepts from same manipulator, but different targets", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3  3 3 3-- B
         B: 3pA 3  3 3 3  3 3 3 -- A
         M: .   IB C . IA C`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable
    assert(manipulations[2].kind === "I" && manipulations[3].kind === "C") // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [M, B, A])

    assertThrow(rewritten, 1, 3, B, M, "first intercept")
    assertThrow(rewritten, 2, 3, B, M, "first carry")

    assertThrow(rewritten, 3, 3, M, M, "M now has Bs throws")

    assertThrow(rewritten, 4, 3, A, B, "second intercept")
    assertThrow(rewritten, 5, 3, A, B, "second carry")

    assertThrow(rewritten, 6, 3, B, B, "B now has As throws")
    assertNoThrow(rewritten, 6, A, A, "B now has As throws")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: two independent intercepts", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3  3 3 -- B
         B: 3pA 3  3 3 3  3 3 -- A
         M: .   IB C
         N: .   .  . . IB C`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable
    assert(manipulations[2].kind === "I" && manipulations[3].kind === "C") // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2, N = 3

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 2, 3, 0])

    assertNoThrow(rewritten, 1, B, B, "remove first intercepted")
    assertThrow(rewritten, 1, 3, B, M, "new throw for first intercept")
    // assertThrow(rewritten, 2, 0, M, M, 'catching first intercept with an empty hand')

    assertNoThrow(rewritten, 4, B, B, "remove second intercepted")
    assertNoThrow(rewritten, 4, M, M, "remove second intercepted")
    assertThrow(rewritten, 4, 3, M, N, "new throw for second intercept")
    // assertThrow(rewritten, 5, 0, N, N, 'catching second intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, "moving original throws from B to M")
    assertNoThrow(rewritten, 3, B, B, "moving original throws from B to M")

    assertThrow(rewritten, 6, 3, N, N, "moving original throws from B to N after second relabel")
    assertNoThrow(rewritten, 6, B, B, "moving original throws from B to N after second relabel")
    assertNoThrow(rewritten, 6, M, M, "moving original throws from B to N after second relabel")

    assertThrow(rewritten, 2, 3, B, M, "first carry")
    assertThrow(rewritten, 5, 3, M, N, "second carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept rewrite: intercepting a carry", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3  3 3 -- B
         B: 3pA 3  3 3 3  3 3 -- A
         M: .   IB C
         N: .   .  IB C`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable
    assert(manipulations[2].kind === "I" && manipulations[3].kind === "C") // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applyInterceptCarry(rewritten, manipulations[2], manipulations[3])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2, N = 3

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 2, 3, 0])

    assertNoThrow(rewritten, 1, B, B, "remove first intercepted")
    assertThrow(rewritten, 1, 3, B, M, "new throw for first intercept")
    // assertThrow(rewritten, 2, 0, M, M, 'catching first intercept with an empty hand')

    assertNoThrow(rewritten, 3, B, B, "remove second intercepted")
    assertNoThrow(rewritten, 3, M, M, "remove second intercepted")
    assertThrow(rewritten, 2, 3, B, N, "new throw for second intercept (the previous carry)")
    // assertThrow(rewritten, 3, 0, N, N, 'catching second intercept with an empty hand')

    assertThrow(rewritten, 4, 3, N, N, "moving original throws from B to N after second relabel")
    assertNoThrow(rewritten, 4, B, B, "moving original throws from B to N after second relabel")

    assertThrow(rewritten, 2, 3, B, N, "first carry is also second intercept")
    assertThrow(rewritten, 3, 3, M, N, "second carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

test.skip("intercept rewrite: two interleaved intercepts", () => {
    // this is not currently supported, because N would intercept a 0 or 1 from M
    // when we support intercepting 0/1s this should probably work

    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3  3 3  3 3 -- B
         B: 3pA 3  3  3 3  3 3 -- A
         M: .   IB .  C
         N: .   .  IB `,
        )[0],
        2,
    )

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

Deno.test("apply substitution: basics", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 -- B
         B: 3pA 3  3 3 -- A
         M: .   SB z`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "S") // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 1, B, B, "remove substituted throw")
    assertThrow(rewritten, 1, 1, B, M, "pelf: taking out the substituted throw")
    assertThrow(rewritten, 1, 3, M, B, "putting in the replacement for the substituted throw")
    // assertThrow(rewritten, 0, 0, M, M, 'catching pelf with an empty hand')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("apply substitution: substituting the first beat requires reverse wraparound", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 -- B
         B: 3pA 3  3 3 -- A
         M: SB  z`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "S") // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 0, A, B, "remove substituted throw")
    assertThrow(rewritten, 0, 1, A, M, "pelf: taking out the substituted throw")
    assertThrow(rewritten, 0, 3, M, B, "putting in the replacement for the substituted throw")
    // assertThrow(rewritten, 3, 0, M, M, 'catching pelf with an empty hand')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("apply substitution: substituting the last beat", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 -- B
         B: 3pA 3  3 3 -- A
         M: . . . SA`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "S") // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertThrow(rewritten, 3, 3, B, B, "keep Bs self")
    assertNoThrow(rewritten, 3, A, B, "remove substituted throw")
    assertThrow(rewritten, 3, 1, A, M, "pelf: taking out the substituted throw")
    assertThrow(rewritten, 3, 3, M, A, "putting in the replacement for the substituted throw")
    // assertThrow(rewritten, 2, 0, M, M, 'catching pelf with an empty hand')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("apply substitution: substituting right person after relabel", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3 3 -- B
         B: 3pA 3  3 3 3 3 -- A
         M: IB  C  . . SB z`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "I") // just making sure parsing is stable
    assert(manipulations[1].kind === "C") // just making sure parsing is stable
    assert(manipulations[2].kind === "S") // just making sure parsing is stable
    assert(manipulations[3].kind === "T") // just making sure parsing is stable

    let rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    rewritten = applySubstitution(rewritten, manipulations[2])
    rewritten = applyManipulatorThrow(rewritten, manipulations[3])
    assert.deepStrictEqual(_removeUniqueKey(applyManipulations(p, manipulations)), _removeUniqueKey(rewritten)) //, 'applyManipulations should do the same as the manual steps before')
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 3, A, M, "intercept")
    assertThrow(rewritten, 1, 3, B, M, "carry")

    assertNoThrow(rewritten, 4, M, M, "remove substituted throw")
    assertThrow(rewritten, 4, 1, M, B, "pelf: taking out the substituted throw")
    assertThrow(rewritten, 4, 3, B, M, "putting in the replacement for the substituted throw")
    // assertThrow(rewritten, 3, 0, B, B, 'catching pelf with an empty hand')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("apply substitution: intercept a substitution", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3 3 -- B
         B: 3pA 3  3 3 3 3 -- A
         M: SB
         N: IB C`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    const rewritten = applyManipulations(p, manipulations)
    const A = 0, B = 1, M = 2, N = 3

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 1, A, M, "substitution -- steal")
    assertThrow(rewritten, 0, 3, M, N, "intercept of the placement part of the substitution")
    assertThrow(rewritten, 1, 3, B, N, "carry")
    // assertThrow(rewritten, 1, 0, N, N, 'catching intercept with an empty hand')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("apply substitution: intercept a substitution 2", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 3 3 -- B
         B: 3pA 3  3 3 3 3 -- A
         M: IB C
         N: SB`,
        )[0],
        2,
    )

    // const pM = applyInterceptCarry(p, manipulations[0] as InterceptAction, manipulations[1] as CarryAction)
    // console.log(pM.prettyPrintThrows())
    // const pN = applySubstitution(p, manipulations[2] as SubstitutionAction)
    // console.log(pN.prettyPrintThrows())
    // const pNM = applyInterceptCarry(pN, manipulations[0] as InterceptAction, manipulations[1] as CarryAction)
    // console.log(pNM.prettyPrintThrows())

    assert.deepEqual(p.mapRows, [1, 0])
    const rewritten = applyManipulations(p, manipulations)
    const A = 0, B = 1, M = 2, N = 3

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 0, 1, A, N, "substitution -- steal")
    assertThrow(rewritten, 0, 3, N, M, "intercept of the placement part of the substitution")
    assertThrow(rewritten, 1, 3, B, M, "carry")
    // assertThrow(rewritten, 1, 0, N, N, 'catching intercept with an empty hand')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("manipulator throw: basics", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 -- B
         B: 3pA 3  3 3 -- A
         M: .   SB z`,
        )[0],
        2,
    )

    assert(manipulations[1].kind === "T") // just making sure parsing is stable

    let rewritten = applyManipulatorThrow(p, manipulations[1])

    // console.log(rewritten.prettyPrintThrows())

    const M = 2
    assertThrow(rewritten, 2, 1, M, M, "new manipulator throw")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("manipulator throw: zip after substitution", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3  3 3 -- B
         B: 3pA 3  3 3 -- A
         M: .   SB z`,
        )[0],
        2,
    )

    assert.deepEqual(p.mapRows, [1, 0])
    assert(manipulations[0].kind === "S") // just making sure parsing is stable
    assert(manipulations[1].kind === "T") // just making sure parsing is stable

    let rewritten = applySubstitution(p, manipulations[0])
    rewritten = applyManipulatorThrow(rewritten, manipulations[1])

    assert.deepStrictEqual(_removeUniqueKey(applyManipulations(p, manipulations)), _removeUniqueKey(rewritten), "applyManipulations should do the same as the manual steps before")

    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())
    assert.deepEqual(rewritten.mapRows, [1, 0, 2])

    assertNoThrow(rewritten, 1, B, B, "remove substituted throw")
    assertThrow(rewritten, 1, 1, B, M, "pelf: taking out the substituted throw")
    assertThrow(rewritten, 1, 3, M, B, "putting in the replacement for the substituted throw")
    // assertThrow(rewritten, 0, 0, M, M, 'catching pelf with an empty hand')

    assertThrow(rewritten, 2, 1, M, M, "new manipulator throw")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("roundabout", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33  -- A
         M: SB z SB z  IB . CB z `,
        )[0],
        2,
    )
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertThrowRaw(rewritten, 0, 1, A, B, "sub pass -- steal")
    assertThrow(rewritten, 0, 3, M, B, "sub pass -- place")

    assertThrow(rewritten, 2, 1, B, M, "sub self -- steal")
    assertThrow(rewritten, 2, 3, M, B, "sub self -- place")

    assertThrow(rewritten, 4, 3, A, M, "intercept")
    // assertThrow(rewritten, 5, 0, M, M, 'empty hand to catch intercept')
    assertThrow(rewritten, 5, 2, B, B, "hold before carry")
    assertThrow(rewritten, 6, 2, M, M, "hold due to carry")

    assertThrow(rewritten, 6, 3, B, M, "carry")

    assertThrow(rewritten, 1, 1, M, M, "zip 1")
    assertThrow(rewritten, 3, 1, M, M, "zip 2")
    assertThrow(rewritten, 7, 1, B, B, "zip 3")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("chopabout", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB3 33   3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33   3pA3 33 -- A
         M: SBcz SAlz SAcz SAlz IAvo. CA`,
        )[0],
        2,
    )
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertSub(rewritten, 0, 3, A, M, B, "sub first chop")
    assertSub(rewritten, 2, 3, A, M, A, "sub self")
    assertSub(rewritten, 4, 3, B, M, A, "sub second chop")
    assertSub(rewritten, 6, 3, A, M, A, "sub another self")

    assertThrow(rewritten, 8, 3, B, M, "intercept")
    assertNoThrow(rewritten, 8, B, A, "remove intercepted")
    // assertThrow(rewritten, 9, 0, M, M, 'empty hand to catch intercept')
    assertThrow(rewritten, 9, 2, A, A, "hold before carry")
    assertThrow(rewritten, 10, 2, M, M, "hold due to carry")

    assertThrow(rewritten, 10, 3, A, M, "carry")

    assertThrow(rewritten, 1, 1, M, M, "zip 1")
    assertThrow(rewritten, 3, 1, M, M, "zip 2")
    assertThrow(rewritten, 5, 1, M, M, "zip 3")
    assertThrow(rewritten, 7, 1, M, M, "zip 4")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("phonecian walz", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
        B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
        M: SBloz   zf  SBloz   .   IBvb CA  . `,
        )[0],
        2,
    )
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertSub(rewritten, 0, 3, A, M, B, "sub first")
    assertSub(rewritten, 3, 3, A, M, B, "sub self")
    assertThrow(rewritten, 6, 3, A, M, "intercept")
    assertNoThrow(rewritten, 6, A, B, "remove intercepted")
    // assertThrow(rewritten, 7, 0, M, M, 'empty hand to catch intercept')
    assertThrow(rewritten, 7, 3, B, A, "carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("opernball", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB  3pB 3   3pB  3pB 3   3pB  3pB 3 -- B
         B: 3pA  3pA 3   3pA  3pA 3   3pA  3pA 3 -- A
         O: IBvb CA  .   SAlo z   zf  SAlo z   .   
         N: SAlo z   .   IAvb CB  .   SBlo z   zf  
         M: SBlo z   zf  SBlo z   .   IBvb CA  . 
         `,
        )[0],
        2,
    )
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2, N = 3, O = 4
    assertSub(rewritten, 0, 3, A, M, O, "sub north to intercept")
    // assertThrow(rewritten, 1, 0, O, O, 'empty hand to catch intercept')
    assertSub(rewritten, 0, 3, B, N, A, "sub south")
    // check markers on those throws
    {
        const _t0A = findThrow(rewritten, 0, 1, A, M)
        assert.ok(_t0A && _t0A.markers, "throw 3 A->M should exist and have markers")
        // assert.ok(_t0A!.markers!.find(m => m.kind === 'S' && (m as SubstitutionMarker).throw === 'P' && (m as SubstitutionMarker).fromRole === 'A' && (m as SubstitutionMarker).toRoleAtThrow === 'O'), "unexpected substitution marker: " + JSON.stringify(_t0A!.markers!.find(m => m.kind === 'S')))
        assert.equal(rewritten.getFromPasserRole(_t0A!), "A")
        assert.equal(rewritten.getToPasserRole(_t0A!), "M")
        assert.ok(!_t0A!.markers!.find((m) => m.kind === "I"), "throw 3 A->M should not have an intercept marker, found: " + JSON.stringify(_t0A!.markers!.find((m) => m.kind === "I")))
        const _t0M = findThrow(rewritten, 0, 3, M, O)
        assert.ok(_t0M && _t0M.markers, "throw 3 M->O should exist and have markers")
        assert.ok(
            _t0M!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "S" && (m as SubstitutionMarker).fromRole === "A" && (m as SubstitutionMarker).toRoleAtThrow === "O"),
            "unexpected substitution marker: " + JSON.stringify(_t0M!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t0M!), "M")
        assert.equal(rewritten.getToPasserRole(_t0M!), "O")
        assert.ok(
            _t0M!.markers!.find((m) => m.kind === "I" && (m as InterceptMarker).fromRole === "M" && (m as InterceptMarker).originalFromRole === "A" && (m as InterceptMarker).originalToRoleAtThrow === "B"),
            "unexpected intercept marker: " + JSON.stringify(_t0M!.markers!.find((m) => m.kind === "I")),
        )

        const _t0B = findThrow(rewritten, 0, 1, B, N)
        assert.ok(_t0B && _t0B.markers, "throw 3 B->N should exist and have markers")
        assert.ok(
            _t0B!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "P" && (m as SubstitutionMarker).fromRole === "B" && (m as SubstitutionMarker).toRoleAtThrow === "A"),
            "unexpected substitution marker: " + JSON.stringify(_t0B!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t0B!), "B")
        assert.equal(rewritten.getToPasserRole(_t0B!), "N")
        assert.ok(!_t0B!.markers!.find((m) => m.kind === "I"), "throw 3 B->N should not have an intercept marker, found: " + JSON.stringify(_t0B!.markers!.find((m) => m.kind === "I")))
        const _t0N = findThrow(rewritten, 0, 3, N, A)
        assert.ok(_t0N && _t0N.markers, "throw 3 N->A should exist and have markers")
        assert.ok(
            _t0N!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "S" && (m as SubstitutionMarker).fromRole === "B" && (m as SubstitutionMarker).toRoleAtThrow === "A"),
            "unexpected substitution marker: " + JSON.stringify(_t0N!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t0N!), "N")
        assert.equal(rewritten.getToPasserRole(_t0N!), "A")
        assert.ok(!_t0N!.markers!.find((m) => m.kind === "I"), "throw 3 N->A should not have an intercept marker, found: " + JSON.stringify(_t0N!.markers!.find((m) => m.kind === "I")))
    }

    assertSub(rewritten, 3, 3, O, B, N, "sub north to intercept 2")
    assertSub(rewritten, 3, 3, A, M, O, "sub south 2")
    // check markers on those throws
    {
        const _t3O = rewritten.findThrow(3, O, B)
        assert.ok(_t3O && _t3O.markers, "throw 3 O->B should exist and have markers")
        assert.ok(
            _t3O!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "P" && (m as SubstitutionMarker).fromRole === "B" && (m as SubstitutionMarker).toRoleAtThrow === "N"),
            "unexpected substitution marker: " + JSON.stringify(_t3O!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t3O!), "B")
        assert.equal(rewritten.getToPasserRole(_t3O!), "O")
        assert.ok(!_t3O!.markers!.find((m) => m.kind === "I"), "throw 3 O->B should not have an intercept marker, found: " + JSON.stringify(_t3O!.markers!.find((m) => m.kind === "I")))
        const _t3N = rewritten.findThrow(3, B, N)
        assert.ok(_t3N && _t3N.markers, "throw 3 B->N should exist and have markers")
        assert.ok(
            _t3N!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "S" && (m as SubstitutionMarker).fromRole === "B" && (m as SubstitutionMarker).toRoleAtThrow === "N"),
            "unexpected substitution marker: " + JSON.stringify(_t3N!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t3N!), "O")
        assert.equal(rewritten.getToPasserRole(_t3N!), "N")
        assert.ok(
            _t3N!.markers!.find((m) => m.kind === "I" && (m as InterceptMarker).fromRole === "O" && (m as InterceptMarker).originalFromRole === "B" && (m as InterceptMarker).originalToRoleAtThrow === "A"),
            "unexpected intercept marker: " + JSON.stringify(_t3N!.markers!.find((m) => m.kind === "I")),
        )

        const _t3M = rewritten.findThrow(3, A, M)
        assert.ok(_t3M && _t3M.markers, "throw 3 A->M should exist and have markers")
        assert.ok(
            _t3M!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "P" && (m as SubstitutionMarker).fromRole === "A" && (m as SubstitutionMarker).toRoleAtThrow === "B"),
            "unexpected substitution marker: " + JSON.stringify(_t3M!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t3M!), "A")
        assert.equal(rewritten.getToPasserRole(_t3M!), "M")
        assert.ok(!_t3M!.markers!.find((m) => m.kind === "I"), "throw 3 A->M should not have an intercept marker, found: " + JSON.stringify(_t3M!.markers!.find((m) => m.kind === "I")))
        const _t3B = rewritten.findThrow(3, M, O)
        assert.ok(_t3B && _t3B.markers, "throw 3 M->B should exist and have markers")
        assert.ok(
            _t3B!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "S" && (m as SubstitutionMarker).fromRole === "A" && (m as SubstitutionMarker).toRoleAtThrow === "B"),
            "unexpected substitution marker: " + JSON.stringify(_t3B!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t3B!), "M")
        assert.equal(rewritten.getToPasserRole(_t3B!), "B")
        assert.ok(!_t3B!.markers!.find((m) => m.kind === "I"), "throw 3 M->O should not have an intercept marker, found: " + JSON.stringify(_t3B!.markers!.find((m) => m.kind === "I")))
    }

    assertSub(rewritten, 6, 3, N, A, M, "sub north to intercept 3")
    // assertThrow(rewritten, 7, 0, M, M, 'empty hand to catch intercept 3')
    assertSub(rewritten, 6, 3, O, B, N, "sub south 3")
    // check markers on those throws
    {
        const _t6N = rewritten.findThrow(6, N, A)
        assert.ok(_t6N && _t6N.markers, "throw 6 N->A should exist and have markers")
        assert.ok(
            _t6N!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "P" && (m as SubstitutionMarker).fromRole === "A" && (m as SubstitutionMarker).toRoleAtThrow === "M"),
            "unexpected substitution marker: " + JSON.stringify(_t6N!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t6N!), "A")
        assert.equal(rewritten.getToPasserRole(_t6N!), "N")
        assert.ok(!_t6N!.markers!.find((m) => m.kind === "I"), "throw 6 N->A should not have an intercept marker, found: " + JSON.stringify(_t6N!.markers!.find((m) => m.kind === "I")))
        const _t6A = rewritten.findThrow(6, A, M)
        assert.ok(_t6A && _t6A.markers, "throw 6 A->M should exist and have markers")
        assert.ok(
            _t6A!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "S" && (m as SubstitutionMarker).fromRole === "A" && (m as SubstitutionMarker).toRoleAtThrow === "M"),
            "unexpected substitution marker: " + JSON.stringify(_t6A!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t6A!), "N")
        assert.equal(rewritten.getToPasserRole(_t6A!), "M")
        assert.ok(
            _t6A!.markers!.find((m) => m.kind === "I" && (m as InterceptMarker).fromRole === "N" && (m as InterceptMarker).originalFromRole === "A" && (m as InterceptMarker).originalToRoleAtThrow === "B"),
            "unexpected intercept marker: " + JSON.stringify(_t6A!.markers!.find((m) => m.kind === "I")),
        )

        const _t6O = rewritten.findThrow(6, O, B)
        assert.ok(_t6O && _t6O.markers, "throw 6 O->B should exist and have markers")
        assert.ok(
            _t6O!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "P" && (m as SubstitutionMarker).fromRole === "B" && (m as SubstitutionMarker).toRoleAtThrow === "A"),
            "unexpected substitution marker: " + JSON.stringify(_t6O!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t6O!), "B")
        assert.equal(rewritten.getToPasserRole(_t6O!), "O")
        assert.ok(!_t6O!.markers!.find((m) => m.kind === "I"), "throw 6 O->B should not have an intercept marker, found: " + JSON.stringify(_t6O!.markers!.find((m) => m.kind === "I")))
        const _t6B = rewritten.findThrow(6, B, N)
        assert.ok(_t6B && _t6B.markers, "throw 6 B->N should exist and have markers")
        assert.ok(
            _t6B!.markers!.find((m) => m.kind === "S" && (m as SubstitutionMarker).throw === "S" && (m as SubstitutionMarker).fromRole === "B" && (m as SubstitutionMarker).toRoleAtThrow === "A"),
            "unexpected substitution marker: " + JSON.stringify(_t6B!.markers!.find((m) => m.kind === "S")),
        )
        assert.equal(rewritten.getFromPasserRole(_t6B!), "O")
        assert.equal(rewritten.getToPasserRole(_t6B!), "A")
        assert.ok(!_t6B!.markers!.find((m) => m.kind === "I"), "throw 6 B->N should not have an intercept marker, found: " + JSON.stringify(_t6B!.markers!.find((m) => m.kind === "I")))
    }

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("minued", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3B 3B 3 3B 3B 3 3B 3B 3 -- B
        B: 3A 3A 3 3A 3A 3 3A 3A 3 -- A
        M: .  SB IB C z  z SB .  SB `,
        )[0],
        2,
    )
    const A = 0, B = 1, M = 2
    assert.deepEqual(p.mapRows, [B, A])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    assertSub(rewritten, 1, 3, A, M, B, "sub pass")
    assertThrow(rewritten, 2, 3, B, M, "intercept")
    assertThrow(rewritten, 3, 3, B, A, "carry")
    assertSub(rewritten, 6, 3, A, B, M, "sub pass 2")
    assertSub(rewritten, 8, 3, M, B, M, "sub self")
    // assertThrow(rewritten, 0, 2, A, A, 'flip due to carry')
    // assertNoThrow(rewritten, 4, C, C, 'intercepted')
    // assertThrow(rewritten, 5, 0, M, M, 'catch intercept')
    // assertThrow(rewritten, 5, 2, C, C, 'flip to prepare for carry')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("scrambled V", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3B 3  3C 3  3B 3 -- B
        B: 3A 3  3  3  3A 3  -- C
        C: 3  3  3A 3  3  3  -- A
        M: C  z  SB z  ICe 
        positions: V(A,B,C)`,
        )[0],
        2,
    )
    const A = 0, B = 1, C = 2, M = 3
    assert.deepEqual(p.mapRows, [B, C, A])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())
    assert.ok(rewritten.isValid(), rewritten.getValidationError())

    assertThrow(rewritten, 0, 3, M, B, "carry")
    assertThrow(rewritten, 0, 2, A, A, "skipped pass, flip instead")
    assertSub(rewritten, 2, 3, B, M, B, "sub self")
    assertThrow(rewritten, 4, 1, C, M, "intercept")
    assertNoThrow(rewritten, 4, C, C, "intercepted")
    assertThrow(rewritten, 3, 1, M, M, "catch intercept, into a zip")
    assertThrow(rewritten, 5, 2, C, C, "flip to prepare for carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid())
    const hands = full.getStartingHands()
    // console.log(full.prettyPrintThrows())
    assert.deepEqual(hands[A], [1, 1])
    assert.deepEqual(hands[B], [2, 1])
    assert.deepEqual(hands[C], [2, 1])
    assert.deepEqual(hands[M], [1, 1])
})

Deno.test("ambled V", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 4pBx3  4pCx3  4pBx3  4pCx -- B
B: !34pAx  3  3  34pAx  4x  -- C
C: !2 33 4pAx 3  3  3   -- A
M: C  !1x z  SB z  IC 
positions: V(A,B,C)
move: Vmove(B,5.9,3)`,
        )[0],
        2,
    )
    const A = 0, B = 1, C = 2, M = 3
    assert.deepEqual(p.mapRows, [B, C, A])
    // console.log(p.prettyPrintThrows() + prettyPrintManipulatorActions(p, manipulations))
    assert.ok(p.isValid(), p.getValidationError())

    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())
    // assert.ok(rewritten.isValid(), rewritten.getValidationError())

    assertThrow(rewritten, 0, 4, M, B, "carry")
    assertThrow(rewritten, 0, 2, A, A, "flip due to carry")
    assertSub(rewritten, 3, 3, B, M, B, "sub self")
    assertThrow(rewritten, 5, 3, C, M, "intercept")
    assertNoThrow(rewritten, 5, C, C, "intercepted")
    // assertThrow(rewritten, 6, 0, M, M, 'catch intercept')
    assertThrow(rewritten, 6, 2, C, C, "flip to prepare for carry")

    const full = fillPatternGaps(rewritten)
    // console.log(full.prettyPrintThrows())
    assert.ok(full.isValid(), full.getValidationError())
    const hands = full.getStartingHands()
    // console.log(full.prettyPrintThrows())
    assert.deepEqual(hands[A], [1, 2])
    assert.deepEqual(hands[B], [1, 2])
    assert.deepEqual(hands[C], [2, 1])
    assert.deepEqual(hands[M], [1, 1])
})

Deno.test("ambled 3 (with late intercept)", () => {
    //this is with all crossing passes and no handedness weirdness
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 4B 3  4C 3  4B 3  4C -- B
        B: 3  4A 3  3  3  4A 3  -- C
        C: 3  3  3  4A 3  3  3  -- A
        M: .  C  z  SCAIAB
        positions: V(A,B,C)`,
        )[0],
        2,
    )
    const A = 0, B = 1, C = 2, M = 3
    assert.deepEqual(p.mapRows, [B, C, A])
    assert.ok(p.isValid(), p.getValidationError())

    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 3, M, C, "carry")
    // 3 beat carry!
    assertThrowH(rewritten, 0, 2, M, Hand.Right, M, false, "flip due to carry")
    assertThrowH(rewritten, 0, 2, C, Hand.Right, C, false, "flip due to carry")
    assertThrowH(rewritten, 1, 2, C, Hand.Left, C, false, "flip due to carry")
    assertThrowH(rewritten, 6, 2, B, Hand.Right, B, false, "flip due to carry")

    assertSub(rewritten, 3, 4, C, M, A, "sub pass")
    assertThrow(rewritten, 4, 4, A, M, "intercept")
    assertNoThrow(rewritten, 4, A, B, "intercepted")
    // assertThrow(rewritten, 6, 0, M, M, 'catch intercept')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("modifiers: delayed placement (for German turn)", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3 3 3 3 -- B
        B: 3 3 3 3 3 -- A
        M: . SBd2 `,
        )[0],
        2,
    )
    const A = 0, B = 1, M = 2
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 1, B, M, "steal")
    assertThrow(rewritten, 3, 1, M, B, "late placement")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("modifiers: delayed placement with flips (for German turn)", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3 3 3 3 -- B
        B: 3 3 3 3 3 -- A
        M: . (SBd2 2) 2 `,
        )[0],
        2,
    )
    const A = 0, B = 1, M = 2
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 1, B, M, "steal")
    assertThrow(rewritten, 3, 1, M, B, "late placement")
    assertThrow(rewritten, 1, 2, M, M, "flip")
    assertThrow(rewritten, 2, 2, M, M, "flip")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

function createPattern(s: string): Pattern {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(s)[0], 2)
    return applyManipulations(p, manipulations)
}

Deno.test("delayed substitute placement: basics", () => {
    const basic = createPattern(
        `A: 3333 -- B
         B: 3333  -- A
         M: . SB `,
    )

    const B = 1, M = 2

    // console.log(basic.prettyPrintThrows())

    // assertEmpty(basic, 0, M, 'empty hand to catch pelf')
    assertThrow(basic, 1, 3, M, B, "normal handin")

    // delay 2
    const d2 = createPattern(
        `A: 3333 -- B
         B: 3333  -- A
         M: . SBd2 `,
    )
    // console.log(d2.prettyPrintThrows())

    // assertEmpty(d2, 0, M, 'empty hand to catch pelf')
    assertThrow(d2, 3, 1, M, B, "very late handin")

    //delay 1
    const d = createPattern(
        `A: 3333 -- B
         B: 3333  -- A
         M: . SBd `,
    )
    const d1 = createPattern(
        `A: 3333 -- B
         B: 3333  -- A
         M: . SBd1 `,
    )
    assert.deepEqual(stripModifiers(d), stripModifiers(d1))
    // console.log(d1.prettyPrintThrows())

    // assertEmpty(d1, 0, M, 'empty hand to catch pelf')
    assertThrow(d1, 2, 2, M, B, "later handin")
})

function stripModifiers(p: Pattern): Pattern {
    return {
        ...p,
        throws: p.throws.map((t) => ({
            ...t,
            markers: [],
        })),
    }
}

test.skip("delayed substitute placement: roundabout with German turn", () => {
    //TODO the zip after the intercept is weird; it still belongs to the old manipulator to free the hand for the intercept
    // we could fill it automatically, but it might be nice to have it explicitly in the notation?
    //(not sure how to handle this)
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33  -- A
         M: SB z (SBd2, 2) 2 IB z CB z `,
        )[0],
        2,
    )
    assert.deepEqual(p.mapRows, [1, 0])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    const A = 0, B = 1, M = 2
    assertThrowRaw(rewritten, 0, 1, A, M, /*weird wraparound, but correct */ "sub pass -- steal")
    assertThrow(rewritten, 0, 3, M, B, "sub pass -- place")

    assertThrow(rewritten, 2, 1, B, M, "sub self -- steal")
    assertThrow(rewritten, 4, 1, M, B, "sub self -- place delayed with 1p")
    assertThrow(rewritten, 2, 2, M, M, "flip")
    assertThrow(rewritten, 3, 2, M, M, "flip")

    assertThrow(rewritten, 4, 3, A, M, "intercept")
    assertThrow(rewritten, 5, 2, B, B, "hold before carry")
    assertThrow(rewritten, 6, 2, M, M, "hold due to carry")

    assertThrow(rewritten, 6, 3, B, M, "carry")

    assertThrow(rewritten, 1, 1, M, M, "zip 1")
    assertThrow(rewritten, 4, 1, M, M, "zip 2") // this one is problematic!
    assertThrow(rewritten, 7, 1, B, B, "zip 3")
    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("modifiers: early intercept", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3pB 3 3 -- B
        B: 3 3pA  3 3 -- A
        M: . IBAe CA`,
        )[0],
        2,
    )

    assert(manipulations && manipulations[0].kind === "I" && manipulations[1].kind === "C") // just making sure parsing is stable

    const rewritten = applyInterceptCarry(p, manipulations[0], manipulations[1])
    assert.deepStrictEqual(applyManipulations(p, manipulations), rewritten, "applyManipulations should do the same as the manual steps before")
    const A = 0, B = 1, M = 2

    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 1, B, M, "new throw for intercept")
    assertNoThrow(rewritten, 1, B, A, "remove intercepted")
    // assertEmpty(rewritten, 0, M, 'catching intercept with an empty hand, really early')

    // TODO: manipulator does nothing (flips) on beat 1 and 2

    assertThrow(rewritten, 3, 3, M, M, "moving original throws from A to M")
    assertNoThrow(rewritten, 3, A, A, "moving original throws from A to M")

    // 1 beat carry is easy, unchanged in this case except for redirecting it
    assertThrow(rewritten, 2, 3, A, M, "carry")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("ambled 3 (with early intercept)", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 4B 3  4C 3  4B 3  4C -- B
        B: 3  4A 3  3  3  4A 3  -- C
        C: 3  3  3  4A 3  3  3  -- A
        M: .  C  z  SCAIABe
        positions: V(A,B,C)`,
        )[0],
        2,
    )
    const A = 0, B = 1, C = 2, M = 3
    assert.deepEqual(p.mapRows, [B, C, A])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 3, M, C, "carry")
    // 3 beat carry!
    assertThrow(rewritten, 0, 2, M, M, "flip due to carry")
    assertThrow(rewritten, 0, 2, C, C, "flip due to carry")
    assertThrow(rewritten, 1, 2, C, C, "flip due to carry")
    assertThrow(rewritten, 6, 2, B, B, "flip due to carry")

    assertSub(rewritten, 3, 4, C, M, A, "sub pass")
    assertThrow(rewritten, 4, 1, A, M, "intercept")
    assertNoThrow(rewritten, 4, A, B, "intercepted")
    // assertEmpty(rewritten, 3, M, 'catch intercept')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("ambled 3 (with early intercept and delayed hand-in and real time-travel)", () => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 4B 3  4C 3  4B 3  4C -- B
        B: 3  4A 3  3  3  4A 3  -- C
        C: 3  3  3  4A 3  3  3  -- A
        M: .  C  z  (SCAd 3) IABe 
        positions: V(A,B,C)`,
        )[0],
        2,
    )
    const A = 0, B = 1, C = 2, M = 3
    assert.deepEqual(p.mapRows, [B, C, A])
    let rewritten = applyManipulations(p, manipulations)
    // console.log(rewritten.prettyPrintThrows())

    assertThrow(rewritten, 1, 3, M, C, "carry")
    // 3 beat carry!
    assertThrow(rewritten, 0, 2, M, M, "flip due to carry")
    assertThrow(rewritten, 0, 2, C, C, "flip due to carry")
    assertThrow(rewritten, 1, 2, C, C, "flip due to carry")
    assertThrow(rewritten, 6, 2, B, B, "flip due to carry")

    assertThrow(rewritten, 3, 1, C, M, "sub pass catch")
    assertThrow(rewritten, 4, 3, M, A, "sub pass late hand in")
    assertThrow(rewritten, 4, 1, A, M, "intercept")
    assertNoThrow(rewritten, 4, A, B, "intercepted")
    // assertEmpty(rewritten, 3, M, 'catch intercept')

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test.ignore("ambled 3 with straight passes", () => {
    // now we need to switch hands during the manipulation sequence (i.e. the substitution must come from the left hand, but still thrown to the left hand, i.e., now crossing instead of straight)
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 4pBx3  4pCx3  4pBx3  4pCx -- B
B: !34pAx  3  3  34pAx  4x  -- C
C: !2 33 4pAx 3  3  3   -- A
M: !.  C  z ! SCA  IABe -- M!
positions: V(A,B,C)
move: Vmove(B,5.9,3)`,
        )[0],
        2,
    )
    let rewritten = applyManipulations(p, manipulations)
    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

Deno.test("intercept: at end of pattern with different base rows", () => {
    // this really messes with relabeling: the intercept is to the person who is B when the intercept is thrown but is actually A when it arrives, so A and M swap at that point

    const tt = `A: 2 3 3 3 -- B
     B: 3 3 3 4 -- A
     M: .C . IB `
    const r = parseGroupSyncPattern(tt)
    const [t, m] = createPatternFromRaw(r[0], 2)
    const rewritten = applyManipulations(t, m)

    // console.log(rewritten.prettyPrintThrows())
    const A = 0, B = 1, M = 2

    assertThrow(rewritten, 3, 4, B, A, "intercept")
    // assertEmpty(rewritten, 1, M, 'catch intercept')
    // 0 beat carry, but later
    assertThrow(rewritten, 1, 3, A, M, "carry")

    assertThrow(rewritten, 0, 2, A, A, "original flip")

    assertThrow(rewritten, 2, 3, M, M, "moved")
    assertNoThrow(rewritten, 2, A, A, "moved")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

export function assertThrowRaw(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg?: string) {
    const ts = pattern.throws.filter((t) => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(
        ts.length !== 0,
        `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtCausal}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${
            pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map((t) => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(", ")
        }`,
    )
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected one [${msg}]`)
}
export function assertIntercept(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg: string = "intercept") {
    //uses raw rows, no intelligence for relabeling
    const ts = pattern.throws.filter((t) => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(
        ts.length !== 0,
        `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtCausal}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${
            pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map((t) => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(", ")
        }`,
    )
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected one [${msg}]`)
    assert(ts[0].markers!.some((t) => t.kind === "I"), `expected intercept, found ${ts[0].markers} [${msg}]`)
}
export function assertCarry(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg: string = "carry") {
    //uses raw rows, no intelligence for relabeling
    const ts = pattern.throws.filter((t) => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(
        ts.length !== 0,
        `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtCausal}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${
            pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map((t) => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(", ")
        }`,
    )
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected one [${msg}]`)
    assert(ts[0].markers!.some((t) => t.kind === "C"), `expected carry, found ${ts[0].markers} [${msg}]`)
}

function findThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtThrow: number): Throw | undefined {
    const ts = findThrows(pattern, beat, length, fromPasserIdx, toPasserIdxAtThrow)
    if (ts.length > 1) throw new Error(`multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtThrow}, expected one`)
    if (ts.length === 0) return undefined
    return ts[0]
}

function findThrows(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtThrow: number): Throw[] {
    // automated relabel of rows past the end of the pattern
    let toTime = pattern.getThrowCauseTime_(beat, length)
    const toPasserIdxAtCausal = pattern.adjustRowIdxByTime(toTime, toPasserIdxAtThrow)

    return pattern.throws.filter((t) => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)
}

/**
 * throws are identified by passer index (i.e. stable, not affected by relabeling)
 */
export function assertThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtThrow: number, msg?: string) {
    const ts = findThrows(pattern, beat, length, fromPasserIdx, toPasserIdxAtThrow)

    assert(
        ts.length !== 0,
        `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtThrow}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${
            pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map((t) => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(", ")
        }`,
    )
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtThrow}, expected one [${msg}]`)
}
export function assertThrowH(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, fromHand: Hand, toPasserIdxAtCausal: number, expectCrossing?: boolean, msg?: string) {
    // automated relabel of rows past the end of the pattern
    let toTime = pattern.getThrowCauseTime_(beat, length)
    toPasserIdxAtCausal = pattern.adjustRowIdxByTime(toTime, toPasserIdxAtCausal)
    const isFromOppositeHand = fromHand !== pattern.getGlobalHand(0, beat)
    const isCrossingByDefault = pattern.getGlobalHand(0, beat) !== pattern.getGlobalHand(0, beat + length)
    const isFlipCrossing = isCrossingByDefault !== expectCrossing

    const ts = pattern.throws.filter((t) =>
        t.throwBeat === beat &&
        t.throwLength === length &&
        t.fromPasserIdx === fromPasserIdx &&
        t.fromOppositeHand === isFromOppositeHand &&
        t.flipCrossing == isFlipCrossing &&
        t.toPasserIdxAtCausal === toPasserIdxAtCausal
    )

    assert(
        ts.length !== 0,
        `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtCausal}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${
            pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map((x) => JSON.stringify(x)).join(", ")
        }`,
    )
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected one [${msg}]`)
}
function assertNoThrow(pattern: Pattern, beat: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg?: string) {
    const ts = pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal)

    assert(ts.length === 0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected none [${msg}]`)
}
function assertNoThrowL(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtCausal: number, msg?: string) {
    const ts = pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdxAtCausal === toPasserIdxAtCausal && t.throwLength === length)

    assert(ts.length === 0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdxAtCausal}, expected none [${msg}]`)
}
function assertSub(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, manipulatorIdx: number, toPasserIdxAtCausal: number, msg?: string) {
    assertThrow(pattern, beat, pattern.nrHands / 2, fromPasserIdx, manipulatorIdx, msg + " -- steal")
    assertThrow(pattern, beat, length, manipulatorIdx, toPasserIdxAtCausal, msg + " -- place")
    assertNoThrowL(pattern, beat, length, fromPasserIdx, toPasserIdxAtCausal, msg + " -- replaced")
}
/**
 * empty hand (0) at this time (don't care about the target of the throw)
 */
export function assertEmpty(pattern: Pattern, beat: number, fromPasserIdx: number, msg?: string) {
    // automated relabel of rows past the end of the pattern
    const ts = pattern.throws.filter((t) => t.throwBeat === beat && t.throwLength === 0 && t.fromPasserIdx === fromPasserIdx)

    assert(
        ts.length !== 0,
        `throw {beat: ${beat}, length: ${0}, from: ${fromPasserIdx} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${
            pattern.throws.filter((t) => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map((t) => `${t.throwLength}p to ${t.toPasserIdxAtCausal}`).join(", ")
        }`,
    )
    assert(ts.length <= 1, `multiple throws found for ${beat} ${0} ${fromPasserIdx} expected one [${msg}]`)
}

// Deno.test('manipulator pattern parsing of opernball', async (t) => {
//     const opernball = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
// B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
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

// Deno.test('Pattern.findThrowsByRole', () => {
//     const tt =
//         `A: 3 3B 3 3 -- B
//         B: 3 3A 3 3 -- A
//         M: .C . IB `
//     const r = parseGroupSyncPattern(tt)
//     const [t, m] = createPatternFromRaw(r[0], 2)

//     console.log(t.prettyPrintThrows())

//     function assertT(ts: Throw[], fromRow: number, toRow: number) {
//         assert(ts.length === 1, `expected 1 throw, found ${ts.length}`)
//         assert(ts[0].fromPasserIdx === fromRow, `expected throw from ${fromRow}, found ${ts[0].fromPasserIdx}`)
//         assert(ts[0].toPasserIdxAtCausal === toRow, `expected throw to ${toRow}, found ${ts[0].toPasserIdxAtCausal}`)
//     }
//     assertT(t.findThrowsByRoleAtCausal(0, 'A', 'A'), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, 'A', undefined), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, undefined, 'A'), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, 'B'), 1, 1)
//     assertT(t.findThrowsByRoleAtCausal(1, 'A', 'B'), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(1, undefined, 'B'), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(1, 'A', undefined), 0, 1)

//     assertT(t.findThrowsByRoleAtCausal(3, 'A', 'B'), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(3, undefined, 'B'), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(3, 'A', undefined), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(3, 'B', 'A'), 1, 0)
//     assertT(t.findThrowsByRoleAtCausal(3, undefined, 'A'), 1, 0)
//     assertT(t.findThrowsByRoleAtCausal(3, 'B', undefined), 1, 0)

//     // assertT(t.findThrowsByRole(-2, 'A', 'A'), 0, 0)
//     // assertT(t.findThrowsByRole(-1, 'A', 'A'), 1, 0)

// })

// Deno.test('Pattern.findThrowsByRole2', () => {
//     const tt =
//         `A: 2 3 3 3 -- B
//         B: 3 3 3 4 -- A
//         M: .C . IB `
//     const r = parseGroupSyncPattern(tt)
//     const [t, m] = createPatternFromRaw(r[0], 2)

//     console.log(t.prettyPrintThrows())

//     function assertT(ts: Throw[], fromRow: number, toRow: number, throwLength?: number) {
//         assert(ts.length === 1, `expected 1 throw, found ${ts.length}`)
//         assert(ts[0].fromPasserIdx === fromRow, `expected throw from ${fromRow}, found ${ts[0].fromPasserIdx}`)
//         assert(ts[0].toPasserIdxAtCausal === toRow, `expected throw to ${toRow}, found ${ts[0].toPasserIdxAtCausal}`)
//         if (throwLength !== undefined) {
//             assert(ts[0].throwLength === throwLength, `expected throw length ${throwLength}, found ${ts[0].throwLength}`)
//         }
//     }
//     assertT(t.findThrowsByRoleAtCausal(0, 'A', 'A'), 0, 0, 2)
//     assertT(t.findThrowsByRoleAtCausal(0, 'A', undefined), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, undefined, 'A'), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, 'B'), 1, 1, 3)

//     assertT(t.findThrowsByRoleAtCausal(3, 'A', 'B'), 0, 1, 3)
//     assertT(t.findThrowsByRoleAtCausal(3, undefined, 'B'), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(3, 'A', undefined), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(3, 'B', 'A'), 1, 0, 4)
//     assertT(t.findThrowsByRoleAtCausal(3, undefined, 'A'), 1, 0)
//     assertT(t.findThrowsByRoleAtCausal(3, 'B', undefined), 1, 0)

// })

// Deno.test('Pattern.findThrowsByRole with relabel', () => {
//     const tt =
//         `A: 2 3 3 3 -- B
//         B: 3 3 3 4 -- A
//         M: .C . IB `
//     const r = parseGroupSyncPattern(tt)
//     const [t2, m] = createPatternFromRaw(r[0], 2)
//     const t = t2.swapRoles(3, 'A', 'B', true)

//     console.log(t2.prettyPrintThrows())
//     console.log(t.prettyPrintThrows())

//     function assertT(ts: Throw[], fromRow: number, toRow: number, throwLength?: number) {
//         assert(ts.length === 1, `expected 1 throw, found ${ts.length}`)
//         assert(ts[0].fromPasserIdx === fromRow, `expected throw from ${fromRow}, found ${ts[0].fromPasserIdx}`)
//         assert(ts[0].toPasserIdxAtCausal === toRow, `expected throw to ${toRow}, found ${ts[0].toPasserIdxAtCausal}`)
//         if (throwLength !== undefined) {
//             assert(ts[0].throwLength === throwLength, `expected throw length ${throwLength}, found ${ts[0].throwLength}`)
//         }
//     }
//     assertT(t.findThrowsByRoleAtCausal(0, 'A', 'A'), 0, 0, 2)
//     assertT(t.findThrowsByRoleAtCausal(0, 'A', undefined), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, undefined, 'A'), 0, 0)
//     assertT(t.findThrowsByRoleAtCausal(0, 'B'), 1, 1, 3)

//     assertT(t.findThrowsByRoleAtCausal(3, 'A', 'A'), 1, 0, 4)
//     assertT(t.findThrowsByRoleAtCausal(3, undefined, 'A'), 1, 0)
//     assertT(t.findThrowsByRoleAtCausal(3, 'A', undefined), 1, 0)
//     assertT(t.findThrowsByRoleAtCausal(3, 'B', 'B'), 0, 1, 3)
//     assertT(t.findThrowsByRoleAtCausal(3, undefined, 'B'), 0, 1)
//     assertT(t.findThrowsByRoleAtCausal(3, 'B', undefined), 0, 1)
// })

Deno.test("intercept: at end of pattern again after prior relabeling", () => {
    // this really messes with relabeling: the intercept is to the person who is B when the intercept is thrown but is actually A when it arrives, so A and M swap at that point

    const tt = `A: 3 3 3 3B -- B
     B: 3 3 3 3A -- A
     M: C .. IA `
    const r = parseGroupSyncPattern(tt)
    const [t, m] = createPatternFromRaw(r[0], 2)
    const t2 = t.swapRoles(3, "A", "B", true)
    // console.log(t2.prettyPrintThrows() + prettyPrintManipulatorActions(t2, m))
    const rewritten = applyManipulations(t2, m)

    // console.log(rewritten.prettyPrintThrows())
    const A = 0, B = 1, M = 2

    assertIntercept(rewritten, 3, 3, M, M)
    // assertEmpty(rewritten, 0, M, 'catch intercept')
    // // 0 beat carry, but later
    assertCarry(rewritten, 0, 3, A, M)

    assertThrow(rewritten, 2, 3, M, M, "moved")
    assertNoThrow(rewritten, 2, A, A, "moved")

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())
})

function loadPattern(s: string): Pattern {
    const [p, manipulations] = createPatternFromRaw(parseGroupSyncPattern(s)[0], 2)
    return applyManipulations(p, manipulations)
}

Deno.test("fill and validate: basics", () => {
    const p = loadPattern(
        `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IBA CA`,
    )

    // console.log(p.prettyPrintThrows())

    assert.ok(!p.isValid(), "pattern is valid without filling manipulator actions: " + p.getValidationError())
    const filled = fillPatternGaps(p)
    // console.log(filled.prettyPrintThrows())
    assert.ok(filled.isValid(), "pattern is invalid after filling manipulator actions: " + filled.getValidationError())
})

Deno.test("fill and validate: basics 2 beat intercept", () => {
    const p = loadPattern(
        `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: IB . C`,
    )

    // console.log(p.prettyPrintThrows())

    assert.ok(!p.isValid(), "pattern is valid without filling manipulator actions: " + p.getValidationError())
    const filled = fillPatternGaps(p)
    // console.log(filled.prettyPrintThrows())
    assert.ok(filled.isValid(), "pattern is invalid after filling manipulator actions: " + filled.getValidationError())
})
Deno.test("fill and validate: ambled 3 with time travel", () => {
    const p = loadPattern(
        `A: 4B 3  4C 3  4B 3  4C -- B
        B: 3  4A 3  3  3  4A 3  -- C
        C: 3  3  3  4A 3  3  3  -- A
        M: .  C  z  (SCAd 3) IABe 
        positions: V(A,B,C)`,
    )

    // console.log(p.prettyPrintThrows())

    const filled = fillPatternGaps(p)
    // console.log(filled.prettyPrintThrows())
    assert.ok(filled.isValid(), "pattern is invalid after filling manipulator actions: " + filled.getValidationError())
})

Deno.test("check starting hands in Nickis 3c roundabout", () => {
    // this is a pattern that has a starting hand of 3pB, but the manipulator actions are not filled, so it is invalid
    const p = loadPattern(
        `A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..
positions: Line(A,B)`,
    )

    // console.log(p.prettyPrintThrows())

    assert.ok(!p.isValid(), "pattern is valid without filling manipulator actions: " + p.getValidationError())
    const filled = fillPatternGaps(p)
    // console.log(filled.getStartingHands())
    assert.ok(filled.isValid(), "pattern is invalid after filling manipulator actions: " + filled.getValidationError())

    assert.deepEqual(filled.getStartingHands(), [[2, 1], [2, 1], [1, 0]])
})

Deno.test("check animations/hands in ronjabout roundabout", () => {
    const ronjabout = `A: 4pBx 3   5 3 4pBx 3   5 3 4pBx -- B
B: !3   4pAx 3 3 3   4pAx 3 3 3 -- A
M: SBe! . 1x     SBl IBv.. CB↺  -- M`

    const r = parseGroupSyncPattern(ronjabout)
    const [t, m] = createPatternFromRaw(r[0], 2)
    const rewritten = applyManipulations(t, m)

    // console.log(rewritten.prettyPrintThrows())
    const A = 0, B = 1, M = 2

    const full = fillPatternGaps(rewritten)
    assert.ok(full.isValid(), full.getValidationError())

    // first throw is substituted (right handed)
    assertThrowH(full, 0, 1, A, Hand.Right, M, true, "sub pass -- steal")
    const firstThrow = full.throws.find((t) => t.throwBeat === 0 && t.fromPasserIdx === A)!
    assert(full.getThrowHand(firstThrow, 0) === Hand.Right, "first throw should be right handed")
    assert(full.getThrowHand(firstThrow, 1) === Hand.Right, "first throw should be right handed also in the second iteration")
})

function _removeUniqueKey(rewritten: Pattern): Pattern {
    return {
        ...rewritten,
        throws: rewritten.throws.map((t) => ({
            ...t,
            markers: t.markers?.map((m) => ({ ...m, uniqueKey: undefined })),
        })),
    }
}
