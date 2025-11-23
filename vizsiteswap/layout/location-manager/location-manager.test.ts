import { createShapeLayout, GroupPattern } from "../layout.ts";
import { createGroupPattern, createSyncGroupPattern } from "../../parsing/pattern-fromgroup.ts";
import assert from "node:assert";
import test from "node:test";
import { Hand } from "@modernpassing/pattern";
import { createFullLocationManager } from "./location-manager.ts";
import { assertEqualLocation, assertLocationBetween } from "../location-test-helpers.ts";
import { createBaseLocationManager, LocationManager } from "./base-location-manager.ts";
import { createPasserIdx, PasserIdx } from "./helpers.ts";
import { MovementTracker, UnresolvedMovementSegment } from "./relative-movement.ts";
import { Svg } from "@svgdotjs/svg.js";
import { createSVG } from "@modernpassing/svg-utils";


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

function hasMovement(locationMgr: LocationManager, time: number, passerId: number): boolean {
    return locationMgr.movementTracker.movements.some(m => m.onBeat === time && m.passerIdx === passerId);
}

function assertVLocationManager(locationMgr: LocationManager) {

    // check basic internal structures
    assert.equal(locationMgr.mod, 72);

    assert.ok(hasMovement(locationMgr, 4.9, 1)); // B in the first iteration
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find(r => r[0] === 0)![1], ['A', 'B', 'C']);

    assert.ok(hasMovement(locationMgr, 4.9 + 6, 0)); // B after relabeling, which was A at the beginning
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find(r => r[0] === 6)![1], ['B', 'C', 'A']);

    assert.ok(hasMovement(locationMgr, 4.9 + 12, 2));
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find(r => r[0] === 12)![1], ['C', 'A', 'B']);

    assert.ok(hasMovement(locationMgr, 4.9 + 18, 1));
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find(r => r[0] === 18)![1], ['A', 'B', 'C']);

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
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // check basic internal structures
    // assert.equal(locationMgr.mod, 96);

    // console.log(locationMgr.fullPatternRoles)
    // console.log(locationMgr.baseLocationManager.basePatternRoles)
    assert.deepEqual(locationMgr.roleTracker.roles, ['A', 'B', 'C', 'M']);

    // console.log(locationMgr.roleMapping);

    // 1/B walks first
    function assertMovement(time: number, passerIdx: PasserIdx, asRole: string) {
        assert(locationMgr.roleTracker._getPasserIdx(time, asRole) === passerIdx, `Expected passerIdx for role ${asRole} at time ${time} to be ${passerIdx}, but got ${locationMgr.roleTracker._getPasserIdx(time, asRole)}`);
        const movementLookupByPasserIdx = locationMgr.movementTracker.movements.find(m => m.onBeat === time && m.passerIdx === passerIdx);
        assert.ok(movementLookupByPasserIdx, `Expected movement for ${passerIdx} at time ${time} to be defined`);
        // assert.equal(locationMgr._getMovementByRole(time, asRole), movementLookupByPasserIdx, `Expected movement lookup by role ${asRole} to match that by passerIdx ${passerIdx}`);
    }

    // original B walks first
    assertMovement(4.9, createPasserIdx(1), 'B');
    // next previous A, now B walks
    assertMovement(4.9 + 6, createPasserIdx(0), 'B');
    // next previous A, now B walks
    assertMovement(4.9 + 6 * 2, createPasserIdx(3), 'B');
    // next previous A, now B walks
    assertMovement(4.9 + 6 * 3, createPasserIdx(2), 'B');

    // now let's try locations
    const initialC: [number, number] = [0.25, 0.933]
    const initialA: [number, number] = [0.5, 0];
    assertEqualLocation(locationMgr.getLocationByRole(0, 'A'), initialA); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'C'), initialC); // should be at start, skipping the initial mid-walk start
    // in the second round, C is still moving for the first few beats
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, 'C'), [0, 0.53]); // should be at the start again, but this time mid-walk
    assertEqualLocation(locationMgr.getLocationByRole(1 + locationMgr.mod, 'C'), [0.08, 0.77]);
    assertEqualLocation(locationMgr.getLocationByRole(1.5 + locationMgr.mod, 'C'), [0.17, 0.87]);

    // B is moving, not affected by manipulation
    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), locationMgr.getLocationByRole(3.8, 'B')); // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, 'C'), [.933, .25]); // B fully moved (and is now C)
    assertEqualLocation(locationMgr.getLocationByRole(5, 'B'), [0.77, 0.919]); // moved only a bit
    assertEqualLocation(locationMgr.getLocationByRole(7.8, 'C'), [0.9455, 0.273]); // almost arrived


    // once M becomes C on beat 5, they move to C's old spot for 1 beat
    assert.equal(locationMgr.roleTracker._getPasserIdx(4.9, 'M'), locationMgr.roleTracker._getPasserIdx(5, 'C')); // relabel, nothing else changes
    assert.equal(locationMgr.roleTracker._getPasserIdx(4.9, 'C'), locationMgr.roleTracker._getPasserIdx(5, 'M')); // relabel, nothing else changes
    assert.equal(locationMgr.roleTracker._getPasserIdx(5, 'C'), createPasserIdx(3)); // former M is now C
    assert.equal(locationMgr.roleTracker._getPasserIdx(6, 'A'), createPasserIdx(3)); // former M is A in the next cycle
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), initialC);
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(4.9, 'C')); // stay there and come A


    // so, now let's track what M is doing
    // M starts with a carry, between A and B
    assertLocationBetween(locationMgr.getLocationByRole(0, 'M'), locationMgr.getLocationByRole(0, 'A'), locationMgr.getLocationByRole(0, 'B'));
    // after that M moves to stand in front of B
    assertLocationBetween(locationMgr.getLocationByRole(2, 'M'), locationMgr.getLocationByRole(2, 'B'), [.5, .5]);
    // then M stands in front of C to intercept a self
    const inFrontOfC = locationMgr.getLocationByRole(4, 'M');
    assertLocationBetween(inFrontOfC, locationMgr.getLocationByRole(4, 'C'), [.5, .5]);
    assertEqualLocation(locationMgr.getLocationByRole(4, 'C'), initialC); // C still moving, not switched roles yet
    assert.equal(locationMgr.roleTracker._getPasserIdx(4, 'C'), 2)
    // afterward M becomes C, still in old position about to walk
    assert.equal(locationMgr.roleTracker._getPasserIdx(5, 'C'), 3)
    assertEqualLocation(locationMgr.getLocationByRole(5, 'M'), initialC); // new C
    assertEqualLocation(locationMgr.getLocationByRole(5, 'C'), inFrontOfC);
    // now C and M both walk
    assertLocationBetween(locationMgr.getLocationByRole(5.5, 'C'), initialC, inFrontOfC); // prior M, now C
    assertLocationBetween(locationMgr.getLocationByRole(5.5, 'M'), initialC, initialA); // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), initialC); // prior M, was briefly C, is now A
    assertLocationBetween(locationMgr.getLocationByRole(6, 'M'), locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(6, 'B'));// prior C as M between A and B
})


