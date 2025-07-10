// deno-lint-ignore-file no-explicit-any
import { Svg } from "@svgdotjs/svg.js";
import fs from "node:fs";
import test from "node:test";
import { renderGroupPattern, renderPattern, renderPlainPattern } from "./renderer-svg.ts";
import { createSiteswapPattern, createSyncPattern } from "@modernpassing/parsing";
import { createSyncGroupPattern } from "../parsing/pattern-fromgroup.ts";

if (!fs.existsSync("test")) fs.mkdirSync("test");

test("create siteswap examples file", async (t) => {

    const patterns = ["77722", "972", "759", "45678", "456789a", "77a", "567", "786"]

    let content = "<!DOCTYPE html><html>"

    for (const p of patterns) {
        const pattern = createSiteswapPattern(p, {})
        const errors = pattern.getValidationError()
        // console.log(JSON.stringify(pattern.getThrows(2)))
        const svg = renderPlainPattern(pattern, { showLines: true, lineKind: "ladder", showStraightCross: true, iterations: 4, yMargin: 30 })

        content += `<h2>${p}</h2><p>${svg.svg()}</p><br/>${errors}`
    }

    content += "</html>"
    fs.writeFileSync("test/siteswaps.html", content);


})

test("create basic sync examples", async (t) => {

    const patterns = ["3p3", "3p33", "4p3,34p", "4p33p,3p4p4"]

    let content = "<!DOCTYPE html><html>"

    for (const p of patterns) {
        const pattern = createSyncPattern(p)
        const svg = renderPlainPattern(pattern, { showLines: true, lineKind: "causal", showStraightCross: true, iterations: 4 })

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
        const pattern = createSyncPattern(p)
        const svg = renderPlainPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_hl.html", content);
})


test("advanced sync patterns", async (t) => {
    const patterns: [any, string][] = [
        [{ showLines: true, lineKind: "causal", }, '3p | 333p, 3p | 34p2'],
        [{ "iterations": 3 }, '4px | !34px,4px3'],
        [{ "iterations": 4 }, '4p3,34p'],
        [{ "iterations": 4 }, '!4px3,34px'],
        [{}, '!4px33353,3534px33'],
        [{}, "3p4p3,4p34p"],
        [{}, "3p 3 4 , 4 4 3p"],
        [{}, "4p4p4,4p4p4"],
    ]

    let content = "<!DOCTYPE html><html>"

    for (const [conf, p] of patterns) {
        const pattern = createSyncPattern(p)
        const svg = renderPlainPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_adv.html", content);


})



test("jims and galloped sync patterns", async (t) => {
    const patterns: [any, string][] = [
        [{ showLines: true, lineKind: "causal", "emphasizeThrows": [2, 9, 14, 21], xDist: 80, yDist: 80 }, '3p33 3p33,3px33 3px33'],
        [{ "emphasizeThrows": [2, 7, 10, 15] }, '3p3 3p3,3px3 3px3'],
        [{ showLines: true, lineKind: "ladder", xDist: 80, yDist: 80, "emphasizeThrows": [2, 5, 8, 13, 14, 19, 22, 25, 28, 33, 34, 39] }, '3p3p33p3 3p3p33p3,3px3px33px3 3px3px33px3'],
        [{ "gallop": true, flipStraightCrossing: true, iterations: 4 }, '4px | !34px,4px3'],
        [{ "gallop": true, iterations: 4 }, '5p3'],
        [{ "gallop": true, flipStraightCrossing: true, showLines: true, xDist: 80, yDist: 80, lineKind: "ladder" }, '6p3534p3,34p36p35'],
    ]


    let content = "<!DOCTYPE html><html>"

    for (const [conf, p] of patterns) {
        const pattern = createSyncPattern(p)
        const svg = renderPlainPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_jims.html", content);


})


test("fully synchronous patterns", async (t) => {
    const patterns: [any, string][] = [
        [{ separateleftRightRows: true, showLeftRight: false, showStraightCross: false },
            '(4p 4x)(4x 2)(4x 4p)(2 4x),(4x 2)(4x 4px)(2 4x)(4px 4x)'],
        [{ separateleftRightRows: true, showLeftRight: false, showStraightCross: false, showLines: true, iterations: 8 },
            '(4px 4x),(4px 4x)'],
        [{ separateleftRightRows: true, showLeftRight: false, showStraightCross: false, showLines: true, iterations: 4 },
            '(4px 4x)(4x 4px),(4px 4x)(4x 4px)'],
        [{ separateleftRightRows: true, showLeftRight: false, showStraightCross: false, showLines: true, iterations: 4 },
            '(4px 4x)(4px 4x),(4px 4x)(4 4p)'],
        [{ separateleftRightRows: true, showLeftRight: false, showStraightCross: false, showLines: true, iterations: 8 },
            '(6px 4x)'],
        // [{ separateleftRightRows: true, showLeftRight: false, showLines: true, iterations: 4, lineKind: "ladder", yDist: 80, yHandDist: 70, xDist: 80 },
        //     '(5p 3p),3p5p'],
        [{ separateleftRightRows: true, showLeftRight: false, showLines: true, iterations: 4, lineKind: "ladder", yDist: 80, yHandDist: 60, xDist: 80 },
            '(4px 6)(2 2)(6 4px)(2 2),(2 2)(4p 6)(2 2)(6 4p)'],
        // <sync>(3px,4)(2,0),(2,0)(4,3p)</sync>       
    ]


    let content = "<!DOCTYPE html><html>"

    for (const [conf, p] of patterns) {
        const pattern = createSyncPattern(p)
        // console.log(pattern)
        // console.log(pattern.getThrows(1))
        conf.labelThrows = "simpleAllSync"
        const svg = renderPlainPattern(pattern, conf)

        content += `<h2>${p}</h2><p>${svg.svg()}</p>`
    }

    content += "</html>"
    fs.writeFileSync("test/sync_sync.html", content);


})



test("create basic group sync examples", async (t) => {

    const patterns = [
        "\nA: 3pB33\n           B: 3pC33\n            C: 3pA33\n            positions: Circle(A,B,C)",
        "\nA: 3pB333pC33\n           B: 3pC333pA33\n            C: 3pA333pB33\n            positions: Circle(A,B,C)",
        "A: 3pB333pB33\n           B: 3pC333pC33\n            C: 3pA333pA33\n            positions: Circle(A,B,C)\n\n",
        "A: 3pB3pC3\n  B: 3pA33\n C: 4pA23\n positions: V(A,B,C)",
        "A: 3pB33 3pC33 3pD33 3pE33 3  33\nB: 3pA33 3  33 3pC33 3pD33 3pE33\nC: 3pE33 3pA33 3pB33 3  33 3pD33\nD: 3  33 3pE33 3pA33 3pB33 3pC33\nE: 3pC33 3pD33 3  33 3pA33 3pB33\npositions: Circle(A,B,C,D,E)",
        "A: 3pD 3   3pC \nB: 3pC 3pD 3   \nC: 3pB 3   3pA \nD: 3pA 3pB 3   \npositions: Circle(A,B,C,D)",
        "A: 3pD 3 3 3pC 3 3 3pB 3 3 3pC 3 3\nB: 3pC 3 3pD 3 3pD 3 3pA 3 3pD 3 3pD 3\nC: 3pB 3 3 3pA 3 3 3pD 3 3 3pA 3 3\nD: 3pA 3 3pB 3 3pB 3 3pC 3 3pB 3 3pB 3\npositions: Circle(A,B,C,D)",
        "A:3\nB:3\nC:3\nD:3\nE:3\npositions: Circle(A,B,C,D,E)",
        "A: 3pC 3pD 3   3   3pD 3pE 3   3   3pE 3pC 3   3\nB: 3   3   3pE 3pC 3   3   3pC 3pD 3   3   3pD 3pE\nC: 3pA 3   3   3pB 3   3   3pB 3   3   3pA 3   3\nD: 3   3pA 3   3   3pA 3   3   3pB 3   3   3pB 3 \nE: 3   3   3pB 3   3   3pA 3   3   3pA 3   3   3pB\npositions: Trapezoid(A,B,C,D,E)",
    ]

    let content = "<!DOCTYPE html><html>"

    for (const p of patterns) {
        const pattern = createSyncGroupPattern(p)
        const [svg, js] = renderGroupPattern(pattern, { showLines: true, lineKind: "causal", showStraightCross: true, iterations: 1, showPasserRoles: true, labelThrows: "simple" })

        // let staticFrames: Svg[] = []
        // if (pattern.layout && pattern.layout.frames) {
        //     staticFrames = renderLayoutFrames(pattern.layout.frames, 200, 200)
        // }

        // content += `<h2>${p}</h2><p>${svg.svg()}</p><p>${staticFrames.map(s => s.svg())}</p>`
        content += `<h2>${p}</h2><p>${svg.svg()}</p><script>window.addEventListener("load",function(){${js}\n})\n</script><pre>${js}</pre>`
    }

    content += "     <script src=\"../../dist/animations.js\"></script>  <script src=\"../../dist/svg.min.js\"></script></html>"
    fs.writeFileSync("test/pattern_animation.html", content);


})
