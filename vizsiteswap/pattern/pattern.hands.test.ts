import assert from "node:assert"
import { PatternImpl } from "./pattern-impl.ts"
import { test } from "node:test"
import { createFourHandedPattern, createPattern, createThrow, createTwoHandedPattern, Hand, Pattern, Throw } from "./pattern.ts"

test("global hand order - basic alternating pattern (sync, length 1)", () => {
    const throws = [
        createThrow(0, 0, false, false, 1, 3), // fromOppositeHand=false, flipCrossing=false
        createThrow(0, 1, false, false, 0, 3),
    ]

    const pattern = createTwoHandedPattern(throws, [0, 1], ["A", "B"])

    for (const iteration of [0, 1, 2, -1, -2]) {
        const expectedHand = iteration % 2 === 0 ? Hand.Right : Hand.Left
        assert.equal(pattern.getGlobalHand(0, iteration), expectedHand)
        assert.equal(pattern.getThrowHand(throws[0], iteration), expectedHand)
        assert.equal(pattern.getThrowHand(throws[1], iteration), expectedHand)
        // all throws are selfs, so they arrive to the opposite hand
        assert.equal(pattern.getTargetHand(throws[0], iteration), 1 - expectedHand)
        assert.equal(pattern.getTargetHand(throws[1], iteration), 1 - expectedHand)
    }
})