Deno.test("locationMgr for scrambled v, with bend in take", () => {

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SBl z ICl↺  
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // everything same as above
    const initialC: [number, number] = [0.25, 0.933]

    // now C and M both walk, but both walk on a curve
    assertEqualLocation(locationMgr.getLocationByRole(5.5, 'C'), [0.30,0.73]); // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(5.5, 'M'), [0.4,0.67]); // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), initialC); // prior M, was briefly C, is now A
    assertLocationBetween(locationMgr.getLocationByRole(6, 'M'), locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(6, 'B'));// prior C as M between A and B

})

// Deno.test("locationMgr for wankel engine (mid-walk swap with manipulator", () => {

//     const pattern = `A: 3pB3 3pC3 3pB3 -- B
// B: 3pA3 33   3pA3 -- C
// C: 33   3pA3 33   -- A
// M: IC . CA. SC 
// positions: V(A,B,C)
// move: Vmove(B,4.9,3)`
//     const gp: GroupPattern = createSyncGroupPattern(pattern)

//     const locationMgr = createFullLocationManager(gp.layout!.animation)

//     // check basic internal structures
//     // assert.equal(locationMgr.mod, 96);

//     // console.log(locationMgr.fullPatternRoles)
//     // console.log(locationMgr.baseLocationManager.basePatternRoles)
//     assert.deepEqual(locationMgr.roles, ['A', 'B', 'C', 'M']);

