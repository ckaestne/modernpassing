
import assert from "node:assert";
import test from "node:test";
import { applyInterceptCarry, applyManipulations, applyManipulatorThrow, applySubstitution, prettyPrintManipulatorActions, fillPatternGaps } from "./manipulator-processing.ts";
import { AnimationLayout, Hand, Pattern, Throw, ThrowType } from "@modernpassing/pattern";
import { createPatternFromRaw, parseGroupSyncPattern } from "./testutils.ts";
import { createGroupPattern } from "../parsing/parsing.ts";
import { applyManipulatorLayout, getManipulatorPositionAndRotation } from "./manipulator-layout.ts";


Deno.test('test infrastructure', () => {
    const g = createGroupPattern(
        `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: SAB
        positions: Line(A,B)`
        , 2)

    console.log(g.pattern.prettyPrintThrows())
    assert.ok(g.pattern.isValid(), g.pattern.getValidationError())

    // console.log(g.layout)
    const newLayout= applyManipulatorLayout(g.aidenNotation![0], g.aidenNotation![1], g.pattern, g.layout!.animation!)
    console.log(newLayout)


})


Deno.test('manipulator position computations', () => {
    const initial: AnimationLayout = {
        initialPositions: [
            { role: "A", x: 0, y: .5 },
            { role: "B", x: 1, y: .5 },
        ],
        passAnimations: [],
        movementSegments: [],
        movementSequences: [],
        movementTriggers: [],
        relabeling: [],
        speed: 1
    }
    const initialD: AnimationLayout = {
        initialPositions: [
            { role: "A", x: 0, y: 0 },
            { role: "B", x: 1, y: 1 },
        ],
        passAnimations: [],
        movementSegments: [],
        movementSequences: [],
        movementTriggers: [],
        relabeling: [],
        speed: 1
    }


    assert.deepEqual(getManipulatorPositionAndRotation(initial, {
        beat: 0,
        role: "M",
        between: ["A", "B"],
        side: 0.5,
        offset: 0,
        direction: 0
    }),[0.5, 0.5, 0])
    assert.deepEqual(getManipulatorPositionAndRotation(initial, {
        beat: 0,
        role: "M",
        between: ["B", "A"],
        side: 0.5,
        offset: 0,
        direction: 0
    }),[0.5, 0.5, 180])
    assert.deepEqual(getManipulatorPositionAndRotation(initial, {
        beat: 0,
        role: "M",
        between: ["A", "B"],
        side: 0.5,
        offset: 0,
        direction: 90
    }),[0.5, 0.5, 90])
    assert.deepEqual(getManipulatorPositionAndRotation(initial, {
        beat: 0,
        role: "M",
        between: ["A", "B"],
        side: 0,
        offset: 0,
        direction: 0
    }),[1, 0.5, 0])
    assert.deepEqual(getManipulatorPositionAndRotation(initial, {
        beat: 0,
        role: "M",
        between: ["A", "B"],
        side: 0,
        offset: .1,
        direction: 0
    }),[1, 0.6, 0])
    

    assert.deepEqual(getManipulatorPositionAndRotation(initialD, {
        beat: 0,
        role: "M",
        between: ["A", "B"],
        side: 0.5,
        offset: 0,
        direction: 0
    }),[0.5, 0.5, 45])
        

})




