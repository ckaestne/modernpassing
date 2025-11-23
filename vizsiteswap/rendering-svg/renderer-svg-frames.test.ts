// deno-lint-ignore-file no-explicit-any
import { GroupPattern } from "@modernpassing/layout";
import fs from "node:fs";
import test from "node:test";
import { createSyncGroupPattern } from "../parsing/pattern-fromgroup.ts";
import { renderGroupPatternLayoutFrames } from "./renderer-svg-frames.ts";
import { createSVG } from "@modernpassing/svg-utils";

if (!fs.existsSync("test")) fs.mkdirSync("test");

test("render scrambled v frames", async (t) => {
  const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SBl z ICl↺  
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const svg = createSVG(200,1200)
    const frames = renderGroupPatternLayoutFrames(gp, {showAnimationCounter:true, animateRoleColors: true}, svg)
    for (let i = 0; i < frames.length; i++) {
      frames[i].y(220*i)
    }
    console.log(`rendered ${frames.length} frames`)


    fs.writeFileSync("test/scrambled-v-frames.svg", svg.svg())

})
