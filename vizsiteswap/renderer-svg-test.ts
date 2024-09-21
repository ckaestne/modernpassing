import test from "node:test";
import { FourHandedSiteswap } from './siteswap.js'
import assert from "node:assert";
import { createSiteswapPattern } from "./pattern-fromsiteswap.js";
import { checkValidPattern } from "./pattern-structure.js";
import { renderPattern } from "./renderer-svg.js";
import fs from "node:fs";
import { createSyncPattern } from "./pattern-fromsync.js";

test("simple siteswap", async (t) => {
    const p = createSiteswapPattern(new FourHandedSiteswap("972"), {})
    assert.deepStrictEqual(checkValidPattern(p), []);
})


test("create siteswap examples file", async (t) => {

    const patterns = ["77722", "972", "759", "45678", "456789a", "77a", "567", "786"]

    let content = "<!DOCTYPE html><html>"

    for (const p of patterns) {
        const pattern = createSiteswapPattern(new FourHandedSiteswap(p), {})
        const errors = checkValidPattern(pattern)
        const svg = renderPattern(pattern, { showLines: true, lineKind: "ladder", showStraightCross: false, iterations: 4, yMargin: 30 })

        content += `<h2>${p}</h2><p>${svg.svg()}</p><br/>${errors}`
    }

    content += "</html>"
    fs.writeFileSync("test/siteswaps.html", content);


})

test("create basic sync examples", async (t) => {

    const patterns = ["3p3", "3p33", "4p3,34p", "4p33p,3p4p4"]

    let content = "<!DOCTYPE html><html>"

    for (const p of patterns) {
        const pattern = createSyncPattern(p, { flipStraightCrossing: true })
        const svg = renderPattern(pattern, { showLines: true, lineKind: "causal", showStraightCross: true, iterations: 4 })

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync.html", content);


})


test("highlight in sync patterns", async (t) => {
    const patterns: [any, string][] = [
        [{ "emphasizeThrows": [10, 11, 12, 13], "iterations": 1 }, '3p33 3p33 3p33 3p33,3p33 3p34p 233 3p33'],
        [{ "emphasizeThrows": [8, 9, 10, 11, 12, 13], "iterations": 1 }, '3p33 3p33 3p33 3p33,3p33 3p5p2 233 3p33'],
        [{ "emphasizeThrows": [8, 9, 10, 11], "iterations": 1 }, '3p33 3p33 3p33,3p33 3p42 3p33'],
        [{ "emphasizeThrows": [10, 11, 12, 13, 14, 15], "iterations": 1 }, '3p333 3p333 3p333,3p333 3p531 3p333']
    ]

    let content = "<!DOCTYPE html><html>"

    for (const [conf, p] of patterns) {
        const pattern = createSyncPattern(p, conf)
        const svg = renderPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_hl.html", content);
})


test("advanced sync patterns", async (t) => {
    const patterns: [any, string][] = [
        [{}, '3p3 -> 33p3, 4p23'],
        [{ "flipStraightCrossing": true, "iterations": 3 }, '4p,o -> 34p,4p3'],
        [{ "flipStraightCrossing": false, "iterations": 4 }, '4p3,34p'],
        [{ "flipStraightCrossing": true, "iterations": 4 }, '4p3,34p'],
        [{ "flipStraightCrossing": true }, '4p33353,3534p33'],
        [{}, "3p4p3,4p34p"],
        [{}, "3p 3 4 , 4 4 3p"],
        [{}, "4p4p4,4p4p4"],
    ]

    let content = "<!DOCTYPE html><html>"

    for (const [conf, p] of patterns) {
        const pattern = createSyncPattern(p, conf)
        const svg = renderPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_adv.html", content);


})



test("jims sync patterns", async (t) => {
    const patterns: [any, string][] = [
        [{ showLines: true, lineKind: "causal", "emphasizeThrows": [2, 9, 14, 21] }, '3p33 3p33,3px33 3px33'],
        [{ "emphasizeThrows": [2, 7, 10, 15] }, '3p3 3p3,3px3 3px3'],
        [{ "emphasizeThrows": [2, 5, 8,13,14,19,22, 25, 28,33,34,39] }, '3p3p33p3 3p3p33p3,3px3px33px3 3px3px33px3'],
    ]


    let content = "<!DOCTYPE html><html>"

    for (const [conf, p] of patterns) {
        const pattern = createSyncPattern(p, conf)
        const svg = renderPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_jims.html", content);


})
