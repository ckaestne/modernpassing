import { createShapeLayout, GroupPattern } from "../layout.ts";
import { createGroupPattern, createSyncGroupPattern } from "../../parsing/pattern-fromgroup.ts";
import assert from "node:assert";
import test from "node:test";
import { Hand } from "@modernpassing/pattern";
import { createBaseLocationManager } from "./location-manager.ts";
import { assertEqualLocation } from "../location-test-helpers.ts";

Deno.test("locationMgr for moving feed (V)", () => {

    const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,3.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = createBaseLocationManager(gp.layout!.animation)

    // check basic internal structures
    assert.equal(baseAnimations.mod, 72);

    assert.equal(baseAnimations.movements[0].passerIdx, 1); // B in the first iteration
    assert.equal(Math.round(10 * baseAnimations.movements[0].onBeat), 39);
    assert.deepEqual(baseAnimations.basePatternRoles.find(r => r[0] === 0)![1], ['A', 'B', 'C']);

    assert.equal(baseAnimations.movements[1].passerIdx, 0); // B after relabeling, which was A at the beginning
    assert.equal(Math.round(10 * baseAnimations.movements[1].onBeat), 60 + 39);
    assert.deepEqual(baseAnimations.basePatternRoles.find(r => r[0] === 6)![1], ['B', 'C', 'A']);

    assert.equal(baseAnimations.movements[2].passerIdx, 2);
    assert.equal(Math.round(10 * baseAnimations.movements[2].onBeat), 2 * 60 + 39);
    assert.deepEqual(baseAnimations.basePatternRoles.find(r => r[0] === 12)![1], ['C', 'A', 'B']);

    assert.equal(baseAnimations.movements[3].passerIdx, 1);
    assert.equal(Math.round(10 * baseAnimations.movements[3].onBeat), 3 * 60 + 39);
    assert.deepEqual(baseAnimations.basePatternRoles.find(r => r[0] === 18)![1], ['A', 'B', 'C']);

    // now let's try locations
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'A'), [0.5, 0]); // should be at start
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'C'), [0.08, 0.77]); // should be at start
    assertEqualLocation(baseAnimations.getLocationByRole(0, 'B'), baseAnimations.getLocationByRole(3.8, 'B')); // not moving yet
    assertEqualLocation(baseAnimations.getLocationByRole(7, 'C'), [.933, .25]); // B fully moved (and is now C)
    assertEqualLocation(baseAnimations.getLocationByRole(4, 'B'), [0.77, 0.919]); // moved only a bit
    assertEqualLocation(baseAnimations.getLocationByRole(6.8, 'C'), [0.9455, 0.273]); // almost arrived

})
