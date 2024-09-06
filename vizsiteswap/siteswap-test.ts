import test from "node:test";
import { FourHandedSiteswap } from './siteswap.js'
import assert from "node:assert";

test("siteswap thrownNext", async (t) => {
    const sw = new FourHandedSiteswap("786");
    assert.strictEqual(sw.thrownNext(0), 7); 
    assert.strictEqual(sw.thrownNext(3), 10); 
    assert.strictEqual(sw.thrownNext(1), 9); 
    assert.strictEqual(sw.thrownNext(-3), 4); 
})
test("siteswap thrownPreviously", async (t) => {
    const sw = new FourHandedSiteswap("786");
    assert.strictEqual(sw.thrownPreviously(7), 0); 
    assert.strictEqual(sw.thrownPreviously(10), 3); 
    assert.strictEqual(sw.thrownPreviously(9), 1); 
    assert.strictEqual(sw.thrownPreviously(4), -3); 
    assert.strictEqual(sw.thrownPreviously(0), -8); 
    assert.strictEqual(sw.thrownPreviously(5), -1); 
    assert.strictEqual(sw.thrownPreviously(3), -5); 
})
test("siteswap causes", async (t) => {
    const sw = new FourHandedSiteswap("786");
    assert.strictEqual(sw.causes(0), 7-4); 
    assert.strictEqual(sw.causes(3), 10-4); 
    assert.strictEqual(sw.causes(1), 9-4); 
    assert.strictEqual(sw.causes(-3), 4-4); 
})
test("siteswap causedBy", async (t) => {
    const sw = new FourHandedSiteswap("786");
    assert.strictEqual(sw.causedBy(7-4), 0); 
    assert.strictEqual(sw.causedBy(10-4), 3); 
    assert.strictEqual(sw.causedBy(9-4), 1); 
    assert.strictEqual(sw.causedBy(4-4), -3); 
    assert.strictEqual(sw.causedBy(0-4), -8); 
    assert.strictEqual(sw.causedBy(5-4), -1); 
    assert.strictEqual(sw.causedBy(3-4), -5); 
})
test("siteswap starting hands", async (t) => {
    const sw = new FourHandedSiteswap("786");
    assert.deepStrictEqual(sw.getStartingHands(), [[2,2],[2,1]]); 
})

