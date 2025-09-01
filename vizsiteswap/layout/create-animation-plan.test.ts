import { computeBaseAnimations, createAnimationPlan } from "./create-animation-plan.ts";
import { createShapeLayout, GroupPattern } from "./layout.ts";
import { createGroupPattern, createSyncGroupPattern } from "../parsing/pattern-fromgroup.ts";
import assert from "node:assert";
import test from "node:test";


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

    const plan = createAnimationPlan(gp.layout!.animation, 10);



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

    const plan = createAnimationPlan(gp.layout!.animation, 10);


})


Deno.test("first attempt at manipulator animation", () => {
//     const unscambledB = `A: 3pB3 3pC3 3pB3 -- B
// B: 3pA3 33   3pA3 -- C
// C: 33   3pA3 33   -- A
// M: IB.CB.SA.
// positions: V(A,B,C)`
    const scambledV = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SB.IC
positions: V(A,B,C)`
//     const roundabout = `A: 3pB3 33   3pB3 33 -- B
//          B: 3pA3 33   3pA3 33  -- A
//          M: SB z SB z  IB . CB z
// positions: Line(A,B)`
    const gp: GroupPattern = createSyncGroupPattern(scambledV)
    const plan = createAnimationPlan(gp.layout!.animation, 10);
    // console.log(plan)

})



Deno.test("check positions in scrambled V animations", () => {
    const scambledV = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SB.IC↺
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(scambledV)
    const spec = gp.layout!.animation

    // on beat 5 we should take C's position
    const r5 = spec.relativeMovements.find(r => r.onBeat === 5 && r.positionSpec.type === 'take')
    assert(r5, "Relative movement on beat 5 exists")
    assert(r5.positionSpec.type === 'take' && r5.positionSpec.toRole === 'C', "Relative movement on beat 5 is a take to C's position"+JSON.stringify(r5.positionSpec))


    const plan = createAnimationPlan(spec, 10);

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
    const plan = createAnimationPlan(spec, 10);

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
    const plan = createAnimationPlan(spec, 10);

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
    const m3 = plan.directMovementAnimations.find(m => m.role === 'B' && m.onBeat === 2.5)
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


Deno.test("walking on siteswap, fixing passing positions", () => {
    const whynotVsPopcorn = `A: 7B 6 7Cx 82 7B 6 7Cx 827Cx -- B
B: , 887A66887A67 -- C
C: !, 66887Ax66887Ax -- A
positions: V(A,B,C)
move: Vmove(B, 17, 1)`

    const gp: GroupPattern = createGroupPattern(whynotVsPopcorn,4)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec, 10);

    const locationMgr = computeBaseAnimations(gp.layout!.animation)
    const startLocationA: [number, number] = [0.5, 0] // A then B
    const startLocationB: [number, number] = [0.75, 0.933] // B before move
    const startLocationC: [number, number] = [0.25, 0.933] // C then A
    const moveLocationB: [number, number] = [.933, .25] // B after move, now C




    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'C')!), startLocationC, "C at start");

    assertEqualLocation(locationMgr.getLocationByRole(17, 'B'), startLocationB)
    assertEqualLocation(locationMgr.getLocationByRole(18, 'B'), moveLocationB)
    // A and C are not moving
    assertEqualLocation(locationMgr.getLocationByRole(19, 'A'), startLocationA)
    assertEqualLocation(locationMgr.getLocationByRole(19, 'C'), startLocationC)

    // check passes
    assert(spec.passAnimations[0].onBeat===0 && spec.passAnimations[0].pass.fromRole === 'A' && spec.passAnimations[0].pass.toRole === 'B', "First pass from A to B on beat 0");
    assert(spec.passAnimations[6].onBeat===15 && spec.passAnimations[6].pass.fromRole === 'B' && spec.passAnimations[6].pass.toRole === 'A',JSON.stringify(spec.passAnimations[6]))
    assert(spec.passAnimations[7].onBeat===19 && spec.passAnimations[7].pass.fromRole === 'C' && spec.passAnimations[7].pass.toRole === 'A', JSON.stringify(spec.passAnimations[7]))
    assert(spec.passAnimations[8].onBeat === 20 && spec.passAnimations[8].pass.fromRole === 'A' && spec.passAnimations[8].pass.toRole === 'C', JSON.stringify(spec.passAnimations[8]))

    // let's find the corresponding entries in the plan
    assert(plan.passAnimations[0].onBeat===0)
    assertNearbyLocation([plan.passAnimations[0].fromX, plan.passAnimations[0].fromY], startLocationA, "First pass from A to B on beat 0");
    assertNearbyLocation([plan.passAnimations[0].toX, plan.passAnimations[0].toY], startLocationB, "First pass from A to B on beat 0");

    const p6 = plan.passAnimations.find(p => p.onBeat === 15)!
    assertNearbyLocation([p6.fromX, p6.fromY], startLocationB, "Pass from B to A on beat 15");
    assertNearbyLocation([p6.toX, p6.toY], startLocationA, "Pass from B to A on beat 15");

    const p7 = plan.passAnimations.find(p => p.onBeat === 19)!
    assertNearbyLocation([p7.fromX, p7.fromY], startLocationC, "Pass from C to A on beat 19");
    assertNearbyLocation([p7.toX, p7.toY], startLocationA, "Pass from C to A on beat 19");

    const p8 = plan.passAnimations.find(p => p.onBeat === 20)!
    assertNearbyLocation([p8.fromX, p8.fromY], startLocationA, "Pass from A to C on beat 20");
    assertNearbyLocation([p8.toX, p8.toY], startLocationC, "Pass from A to C on beat 20");

    // next one is in the next iteration
    // beat 21 from A to B, fromer C to former A, both in the original positions
    const p9 = plan.passAnimations.find(p => p.onBeat === 21)!
    assertNearbyLocation([p9.fromX, p9.fromY], startLocationC, "Pass from A to B on beat 21");
    assertNearbyLocation([p9.toX, p9.toY], startLocationA)
})