test("global hand order - four handed pattern 756", () => {
    // let's to 756
    const throws = [
        createThrow(0, 0, false, false, 0, 7),
        createThrow(1, 1, false, false, 0, 5),
        createThrow(2, 0, false, false, 1, 6),
    ]

    const pattern = createFourHandedPattern(throws, [1, 0], ["A", "B"], 3)

    assert.equal(pattern.getGlobalHand(0, 0), Hand.Right)
    assert.equal(pattern.getGlobalHand(0, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(0, 2), Hand.Left)

    assert.equal(pattern.getGlobalHand(1, 0), Hand.Left)
    assert.equal(pattern.getGlobalHand(1, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(1, 2), Hand.Right)

    for (const offset of [0, 4, 8, -4, -8]) {
        assert.equal(pattern.getThrowHand(throws[0], 0 + offset), Hand.Right)
        assert.equal(pattern.getTargetHand(throws[0], 0 + offset), Hand.Left) //straight pass
        assert.equal(pattern.getThrowHand(throws[1], 0 + offset), Hand.Right)
        assert.equal(pattern.getTargetHand(throws[1], 0 + offset), Hand.Left) //straight zap
        assert.equal(pattern.getThrowHand(throws[2], 0 + offset), Hand.Left)
        assert.equal(pattern.getTargetHand(throws[2], 0 + offset), Hand.Right) //crossing self
        assert.equal(pattern.getThrowHand(throws[0], 1 + offset), Hand.Left)
        assert.equal(pattern.getTargetHand(throws[0], 1 + offset), Hand.Left) //crossing pass
        assert.equal(pattern.getThrowHand(throws[1], 1 + offset), Hand.Right)
        assert.equal(pattern.getTargetHand(throws[1], 1 + offset), Hand.Right) //crossing zap
        assert.equal(pattern.getThrowHand(throws[2], 1 + offset), Hand.Right)
        assert.equal(pattern.getTargetHand(throws[2], 1 + offset), Hand.Left) //crossing self
        for (const o of [0, 1]) {
            for (const tidx of [0, 1, 2]) {
                assert.equal(pattern.getThrowHand(throws[tidx], 2 + o + offset), 1 - pattern.getThrowHand(throws[tidx], 0 + o + offset))
                assert.equal(pattern.getTargetHand(throws[tidx], 2 + o + offset), 1 - pattern.getTargetHand(throws[tidx], 0 + o + offset))
            }
        }
    }
})

test("global hand order - test offset handling -1", () => {
    // the pattern is invalid, but that shouldn't matter
    const throws = [
        createThrow(0, 0, false, false, 0, 7),
        createThrow(1, 1, false, false, 0, 5),
        createThrow(2, 0, false, false, 1, 6),
    ]
    const pattern = createFourHandedPattern(throws, [1, 0], ["A", "B"], 3, -1)

    assert.equal(pattern.getGlobalHand(0, 0), Hand.Right)
    assert.equal(pattern.getGlobalHand(0, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(0, 2), Hand.Left)

    // with -1 we go back one step in the hand order and start with left, left

    assert.equal(pattern.getGlobalHand(1, 0), Hand.Left)
    assert.equal(pattern.getGlobalHand(1, 1), Hand.Left)
    assert.equal(pattern.getGlobalHand(1, 2), Hand.Right)

    assert.equal(pattern.getGlobalHand(2, 0), Hand.Right)
    assert.equal(pattern.getGlobalHand(2, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(2, 2), Hand.Left)

    assert.equal(pattern.iterationsUntilRepeat(), 2)
})

test("global hand order - test offset handling 1", () => {
    // the pattern is invalid, but that shouldn't matter
    const throws = [
        createThrow(0, 0, false, false, 0, 7),
        createThrow(1, 1, false, false, 0, 5),
        createThrow(2, 0, false, false, 1, 6),
    ]
    const pattern = createFourHandedPattern(throws, [0, 1], ["A", "B"], 3, 1)

    assert.equal(pattern.getGlobalHand(0, 0), Hand.Right)
    assert.equal(pattern.getGlobalHand(0, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(0, 2), Hand.Left)

    // with offset 1, we go forward 1 in the hand order, so skip the second left, starting over with right

    assert.equal(pattern.getGlobalHand(1, 0), Hand.Right)
    assert.equal(pattern.getGlobalHand(1, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(1, 2), Hand.Left)

    assert.equal(pattern.getGlobalHand(2, 0), Hand.Right)
    assert.equal(pattern.getGlobalHand(2, 1), Hand.Right)
    assert.equal(pattern.getGlobalHand(2, 2), Hand.Left)

    assert.equal(pattern.iterationsUntilRepeat(), 1)
})

test("global hand order offset -- throw and target hands", () => {
    // the offset should affect the throw hand, but the target hand must be computed with the original hand-order after the throw not affected by the offset
    let t1: Throw, t2: Throw, t3: Throw
    const throws = [
        t1 = createThrow(0, 0, false, false, 0, 3),
        t2 = createThrow(1, 1, false, false, 0, 3),
        t3 = createThrow(2, 0, false, false, 1, 3),
    ]
    const pattern = createTwoHandedPattern(throws, [1, 0], ["A", "B"], 3, 0, 1)

    for (const iteration of [0, 1, 2, -1, -2]) {
        assert.equal(pattern.getThrowHand(t1, iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(t1, iteration), Hand.Left)

        assert.equal(pattern.getThrowHand(t2, iteration), Hand.Left)
        assert.equal(pattern.getTargetHand(t2, iteration), Hand.Right)

        assert.equal(pattern.getThrowHand(t3, iteration), Hand.Right)
        assert.equal(pattern.getTargetHand(t3, iteration), Hand.Left)
    }

    assert.equal(pattern.iterationsUntilRepeat(), 2)
})

test("global hand order offset -- seven club two count straight", () => {
    // the offset should affect the throw hand, but the target hand must be computed with the original hand-order after the throw not affected by the offset
    let t1: Throw, t2: Throw
    const throws = [
        t1 = createThrow(0, 0, false, true, 1, 4),
        t2 = createThrow(0, 1, true, false, 0, 3),
    ]
    const pattern = createTwoHandedPattern(throws, [1, 0], ["A", "B"], 1, 0, 1)

    for (const iteration of [0, 1, 2, -1, -2]) {
        assert.equal(pattern.getThrowHand(t1, iteration), Hand.Right, "iteration " + iteration)
        assert.equal(pattern.getTargetHand(t1, iteration), Hand.Left, "iteration " + iteration)

        assert.equal(pattern.getThrowHand(t2, iteration), Hand.Left, "iteration " + iteration)
        assert.equal(pattern.getTargetHand(t2, iteration), Hand.Right, "iteration " + iteration)
    }
    // console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    assert.equal(pattern.iterationsUntilRepeat(), 2)
})

Deno.test("hands, four count", () => {
    const pattern = createTwoHandedPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 3, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 3, throwLength: 3, toPasserIdxAtCausal: 1 },
        ],
        [0, 1],
        ["A", "B"],
    )
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
    assert.equal(pattern.iterationsUntilRepeat(), 1)
})

Deno.test("hands, three count", () => {
    const pattern = createPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 3, toPasserIdxAtCausal: 0 },
        ],
        2,
        [0, 1],
        ["A", "B"],
    )

    // console.log(pattern.prettyPrintThrows())
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
    assert.equal(pattern.iterationsUntilRepeat(), 2)
})

Deno.test("hands, 756", () => {
    const pattern = createFourHandedPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 7, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 5, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 6, toPasserIdxAtCausal: 1 },
        ],
        [1, 0],
        ["A", "B"],
    ) as PatternImpl

    // console.log(pattern.prettyPrintThrows())

    assert.equal(pattern.isStraightPass(pattern.throws[0], 0), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], 0), true)
    assert.equal(pattern.isStraightPass(pattern.throws[0], 1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[1], 1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], 2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], 2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[0], -1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[1], -1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], -2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], -2), true)

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
    assert.equal(pattern.iterationsUntilRepeat(), 4)
})

