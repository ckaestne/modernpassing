import  assert  from "node:assert";
import { createSiteswapPattern } from "./pattern-fromsiteswap.ts";
import { Hand } from "../pattern/pattern.ts";


Deno.test("Pattern from siteswap, 756", () => {

    const s756 = createSiteswapPattern("756", {  });
    console.log(s756.prettyPrintThrows())
    const t7=s756.findThrow(0)!
    const t5=s756.findThrow(1)!
    const t6=s756.findThrow(2)!
    assert.equal(t7.toPasserIdxAtCausal, 0);
    assert.equal(t5.toPasserIdxAtCausal, 0);
    assert.equal(t6.toPasserIdxAtCausal, 1);
    assert.equal(t7.fromPasserIdx,0)
    assert.equal(t5.fromPasserIdx,1)
    assert.equal(t6.fromPasserIdx,0)
    assert.equal(s756.getThrowHand(t7, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t7, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 3), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t5, 3), Hand.Left)
    assert.equal(s756.getTargetHand(t7, 0), 1-Hand.Right)
    assert.equal(s756.getTargetHand(t5, 0), 1-Hand.Right)
    assert.equal(s756.getTargetHand(t7, 1), Hand.Left)
    assert.equal(s756.getTargetHand(t5, 1), Hand.Right)
    assert.equal(s756.getTargetHand(t7, 2), 1-Hand.Left)
    assert.equal(s756.getTargetHand(t5, 2), 1-Hand.Left)
    assert.equal(s756.getTargetHand(t7, 3), Hand.Right)
    assert.equal(s756.getTargetHand(t5, 3), Hand.Left)

    assert.deepEqual(s756.getStartingHands(), [[2, 1], [2,1]])
})


Deno.test("Pattern from siteswap, 756, B starting", () => {

    const s756 = createSiteswapPattern("756", { startingJuggler: 1 });
    console.log(s756.prettyPrintThrows())
    const t7=s756.findThrow(0)!
    const t5=s756.findThrow(1)!
    const t6=s756.findThrow(2)!
    assert.equal(t7.toPasserIdxAtCausal, 1);
    assert.equal(t5.toPasserIdxAtCausal, 1);
    assert.equal(t6.toPasserIdxAtCausal, 0);
    assert.equal(t7.fromPasserIdx,1)
    assert.equal(t5.fromPasserIdx,0)
    assert.equal(t6.fromPasserIdx,1)
    assert.equal(s756.getThrowHand(t7, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t7, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t7, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 3), Hand.Left)
    assert.equal(s756.getThrowHand(t5, 0), Hand.Left)
    assert.equal(s756.getThrowHand(t5, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 2), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 3), Hand.Left)
    assert.equal(s756.getTargetHand(t7, 0), Hand.Right)
    assert.equal(s756.getTargetHand(t5, 0), 1-Hand.Right)
    assert.equal(s756.getTargetHand(t7, 1), Hand.Left)
    assert.equal(s756.getTargetHand(t5, 1), Hand.Left)
    assert.equal(s756.getTargetHand(t7, 2), Hand.Left)
    assert.equal(s756.getTargetHand(t5, 2), Hand.Right)
    assert.equal(s756.getTargetHand(t7, 3), Hand.Right)
    assert.equal(s756.getTargetHand(t5, 3), Hand.Right)

    assert.deepEqual(s756.getStartingHands(), [[1, 2], [2,1]])
})

