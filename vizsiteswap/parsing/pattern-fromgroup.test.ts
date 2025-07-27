import assert, { fail } from "node:assert";
import test from "node:test";
import { expectEOF, expectSingleResult } from "npm:typescript-parsec";
import { createGroupPattern, createSyncGroupPattern } from "./pattern-fromgroup.ts";
import { parseGroupPattern } from "./pattern-fromgroup-parser.ts";
import { createSiteswapPattern } from "./pattern-fromsiteswap.ts";
import { Hand, Pattern, Throw } from "@modernpassing/pattern";
import { GroupPattern } from "@modernpassing/layout";

const R = Hand.Right
const L = Hand.Left


Deno.test('test parsing four-count', () => {
    const t = createGroupPattern(
        `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A`, 2
    ).pattern

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


/**
 * throws are identified by passer index (i.e. stable, not affected by relabeling)
 */
export function assertThrow(pattern: Pattern, beat: number, length: number, fromPasserIdx: number, toPasserIdxAtThrow: number, msg?: string) {
    // automated relabel of rows past the end of the pattern
    let toTime = pattern.getThrowCauseTime_(beat, length)

    const ts = pattern.throws.filter(t => t.throwBeat === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && pattern.getToPasserIdxAtThrow(t) === toPasserIdxAtThrow)

    assert(ts.length !== 0, `throw {beat: ${beat}, length: ${length}, from: ${fromPasserIdx}, to: ${toPasserIdxAtThrow}} not found [${msg}] -- other throws from ${fromPasserIdx} on ${beat}: ${pattern.throws.filter(t => t.throwBeat === beat && t.fromPasserIdx === fromPasserIdx).map(t => `${t.throwLength}p to ${pattern.getToPasserIdxAtThrow(t)}`).join(', ')}`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdxAtThrow}, expected one [${msg}]`)
}


Deno.test('test parsing four-count in different notations', () => {
    // with p and target
    const t1 = createGroupPattern(
        `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A`
        , 2).pattern
    // implied target
    const t2 = createGroupPattern(
        `A: 3p 3 3 3 -- B
        B: 3p 3 3 3 -- A`
        , 2).pattern
    // target without p
    const t3 = createGroupPattern(
        `A: 3B 3 3 3 -- B
        B: 3A 3 3 3 -- A`
        , 2).pattern
    // extra self-targets
    const t4 = createGroupPattern(
        `A: 3B 3A 3A 3A -- B
        B: 3A 3B 3B 3B -- A`
        , 2).pattern
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



Deno.test('test parsing 867', () => {
    const t = createGroupPattern(
        `A:  7 6 8 7 6 -- B
         B: , 8 7 6 8 -- A`, 4
    ).pattern

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
Deno.test('test parsing 867 notation variations', () => {
    // default notation without annotations
    const t1 = createGroupPattern(
        `A:  7 6 8 7 6 -- B
         B: , 8 7 6 8 -- A`
        , 4).pattern
    // implied target with p
    const t2 = createGroupPattern(
        `A:  7p 6 8 7p 6 -- B
         B: , 8 7p 6 8 -- A`
        , 4).pattern
    // target without p
    const t3 = createGroupPattern(
        `A:  7B 6 8 7B 6 -- B
         B: , 8 7A 6 8 -- A`
        , 4).pattern
    // extra self-targets
    const t4 = createGroupPattern(
        `A:  7B 6A 8A 7B 6A -- B
         B: , 8B 7A 6B 8B -- A`
        , 4).pattern


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


test("test pattern creation", (t) => {
    const gp: GroupPattern = createSyncGroupPattern("A: 3pB333pC33\n           B: 3pC333pA33\n            C: 3pA333pB33\n            positions: Circle(A,B,C)")
    const p = gp.pattern

    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    const roles = ['A', 'B', 'C']
    assert.deepStrictEqual(p.getInitialRoles(), roles)
    assert.equal(p.getLength(), 6)
    // assert.equal(p.prefixPeriod, 0)
    const throws = p.throws
    function assertContainsThrow(throws: Throw[], fromRole: string, fromHand: Hand, throwLength: number, toRole: string, toHand: Hand, beat: number) {
        const t = throws.find(t => t.fromPasserIdx === roles.indexOf(fromRole) && t.fromHand === fromHand &&
            t.throwLength === throwLength && p.getToPasserIdxAtThrow(t) === roles.indexOf(toRole) && t.throwBeat === beat)
        if (!t) fail(`throw ${fromRole} ${throwLength} -> ${toRole} at ${beat} not found`)
        assert.equal(p.getTargetHand(t, 0), toHand)
    }

    assertContainsThrow(throws, 'A', R, 3, 'B', L, 0)
    assertContainsThrow(throws, 'B', R, 3, 'C', L, 0)
    assertContainsThrow(throws, 'C', R, 3, 'A', L, 0)
    assertContainsThrow(throws, 'A', L, 3, 'A', R, 1)
    assertContainsThrow(throws, 'B', L, 3, 'B', R, 1)
    assertContainsThrow(throws, 'C', L, 3, 'C', R, 1)
    assertContainsThrow(throws, 'A', L, 3, 'C', R, 3)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 2), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, -1), Hand.Right)

    // console.log(gp.layout)
    // console.log(throws)
})


test("test double feed", async (t) => {
    const pattern = `A: 3pB33
B: 3pA3pC3
C: 3pD3pB3
D: 3pC33
positions: Box(A,C,D,B)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    const roles = ['A', 'B', 'C']
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 1)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 2)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 3)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 1)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 2)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 3)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 2), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 3), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, -1), Hand.Left)
})

