import assert from "node:assert";
import { createPattern, Hand, Pattern, Throw, ThrowType } from "./pattern.ts";
import { PatternImpl } from "./pattern-impl.ts";




Deno.test("hands, four count", () => {
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 3, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 1, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 1, throwLength: 3, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 2, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 2, throwLength: 3, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 3, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 3, throwLength: 3, toPasserIdxAtThrow: 1 }
    ], 2, [0, 1], ['A', 'B'], [[false], [false]])
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    for (let iteration = -3; iteration < 5; iteration++) {
        // pass from A to B on 0
        assert.equal(pattern.getThrowHand(pattern.throws[0]!, iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[0], iteration), Hand.Left)

        // pass from B to A on 0
        assert.equal(pattern.getThrowHand(pattern.throws[1], iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[1], iteration), Hand.Left)

        // self from A to A on 1 
        assert.equal(pattern.getThrowHand(pattern.throws[2], iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[2], iteration), Hand.Right)

        // self from B to B on 1 
        assert.equal(pattern.getThrowHand(pattern.throws[3], iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[3], iteration), Hand.Right)

        // self from A to A on 2 
        assert.equal(pattern.getThrowHand(pattern.throws[4], iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[4], iteration), Hand.Left)

        // self from B to B on 2 
        assert.equal(pattern.getThrowHand(pattern.throws[5], iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[5], iteration), Hand.Left)

        // self from A to A on 3
        assert.equal(pattern.getThrowHand(pattern.throws[6], iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[6], iteration), Hand.Right)

        // self from B to B on 3
        assert.equal(pattern.getThrowHand(pattern.throws[7], iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[7], iteration), Hand.Right)
    }
    assert.deepEqual(pattern.getStartingHands(), [[2, 1], [2, 1]])
})


Deno.test("hands, three count", () => {
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 3, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 1, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 1, throwLength: 3, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 2, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 2, throwLength: 3, toPasserIdxAtThrow: 1 },
    ], 2, [0, 1], ['A', 'B'], [[true], [true]])


    console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    for (let iteration = -4; iteration < 8; iteration += 2) {
        const iteration = 0
        // pass from A to B on 0
        assert.equal(pattern.getThrowHand(pattern.throws[0]!, iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[0], iteration), Hand.Left)

        // pass from B to A on 0
        assert.equal(pattern.getThrowHand(pattern.throws[1], iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[1], iteration), Hand.Left)

        // self from A to A on 1 
        assert.equal(pattern.getThrowHand(pattern.throws[2], iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[2], iteration), Hand.Right)

        // self from B to B on 1 
        assert.equal(pattern.getThrowHand(pattern.throws[3], iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[3], iteration), Hand.Right)

        // self from A to A on 2 
        assert.equal(pattern.getThrowHand(pattern.throws[4], iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[4], iteration), Hand.Left)

        // self from B to B on 2 
        assert.equal(pattern.getThrowHand(pattern.throws[5], iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[5], iteration), Hand.Left)

        // self from A to B on 3
        assert.equal(pattern.getThrowHand(pattern.throws[0], iteration + 1), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[0], iteration + 1), Hand.Right)

        // self from B to A on 3
        assert.equal(pattern.getThrowHand(pattern.throws[1], iteration + 1), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[1], iteration + 1), Hand.Right)


        // self from A to A on 4
        assert.equal(pattern.getThrowHand(pattern.throws[2], iteration + 1), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[2], iteration + 1), Hand.Left)

        // self from B to B on 4 
        assert.equal(pattern.getThrowHand(pattern.throws[3], iteration + 1), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[3], iteration + 1), Hand.Left)

        // self from A to A on 5 
        assert.equal(pattern.getThrowHand(pattern.throws[4], iteration + 1), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[4], iteration + 1), Hand.Right)

        // self from B to B on 5 
        assert.equal(pattern.getThrowHand(pattern.throws[5], iteration + 1), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[5], iteration + 1), Hand.Right)

    }
    assert.deepEqual(pattern.getStartingHands(), [[2, 1], [2, 1]])
})


