import test from "node:test";
import { FourHandedSiteswap } from './siteswap.js'
import assert from "node:assert";
import { createSiteswapPattern } from "./pattern-fromsiteswap.js";
import { checkValidPattern } from "./pattern-structure.js";
import { renderPattern } from "./renderer-svg.js";
import fs from "node:fs";

test("simple siteswap", async (t) => {
    const p = createSiteswapPattern(new FourHandedSiteswap("972"),{})
    assert.deepStrictEqual(checkValidPattern(p), []);
})


test("create examples file", async (t) => {

    const patterns =["77722","972","759","45678","456789a","77a","567","786"]

    let content = "<!DOCTYPE html><html>"
    
    for (const p of patterns) {
        const pattern = createSiteswapPattern(new FourHandedSiteswap(p),{})
        const errors = checkValidPattern(pattern)
        const svg = renderPattern(pattern, {showLines:true, lineKind:"ladder",showStraightCross:false,iterations:4,yMargin:30})

        content += `<h2>${p}</h2><p>${svg.svg()}</p><br/>${errors}`
    }

    content += "</html>"
    fs.writeFileSync("test/test.html", content);


})