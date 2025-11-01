import { createShapeLayout, GroupPattern } from "../layout.ts";
import { createGroupPattern, createSyncGroupPattern } from "../../parsing/pattern-fromgroup.ts";
import assert from "node:assert";
import test from "node:test";
import { Hand } from "@modernpassing/pattern";
import { createFullLocationManager } from "./location-manager.ts";
import { assertEqualLocation } from "../location-test-helpers.ts";
import { createBaseLocationManager, LocationManager } from "./base-location-manager.ts";
import { createPasserIdx, PasserIdx } from "./helpers.ts";


Deno.test("baseLocationMgr for moving feed (V)", () => {

    const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = createBaseLocationManager(gp.layout!.animation)
    assertVLocationManager(baseAnimations);
})

function assertVLocationManager(locationMgr: LocationManager) {

    // check basic internal structures
    assert.equal(locationMgr.mod, 72);

    assert.equal(locationMgr.movements[0].passerIdx, 1); // B in the first iteration
    assert.equal(Math.round(10 * locationMgr.movements[0].onBeat), 49);
    assert.deepEqual(locationMgr.roleMapping.find(r => r[0] === 0)![1], ['A', 'B', 'C']);

    assert.equal(locationMgr.movements[1].passerIdx, 0); // B after relabeling, which was A at the beginning
    assert.equal(Math.round(10 * locationMgr.movements[1].onBeat), 60 + 49);
    assert.deepEqual(locationMgr.roleMapping.find(r => r[0] === 6)![1], ['B', 'C', 'A']);

    assert.equal(locationMgr.movements[2].passerIdx, 2);
    assert.equal(Math.round(10 * locationMgr.movements[2].onBeat), 2 * 60 + 49);
    assert.deepEqual(locationMgr.roleMapping.find(r => r[0] === 12)![1], ['C', 'A', 'B']);

    assert.equal(locationMgr.movements[3].passerIdx, 1);
    assert.equal(Math.round(10 * locationMgr.movements[3].onBeat), 3 * 60 + 49);
    assert.deepEqual(locationMgr.roleMapping.find(r => r[0] === 18)![1], ['A', 'B', 'C']);

    // now let's try locations
    assertEqualLocation(locationMgr.getLocationByRole(0, 'A'), [0.5, 0]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'C'), [0.25, 0.933]); // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, 'C'), [0, 0.53]); // should be at the start again, but this time mid-walk

    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), locationMgr.getLocationByRole(4.8, 'B')); // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, 'C'), [.933, .25]); // B fully moved (and is now C)
    assertEqualLocation(locationMgr.getLocationByRole(5, 'B'), [0.77, 0.919]); // moved only a bit
    assertEqualLocation(locationMgr.getLocationByRole(7.8, 'C'), [0.9455, 0.273]); // almost arrived

}

Deno.test("full locationMgr for moving feed (V) should be the same as base", () => {

    const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const fullLocationMgr = createFullLocationManager(gp.layout!.animation)

    assertVLocationManager(fullLocationMgr);
})


Deno.test("locationMgr for scrambled v", () => {

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SBl z ICl↺ 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // check basic internal structures
    // assert.equal(locationMgr.mod, 96);

    // console.log(locationMgr.fullPatternRoles)
    // console.log(locationMgr.baseLocationManager.basePatternRoles)
    assert.deepEqual(locationMgr.roles, ['A', 'B', 'C', 'M']);

    // console.log(locationMgr.roleMapping);

    // 1/B walks first
    function assertMovement(time: number, passerIdx: PasserIdx, asRole: string) {
        assert(locationMgr._getPasserIdx(time, asRole) === passerIdx, `Expected passerIdx for role ${asRole} at time ${time} to be ${passerIdx}, but got ${locationMgr._getPasserIdx(time, asRole)}`);
        const movementLookupByPasserIdx = locationMgr._getMovement(time, passerIdx);
        assert.ok(movementLookupByPasserIdx, `Expected movement for ${passerIdx} at time ${time} to be defined`);
        assert.equal(locationMgr._getMovementByRole(time, asRole), movementLookupByPasserIdx, `Expected movement lookup by role ${asRole} to match that by passerIdx ${passerIdx}`);
    }

    // original B walks first
    assertMovement(4.9, createPasserIdx(1), 'B');
    // next previous A, now B walks
    assertMovement(4.9+6, createPasserIdx(0), 'B');
    // next previous A, now B walks
    assertMovement(4.9+6*2, createPasserIdx(3), 'B');
    // next previous A, now B walks
    assertMovement(4.9+6*3, createPasserIdx(2), 'B');

    // now let's try locations
    assertEqualLocation(locationMgr.getLocationByRole(0, 'A'), [0.5, 0]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'C'), [0.25, 0.933]); // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, 'C'), [0, 0.53]); // should be at the start again, but this time mid-walk
    assertEqualLocation(locationMgr.getLocationByRole(1+locationMgr.mod, 'C'), [0.08, 0.77]); 
    // let's worry about M's initial position later

    // once M becomes C on beat 5, they teleport to C's old spot
    assert.equal(locationMgr._getPasserIdx(4.9, 'M'), locationMgr._getPasserIdx(5, 'C'));
    assert.equal(locationMgr._getPasserIdx(5, 'C'), createPasserIdx(3));
    assertEqualLocation(locationMgr.getLocationByRole(5, 'C'), [0.25, 0.933]); 
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(5, 'C')); // stay there and come A

    assertEqualLocation(locationMgr.getLocationByRole(1.5+locationMgr.mod, 'C'), [0.17, 0.87]); 


    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), locationMgr.getLocationByRole(3.8, 'B')); // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, 'C'), [.933, .25]); // B fully moved (and is now C)
    assertEqualLocation(locationMgr.getLocationByRole(5, 'B'), [0.77, 0.919]); // moved only a bit
    assertEqualLocation(locationMgr.getLocationByRole(7.8, 'C'), [0.9455, 0.273]); // almost arrived

})