Deno.test("Pattern from siteswap, 77722", () => {

    const s756 = createSiteswapPattern("77722", { startingJuggler: 0 });
    console.log(s756.prettyPrintThrows())

    const t1= s756.findThrow(0)!
    const t2= s756.findThrow(1)!
    assert.equal(t1.fromPasserIdx,0)
    assert.equal(t2.fromPasserIdx,1)
    assert.equal(s756.getThrowHand(t1, 0), Hand.Right)
    assert.equal(s756.getTargetHand(t1, 0), Hand.Left) // straight
    assert.equal(s756.getThrowHand(t2, 0), Hand.Right)
    assert.equal(s756.getTargetHand(t2, 0), Hand.Right) // crossing
    assert.equal(s756.getThrowHand(t1, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t1, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t2, 2), Hand.Left)
    assert(s756.isValid(), s756.getValidationError())

})
Deno.test("Pattern from siteswap, 77722, B starting", () => {

    const s756 = createSiteswapPattern("77722", { startingJuggler: 1 });
    console.log(s756.prettyPrintThrows())

    const t1= s756.findThrow(0)!
    const t2= s756.findThrow(1)!
    assert.equal(t1.fromPasserIdx,1)
    assert.equal(t2.fromPasserIdx,0)
    assert.equal(s756.getThrowHand(t1, 0), Hand.Right)
    assert.equal(s756.getTargetHand(t1, 0), Hand.Right) // crossing
    assert.equal(s756.getThrowHand(t2, 0), Hand.Left)
    assert.equal(s756.getTargetHand(t2, 0), Hand.Right) // straight
    assert.equal(s756.getThrowHand(t1, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t2, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t1, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t2, 2), Hand.Right)
})



Deno.test("Pattern from siteswap, 7", () => {

    const s756 = createSiteswapPattern("7", { startingJuggler: 0 });
    console.log(s756.prettyPrintThrows())

    const t1= s756.findThrow(0)!
    assert.equal(t1.fromPasserIdx,0)
    assert.equal(s756.getThrowHand(t1, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t1, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t1, 2), Hand.Left)
    assert.equal(s756.getTargetHand(t1, 0), Hand.Left) // straight
})


Deno.test("Pattern from siteswap, 75", () => {

    const s756 = createSiteswapPattern("75", { startingJuggler: 0 });
    console.log(s756.prettyPrintThrows())

    const t1= s756.findThrow(0)!
    const t2= s756.findThrow(1)!
    assert.equal(t1.fromPasserIdx,0)
    assert.equal(t2.fromPasserIdx,1)
    assert.equal(s756.getThrowHand(t1, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t1, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t1, 2), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t2, 2), Hand.Right)
    assert.equal(s756.getTargetHand(t1, 0), Hand.Left) // straight
    assert(s756.isValid(), s756.getValidationError())
})


Deno.test("Pattern from siteswap, 7575", () => {

    const s756 = createSiteswapPattern("7575", { startingJuggler: 0 });
    console.log(s756.prettyPrintThrows())

    const t1= s756.findThrow(0)!
    const t2= s756.findThrow(1)!
    assert.equal(t1.fromPasserIdx,0)
    assert.equal(t2.fromPasserIdx,1)
    assert.equal(s756.getThrowHand(t1, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t1, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t1, 2), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 2), Hand.Right)
    assert.equal(s756.getTargetHand(t1, 0), Hand.Left) // straight
})


Deno.test("Pattern from siteswap, 756756", () => {

    const s756 = createSiteswapPattern("756756", { startingJuggler: 0 });
    console.log(s756.prettyPrintThrows())

    const t1= s756.findThrow(0)!
    const t2= s756.findThrow(1)!
    assert.equal(t1.fromPasserIdx,0)
    assert.equal(t2.fromPasserIdx,1)
    assert.equal(s756.getThrowHand(t1, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t1, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t1, 2), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t2, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t2, 2), Hand.Right)
    assert.equal(s756.getTargetHand(t1, 0), Hand.Left) // straight
})


Deno.test("more siteswaps", () => {
    function ensureValid(s: string) {
        const p = createSiteswapPattern(s, { });
        console.log(p.prettyPrintThrows())
        assert(p.isValid(), s+": "+p.getValidationError())    
    }

    ensureValid("7")
    ensureValid("726")
    ensureValid("77722")
    ensureValid("77880")
})