Deno.test("hands, 756", () => {
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 7, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 1, throwLength: 5, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 2, throwLength: 6, toPasserIdxAtThrow: 0 },
    ], 4, [1, 0], ['A', 'B'], [[false], [true]], [[true], [true]]) as PatternImpl

    console.log(pattern.prettyPrintThrows())

    assert.equal(pattern.isCrossingPass(pattern.throws[0], 0), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], 0), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], 1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], 1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], 2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], 2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], -1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], -1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], -2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], -2), true)


    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
    assert.equal(pattern.isSelfThrow(pattern.throws[0]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[1]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[2]), true)

    assert.equal(pattern.getThrowHand(pattern.throws[0], -3), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], -3), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[2], -3), Hand.Right)

    assert.equal(pattern.getThrowHand(pattern.throws[0], -2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], -2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], -2), Hand.Right)

    assert.equal(pattern.getThrowHand(pattern.throws[0], -1), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], -1), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[1], -1), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[1], -1), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], -1), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], -1), Hand.Right)

    assert.equal(pattern.getThrowHand(pattern.throws[0], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 0), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 0), Hand.Right)

    assert.equal(pattern.getThrowHand(pattern.throws[0], 1), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 1), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 1), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 1), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 1), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 1), Hand.Left)

    assert.equal(pattern.getThrowHand(pattern.throws[0], 2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 2), Hand.Right)

    assert.equal(pattern.getThrowHand(pattern.throws[0], 3), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 3), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 3), Hand.Left)

    assert.deepEqual(pattern.getStartingHands(), [[2, 1], [2, 1]])

})



Deno.test("hands, 756756", () => {
    // different modeling with even length sideswap: rows do not change, hands flip here (since period mod 4 !=0)
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 7, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 1, throwLength: 5, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 2, throwLength: 6, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: false, throwBeat: 3, throwLength: 7, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: false, throwBeat: 4, throwLength: 5, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 5, throwLength: 6, toPasserIdxAtThrow: 1 },
    ], 4, [0, 1], ['A', 'B'], [[true], [true]], [[false], [false]]) as PatternImpl

    console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    assert.equal(pattern.isCrossingPass(pattern.throws[0], 0), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], 0), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[3], 0), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[4], 0), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], 1), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], 1), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[3], 1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[4], 1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], 2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], 2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[3], 2), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[4], 2), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], -1), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], -1), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[3], -1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[4], -1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], -2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[1], -2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[3], -2), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[4], -2), false)

    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
    assert.equal(pattern.isSelfThrow(pattern.throws[0]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[1]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[2]), true)
    assert.equal(pattern.isSelfThrow(pattern.throws[3]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[4]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[5]), true)



    assert.equal(pattern.getThrowHand(pattern.throws[0], -2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], -2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], -2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], -2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], -2), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], -2), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[3], -2), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[3], -2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[4], -2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[4], -2), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[5], -2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[5], -2), Hand.Left)

    assert.equal(pattern.getThrowHand(pattern.throws[0], -1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], -1), 1 - Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], -1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], -1), 1 - Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], -1), 1 - Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], -1), 1 - Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[3], -1), 1 - Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[3], -1), 1 - Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[4], -1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[4], -1), 1 - Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[5], -1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[5], -1), 1 - Hand.Left)


    assert.equal(pattern.getThrowHand(pattern.throws[0], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 0), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 0), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[3], 0), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[3], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[4], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[4], 0), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[5], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[5], 0), Hand.Left)


    assert.equal(pattern.getThrowHand(pattern.throws[0], 1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 1), 1 - Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 1), 1 - Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 1), 1 - Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 1), 1 - Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[3], 1), 1 - Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[3], 1), 1 - Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[4], 1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[4], 1), 1 - Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[5], 1), 1 - Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[5], 1), 1 - Hand.Left)


    assert.equal(pattern.getThrowHand(pattern.throws[0], 2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 2), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 2), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[3], 2), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[3], 2), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[4], 2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[4], 2), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[5], 2), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[5], 2), Hand.Left)

    assert.deepEqual(pattern.getStartingHands(), [[2, 1], [2, 1]])
})



