import assert, { fail } from "node:assert";
import fs from "node:fs";
import test from "node:test";
import { createSyncPattern, parseSyncPattern } from "./pattern-fromsync.js";
import { replaceElement } from "./replace-util.js";

test("parse simple pattern", async (t) => {
    parseSyncPattern("3 -> (3px,4) 3(3,3p),333")
})

test("parse patterns from sync.md", async (t) => {

    const fileContent = fs.readFileSync("test/sync.md", "utf-8")

    const ps: string[] = []
    const result = replaceElement("sync", fileContent, (match: string, inner: string, config: any) => {
        ps.push(inner)
        return ""
    })

    for (const p of ps) {
        try {
            parseSyncPattern(p)
        } catch (e) {
            console.log("failed to parse ", p)
            throw e
        }
    }

})

test("reject invalid patterns", async (t) => {
    //assert exception
    assert.throws(() => parseSyncPattern("3,33"))
    assert.throws(() => parseSyncPattern("3h,33"))
    assert.throws(() => parseSyncPattern("3(3,3)3,33"))
})




test("sync pattern regression tests", async (t) => {

    const patterns: [any, string][] = [
        [        {},"3p3"], 
        [{},"3p33"], 
        [{}, "4p33p,3p4p4"],
        [{ "emphasizeThrows": [10, 11, 12, 13], "iterations": 1 }, '3p33 3p33 3p33 3p33,3p33 3p34p 233 3p33'],
        //advanced
        [{}, '3p3 -> 33p3, 4p23'],
                [{ "flipStraightCrossing": true, "iterations": 3 }, '4p,o -> 34p,4p3'],
                [{ "flipStraightCrossing": false, "iterations": 4 }, '4p 3 , 3 4p'],
                [{ "flipStraightCrossing": true, "iterations": 4 }, '4p3, 34p'],
                [{ "flipStraightCrossing": true }, '4p33353,3534p33'],
                [{}, "3p4p3,4p34p"],
                [{}, "3p 3 4 , 4 4 3p"],
                [{}, "4p4p4,4p4p4"],
                [{}, "3p33 3p33,3px33 3px33"],
                // [{}, "3px3px33px33px3px33px3,3p3p33p33p3p33p3"],
    ] 

    const knownPatternStructures = JSON.parse(fs.readFileSync("test/sync-patterns-oracle.json", "utf-8"))
   
    for (const [conf,p] of patterns) {
        const pattern = createSyncPattern(p, conf)
        const sh = pattern.startingHands
        const iterations = conf.iterations || 2
        const ts = pattern.getThrows(iterations)

        // console.log(`"${p}":\n\t`+JSON.stringify({startingHands: sh, throws: ts})+",\n")

        const known = knownPatternStructures[p]
        if (!known) fail("no oracle for pattern " + p)
        if (!known.startingHands) fail("no startingHands oracle for pattern " + p)
        if (!known.throws) fail("no throws oracle for pattern " + p)

        assert.deepStrictEqual(sh, known.startingHands, "changed starting hands for " + p)
        assert.deepStrictEqual(ts, known.throws, "changed throws for " + p)
    } 

})


