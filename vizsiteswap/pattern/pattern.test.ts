import assert from "node:assert"
import { createPattern, createThrow, Hand } from "./pattern.ts"

Deno.test("prefix throws", () => {
    const t = [
        createThrow(-1, 0, false, false, 0, 3),
        createThrow(0, 0, false, false, 1, 3),
        createThrow(0, 1, false, false, 0, 3),
        createThrow(1, 0, false, false, 0, 3),
        createThrow(1, 1, false, false, 1, 3),
    ]
    const p = createPattern(t, 2, [0, 1], ["A", "B"])

    // console.log(p.prettyPrintThrows())

    assert.ok(p.isValid(), p.getValidationError())
    assert.deepEqual(p.getStartingHands(), [[1, 2], [2, 1]])
})

Deno.test("invalid prefix throws: to a hand already receiving a throw", () => {
    const t = [
        createThrow(-1, 0, false, false, 0, 4), //should land where the pass lands
        createThrow(0, 0, false, false, 1, 3),
        createThrow(0, 1, false, false, 0, 3),
        createThrow(1, 0, false, false, 0, 3),
        createThrow(1, 1, false, false, 1, 3),
    ]
    const p = createPattern(t, 2, [0, 1], ["A", "B"])

    assert.ok(!p.isValid())
    assert.equal(p.iterationsUntilRepeat(), 1)
})

Deno.test("invalid prefix throws: to a hand not throwing on that beat", () => {
    const t = [
        createThrow(-1, 0, false, true, 0, 3), //should land on the wrong hand that is not throwing on that beat
        createThrow(0, 0, false, false, 1, 3),
        createThrow(0, 1, false, false, 0, 3),
        createThrow(1, 0, false, false, 0, 3),
        createThrow(1, 1, false, false, 1, 3),
    ]
    const p = createPattern(t, 2, [0, 1], ["A", "B"])

    assert.ok(!p.isValid())
})
