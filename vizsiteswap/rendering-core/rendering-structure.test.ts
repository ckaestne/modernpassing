import assert from "node:assert";
import { createSiteswapPattern } from "@modernpassing/parsing";
import { getThrowsFromPattern } from "./rendering-structure.ts";
import { customRendererConfigDefaults } from "./renderer-config.ts";


Deno.test("getThrowsFromPattern, 756",()=>{
    const p = createSiteswapPattern("756", {})
    const ts = getThrowsFromPattern(p, 4,customRendererConfigDefaults(p))
    
    assertPartialEqual(ts[0], {fromPasserIdx:0, toPasserIdx:1, fromHand:0, toHand:1, throwTime:0, throwLength: 7})
    assertPartialEqual(ts[1], {fromPasserIdx:1, toPasserIdx:0, fromHand:0, toHand:1, throwTime:1, throwLength: 5})
    assertPartialEqual(ts[2], {fromPasserIdx:0, toPasserIdx:0, fromHand:1, toHand:0, throwTime:2, throwLength: 6})
    
    assertPartialEqual(ts[3], {fromPasserIdx:1, toPasserIdx:0, fromHand:1, toHand:1, throwTime:3, throwLength: 7})
    assertPartialEqual(ts[4], {fromPasserIdx:0, toPasserIdx:1, fromHand:0, toHand:0, throwTime:4, throwLength: 5})
    assertPartialEqual(ts[5], {fromPasserIdx:1, toPasserIdx:1, fromHand:0, toHand:1, throwTime:5, throwLength: 6})

    assertPartialEqual(ts[6], {fromPasserIdx:0, toPasserIdx:1, fromHand:1, toHand:0, throwTime:6, throwLength: 7})
    assertPartialEqual(ts[7], {fromPasserIdx:1, toPasserIdx:0, fromHand:1, toHand:0, throwTime:7, throwLength: 5})
    assertPartialEqual(ts[8], {fromPasserIdx:0, toPasserIdx:0, fromHand:0, toHand:1, throwTime:8, throwLength: 6})
})



function assertPartialEqual(actual: any, expected: any) {
    for (const key in expected) {
        if (expected.hasOwnProperty(key)) {
            assert.deepEqual(actual[key], expected[key], `Expected ${key} to be ${expected[key]}, but got ${actual[key]} in ${JSON.stringify(actual)}`);
        }
    }
}