test("check position for *outside* substitutions in phoneician waltz", () => {
    const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBlo z   zf  SBlo z   .   IBvb CA  . `

    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec, 10);

    const startLocationA: [number, number] = [0, 0.5] // A then B
    const startLocationB: [number, number] = [1, .5] // B before move
    const centerLocation: [number, number] = [0.5, 0.5]

    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    // M should be south of the center between A and B
    assertLocationSouthOf(xy(plan.initialPositions.find(p => p.initialRole === 'M')!), centerLocation, "M at start");

    // on beat 1 M moves north on beat 2
    const m1 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 2)
    assert(m1, "M movement on beat 2 exists")
    assertLocationNorthOf(xy(m1), centerLocation, "M north of the pass on beat 3");

    // on beat 8 M moves south to the starting point for the second iteration
    const m2 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 8)
    assert(m2, "M movement on beat 8 exists")
    assertLocationSouthOf(xy(m2), centerLocation, "M south of the pass on beat 9");

    // then we move north again on beat 11
    const m3 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 11)
    assert(m3, "M movement on beat 11 exists")
    assertLocationNorthOf(xy(m3), centerLocation, "M north of the pass on beat 11");

    // now we are back to the start, moving south on beat 17
    const m4 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 17)
    assert(m4, "M movement on beat 17 exists")
    assertLocationSouthOf(xy(m4), centerLocation, "M south of the pass on beat 17"); 

})


test("check position for *very late* left-handed intercept in dolbysoeround", () => {
    const pattern = `A: 3pB333 3pB33 -- B
B: 3pA333 3pA33 -- A
M: SBezSBlz IBv CBz`

    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec, 10);

    const startLocationA: [number, number] = [0, 0.5] // A then B
    const startLocationB: [number, number] = [1, .5] // B before move
    const centerLocation: [number, number] = [0.5, 0.5]

    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    // M should be between A and B
    assertLocationBetween(xy(plan.initialPositions.find(p => p.initialRole === 'M')!), startLocationA, startLocationB, "M at start");

    // first intercept on beat 4, start moving on beat 3
    const m1 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 3)
    assert(m1, "M movement on beat 3 exists")
    assertLocationSouthOf(xy(m1), startLocationB, "M south of the intercepted passer on beat 4");

    // in the second iteration, the intercept is on beat 11, start moving on 10
    const m2 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 10)
    assert(m2, "M movement on beat 10 exists")
    assertLocationSouthOf(xy(m2), startLocationA, "M south of the intercepted passer on beat 11");
    
})

test.skip("compute animation plan for Opernball", () => {
    const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   .  `

    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec, 10);
})

