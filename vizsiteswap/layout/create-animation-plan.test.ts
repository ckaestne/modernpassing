import { computeBaseAnimations, createAnimationPlan } from "./create-animation-plan.ts";
import { createShapeLayout, GroupPattern } from "./layout.ts";
import { createSyncGroupPattern } from "../parsing/pattern-fromgroup.ts";
import assert from "node:assert";


Deno.test("locationMgr for moving feed (V)", () => {

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


Deno.test("first attempt at manipulator animation", () => {
    const unscambledB = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IB.CB.SA.
positions: V(A,B,C)`
    const scambledV = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SB.IC
positions: V(A,B,C)`
    const roundabout = `A: 3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33  -- A
         M: SB z SB z  IB . CB z
positions: Line(A,B)`
    const gp: GroupPattern = createSyncGroupPattern(scambledV)
    const plan = createAnimationPlan(gp.layout!.animation);
    // console.log(plan)

})



Deno.test("check positions in scrambled V animations", () => {
    const scambledV = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SB.IC
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(scambledV)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec);

    const locationMgr = computeBaseAnimations(gp.layout!.animation)
    const startLocationA: [number, number] = [0.5, 0] // A then B
    const startLocationB: [number, number] = [0.75, 0.933] // B before move
    const startLocationC: [number, number] = [0.25, 0.933] // C then A
    const moveLocationB: [number, number] = [.933, .25] // B after move, now C
    const centerLocation: [number, number] = [0.5, 0.5]

    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'C')!), startLocationC, "C at start");

    // M should be between A and B
    // assertLocationBetween(xy(plan.initialPositions.find(p => p.initialRole === 'M')!), startLocationA, startLocationB, "M at start");

    // on beat 1 M moves toward B for substitution on beat 2
    const m1 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 1)
    assert(m1, "M movement on beat 1 exists")
    assertLocationBetween(xy(m1), startLocationB, centerLocation, "M in front of B on beat 2");

    // on beat 3 or 4 M moves near C to intercept a throw form C
    const m2 = plan.directMovementAnimations.find(m => m.role === 'M' && (m.onBeat === 3 || m.onBeat === 4))
    assert(m2, "M movement on beat 3 or 4 exists")
    assertLocationBetween(xy(m2), startLocationC, centerLocation, "M near C on beat 3 or 4");

    // beat 5 is the iBeat (when the intercept lands and the roles swap)
    // now we expect the previous M, now C, to move to C's original position
    const m3 = plan.directMovementAnimations.find(m => m.role === 'C' && m.onBeat === 5)
    assert(m3, "C movement on beat 5 exists")
    assertEqualLocation(xy(m3), startLocationC, "C at original position on beat 5");
    // at the same time, M, the previous C, should start moving toward A for the carry
    const m4 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 5)
    assert(m4, "M movement on beat 5 exists")
    assertLocationBetween(xy(m4), startLocationC, startLocationA, "M moving toward A on beat 5");

    // next round, M arrived for the carry
    // B should be walking
    const b1 = plan.segmentMovementAnimations.find(m => m.role === 'B' && m.onBeat === 4.9)
    assert(b1, "B segment movement on beat 4.9 exists")
    assertEqualLocation(locationMgr.getLocationByRole(8, 'C'), moveLocationB, "B, now C, should be in the right place after walking");
    // after relabeling all positions should be as expected
    assertEqualLocation(locationMgr.getLocationByRole(6, 'B'), startLocationA, "A is now B");
    assertEqualLocation(locationMgr.getLocationByRole(6, 'A'), startLocationC, "C is now A");

    // on beat 1 M now moves to substitute the new B in originalA position
    const m5 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 7)
    assert(m5, "M movement on beat 7 exists")
    assertLocationBetween(xy(m5), startLocationA, centerLocation, "M moving toward B (former A) on beat 7");

    // now we are moving to intercept again on beat 3 or 4
    const m6 = plan.directMovementAnimations.find(m => m.role === 'M' && (m.onBeat === 9 || m.onBeat === 10))
    assert(m6, "M movement on beat 9 or 10 exists")
    assertLocationBetween(xy(m6), moveLocationB, centerLocation, "M near B on beat 9 or 10");

    // then M moves to C's original position on beat 11 (where B moved to)
    const m7 = plan.directMovementAnimations.find(m => m.role === 'C' && m.onBeat === 11)
    assert(m7, "M movement on beat 11 exists")
    assertEqualLocation(xy(m7), moveLocationB, "M at C's original position on beat 11");

    // and the new M moves to carry to A 
    const m8 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 11)
    assert(m8, "third M's movement on beat 11 exists")
    assertLocationBetween(xy(m8), moveLocationB, startLocationC, "M moving toward A on beat 11");

    // console.log(plan)

})




Deno.test("check positions roundabout", () => {
    const roundabout = `A: 3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33  -- A
         M: SB z SB z  IBe . CB z
positions: Line(A,B)`
    const gp: GroupPattern = createSyncGroupPattern(roundabout)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec);

    const locationMgr = computeBaseAnimations(gp.layout!.animation)
    const startLocationA: [number, number] = [0, 0.5] // A then B
    const startLocationB: [number, number] = [1, .5] // B before move
    const centerLocation: [number, number] = [0.5, 0.5]

    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    // M should be between A and B
    // assertLocationBetween(xy(plan.initialPositions.find(p => p.initialRole === 'M')!), startLocationA, startLocationB, "M at start");

    // on beat 1 M moves toward B for substitution on beat 2
    const m1 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 1)
    assert(m1, "M movement on beat 1 exists")
    assertLocationBetween(xy(m1), startLocationB, centerLocation, "M in front of B on beat 2");

    // on beat 3 M moves near A to intercept the pass early
    const m2 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 3)
    assert(m2, "M movement on beat 3 or 4 exists")
    assertLocationBetween(xy(m2), startLocationA, centerLocation, "M near C on beat 3 or 4");

    // after the intercept on beat 5, M is now B and should go to B's original position
    const m3 = plan.directMovementAnimations.find(m => m.role === 'B' && m.onBeat === 5)
    assert(m3, "B movement on beat 5 exists")
    assertEqualLocation(xy(m3), startLocationB, "B at original position on beat 5");

})



