import { createShapeLayout, GroupPattern } from "../layout.ts";
import { createGroupPattern, createSyncGroupPattern } from "../../parsing/pattern-fromgroup.ts";
import assert from "node:assert";
import test from "node:test";
import { Hand, Role } from "@modernpassing/pattern";
import { assertEqualLocation, assertLocationBetween } from "../location-test-helpers.ts";
import { createBaseLocationManager, createFullLocationManager, LocationManager } from "./location-manager.ts";
import { createPasserIdx, PasserIdx } from "./helpers.ts";
import { MovementTracker, UnresolvedMovementSegment } from "./relative-movement.ts";
import { Svg } from "@svgdotjs/svg.js";
import { createSVG } from "@modernpassing/svg-utils";
import { createAnimationPlan } from "../create-animation-plan.ts";
import { log } from "node:console";
import path from "node:path";


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

Deno.test("locationMgr for scrambled v -- movement", () => {

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    assert.deepEqual(locationMgr.roleTracker.roles, ['A', 'B', 'C', 'M']);


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
})

Deno.test("locationMgr for scrambled v -- locations", () => {

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const locationMgr = createFullLocationManager(gp.layout!.animation)


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
    assertEqualLocation(locationMgr.getLocationByRole(5.5, 'C'), [0.30, 0.73]); // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(5.5, 'M'), [0.4, 0.67]); // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), initialC); // prior M, was briefly C, is now A
    assertLocationBetween(locationMgr.getLocationByRole(6, 'M'), locationMgr.getLocationByRole(6, 'A'), locationMgr.getLocationByRole(6, 'B'));// prior C as M between A and B

})

Deno.test("locationMgr for wankel engine (mid-walk swap with manipulator)", () => {
    // here we expect to see differences between the first and later iterations

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const plan = createAnimationPlan(gp.layout!.animation, .1);

    assert.deepEqual(locationMgr.roleTracker.roles, ['A', 'B', 'C', 'M']);

    assert.equal(locationMgr.mod, 72);

    // now let's try locations
    const initialC: [number, number] = [0.25, 0.933]
    const walkingCStart: [number, number] = [0, 0.53];
    const initialA: [number, number] = [0.5, 0];
    const center: [number, number] = [0.5, 0.5];
    assertEqualLocation(locationMgr.getLocationByRole(0, 'A'), initialA); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'B'), [0.75, 0.933]); // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, 'C'), initialC); // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, 'C'), walkingCStart); // should be at the start again, but this time mid-walk
    assertEqualLocation(locationMgr.getLocationByRole(71.999, 'B'), walkingCStart); // just before the start, walking position, both in first and later iterations
    assertEqualLocation(locationMgr.getLocationByRole(71.999 + 72, 'B'), walkingCStart); // just before the start, walking position, both in first and later iterations
    const cMoving = plan.movementAnimations.filter(m => m.passerIdx === 2 && m.onBeat === 70.9)
    assert(cMoving.length === 1, "Expected one movement for C at 70.9");

    assertLocationBetween(locationMgr.getLocationByRole(0, 'M'), center, initialC);
    const inFrontOfC = locationMgr.getLocationByRole(0, 'M');
    assertLocationBetween(locationMgr.getLocationByRole(72, 'M'), center, walkingCStart);
    const inFrontOfWalkingC = locationMgr.getLocationByRole(72, 'M');

    // 0: IC
    assertLocationBetween(locationMgr.getLocationByRole(locationMgr.mod, 'M'), center, walkingCStart);
    assert.equal(locationMgr.roleTracker._getPasserIdx(1, 'C'), locationMgr.roleTracker._getPasserIdx(0, 'M'))
    assert.equal(locationMgr.roleTracker._getPasserIdx(1, 'M'), locationMgr.roleTracker._getPasserIdx(0, 'C'))

    console.log("inFrontOfC:", inFrontOfC);
    console.log("inFrontOfWalkingC:", inFrontOfWalkingC);
    const firstMoveMFirstRound = plan.movementAnimations.find(m => m.onBeat === 1 && m.passerIdx === 3 && m.firstIteration === true);
    const firstMoveMSecondRound = plan.movementAnimations.find(m => m.onBeat === 1 && m.passerIdx === 3 && m.firstIteration === false);
    assertEqualLocation([firstMoveMFirstRound!.movementSpec.fromX, firstMoveMFirstRound!.movementSpec.fromY], inFrontOfC);
    assertEqualLocation([firstMoveMFirstRound!.movementSpec.toX, firstMoveMFirstRound!.movementSpec.toY], initialC);
    assertEqualLocation([firstMoveMSecondRound!.movementSpec.toX, firstMoveMSecondRound!.movementSpec.toY], initialC);
    assertEqualLocation([firstMoveMSecondRound!.movementSpec.fromX, firstMoveMSecondRound!.movementSpec.fromY], inFrontOfWalkingC);
    // M takes C's position
    assertEqualLocation(locationMgr.getLocationByRole(1, 'C'), inFrontOfC);
    assertLocationBetween(locationMgr.getLocationByRole(1.5, 'C'), inFrontOfC, initialC);
    assertEqualLocation(locationMgr.getLocationByRole(2, 'C'), initialC); // should be at start, skipping the initial mid-walk start






})