test('walking v', async (t) => {
    const pattern = `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3 -- C
C: 3 3 3pA3  3  3  -- A
positions: V(A,B,C)
move: Vmove(B,3.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Right)

})


test('hands: double pass', async (t) => {
    const pattern = `4p 2 3\n3 3p 3`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Left)

    assert.equal(p.findThrow(0, 0)!.isCrossing, false)
    assert.equal(p.findThrow(1, 0)!.isCrossing, false)
    assert.equal(p.findThrow(2, 0)!.isCrossing, true)
    assert.equal(p.findThrow(0, 1)!.isCrossing, true)
    assert.equal(p.findThrow(1, 1)!.isCrossing, true)
    assert.equal(p.findThrow(2, 1)!.isCrossing, true)

})


test('hands: jim\'s three count', async (t) => {
    const pattern = `3p  3 3 3p  3 3
                     3px 3 3 3px 3 3`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 1)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(1, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(1, 1)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(2, 0)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(2, 1)!, 0), Hand.Right)

    assert.equal(p.getThrowHand(p.findThrow(3, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(3, 1)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(4, 0)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(4, 1)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(5, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(5, 1)!, 0), Hand.Right)

    // flip hands even though it is even length
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 1)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(1, 0)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(1, 1)!, 1), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(2, 0)!, 1), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(2, 1)!, 1), Hand.Left)

    assert.equal(p.findThrow(0, 0)!.isCrossing, true)
    assert.equal(p.findThrow(1, 0)!.isCrossing, true)
    assert.equal(p.findThrow(2, 0)!.isCrossing, true)
    assert.equal(p.findThrow(0, 1)!.isCrossing, false)
    assert.equal(p.findThrow(1, 1)!.isCrossing, true)
    assert.equal(p.findThrow(2, 1)!.isCrossing, true)

})



test('hands: jim\'s three count -- short', async (t) => {
    const pattern = `A: 3p33--B\nB: 3px33 -- A`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())
    assert.deepEqual(p.getStartingHands(), [[2, 1], [2, 1]])

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 1)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(1, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(1, 1)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(2, 0)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(2, 1)!, 0), Hand.Right)

    // flip hands even though it is even length
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 1)!, 1), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(1, 0)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(1, 1)!, 1), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(2, 0)!, 1), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(2, 1)!, 1), Hand.Right)

    assert.equal(p.findThrow(0, 0)!.isCrossing, true)
    assert.equal(p.findThrow(1, 0)!.isCrossing, true)
    assert.equal(p.findThrow(2, 0)!.isCrossing, true)
    assert.equal(p.findThrow(0, 1)!.isCrossing, false)
    assert.equal(p.findThrow(1, 1)!.isCrossing, true)
    assert.equal(p.findThrow(2, 1)!.isCrossing, true)

})


test('hands: 8c two count', () => {
    const pattern = `(4px 4x)\n(4px 4x)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    assert.deepEqual(p.getStartingHands(), [[2, 2], [2, 2]])

})