Deno.test("hands, 756756", () => {
    // different modeling with even length sideswap: rows do not change, hands flip here (since period mod 4 !=0)
    const pattern = createPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 7, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 5, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 6, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 3, throwLength: 7, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 4, throwLength: 5, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 5, throwLength: 6, toPasserIdxAtCausal: 1 },
        ],
        4,
        [0, 1],
        ["A", "B"],
    ) as PatternImpl

    // console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    assert.equal(pattern.isStraightPass(pattern.throws[0], 0), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], 0), true)
    assert.equal(pattern.isStraightPass(pattern.throws[3], 0), false)
    assert.equal(pattern.isStraightPass(pattern.throws[4], 0), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], 1), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], 1), true)
    assert.equal(pattern.isStraightPass(pattern.throws[3], 1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[4], 1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], 2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], 2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[3], 2), false)
    assert.equal(pattern.isStraightPass(pattern.throws[4], 2), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], -1), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], -1), true)
    assert.equal(pattern.isStraightPass(pattern.throws[3], -1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[4], -1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], -2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[1], -2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[3], -2), false)
    assert.equal(pattern.isStraightPass(pattern.throws[4], -2), false)

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

    assert.equal(pattern.iterationsUntilRepeat(), 2)
})

Deno.test("hands, 7-club two-count straight", () => {
    // modeling flipped passes and B starting left-handed; doing period two to avoid switching rows
    // nothing special needed for hands
    const pattern = createPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 3, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: true, flipCrossing: false, throwBeat: 0, throwLength: 3, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 1, fromOppositeHand: true, flipCrossing: true, throwBeat: 1, throwLength: 4, toPasserIdxAtCausal: 0 },
        ],
        2,
        [0, 1],
        ["A", "B"],
    ) as PatternImpl

    // console.log(pattern.prettyPrintThrows())
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
    assert.equal(pattern.iterationsUntilRepeat(), 1)
})

Deno.test("hands, 8-club two-count", () => {
    // modeling flipped passes and B starting left-handed; doing period two to avoid switching rows
    // nothing special needed for hands
    const pattern = createPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtCausal: 1 },
            { fromPasserIdx: 0, fromOppositeHand: true, flipCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: true, flipCrossing: true, throwBeat: 0, throwLength: 4, toPasserIdxAtCausal: 1 },
        ],
        2,
        [0, 1],
        ["A", "B"],
        undefined,
        2,
    ) as PatternImpl

    // console.log(pattern.prettyPrintThrows())
    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())

    assert.deepEqual(pattern.getStartingHands(), [[2, 2], [2, 2]])
    assert.equal(pattern.iterationsUntilRepeat(), 1)
})

Deno.test("hands, 720", () => {
    // checking that 2 and 0 work
    const pattern = createPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 7, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 2, toPasserIdxAtCausal: 0 },
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 0, toPasserIdxAtCausal: 1 },
        ],
        4,
        [1, 0],
        ["A", "B"],
    ) as PatternImpl

    // console.log(pattern.prettyPrintThrows())

    assert.equal(pattern.isStraightPass(pattern.throws[0], 0), true)
    assert.equal(pattern.isStraightPass(pattern.throws[0], 1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], 2), true)
    assert.equal(pattern.isStraightPass(pattern.throws[0], -1), false)
    assert.equal(pattern.isStraightPass(pattern.throws[0], -2), true)

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
    assert.equal(pattern.iterationsUntilRepeat(), 4)
})

// //TODO test starting hands of 9 and 699 and 996 and 0 and 2 patterns