Deno.test.only("location manager for opernball", async (t) => {
  const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   . 
positions: Line(A, B, 0.2) `
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const plan = createAnimationPlan(gp.layout!.animation, .1);
    
    const lA :[number, number] = [0.2,0.5]
    const lB :[number, number] = [0.8,0.5]
    const lM :[number, number] = [0.5,0.7]
    const lN :[number, number] = [0.5,0.3]
    const lO :[number, number] = [.92,0.5]
    const lOM :[number, number] = [.08,0.5]
    const pA = locationMgr.roleTracker._getPasserIdx(0,'A')
    const pB = locationMgr.roleTracker._getPasserIdx(0,'B')
    const pM = locationMgr.roleTracker._getPasserIdx(0,'M')
    const pN = locationMgr.roleTracker._getPasserIdx(0,'N')
    const pO = locationMgr.roleTracker._getPasserIdx(0,'O')

    const mt = locationMgr.movementTracker
    assertEqualLocation(mt._getLocation(0,pA),lA)
    assertEqualLocation(mt._getLocation(0,pB),lB)
    // M starts south in the middle and N north
    assertEqualLocation(mt._getLocation(0,pM),lM)
    assertEqualLocation(mt._getLocation(0,pN),lN)
    // O starts behind B
    assertEqualLocation(mt._getLocation(0,pO),lO)

    // original B starts moving to carry pass on 1; 
    const carry = plan.movementAnimations.filter(m=>m.passerIdx===pB && m.onBeat===0.5)
    assert(carry.length===1, "Expected one carry movement for B at 0.5")
    assertLocationBetween(mt._getLocation(1,pB),lB,lA)
    // on beat 1, O moves into B's position
    assertEqualLocation(mt._getLocation(2,pO),lB)
    // on beat 2, M moves to N's position, N moves behind A, O moves to M's position
    assertEqualLocation(mt._getLocation(3,pM),lN)
    assertEqualLocation(mt._getLocation(3,pN),lOM)
    const _OsmoveAfterCarry = plan.movementAnimations.filter(m=>m.passerIdx===pB && m.onBeat===2)
    console.log(_OsmoveAfterCarry)
    assert(_OsmoveAfterCarry.length===1, "Expected one movement for B at 2 (to M's initial position)")
    assertEqualLocation(mt._getLocation(3,pB),lM)
        


})

Deno.test("opernball", async (t) => {
  const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   .  `
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const svg = plotRelativeDependencies(locationMgr.movementTracker)
    Deno.writeFileSync("opernball-relative-movements.svg", new TextEncoder().encode(svg.svg()), { create: true, append: false });

})

Deno.test.ignore("plot location dependencies in locationMgr for scrambled v", () => {

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
    const w = 50
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



const regressionTestsJsonFile =path.join(import.meta.dirname! , "regression-tests.json")

Deno.test.only("location mgr regression tests", () => {

    const regressionTests: Array<[string, string, Array<[number, Role, number, number, number]>]> =
        JSON.parse(Deno.readTextFileSync(regressionTestsJsonFile));
    for (const t of regressionTests) {
        console.log(`### Running regression test: ${t[0]}`);

        const gp: GroupPattern = createSyncGroupPattern(t[1])
        const locationMgr = createFullLocationManager(gp.layout!.animation)

        const expected: Array<[number, Role, number, number, number]> = t[2]
        for (let time = 0; time < locationMgr.mod + 10; time += 0.5)
            for (const role of locationMgr.roleTracker.roles) {
                const passerIdx = locationMgr.roleTracker._getPasserIdx(time, role);
                const expectedLoc = expected.find(e => e[0] === time && e[1] === role);
                if (!expectedLoc) {
                    throw new Error(`Missing expected location for time ${time} role ${role}`);
                }
                const [locX1, locY1] = locationMgr.getLocationByRole(time, role);
                assert.equal(passerIdx, expectedLoc[2], `passerIdx mismatch at time ${time} role ${role}`);
                assert(locX1 - expectedLoc[3] < 0.001, `x mismatch at time ${time} role ${role}`);
                assert(locY1 - expectedLoc[4] < 0.001, `y mismatch at time ${time} role ${role}`);
            }
    }
})

Deno.test("create location mgr regression tests", () => {


    const patterns = [[
        "moving feed (V)",
        `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    ],[
        "scrambled v",
        `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    ],
[
    "wankel engine",
    `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
],
     ["phonecian waltz", 
     `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
positions: Line(A, B, 0.2) `]
]
    const result: [string, string, Array<[number, Role, number, number, number]>][] = []
    for (const p of patterns) {
        console.log(`### Generating regression test for pattern: ${p[0]}`);

        const gp: GroupPattern = createSyncGroupPattern(p[1])
        const locationMgr = createFullLocationManager(gp.layout!.animation)

        const log: Array<[number, Role, PasserIdx, number, number]> = []
        for (let time = 0; time < locationMgr.mod + 10; time += 0.5)
            for (const role of locationMgr.roleTracker.roles) {
                const passerIdx = locationMgr.roleTracker._getPasserIdx(time, role);
                const [locX1, locY1] = locationMgr.getLocationByRole(time, role);
                log.push([time, role, passerIdx, locX1, locY1]);
            }

        result.push([p[0], p[1], log])
    }
    Deno.writeTextFileSync(regressionTestsJsonFile, JSON.stringify(result, null, 2));
})