//     // console.log(locationMgr.roleMapping);

//     // 1/B walks first
//     function assertMovement(time: number, passerIdx: PasserIdx, asRole: string) {
//         assert(locationMgr._getPasserIdx(time, asRole) === passerIdx, `Expected passerIdx for role ${asRole} at time ${time} to be ${passerIdx}, but got ${locationMgr._getPasserIdx(time, asRole)}`);
//         const movementLookupByPasserIdx = locationMgr._getMovement(time, passerIdx);
//         assert.ok(movementLookupByPasserIdx, `Expected movement for ${passerIdx} at time ${time} to be defined`);
//         assert.equal(locationMgr._getMovementByRole(time, asRole), movementLookupByPasserIdx, `Expected movement lookup by role ${asRole} to match that by passerIdx ${passerIdx}`);
//     }

//     const C=createPasserIdx(2), M=createPasserIdx(3);

//     // original B walks first
//     assertMovement(4.9, createPasserIdx(1), 'B');
//     // next previous A, now B walks
//     assertMovement(4.9+6, createPasserIdx(0), 'B');
//     // next previous A, now B walks
//     assertMovement(4.9+6*2, createPasserIdx(3), 'B');
//     // next previous A, now B walks
//     assertMovement(4.9+6*3, createPasserIdx(2), 'B');

//     // now let's try locations
//     assertEqualLocation(locationMgr.getLocationByRole(0, 'A'), [0.5, 0]); // should be at start
//     assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
//     assertEqualLocation(locationMgr.getLocationByRole(0, 'C'), [0.25, 0.933]); // should be at start, skipping the initial mid-walk start
//     assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, 'C'), [0, 0.53]); // should be at the start again, but this time mid-walk
//     // let's worry about M's initial position later

//     // once M becomes C on beat 5, they teleport to C's old spot
//     assert.equal(locationMgr._getPasserIdx(0.9, 'M'), locationMgr._getPasserIdx(1, 'C'));
//     assert.equal(locationMgr._getPasserIdx(1, 'C'), createPasserIdx(3));
//     assert.equal(locationMgr._getPasserIdx(0.9+locationMgr.mod, 'M'), locationMgr._getPasserIdx(1+locationMgr.mod, 'C'));
//     assert.equal(locationMgr._getPasserIdx(1+locationMgr.mod, 'C'), createPasserIdx(3));
//     // in the first round, C didn't move, so let's just take their final position
//     assertEqualLocation(locationMgr.getLocationByRole(1, 'C'), [0.25, 0.933]); 
//     // but in other rounds, they just moved/are still moving
//     assertEqualLocation(locationMgr.getLocationByRole(1+locationMgr.mod, 'C'), [0.08, 0.77]); 
//     // but then they arrive 
//     assertEqualLocation(locationMgr.getLocationByRole(5+locationMgr.mod, 'C'), [0.25, 0.933]); 
//     assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(5, 'C')); // stay there and come A

//     // when M take's C's role, mid-walk, they should teleport to C's mid-walk position
//     assertEqualLocation(locationMgr.getLocationByRole(1, 'M'), [0.25, 0.933]); // first round is special, no walk
//     assertEqualLocation(locationMgr.getLocationByRole(1+locationMgr.mod, 'M'), [0.08, 0.77]); 
//     // then they move on C's old path toward the final position
//     assertEqualLocation(locationMgr._getLocation(1.5+locationMgr.mod, M), [0.17, 0.87]); 
//     assertEqualLocation(locationMgr._getLocation(2, M), [0.25, 0.933]); 
//     assertEqualLocation(locationMgr._getLocation(2+locationMgr.mod, M), [0.25, 0.933]); 

//     assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), locationMgr.getLocationByRole(3.8, 'B')); // not moving yet
//     assertEqualLocation(locationMgr.getLocationByRole(8, 'C'), [.933, .25]); // B fully moved, (and is now C)
//     assertEqualLocation(locationMgr.getLocationByRole(5, 'B'), [0.77, 0.919]); // moved only a bit
//     assertEqualLocation(locationMgr.getLocationByRole(7.8, 'C'), [0.9455, 0.273]); // almost arrived

// })