function sw(p: number[]): Pattern {
    assert(p.length % 2 === 1, "Pattern must be odd length")
    const ts: Throw[] = []

    function isCrossing(l: number, isA: boolean): boolean {
        if (l === 5) return !isA
        if (l === 7) return isA
        if (l === 9) return !isA
        return l % 4 === 2
    }

    // const d = createPattern([{fromPasserIdx:0,toPasserIdxAtCausal:0,fromHand:0,isCrossing:false,throwLength:2,throwBeat:p.length-1}], 4, [1, 0], ['A', 'B'], [[false], [true]], [[true], [true]]) as PatternImpl
    for (let i = 0; i < p.length; i++) {
        const causalTime = i + p[i] - 4
        const targetPasserNow = (i + p[i] + Math.floor(causalTime / p.length)) % 2
        ts.push({ fromPasserIdx: i % 2, fromOppositeHand: false, flipCrossing: false, throwBeat: i, throwLength: p[i], toPasserIdxAtCausal: targetPasserNow })
    }

    // swap the hands of the side with the odd number of throws
    const pattern = createPattern(ts, 4, [1, 0], ["A", "B"]) as PatternImpl
    // console.log(pattern.prettyPrintThrows())
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
    assert.deepEqual(sw([7, 7, 7, 2, 2]).getStartingHands(), [[2, 1], [1, 1]])
    assert.deepEqual(sw([9]).getStartingHands(), [[3, 2], [2, 2]])

    assert.deepEqual(sw([9, 7, 2]).getStartingHands(), [[1, 2], [2, 1]])
    assert.deepEqual(sw([7, 2, 9]).getStartingHands(), [[3, 1], [2, 0]])
    assert.deepEqual(sw([2, 9, 7]).getStartingHands(), [[2, 1], [1, 2]])

    assert.deepEqual(sw([7, 2, 0]).getStartingHands(), [[2, 0], [1, 0]])
    assert.deepEqual(sw([2, 0, 7]).getStartingHands(), [[1, 1], [0, 1]])
    assert.deepEqual(sw([0, 7, 2]).getStartingHands(), [[0, 1], [2, 0]])
})

Deno.test("hands, 10 club brunos", () => {
    function self(from: number, when: number, swapHands: boolean = false): Throw {
        return { fromPasserIdx: from, fromOppositeHand: swapHands, flipCrossing: false, throwBeat: when, throwLength: 6, toPasserIdxAtCausal: (from + (when + 2 > 20 ? 1 : 0)) % 3 }
    }
    // this requires the weird transition between siteswap sides (with a 7 as a high self) and the unusual handling of straight/crossing passes
    let lastself: Throw
    const pattern = createPattern(
        [
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 9, toPasserIdxAtCausal: 1 },
            self(0, 2),
            self(0, 4),
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: true, throwBeat: 6, throwLength: 9, toPasserIdxAtCausal: 2 },
            self(0, 8),
            self(0, 10),
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 12, throwLength: 9, toPasserIdxAtCausal: 1 },
            self(0, 14),
            self(0, 16),
            { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: true, throwBeat: 18, throwLength: 9, toPasserIdxAtCausal: 0 },
            self(0, 20),

            self(1, 1),
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 3, throwLength: 9, toPasserIdxAtCausal: 0 },
            self(1, 5),
            self(1, 7),
            self(1, 9),
            self(1, 11),
            self(1, 13),
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 15, throwLength: 9, toPasserIdxAtCausal: 0 },
            self(1, 17),
            { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: true, throwBeat: 19, throwLength: 7, toPasserIdxAtCausal: 2 },

            self(2, 1, true),
            self(2, 3, true),
            self(2, 5, true),
            self(2, 7, true),
            { fromPasserIdx: 2, fromOppositeHand: true, flipCrossing: true, throwBeat: 9, throwLength: 9, toPasserIdxAtCausal: 0 },
            self(2, 11, true),
            self(2, 13, true),
            self(2, 15, true),
            self(2, 17, true),
            lastself = self(2, 19, true), // ** this one is problematic. thrown from the right hand (opposite hand), we'd expect it to arrive on the left hand. however, since the offset manipulates the hand order, the default hand on the arrival beat is a left, so with opposite this would arrive right. unclear whether the right thing is to model this as a non-crossing throw, or determine the arrival hand by the hand order without considering the offset? does this work when it wraps around twice?
        ],
        4,
        [1, 2, 0],
        ["A", "B", "C"],
        undefined,
        undefined,
        1,
    ) as PatternImpl

    // console.log(pattern.prettyPrintThrows())

    // console.log(pattern.getTargetHand(lastself, 0))
    // console.log(pattern.getTargetHandFirstIteration(lastself))

    assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
    assert.deepEqual(pattern.getStartingHands(), [[2, 2], [2, 1], [1, 2]])
    assert.equal(pattern.iterationsUntilRepeat(), 6)
})