test('hands: techno', () => {
    const pattern = `
        (4p 4x)(4x 2  )(4x 4p)(2   4x)
        (4x  2)(4x 4px)(2  4x)(4px 4x)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

    assert.equal(p.findThrow(0, 0, undefined, Hand.Right)?.fromHand, Hand.Right)
    assert.equal(p.findThrow(0, 0, undefined, Hand.Right)?.isCrossing, false)
    assert.deepEqual(p.findThrows(1, undefined, undefined), []) // no throws on odd beats
    assert.equal(p.findThrow(2, 1, undefined, Hand.Left)?.isCrossing, true)

    assert.deepEqual(p.getStartingHands(), [[2, 2], [2, 1]])
})


test('siteswaps, basics', () => {
    const q = createSiteswapPattern("756", {})
    const p = createGroupPattern(`
        A: 7 6 -- B
        B: ,5  -- A
        `, 4).pattern

    console.log(q.prettyPrintThrows())
    console.log(p.prettyPrintThrows())

    assert.equal(p.getLength(), q.getLength())
    assert.deepEqual(p.prettyPrintThrows(), q.prettyPrintThrows())
    assert.deepEqual(p.getStartingHands(), q.getStartingHands())

})

test('hands/crossing complicated: extra club brunos', () => {
    const pattern = `
        A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B
        B: , 6   9A  6   6   6   6   6   9A  6   7x   -- C
        C:!, 6   6   6   6   9Ax 6   6   6   6   6   -- A
        positions: Brunos(A,B,C)
        move: Bmove(B,1.9,4)Bmove(B,6.9,5)Bmove(C,3.9,5) `
    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

})


test('hands: 7 club two count, straight doubles', () => {
    const pattern = `
        A: 4px 3
        B:!3   4px`
    const gp: GroupPattern = createGroupPattern(pattern, 2)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

})


test('prefix and hands: 7 club two count', () => {
    const pattern = `
        A: 4px| !3 4px 
        B: 4px 3`
    const gp: GroupPattern = createGroupPattern(pattern, 2)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())

    assert.equal(p.getPrefixLength(), 1)
    assert.equal(p.getLength(), 2)

    assert.equal(p.getThrowHand(p.findThrow(-1, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Left)

    assert.ok(p.isValid(), p.getValidationError())
})

test('prefix and hands: 7 club two count, start left-handed', () => {
    const pattern = `
        A: 4px| 3 4px 
        B: !4px 3`
    const gp: GroupPattern = createGroupPattern(pattern, 2)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())

    assert.equal(p.getPrefixLength(), 1)
    assert.equal(p.getLength(), 2)

    assert.equal(p.getThrowHand(p.findThrow(-1, 0)!, 0), Hand.Left)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)

    assert.ok(p.isValid(), p.getValidationError())
})

test('prefix notations', () => {
    const p = createGroupPattern(`
        A: 4px| !3 4px 
        B: 4px 3`, 2).pattern
    const q = createGroupPattern(`
            A: 4px| !3 4px 
            B: .| 4px 3`, 2).pattern

    assert.equal(p.prettyPrintThrows(), q.prettyPrintThrows())
})


test('siteswap feed', () => {
    const pattern = `A: 7B7C267B7C6
B: ,7A667A466
C: ,67A667A46
positions: V(A,B,C)`
    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Left)

    assert.ok(p.isValid(), p.getValidationError())
    assert.equal(p.iterationsUntilRepeat(), 2)
})

test('brunos 10 club -- siteswap walking feed', () => {
    const pattern = `A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B
B: , 6   9A  6   6   6   6   6   9A  6   7x  -- C
C: !, 6   6   6   6   9Ax 6   6   6   6   6  -- A
positions: Brunos(A,B,C)
move: Bmove(B,4.9,8)Bmove(B,15.9,5)Bmove(C,9.9,5)`
    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())

    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 0), Hand.Right)
    assert.equal(p.getThrowHand(p.findThrow(0, 0)!, 1), Hand.Left)

    assert.ok(p.isValid(), p.getValidationError())
    // assert.equal(p.iterationsUntilRepeat(),6)
})




test('test crossing/hands validation: jim\'s three count', async (t) => {
    const patterns: [string, boolean][] = [
        [`3p  3 3 3p  3 3 -- B⇆X
          3px 3 3 3px 3 3 -- A⇆X`, false],
        [`3p  3 3 3p  3 3 -- B⇆
          3px 3 3 3px 3 3 -- A⇆`, true]
    ]
    for (const [pattern, expectValid] of patterns) {
        printAndCheckValidity(pattern, expectValid, 2)
    }

})


test('test crossing/hands validation: 10c brunos', async (t) => {
    const patterns: [string, boolean][] = [
        [`A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B⇆
B: , 6   9A  6   6   6   6   6   9A  6   7  -- CX
C: !, 6   6   6   6   9Ax 6   6   6   6   6  -- A⇆X
positions: Brunos(A,B,C)
move: Bmove(B,4.9,8)Bmove(B,15.9,5)Bmove(C,9.9,5)`, false],
        [`A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B⇆
B: , 6   9A  6   6   6   6   6   9A  6   7  -- C
C: !, 6   6   6   6   9Ax 6   6   6   6   6  -- A⇆
positions: Brunos(A,B,C)
move: Bmove(B,4.9,8)Bmove(B,15.9,5)Bmove(C,9.9,5)`, false],
        [`A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B⇆
B: , 6   9A  6   6   6   6   6   9A  6   7x  -- C⇆
C: !, 6   6   6   6   9Ax 6   6   6   6   6  -- A⇆
positions: Brunos(A,B,C)
move: Bmove(B,4.9,8)Bmove(B,15.9,5)Bmove(C,9.9,5)`, true]
    ]
    for (const [pattern, expectValid] of patterns) {
        printAndCheckValidity(pattern, expectValid)
    }
})




test('testing crossing/hands validation (shorter): popcorn vs whynot walking feed', async (t) => {
    const patterns: [string, boolean][] = [
        [`A: 7B 6 7Cx 827Cx -- B
        B: , a67A67 -- C⇆
        C: !, 66a67Ax -- A
        positions: V(A,B,C)
        move: Vmove(B, 7, 5)`, false],
        [`A: 7B 6 7Cx 827Cx -- B
B: , a67A67x -- C!
C: !, 66a67Ax -- A
positions: V(A,B,C)
move: Vmove(B, 7, 5)`, true],
        [`A: 7B 6 7Cx 827Cx -- B
B: , a67A67x -- CX
C: !, 66a67Ax -- A
positions: V(A,B,C)
move: Vmove(B, 7, 5)`, false]
    ]
    for (const [pattern, expectValid] of patterns) {
        printAndCheckValidity(pattern, expectValid)
    }
})

function printAndCheckValidity(pattern: string, expectValid: boolean, nrHands: number = 4) {
    const gp: GroupPattern = createGroupPattern(pattern, nrHands)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())

    const roles = p.getInitialRoles()
    const result: string[][] = roles.map((r) => [])

    for (let passerIdx = 0; passerIdx < roles.length; passerIdx++) {
        for (let time = 0; time < p.getLength() * 3; time++) {
            const iteration = Math.floor(time / p.getLength())
            const rowIdx = p.samePasserNBeatsLater(passerIdx, 0, time)
            const t = p.findThrow(time % p.getLength(), rowIdx)

            if (t) {
                result[passerIdx].push((t.throwLength + "").slice(0, 1) + p.samePasserNBeatsLater(t.toPasserIdxAtCausal, time, t.throwLength - 4 - iteration * p.getLength()) + (p.getThrowHand(t, iteration) ? 'L' : 'R') + (p.isSelfThrow(t) ? "s" : p.isCrossingPass(t, iteration) ? '∥' : 'X'))
            } else result[passerIdx].push('----')
        }
        console.log(roles[passerIdx] + ': ' + result[passerIdx].join(' '))
    }
    console.log((p as any).countHurries(), p.iterationsUntilRepeat())
    assert.equal(p.isValid(), expectValid, `Pattern is ${p.isValid() ? 'valid' : 'invalid'} but expected ${expectValid} for pattern:\n${pattern}\n${p.getValidationError()}`)
}


test.skip('**broken:** testing crossing/hands validation: 456about', async (t) => {
    const patterns: [string, boolean][] = [
        [`A: 5 4 6 5 4 -- B⇆X
B: ,6 5 4 6 -- AX
M: .IA -- MX`, true],
        [`A: 5 4 6 5 4 -- B⇆X
B: ,6 5 4 6 -- AX
M: .IA -- M`, false]
    ]
    for (const [pattern, expectValid] of patterns) {
        printAndCheckValidity(pattern, expectValid)
    }
})
test.skip('**broken:** testing crossing/hands validation: manege', async (t) => {
    const pattern = `A: 7 6 8 7 6 -- B
         B: ,8 7 6 8 -- A
        M: IB, CA -- M`
    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const p = gp.pattern

    p.mapHands[0] = [true]
    p.mapHands[1] = [true, false]
    p.mapHands[2] = [false]
    p.mapCrossing[0] = [true]
    p.mapCrossing[1] = [true]
    p.mapCrossing[2] = [true]
    console.log(p.mapHands)
    console.log(p.mapCrossing)

    console.log(p.prettyPrintThrows())



    // first pass
    const p7 = p.findThrow(0, 0)!
    // B's reaction
    const p8 = p.findThrow(1, 1)!
    // M's first action (should be same hand as B's reaction)
    const p6 = p.findThrow(5, 2)!
    // for crossing/straight, let's look at the carry (from the opposite hand than the starting hand)
    const b7 = p.findThrow(3, 1)!

    for (let quarter = 0; quarter < 13; quarter += 4) {
        // in the first iteration A starts right, B and M start right
        assert.equal(p.getThrowHand(p7, quarter + 0), Hand.Right, `A's first throw in iteration 0+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(p8, quarter + 0), Hand.Right, `B's first throw in iteration 0+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(p6, quarter + 0), Hand.Right, `M's first throw in iteration 0+${quarter} should be right hand`)

        // in the second iteration, new A starts right handed, B and M start left handed
        assert.equal(p.getThrowHand(p7, quarter + 1), Hand.Right, `A's first throw in iteration 1+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(p8, quarter + 1), Hand.Left, `B's first throw in iteration 1+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(p6, quarter + 1), Hand.Left, `M's first throw in iteration 1+${quarter} should be left hand`)

        // in the third iteration, everybody starts left handed
        assert.equal(p.getThrowHand(p7, quarter + 2), Hand.Left, `A's first throw in iteration 2+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(p8, quarter + 2), Hand.Left, `B's first throw in iteration 2+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(p6, quarter + 2), Hand.Left, `M's first throw in iteration 2+${quarter} should be left hand`)

        // in the fourth iteration, A starts left handed, B and M start right handed
        assert.equal(p.getThrowHand(p7, quarter + 3), Hand.Left, `A's first throw in iteration 3+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(p8, quarter + 3), Hand.Right, `B's first throw in iteration 3+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(p6, quarter + 3), Hand.Right, `M's first throw in iteration 3+${quarter} should be right hand`)
    }

    for (let iteration = 0; iteration < 13; iteration++) {
        assert.equal(isJames(p, p7, iteration), iteration % 2 == 0, "A should be on the james side for every even iteration " + iteration)
        assert.equal(isJames(p, b7, iteration), !isJames(p, p7, iteration), "B should be on the opposite side of A")
        // assert.equal(isJames(p, m5, iteration), isJames(p, b5, iteration), "M should always start on the same side as B")
    }

    console.log("Hand of start A:", Array.from({ length: 13 }, (_, i) => (p.getThrowHand(p7, i) ? 'L' : 'R') + (isJames(p, p7, i) ? '‖' : 'X')))
    console.log("Hand of start B:", Array.from({ length: 13 }, (_, i) => (!p.getThrowHand(b7, i) ? 'L' : 'R') + (isJames(p, b7, i) ? '‖' : 'X')))
    // console.log("Hand of start C:", Array.from({ length: 13 }, (_, i) => (!p.getThrowHand(m5, i) ? 'L' : 'R') + (isJames(p, m5, i) ? '‖' : 'X')))


    assert.ok(p.isValid(), p.getValidationError())
})


test('detailed testing crossing/hands validation: 567about', async (t) => {
    const pattern = `A: 7 6 5 7 6 -- B
        B: ,5 7 6 5 -- A
        M: IB, CA -- M`
    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const p = gp.pattern

    console.log(p.nrRows)
    // console.log(p.mapHands)
    // console.log(p.mapCrossing)
    p.mapHands[0] = [true]
    p.mapHands[1] = [true, false]
    p.mapHands[2] = [false]
    p.mapCrossing[0] = [true]
    p.mapCrossing[1] = [true]
    p.mapCrossing[2] = [true]
    console.log(p.mapHands)
    console.log(p.mapCrossing)

    console.log(p.prettyPrintThrows())


    // first pass
    const a7 = p.findThrow(0, 0)!
    // B's reaction (a zap); this is on the opposite site of crossing/straight, but being a 5 vs 7 this should be crossing if a7 is crossing
    const b5 = p.findThrow(1, 1)!
    // M's first action two beats later (a self) -- should be same hand as B's reaction
    const m6 = p.findThrow(5, 2)!
    // M's last action is a zap, from the opposite hand than b5, but same crossing/straight
    const m5 = p.findThrow(7, 2)!



    for (let quarter = 0; quarter < 13; quarter += 4) {
        // in the first iteration A starts right, B and M start right
        assert.equal(p.getThrowHand(a7, quarter + 0), Hand.Right, `A's first throw in iteration 0+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(b5, quarter + 0), Hand.Right, `B's first throw in iteration 0+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(m6, quarter + 0), Hand.Right, `M's first throw in iteration 0+${quarter} should be right hand`)

        // in the second iteration, new A starts right handed, B and M start left handed
        assert.equal(p.getThrowHand(a7, quarter + 1), Hand.Right, `A's first throw in iteration 1+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(b5, quarter + 1), Hand.Left, `B's first throw in iteration 1+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(m6, quarter + 1), Hand.Left, `M's first throw in iteration 1+${quarter} should be left hand`)

        // in the third iteration, everybody starts left handed
        assert.equal(p.getThrowHand(a7, quarter + 2), Hand.Left, `A's first throw in iteration 2+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(b5, quarter + 2), Hand.Left, `B's first throw in iteration 2+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(m6, quarter + 2), Hand.Left, `M's first throw in iteration 2+${quarter} should be left hand`)

        // in the fourth iteration, A starts left handed, B and M start right handed
        assert.equal(p.getThrowHand(a7, quarter + 3), Hand.Left, `A's first throw in iteration 3+${quarter} should be left hand`)
        assert.equal(p.getThrowHand(b5, quarter + 3), Hand.Right, `B's first throw in iteration 3+${quarter} should be right hand`)
        assert.equal(p.getThrowHand(m6, quarter + 3), Hand.Right, `M's first throw in iteration 3+${quarter} should be right hand`)
    }

    for (let iteration = 0; iteration < 13; iteration++) {
        assert.equal(isJames(p, a7, iteration), iteration % 2 == 0, "A should be on the james side for every even iteration " + iteration)
        assert.equal(isJames(p, b5, iteration), !isJames(p, a7, iteration), "B should be on the opposite side of A")
        assert.equal(isJames(p, m5, iteration), isJames(p, b5, iteration), "M should always start on the same side as B")
    }
    console.log("Hand of start A:", Array.from({ length: 13 }, (_, i) => (p.getThrowHand(a7, i) ? 'L' : 'R') + (isJames(p, a7, i) ? '‖' : 'X')))
    console.log("Hand of start B:", Array.from({ length: 13 }, (_, i) => (p.getThrowHand(b5, i) ? 'L' : 'R') + (isJames(p, b5, i) ? '‖' : 'X')))
    console.log("Hand of start C:", Array.from({ length: 13 }, (_, i) => (!p.getThrowHand(m5, i) ? 'L' : 'R') + (isJames(p, m5, i) ? '‖' : 'X')))

    assert.ok(p.isValid(), p.getValidationError())
})

// for my sanity, let's not use the internal crossing/straight but see which side we are on
function isJames(p: Pattern, t: Throw, iteration: number): boolean {
    assert(t.throwLength === 5 || t.throwLength === 7 || t.throwLength === 9, "This is only for passes, but found " + t.throwLength)
    if (t.throwLength === 7)
        return p.isCrossingPass(t, iteration)
    else return !p.isCrossingPass(t, iteration)
}


Deno.test("zippy", () => {
    const pattern = `A: 3pC 3pB 3  3pC 3pB 3  3pC 3 -- B
B: 3   3pA 3  3   3pA 3  3   3 -- C
C: 3pA 3   3  3pA 3   3  3pA 3 -- A
M: z   SBe zf IAv CB  z  SB  z 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createGroupPattern(pattern, 2)
    const p = gp.pattern
    console.log(p.prettyPrintThrows())
    assert.ok(p.isValid(), p.getValidationError())

})
