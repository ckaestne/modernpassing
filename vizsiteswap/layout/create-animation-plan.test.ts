import { computeBaseAnimations } from "./create-animation-plan.ts";
import { createShapeLayout, GroupPattern } from "./layout.ts";
import { createSyncGroupPattern } from "../parsing/pattern-fromgroup.ts";
import assert from "node:assert";


Deno.test("compute animation plan length"   , () => {

        const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,3.9,3)`
        const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = computeBaseAnimations(gp.layout!.animation)

    // check basic internal structures
    assert.equal( baseAnimations.mod , 72);

    assert.equal(baseAnimations.movements[0][0], 1); // B in the first iteration
    assert.equal(Math.round(10*baseAnimations.movements[0][1]), 39); 
    assert.deepEqual(baseAnimations.roles.find(r=> r[0] === 0)![1], ['A','B','C']); 

    assert.equal(baseAnimations.movements[1][0], 0); // B after relabeling, which was A at the beginning
    assert.equal(Math.round(10*baseAnimations.movements[1][1]), 60+39); 
    assert.deepEqual(baseAnimations.roles.find(r=> r[0] === 6)![1], ['B','C','A']); 

    assert.equal(baseAnimations.movements[2][0], 2);
    assert.equal(Math.round(10*baseAnimations.movements[2][1]), 2*60+39); 
    assert.deepEqual(baseAnimations.roles.find(r=> r[0] === 12)![1], ['C','A','B']); 

    assert.equal(baseAnimations.movements[3][0], 1);
    assert.equal(Math.round(10*baseAnimations.movements[3][1]), 3*60+39); 
    assert.deepEqual(baseAnimations.roles.find(r=> r[0] === 18)![1], ['A','B','C']); 

    // now let's try locations
    assertEqualLocation(baseAnimations.getLocation(0, 'A'),[0.5,0]); // should be at start
    assertEqualLocation(baseAnimations.getLocation( 0, 'B'),[0.75,0.933]); // should be at start
    assertEqualLocation(baseAnimations.getLocation( 0, 'C'),[0.08,0.77]); // should be at start
    assertEqualLocation(baseAnimations.getLocation( 0, 'B'),baseAnimations.getLocation( 3.8, 'B')); // not moving yet
    assertEqualLocation(baseAnimations.getLocation( 7, 'C'),[.933,.25]); // B fully moved (and is now C)
    assertEqualLocation(baseAnimations.getLocation( 4, 'B'),[0.77,0.919]); // moved only a bit
     assertEqualLocation(baseAnimations.getLocation( 6.8, 'C'),[0.9455,0.273]); // almost arrived

})

function assertEqualLocation(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100*actual[0])/100 === Math.round(100*expected[0])/100, `${label ?? ''} X location mismatch: expected ${expected} but got ${actual}`);
    assert(Math.round(100*actual[1])/100 === Math.round(100*expected[1])/100, `${label ?? ''} Y location mismatch: expected ${expected} but got ${actual}`);
}