// Deno.test.ignore("**broken:** pattern validation with crossingMapping", () => {
//     /*
//     A: 7B 6 7Cx 827Cx -- B
//     B: , a67A67 -- C⇆X
//     C: !, 66a67Ax -- A
//     */

//     function self(from: number, when: number, swapHands: boolean = false): Throw {
//         return { fromPasserIdx: from, fromHand: (when % 4 < 2) !== swapHands ? Hand.Right : Hand.Left, isCrossing: true, throwBeat: when, throwLength: 6, toPasserIdxAtCausal: (from + (when + 2 > 20 ? 1 : 0)) % 3 }
//     }
//     // this requires the weird transition between siteswap sides (with a 7 as a high self) and the unusual handling of straight/crossing passes
//     const pattern = createPattern([
//         { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 0, throwLength: 7, toPasserIdxAtCausal: 1 },
//         { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: true, throwBeat: 2, throwLength: 6, toPasserIdxAtCausal: 0 },
//         { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: false, throwBeat: 4, throwLength: 7, toPasserIdxAtCausal: 2 },
//         { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: false, throwBeat: 6, throwLength: 8, toPasserIdxAtCausal: 0 },
//         { fromPasserIdx: 0, fromHand: Hand.Right, isCrossing: true, throwBeat: 8, throwLength: 2, toPasserIdxAtCausal: 0 },
//         { fromPasserIdx: 0, fromHand: Hand.Left, isCrossing: false, throwBeat: 10, throwLength: 7, toPasserIdxAtCausal: 0 /*C*/ },

//         { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: true, throwBeat: 1, throwLength: 10, toPasserIdxAtCausal: 1 },
//         { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 3, throwLength: 6, toPasserIdxAtCausal: 1 },
//         { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: false, throwBeat: 5, throwLength: 7, toPasserIdxAtCausal: 0 },
//         { fromPasserIdx: 1, fromHand: Hand.Left, isCrossing: true, throwBeat: 7, throwLength: 6, toPasserIdxAtCausal: 1 },
//         { fromPasserIdx: 1, fromHand: Hand.Right, isCrossing: false, throwBeat: 9, throwLength: 7, toPasserIdxAtCausal: 2 /*B*/ },

//         { fromPasserIdx: 2, fromHand: Hand.Left, isCrossing: true, throwBeat: 1, throwLength: 6, toPasserIdxAtCausal: 2 },
//         { fromPasserIdx: 2, fromHand: Hand.Right, isCrossing: true, throwBeat: 3, throwLength: 6, toPasserIdxAtCausal: 2 },
//         { fromPasserIdx: 2, fromHand: Hand.Left, isCrossing: true, throwBeat: 5, throwLength: 10, toPasserIdxAtCausal: 0 /*C*/ },
//         { fromPasserIdx: 2, fromHand: Hand.Right, isCrossing: true, throwBeat: 7, throwLength: 6, toPasserIdxAtCausal: 2 },
//         { fromPasserIdx: 2, fromHand: Hand.Left, isCrossing: true, throwBeat: 9, throwLength: 7, toPasserIdxAtCausal: 1 /*A*/ },
//     ], 4, [1, 2, 0], ['A', 'B', 'C'], [[false], [true], [false]], [[false], [false], [false]]) as PatternImpl

//     console.log(pattern.prettyPrintThrows())
//     assert.ok(pattern.isValid(), "Pattern invalid: " + pattern.getValidationError())
//     assert.deepEqual(pattern.getStartingHands(), [[2, 2], [2, 1], [1, 2]])
//     assert.equal(pattern.iterationsUntilRepeat(), 6)

// })