Deno.test("hands, 7-club two-count straight", () => {
    // modeling flipped passes and B starting left-handed; doing period two to avoid switching rows
    // nothing special needed for hands
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 1, throwLength: 3, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 0, throwLength: 3, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 1, throwLength: 4, toPasserIdxAtThrow: 0 },
    ], 2, [0, 1], ['A', 'B']) as PatternImpl

    console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    for (let i = -3; i < 5; i++) {
        assert.equal(pattern.getThrowHand(pattern.throws[0], i), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[0], i), Hand.Left)
        assert.equal(pattern.getThrowHand(pattern.throws[1], i), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[1], i), Hand.Right)
        assert.equal(pattern.getThrowHand(pattern.throws[2], i), Hand.Left)
        assert.equal(pattern.getTargetHand(pattern.throws[2], i), Hand.Right)
        assert.equal(pattern.getThrowHand(pattern.throws[3], i), Hand.Right)
        assert.equal(pattern.getTargetHand(pattern.throws[3], i), Hand.Left)
    }

    assert.deepEqual(pattern.getStartingHands(), [[2, 2], [1, 2]])
})



Deno.test("hands, 8-club two-count", () => {
    // modeling flipped passes and B starting left-handed; doing period two to avoid switching rows
    // nothing special needed for hands
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtThrow: 0 },
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: false, throwBeat: 1, throwLength: 2, toPasserIdxAtThrow: 0 },
    ], 2, [0, 1], ['A', 'B']) as PatternImpl

    console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    assert.deepEqual(pattern.getStartingHands(), [[2, 2], [2, 2]])
})



Deno.test("hands, 720", () => {
    // checking that 2 and 0 work
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 7, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 1, throwLength: 2, toPasserIdxAtThrow: 1 },
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: false, throwBeat: 2, throwLength: 0, toPasserIdxAtThrow: 0 },
    ], 4, [1, 0], ['A', 'B'], [[false], [true]], [[true], [true]]) as PatternImpl

    console.log(pattern.prettyPrintThrows())

    assert.equal(pattern.isCrossingPass(pattern.throws[0], 0), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], 1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], 2), true)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], -1), false)
    assert.equal(pattern.isCrossingPass(pattern.throws[0], -2), true)


    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
    assert.equal(pattern.isSelfThrow(pattern.throws[0]), false)
    assert.equal(pattern.isSelfThrow(pattern.throws[1]), true)
    assert.equal(pattern.isSelfThrow(pattern.throws[2]), true)

    assert.equal(pattern.getThrowHand(pattern.throws[0], -1), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], -1), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[1], -1), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[1], -1), Hand.Right)
    assert.equal(pattern.getThrowHand(pattern.throws[2], -1), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], -1), Hand.Left)

    assert.equal(pattern.getThrowHand(pattern.throws[0], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 0), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 0), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 0), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 0), Hand.Left)

    assert.equal(pattern.getThrowHand(pattern.throws[0], 1), Hand.Left)
    assert.equal(pattern.getTargetHand(pattern.throws[0], 1), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[1], 1), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[1], 1), Hand.Left)
    assert.equal(pattern.getThrowHand(pattern.throws[2], 1), Hand.Right)
    assert.equal(pattern.getTargetHand(pattern.throws[2], 1), Hand.Right)


    assert.deepEqual(pattern.getStartingHands(), [[2, 0], [1, 0]])

})

//TODO test starting hands of 9 and 699 and 996 and 0 and 2 patterns


function sw(p: number[]): Pattern {
    assert(p.length%2===1, "Pattern must be odd length")
    const ts: Throw[] = []

    function isCrossing(l: number, isA: boolean): boolean {
        if (l === 5) return !isA
        if (l === 7) return isA
        if (l === 9) return !isA
        return l % 4 === 2
    }

    const d = createPattern([{fromPasserIdx:0,toPasserIdxAtThrow:0,fromHand:0,isCrossing:false,throwLength:2,throwBeat:p.length-1}], 4, [1, 0], ['A', 'B'], [[false], [true]], [[true], [true]]) as PatternImpl
    for (let i = 0; i < p.length; i++) {
        const targetPasserNow = (i + p[i]) % 2
        ts.push({ fromPasserIdx: i % 2, fromHand: i % 4 < 2 ? Hand.Right : Hand.Left, isCrossing: isCrossing(p[i], i % 2 === 0), throwBeat: i, throwLength: p[i], toPasserIdxAtThrow: targetPasserNow })
    }

    // swap the hands of the side with the odd number of throws
    const swap = p.length % 4 === 1 ? [[true], [false]] : [[false], [true]]
    const pattern = createPattern(ts, 4, [1, 0], ['A', 'B'], swap, [[true], [true]]) as PatternImpl
    console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
    return pattern
}

