import { computeBaseAnimations, createAnimationPlan } from "./create-animation-plan.ts";
import { createShapeLayout, GroupPattern } from "./layout.ts";
import { createSyncGroupPattern } from "../parsing/pattern-fromgroup.ts";
import assert from "node:assert";


Deno.test("compute animation plan length", () => {

    const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,3.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = computeBaseAnimations(gp.layout!.animation)

    // check basic internal structures
    assert.equal(baseAnimations.mod, 72);

    assert.equal(baseAnimations.movements[0].passerIdx, 1); // B in the first iteration
    assert.equal(Math.round(10 * baseAnimations.movements[0].onBeat), 39);
    assert.deepEqual(baseAnimations.roles.find(r => r[0] === 0)![1], ['A', 'B', 'C']);

    assert.equal(baseAnimations.movements[1].passerIdx, 0); // B after relabeling, which was A at the beginning
    assert.equal(Math.round(10 * baseAnimations.movements[1].onBeat), 60 + 39);
    assert.deepEqual(baseAnimations.roles.find(r => r[0] === 6)![1], ['B', 'C', 'A']);

    assert.equal(baseAnimations.movements[2].passerIdx, 2);
    assert.equal(Math.round(10 * baseAnimations.movements[2].onBeat), 2 * 60 + 39);
    assert.deepEqual(baseAnimations.roles.find(r => r[0] === 12)![1], ['C', 'A', 'B']);

    assert.equal(baseAnimations.movements[3].passerIdx, 1);
    assert.equal(Math.round(10 * baseAnimations.movements[3].onBeat), 3 * 60 + 39);
    assert.deepEqual(baseAnimations.roles.find(r => r[0] === 18)![1], ['A', 'B', 'C']);

    // now let's try locations
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'A'), [0.5, 0]); // should be at start
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'C'), [0.08, 0.77]); // should be at start
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'B'), baseAnimations.getLocationByRole(3.8, 'B')); // not moving yet
    assertEqualLocation(baseAnimations.getLocationByRole(7, 'C'), [.933, .25]); // B fully moved (and is now C)
    assertEqualLocation(baseAnimations.getLocationByRole(4, 'B'), [0.77, 0.919]); // moved only a bit
    assertEqualLocation(baseAnimations.getLocationByRole(6.8, 'C'), [0.9455, 0.273]); // almost arrived

})

Deno.test("bruno's onecount to check positions", () => {
    const pattern = `A: 3pB 3pC 3pB -- B
B: 3pA 3   3pA -- C
C: 3   3pA 3   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1,1.9)Bmove(B,2.9,1.5)Bmove(C,1.4,1.5)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = computeBaseAnimations(gp.layout!.animation)

    const plan = createAnimationPlan(gp.layout!.animation);



    const shortPasses = plan.passAnimations.filter(p => p.onBeat === 3);



    assertEqualLocation(baseAnimations.getLocationByRole(2, 'B'), [.64, .77])
    assertEqualLocation(baseAnimations.getLocationByRole(2.9, 'B'), [.5, .6])
    assertEqualLocation(baseAnimations.getLocationByRole(3, 'C'), [.46, .56])
    assertEqualLocation(baseAnimations.getLocationByRole(3.1, 'C'), [.425, .526])

    assertEqualLocation(baseAnimations.getLocationByRole(2, 'A'), [0, .8])
    assertEqualLocation(baseAnimations.getLocationByRole(2.9, 'A'), [0, .8])
    assertEqualLocation(baseAnimations.getLocationByRole(3, 'B'), [0, .8])
    assertEqualLocation(baseAnimations.getLocationByRole(3.1, 'B'), [0, .8])
})



Deno.test("weave position computations", () => {
    const pattern = `A: 3pB3 3pC3 3pD3 -- A
B: 3pA3 33   33    -- B
C: 33   3pA3 33    -- C
D: 33  33   3pA3  -- D
positions: Weave(A,B,C,D)
move: move(B,0.5,1.5)move(B,2,2)move(B,4,2)  move(C,0,2)move(C,2.5,1.5)move(C,4,2)  move(D,0,2)move(D,2,2)move(D,4.5,1.5)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = computeBaseAnimations(gp.layout!.animation)

    const plan = createAnimationPlan(gp.layout!.animation);


})





function assertEqualLocation(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? ''} X location mismatch: expected ${expected} but got ${actual}`);
    assert(Math.round(100 * actual[1]) / 100 === Math.round(100 * expected[1]) / 100, `${label ?? ''} Y location mismatch: expected ${expected} but got ${actual}`);
}