Deno.test("hand sequence modeling for siteswap takeout in manage", () => {
    const intercepted7FromA = { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 0, throwLength: 7, toPasserIdxAtCausal: 2 } //intercepted
    const carried7FromB = { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 3, throwLength: 7, toPasserIdxAtCausal: 0 } //carry
    const firstHeffFromM = { fromPasserIdx: 2, fromOppositeHand: false, flipCrossing: false, throwBeat: 7, throwLength: 8, toPasserIdxAtCausal: 0 }
    const t = [
        intercepted7FromA,
        { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 2, throwLength: 6, toPasserIdxAtCausal: 0 },
        { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 4, throwLength: 8, toPasserIdxAtCausal: 0 },
        { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 6, throwLength: 7, toPasserIdxAtCausal: 0 },
        { fromPasserIdx: 0, fromOppositeHand: false, flipCrossing: false, throwBeat: 8, throwLength: 6, toPasserIdxAtCausal: 1 },

        { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 8, toPasserIdxAtCausal: 2 },
        carried7FromB,
        { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 5, throwLength: 4, toPasserIdxAtCausal: 1 }, //fill
        { fromPasserIdx: 1, fromOppositeHand: false, flipCrossing: false, throwBeat: 7, throwLength: 0, toPasserIdxAtCausal: 1 }, //fill

        { fromPasserIdx: 2, fromOppositeHand: false, flipCrossing: false, throwBeat: 1, throwLength: 1, toPasserIdxAtCausal: 1 }, //fill
        { fromPasserIdx: 2, fromOppositeHand: false, flipCrossing: false, throwBeat: 3, throwLength: 2, toPasserIdxAtCausal: 2 }, //fill
        { fromPasserIdx: 2, fromOppositeHand: false, flipCrossing: false, throwBeat: 5, throwLength: 6, toPasserIdxAtCausal: 2 },
        firstHeffFromM,
    ]
    // Use 4-handed globalHandOrder: [Right, Right, Left, Left]
    const p = createPattern(t, 4, [1, 2, 0], ["A", "B", "M"], [Hand.Right, Hand.Right, Hand.Left, Hand.Left]) as PatternImpl

    // console.log(p.iterationsUntilRepeat())
    // console.log(p.prettyPrintThrows())

    // console.log(p.throws[5])
    // console.log(p.getThrowHand(p.throws[5], 0))
    // console.log(p.getTargetHand(p.throws[5], 0))
    // console.log(p.getThrowHand(p.throws[5], 1))
    // console.log(p.getTargetHand(p.throws[5], 1))
    // console.log(p.getTargetHandFirstIteration(p.throws[5]))

    const handStartSequenceA = [Hand.Right, Hand.Right, Hand.Left, Hand.Left]
    const handStartSequenceBM = [Hand.Right, Hand.Left, Hand.Left, Hand.Right]
    const crossingSequenceA = [false, true]
    const crossingSequenceBM = [true, false]

    for (let iteration = 0; iteration < 25; iteration++) {
        assert.equal(
            p.getThrowHand(intercepted7FromA, iteration),
            handStartSequenceA[iteration % handStartSequenceA.length],
            `Intercepted pass thrown from hand ${p.getThrowHand(intercepted7FromA, iteration)} in iteration ${iteration}, expected ${handStartSequenceA[iteration % handStartSequenceA.length]}`,
        )
        // the carry is from the opposite of the starting hand
        assert.equal(
            p.getThrowHand(carried7FromB, iteration),
            1 - handStartSequenceBM[iteration % handStartSequenceBM.length],
            `Carried pass thrown from hand ${p.getThrowHand(carried7FromB, iteration)} in iteration ${iteration}, expected ${1 - handStartSequenceBM[iteration % handStartSequenceBM.length]}`,
        )
        // M should start the same side as B
        assert.equal(p.getThrowHand(firstHeffFromM, iteration), p.getThrowHand(carried7FromB, iteration), `First heff from M thrown from hand ${p.getThrowHand(firstHeffFromM, iteration)} in iteration ${iteration}, expected ${p.getThrowHand(carried7FromB, iteration)}`)

        assert.equal(
            p.isStraightPass(intercepted7FromA, iteration),
            !crossingSequenceA[iteration % crossingSequenceA.length],
            `Intercepted pass crossing status in iteration ${iteration} is ${p.isStraightPass(intercepted7FromA, iteration)}, expected ${!crossingSequenceA[iteration % crossingSequenceA.length]}`,
        )
        assert.equal(
            p.isStraightPass(carried7FromB, iteration),
            !crossingSequenceBM[iteration % crossingSequenceBM.length],
            `Carried pass crossing status in iteration ${iteration} is ${p.isStraightPass(carried7FromB, iteration)}, expected ${!crossingSequenceBM[iteration % crossingSequenceBM.length]}`,
        )
    }

    assert.ok(p.isValid(), p.getValidationError())
})