test("check positions for MiniEd", () => {
    const pattern = `A: 3pB 3pC 3  3pB 3   3 -- B
B: 3pA 3   3  3pA 3pC 3 -- C
C: 3   3pA 3  3   3pB 3 -- A
M: CB  .   SBe .   SCl  IC↻ 
positions: VL(A,B,C)
move: Vmove(C,1.9,2)Vmove(A,3.9,2)`

    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const spec = gp.layout!.animation


    const carryMovement = spec.relativeMovements.find(m => m.onBeat===5.5)!
    // the carry movement is started by C, who will be M when they arrive
    assert(carryMovement.role === 'C', "Carry movement is started by C");
    // the carry is between A and B (arrival roles)
    assert(carryMovement.positionSpec.type==='between' &&
        carryMovement.positionSpec.between![0] === 'A' &&
        carryMovement.positionSpec.between![1] === 'B', "Carry movement is between A and B");

    // intercept on 5, so movement on 4
    const interceptMovement = spec.relativeMovements.find(m => m.onBeat === 4)!
    // movement by M to in front of C
    assert(interceptMovement.role === 'M', "Intercept movement is by M");
    assert(interceptMovement.positionSpec.type === 'infront' && interceptMovement.positionSpec.toRole === 'C', "Intercept movement is in front of C");
    
    // after the intercept on beat 0, M is now A (would be C, but immediately relabeled to A) and should take A's position
    const swapAfterInterceptMovement = spec.relativeMovements.find(m => m.onBeat === 0)!
    assert(swapAfterInterceptMovement.role === 'A', "After intercept, M is now A");
    assert(swapAfterInterceptMovement.positionSpec.type === 'take' && swapAfterInterceptMovement.positionSpec.toRole === 'A', "After intercept, M is now A at A's position");
    




    const plan = createAnimationPlan(spec, 10);

    const locationMgr = computeBaseAnimations(gp.layout!.animation)
    const startLocationA: [number, number] = [0.5, 0] // A then B
    const startLocationB: [number, number] = [0.75, 0.933] // B before move
    const startLocationC: [number, number] = [0.25, 0.933] // C then A
    const centerLocation: [number, number] = [0.5, 0.5]
    const moveLocationB: [number, number] = [.933, .25] // B after move, now C
    const cAfterMovingLocation: [number, number] = [.067,0.25]
    const aAfterMovingLocation: [number, number] = [1,0.5] 

    // initial positions
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'A')!), startLocationA, "A at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'B')!), startLocationB, "B at start");
    assertEqualLocation(xy(plan.initialPositions.find(p => p.initialRole === 'C')!), startLocationC, "C at start");
    // M should be in front of B
    assertLocationBetween(xy(plan.initialPositions.find(p => p.initialRole === 'M')!), startLocationB, centerLocation, "M at start");

    // C walks after 1
    assertEqualLocation(locationMgr.getLocationByRole(1.9, 'C'), startLocationC, "C at start");
    assertEqualLocation(locationMgr.getLocationByRole(4, 'C'), cAfterMovingLocation, "C after moving");

    // A walks after 3
    assertEqualLocation(locationMgr.getLocationByRole(3.9, 'A'), startLocationA, "A at start");
    assertEqualLocation(locationMgr.getLocationByRole(5.9, 'A'), aAfterMovingLocation, "A after moving");
    assertEqualLocation(locationMgr.getLocationByRole(6, 'B'), aAfterMovingLocation, "A, now B after moving");

    // the carry starts on beat 5.5 and should arrive on beat 6. M should now be between A and B
    const carryPlan = plan.directMovementAnimations.find(m => m.role === 'C' && m.onBeat === 5.5)
    assertLocationBetween(xy(carryPlan!), cAfterMovingLocation/*now A*/,aAfterMovingLocation/*now B*/, "Carry movement is between A and B on beat 5.5");

    // the beat after the intercept (0), M is now C, relabeled to A and should move toward A's position (cAfterMovingLocation), where they should arrive on beat 1
    assertEqualLocation(locationMgr.getLocationByRole(7, 'A'), cAfterMovingLocation, "A at a beat after the start of the second iteration");
    const mFinalMovePlan = plan.directMovementAnimations.find(m => m.role === 'A' && m.onBeat === 6)
    assert(mFinalMovePlan, "Final movement plan for A exists");
    assertEqualLocation(xy(mFinalMovePlan), cAfterMovingLocation, "A moving toward A's position on beat 6");


    // M walks on 3 for the substitution on 4
    const m1 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 3)
    assert(m1, "M movement on beat 3 exists")
    assertLocationBetween(xy(m1), startLocationB, cAfterMovingLocation, "M in between B and C when arriving on 4");

    // M then walks again on 4 for the intercept on 5
    const m2 = plan.directMovementAnimations.find(m => m.role === 'M' && m.onBeat === 4)
    assert(m2, "M movement on beat 4 exists")
    assertLocationBetween(xy(m2), cAfterMovingLocation, centerLocation, "M in front of C on beat 5");

    // the subsitution on beat 4 should be with M's position in the middle, all three passes should be parallel?
    // Actually, no, the pass from B to M goes to where M will be a beat later and the pass from 
    // M to C goes from where M is now, so unfortuntately while it looks wonky it is kind of correct
    // However, isn't the pass from B to M a pelf (1), so it should probably be seen as arriving immediately?
    const ps = plan.passAnimations.filter(p => p.onBeat === 4)
    assert(ps.length === 3, "Three passes on beat 4")
    const angles = ps.map(p => (Math.atan2(p.toY - p.fromY, p.toX - p.fromX)+Math.PI)%Math.PI)
    assert(angles[0] === angles[1] && angles[1] === angles[2], "All three passes on beat 4 should be parallel "+ JSON.stringify(angles));


})

Deno.test("check positions roundabout", () => {
    const manege = `A: 7 6 8 7 6 -- B
         B: ,8 7 6 8 -- A
        M: IBb, CAo -- M`
    const gp: GroupPattern = createGroupPattern(manege, 4)
    const spec = gp.layout!.animation
    const plan = createAnimationPlan(spec, 10);

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

function assertLocationSouthOf(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? 'assertEqualLocation'}: X location mismatch: expected ${expected} but got ${actual}`);
    assert(actual[1] > expected[1], `${label ?? 'assertLocationSouthOf'}: Y location ${actual[1]} is not south of expected ${expected[1]}`);
}
function assertLocationNorthOf(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? 'assertEqualLocation'}: X location mismatch: expected ${expected} but got ${actual}`);
    assert(actual[1] < expected[1], `${label ?? 'assertLocationNorthOf'}: Y location ${actual[1]} is not north of expected ${expected[1]}`);
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