import type { GroupPattern } from "@modernpassing/layout";
import fs from "node:fs";
import test from "node:test";
import { createGroupPattern } from "../parsing/pattern-fromgroup.ts";
import { renderGroupPatternLayoutFrames } from "./renderer-svg-frames.ts";
import { createSVG } from "@modernpassing/svg-utils";

if (!fs.existsSync("test")) fs.mkdirSync("test");

test("render scrambled v frames", () => {
  const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SBl z ICl↺  
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
  renderFrames(pattern, "test/scrambled-v-frames.svg")

})

test("render wankel engine", () => {
  const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
  renderFrames(pattern, "test/wankel-engine-frames.svg")
})

test("phonecian waltz", () => {
  const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
positions: Line(A, B, 0.143) `
  renderFrames(pattern, "test/phonecian-waltz.svg")
})

test("opernball", () => {
  const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   . 
positions: Line(A, B, 0.2) `
  renderFrames(pattern, "test/opernball.svg")
})

test("567 about", () => {
  const pattern = `A: 7 6 5 7 6 -- B
B:, 5 7 6 5  -- A
M:, . IAb,Co
positions: Line(A, B, 0.1) `
  renderFrames(pattern, "test/567-about.svg", 4)
})

test("brunos one count", () => {
  const pattern = `A: 3pB 3pC 3pB -- B
B: 3pA 3   3pA -- C
C: 3   3pA 3   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1,1.9)Bmove(B,2.9,1.5)Bmove(C,1.4,1.5)`
  renderFrames(pattern, "test/brunos.svg", 2)
})


test("weave", () => {
  const pattern = `A: 3pB3 3pC3 3pD3 -- A
B: 3pA3 33   33    -- B
C: 33   3pA3 33    -- C
D: 33  33   3pA3  -- D
positions: Weave(A,B,C,D)
move: move(B,0.5,1.5)move(B,2,2)move(B,4,2)  move(C,0,2)move(C,2.5,1.5)move(C,4,2)  move(D,0,2)move(D,2,2)move(D,4.5,1.5)`
  renderFrames(pattern, "test/weave.svg", 2)
})

test("roundabout", () => {
  const pattern = `A: 3pB3 33   3pB3 33 -- B
         B: 3pA3 33   3pA3 33  -- A
         M: SB z SB z  IBe . CB z
positions: Line(A,B)`
  renderFrames(pattern, "test/roundabout.svg", 2)
})



function renderFrames(pattern: string, filename: string, nrHands: number = 2) {
  const gp: GroupPattern = createGroupPattern(pattern, nrHands)

  const svg = createSVG(420, 1200)
  const frames = renderGroupPatternLayoutFrames(gp, { showAnimationCounter: true, animateRoleColors: true, positionCircle: 25, roleLabelFontSize: 14 }, svg)
  svg.height(220 * frames.length / 2)
  for (let i = 0; i < frames.length / 2; i++) {
    frames[i].y(220 * i)
    frames[i].width(200)
    frames[i].height(200)
  }
  for (let i = frames.length / 2; i < frames.length; i++) {
    frames[i].y(220 * (i - frames.length / 2))
    frames[i].x(220)
    frames[i].width(200)
    frames[i].height(200)
  }
  console.log(`rendered ${frames.length} frames`)


  fs.writeFileSync(filename, svg.svg())
}