Deno.test("check positions in nicki's three count roundabout", () => {
    const roundabout = `A: 3pB333pB33
B: 3pA333pA33
M: SB.IBe C↻..
positions: Line(A,B)`
    const gp: GroupPattern = createSyncGroupPattern(roundabout)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec);

    const locationMgr = computeBaseAnimations(gp.layout!.animation)
    const startLocationA: [number, number] = [0, 0.5] // A then B
    const startLocationB: [number, number] = [1, .5] // B before move
    const centerLocation: [number, number] = [0.5, 0.5]

    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    // M should be in the middle for the pass substitution
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'M')!), centerLocation, "M at start");
 
    // on beat 1 M moves toward B for the intercept in front of B on beat 2
    const m1 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 1)
    assert(m1, "M movement on beat 1 exists")
    assertLocationBetween(xy(m1), centerLocation, startLocationB, "M in front of B on beat 2");

    // on beat 3, M is now B and go to B's original position
    const m2 = plan.directMovementAnimations.find(m => m.role === 'B' && m.onBeat === 3)
    assert(m2, "B movement on beat 3 exists")
    assertEqualLocation(xy(m2), startLocationB, "B at original position on beat 3");

    // new new manipulator may need to move somewhat early to do the carry on beat 3, so leaving on beat 2, when they are still B
    const m3 = plan.directMovementAnimations.find(m => m.role === 'B' && m.onBeat === 2)
    assert(m3, "B movement on beat 2 exists")
    assertLocationBetween(xy(m3), startLocationA, centerLocation, "B moving toward A on beat 2");

    // // on beat 3 M moves near A to intercept the pass early
    // const m2 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 3)
    // assert(m2, "M movement on beat 3 or 4 exists")
    // assertLocationBetween(xy(m2), startLocationA, centerLocation, "M near C on beat 3 or 4");

    // // after the intercept on beat 5, M is now B and should go to B's original position
    // const m3 = plan.directMovementAnimations.find(m => m.role === 'B' && m.onBeat === 5)
    // assert(m3, "B movement on beat 5 exists")
    // assertEqualLocation(xy(m3), startLocationB, "B at original position on beat 5");

})

function xy(pos: { x: number, y: number } | { toX: number, toY: number }): [number, number] {
    if ('toX' in pos) {
        return [pos.toX, pos.toY]
    }
    return [pos.x, pos.y]
}

function assertEqualLocation(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? 'assertEqualLocation'}: X location mismatch: expected ${expected} but got ${actual}`);
    assert(Math.round(100 * actual[1]) / 100 === Math.round(100 * expected[1]) / 100, `${label ?? 'assertEqualLocation'}: Y location mismatch: expected ${expected} but got ${actual}`);
}

// check that the location is anywhere between the two expected locations
function assertLocationBetween(actual: [number, number], expectedA: [number, number], expectedB: [number, number], label?: string) {
    assert(actual[0] >= Math.min(expectedA[0], expectedB[0]) && actual[0] <= Math.max(expectedA[0], expectedB[0]), `${label ?? 'assertLocationBetween'}: X location ${actual[0]} not between ${expectedA[0]} and ${expectedB[0]}`);
    assert(actual[1] >= Math.min(expectedA[1], expectedB[1]) && actual[1] <= Math.max(expectedA[1], expectedB[1]), `${label ?? 'assertLocationBetween'}: Y location ${actual[1]} not between ${expectedA[1]} and ${expectedB[1]}`);
    // Interpolate y based on x position along the line
    if ((expectedB[0] - expectedA[0]) !== 0) {
        const xRatio = (actual[0] - expectedA[0]) / (expectedB[0] - expectedA[0]);
        const expectedY = expectedA[1] + xRatio * (expectedB[1] - expectedA[1]);
        assert(Math.abs(actual[1] - expectedY) < 0.01, `${label ?? 'assertLocationBetween'}: Y location ${actual[1]} not on line between points, expected ${expectedY}`);
    }
}

// somewhat fuzzy: not the same location, but near it (usually for intercept next to or in front of)
function assertNearbyLocation(actual: [number, number], expected: [number, number], label?: string) {
    assert((Math.round(100 * actual[0]) / 100 !== Math.round(100 * expected[0]) / 100)
        || (Math.round(100 * actual[1]) / 100 === Math.round(100 * expected[1]) / 100), `${label ?? 'assertEqualLocation'}: locations expected to be different but found the same: expected not ${expected}, but got ${actual}`);

    const acceptedDistance = 0.2; // acceptable distance for "nearby"
    assert(Math.abs(actual[0] - expected[0]) < acceptedDistance && Math.abs(actual[1] - expected[1]) < acceptedDistance, `${label ?? 'assertNearbyLocation'}: location ${actual} not near expected ${expected}`);

}