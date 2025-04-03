import  assert  from "node:assert";
import { createSiteswapPatternStr } from "./pattern-fromsiteswap.ts";
import { Hand } from "../pattern/pattern.ts";


Deno.test("Pattern from siteswap, 756", () => {

    const s756 = createSiteswapPatternStr("756", {  });
    console.log(s756.prettyPrintThrows())
    const t7=s756.findThrow(0)!
    const t5=s756.findThrow(1)!
    const t6=s756.findThrow(2)!
    assert.equal(t7.toPasserIdxAtThrow, 1);
    assert.equal(t5.toPasserIdxAtThrow, 0);
    assert.equal(t6.toPasserIdxAtThrow, 0);
    assert.equal(t7.fromPasserIdx,0)
    assert.equal(t5.fromPasserIdx,1)
    assert.equal(t6.fromPasserIdx,0)
    assert.equal(t7.fromHand,Hand.Right)
    assert.equal(t5.fromHand,Hand.Right)
    assert.equal(t6.fromHand,Hand.Left)
    assert.equal(s756.getThrowHand(t7, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t7, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 3), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t5, 3), Hand.Left)
    assert.equal(t7.isCrossing, true)
    assert.equal(t5.isCrossing, true)
    assert.equal(t6.isCrossing, true)
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

    const s756 = createSiteswapPatternStr("756", { startingJuggler: 1 });
    console.log(s756.prettyPrintThrows())
    const t7=s756.findThrow(0)!
    const t5=s756.findThrow(1)!
    const t6=s756.findThrow(2)!
    assert.equal(t7.toPasserIdxAtThrow, 1);
    assert.equal(t5.toPasserIdxAtThrow, 0);
    assert.equal(t6.toPasserIdxAtThrow, 0);
    assert.equal(t7.fromPasserIdx,0)
    assert.equal(t5.fromPasserIdx,1)
    assert.equal(t6.fromPasserIdx,0)
    assert.equal(t7.fromHand,Hand.Right)
    assert.equal(t5.fromHand,Hand.Right)
    assert.equal(t6.fromHand,Hand.Left)
    assert.equal(s756.getThrowHand(t7, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t7, 1), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t7, 3), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 0), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 1), Hand.Right)
    assert.equal(s756.getThrowHand(t5, 2), Hand.Left)
    assert.equal(s756.getThrowHand(t5, 3), Hand.Left)
    assert.equal(t7.isCrossing, true)
    assert.equal(t5.isCrossing, true)
    assert.equal(t6.isCrossing, true)
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

