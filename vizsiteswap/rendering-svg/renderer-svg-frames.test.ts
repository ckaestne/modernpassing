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
  renderFrames(pattern, "test/scrambled-v-frames.svg")

})

test("render wankel engine", async (t) => {
  const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
  renderFrames(pattern, "test/wankel-engine-frames.svg")
})

function renderFrames(pattern: string, filename: string) {
  const gp: GroupPattern = createSyncGroupPattern(pattern)

  const svg = createSVG(420, 1200)
  const frames = renderGroupPatternLayoutFrames(gp, { showAnimationCounter: true, animateRoleColors: true }, svg)
  svg.height(220 * frames.length/2)
  for (let i = 0; i < frames.length/2; i++) {
    frames[i].y(220 * i)
  }
  for (let i = frames.length/2; i < frames.length; i++) {
    frames[i].y(220 * (i - frames.length/2))
    frames[i].x(220)
  }
  console.log(`rendered ${frames.length} frames`)


  fs.writeFileSync(filename, svg.svg())
}