Deno.test("starting hands, various siteswaps", () => {
    assert.deepEqual(sw([7, 5, 6]).getStartingHands(), [[2, 1], [2, 1]])
    assert.deepEqual(sw([5, 6, 7]).getStartingHands(), [[2, 2], [1, 1]])
    assert.deepEqual(sw([9, 6, 6]).getStartingHands(), [[2, 2], [2, 1]])
    assert.deepEqual(sw([6, 6, 9]).getStartingHands(), [[3, 1], [2, 1]])
    assert.deepEqual(sw([9, 9, 6]).getStartingHands(), [[2, 2], [2, 2]])
    assert.deepEqual(sw([6, 9, 9]).getStartingHands(), [[3, 1], [2, 2]])
    assert.deepEqual(sw([9, 9, 9]).getStartingHands(), [[3, 2], [2, 2]])
    assert.deepEqual(sw([7,7,7,2,2]).getStartingHands(), [[2, 1], [1, 1]])
    assert.deepEqual(sw([9]).getStartingHands(), [[3, 2], [2, 2]])
    //TODO: assert.deepEqual(sw([6,6]).getStartingHands(), [[3, 2], [2, 2]])

    assert.deepEqual(sw([9,7,2]).getStartingHands(), [[1, 2], [2, 1]])
    assert.deepEqual(sw([7,2,9]).getStartingHands(), [[3, 1], [2, 0]])
    assert.deepEqual(sw([2,9,7]).getStartingHands(), [[2,1], [1,2]])

    assert.deepEqual(sw([7,2,0]).getStartingHands(), [[2, 0], [1, 0]])
    assert.deepEqual(sw([2,0,7]).getStartingHands(), [[1, 1], [0,1]])
    assert.deepEqual(sw([0,7,2]).getStartingHands(), [[0, 1], [2,0]])

})


Deno.test("hands, 10 club brunos", () => {
    function self(from: number, when: number, swapHands: boolean=false): Throw {
        return { fromPasserIdx: from, fromHand: (when%4<2) !==swapHands? Hand.Right:Hand.Left, isCrossing: true, throwBeat: when, throwLength: 6, toPasserIdxAtThrow: from }
    }
    // this requires the weird transition between siteswap sides (with a 7 as a high self) and the unusual handling of straight/crossing passes
    const pattern = createPattern([
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: false, throwBeat: 0, throwLength: 9, toPasserIdxAtThrow: 1 },
        self(0, 2),
        self(0, 4),
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 6, throwLength: 9, toPasserIdxAtThrow: 2 },
        self(0, 8),
        self(0, 10),
        { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: false, throwBeat: 12, throwLength: 9, toPasserIdxAtThrow: 1 },
        self(0, 14),
        self(0, 16),
        { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 18, throwLength: 9, toPasserIdxAtThrow: 2 },
        self(0, 20),

        self(1, 1),
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 3, throwLength: 9, toPasserIdxAtThrow: 0 },
        self(1, 5),
        self(1, 7),
        self(1, 9),
        self(1, 11),
        self(1, 13),
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 15, throwLength: 9, toPasserIdxAtThrow: 0 },
        self(1, 17),
        { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 19, throwLength: 7, toPasserIdxAtThrow: 1 },

        self(2, 1, true),
        self(2, 3, true),
        self(2, 5, true),
        self(2, 7, true),
        { fromPasserIdx: 2, fromHand: Hand.Left, isCrossing: false, throwBeat: 9, throwLength: 9, toPasserIdxAtThrow: 0 },
        self(2, 11, true),
        self(2, 13, true),
        self(2, 15, true),
        self(2, 17, true),
        self(2, 19, true),
    ], 4, [1, 2, 0], ['A', 'B','C'], [[true], [true],[true]], [[false], [false],[false]]) as PatternImpl

    console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
    assert.deepEqual(pattern.getStartingHands(), [[2, 2], [2,1],[1,2]])

})