Deno.test("locationMgr for wankel engine (mid-walk swap with manipulator", () => {

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // check basic internal structures
    // assert.equal(locationMgr.mod, 96);

    // console.log(locationMgr.fullPatternRoles)
    // console.log(locationMgr.baseLocationManager.basePatternRoles)
    assert.deepEqual(locationMgr.roles, ['A', 'B', 'C', 'M']);

    // console.log(locationMgr.roleMapping);

    // 1/B walks first
    function assertMovement(time: number, passerIdx: PasserIdx, asRole: string) {
        assert(locationMgr._getPasserIdx(time, asRole) === passerIdx, `Expected passerIdx for role ${asRole} at time ${time} to be ${passerIdx}, but got ${locationMgr._getPasserIdx(time, asRole)}`);
        const movementLookupByPasserIdx = locationMgr._getMovement(time, passerIdx);
        assert.ok(movementLookupByPasserIdx, `Expected movement for ${passerIdx} at time ${time} to be defined`);
        assert.equal(locationMgr._getMovementByRole(time, asRole), movementLookupByPasserIdx, `Expected movement lookup by role ${asRole} to match that by passerIdx ${passerIdx}`);
    }

    const C=createPasserIdx(2), M=createPasserIdx(3);

    // original B walks first
    assertMovement(4.9, createPasserIdx(1), 'B');
    // next previous A, now B walks
    assertMovement(4.9+6, createPasserIdx(0), 'B');
    // next previous A, now B walks
    assertMovement(4.9+6*2, createPasserIdx(3), 'B');
    // next previous A, now B walks
    assertMovement(4.9+6*3, createPasserIdx(2), 'B');

    // now let's try locations
    assertEqualLocation(locationMgr.getLocationByRole(0, 'A'), [0.5, 0]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'C'), [0.25, 0.933]); // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, 'C'), [0, 0.53]); // should be at the start again, but this time mid-walk
    // let's worry about M's initial position later

    // once M becomes C on beat 5, they teleport to C's old spot
    assert.equal(locationMgr._getPasserIdx(0.9, 'M'), locationMgr._getPasserIdx(1, 'C'));
    assert.equal(locationMgr._getPasserIdx(1, 'C'), createPasserIdx(3));
    assert.equal(locationMgr._getPasserIdx(0.9+locationMgr.mod, 'M'), locationMgr._getPasserIdx(1+locationMgr.mod, 'C'));
    assert.equal(locationMgr._getPasserIdx(1+locationMgr.mod, 'C'), createPasserIdx(3));
    // in the first round, C didn't move, so let's just take their final position
    assertEqualLocation(locationMgr.getLocationByRole(1, 'C'), [0.25, 0.933]); 
    // but in other rounds, they just moved/are still moving
    assertEqualLocation(locationMgr.getLocationByRole(1+locationMgr.mod, 'C'), [0.08, 0.77]); 
    // but then they arrive 
    assertEqualLocation(locationMgr.getLocationByRole(5+locationMgr.mod, 'C'), [0.25, 0.933]); 
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(5, 'C')); // stay there and come A

    // when M take's C's role, mid-walk, they should teleport to C's mid-walk position
    assertEqualLocation(locationMgr.getLocationByRole(1, 'M'), [0.25, 0.933]); // first round is special, no walk
    assertEqualLocation(locationMgr.getLocationByRole(1+locationMgr.mod, 'M'), [0.08, 0.77]); 
    // then they move on C's old path toward the final position
    assertEqualLocation(locationMgr._getLocation(1.5+locationMgr.mod, M), [0.17, 0.87]); 
    assertEqualLocation(locationMgr._getLocation(2, M), [0.25, 0.933]); 
    assertEqualLocation(locationMgr._getLocation(2+locationMgr.mod, M), [0.25, 0.933]); 

    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), locationMgr.getLocationByRole(3.8, 'B')); // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, 'C'), [.933, .25]); // B fully moved, (and is now C)
    assertEqualLocation(locationMgr.getLocationByRole(5, 'B'), [0.77, 0.919]); // moved only a bit
    assertEqualLocation(locationMgr.getLocationByRole(7.8, 'C'), [0.9455, 0.273]); // almost arrived

})