Deno.test("plot locationMgr for scrambled v", () => {

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const svg = plotRelativeDependencies(locationMgr.movementTracker)
    Deno.writeFileSync("scrambled-v-relative-movements.svg", new TextEncoder().encode(svg.svg()), { create: true, append: false });

})

function plotRelativeDependencies(movementTracker: MovementTracker): Svg {
    const w = 30
    const svg = createSVG(200 + w * movementTracker.mod, 600);
    const x = (t: number): number => t * w + 20;
    const y = (p: PasserIdx): number => 80 + p * 30;

    for (let time = 0; time < movementTracker.mod; time++) {
        // vertical line for each time
        svg.line(x(time), 0, x(time), 10).stroke({ color: '#ccc', width: 1 });
        // label
        svg.text(`${time}`).move(x(time), 10);
    }

    for (const mov of movementTracker.movements) {
        // bold lines for resolved movements
        if (mov.isResolved()) {
            svg.line(x(mov.onBeat), y(mov.passerIdx), x(mov.onBeat + mov.duration), y(mov.passerIdx))
                .stroke({ color: 'black', width: 8, linecap: 'round' });
        }
        // dashed lines for unresolved movements
        if (!mov.isResolved()) {
            const m = mov as UnresolvedMovementSegment
            svg.line(x(mov.onBeat), y(mov.passerIdx), x(mov.onBeat + mov.duration), y(mov.passerIdx))
                .stroke({ color: 'red', width: 6, linecap: 'round', dasharray: '1,1' });


            if (m.toPosition)
                svg.circle(12).fill('black').move(x(mov.onBeat + mov.duration) - 6, y(mov.passerIdx) - 6);
            else {

                // arrow for dependency
                if (m.spec.positionSpec.type === "infront") {
                    const targetPasserIdx = m.spec.positionSpec.toPasserIdx;
                    const targetTime = mov.onBeat + mov.duration;
                    const line = svg.line(x(targetTime), y(mov.passerIdx), x(targetTime), y(targetPasserIdx))
                        .stroke({ color: 'blue', width: 2, linecap: 'round', dasharray: '2,2' })
                    line.marker('end', 6, 6, marker => {
                        marker.path("M0,0 L0,6 L6,3 z").fill('blue')
                    })
                }
                if (m.spec.positionSpec.type === "between") {
                    const targetPasserIdx1 = m.spec.positionSpec.between[0];
                    const targetPasserIdx2 = m.spec.positionSpec.between[1];
                    const targetTime = mov.onBeat + mov.duration;
                    svg.line(x(targetTime), y(mov.passerIdx), x(targetTime), y(targetPasserIdx1))
                        .stroke({ color: 'green', width: 2, linecap: 'round', dasharray: '2,2' })
                        .marker('end', 6, 6, marker => {
                            marker.path("M0,0 L0,6 L6,3 z").fill('green')
                        })
                    svg.line(x(targetTime), y(mov.passerIdx), x(targetTime), y(targetPasserIdx2))
                        .stroke({ color: 'green', width: 2, linecap: 'round', dasharray: '2,2' })
                        .marker('end', 6, 6, marker => {
                            marker.path("M0,0 L0,6 L6,3 z").fill('green')
                        })
                }
            }

            if (m.fromPosition)
                svg.circle(12).fill('black').move(x(mov.onBeat) - 6, y(mov.passerIdx) - 6);
            else {
                // backward arrow for start position dependency
                const lastPriorMovement = movementTracker.movements.findLast(m => m.passerIdx === mov.passerIdx && m.onBeat < mov.onBeat)
                if (lastPriorMovement) {
                    const endTime = Math.min(mov.onBeat, lastPriorMovement.onBeat + lastPriorMovement.duration);
                    svg.line(x(mov.onBeat), y(mov.passerIdx), x(endTime), y(mov.passerIdx))
                        .stroke({ color: 'purple', width: 2, linecap: 'round', dasharray: '2,2' })
                        .marker('end', 6, 6, marker => {
                            marker.path("M0,0 L0,6 L6,3 z").fill('purple')
                        });
                }
            }
        }
        // small circle for teleport
        if (mov.isTeleport()) {
            svg.circle(12).fill('yellow').move(x(mov.onBeat) - 6, y(mov.passerIdx) - 6);
        }
    }


    return svg;
}