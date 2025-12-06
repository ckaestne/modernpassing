
import type { AnimationSpec } from "@modernpassing/layout";
import assert from "node:assert";
import { createGroupPattern } from "../parsing/parsing.ts";
import { findPriorIntercept, findPriorSubstitutionOrCarryAction } from "./manipulator-layout-specs.ts";
import { SubstitutionMarker } from "@modernpassing/pattern";


Deno.test('findPriorSubstitutionOrCarryAction: no prior action', () => {
    const g = createGroupPattern(
        `A: 3pB 3 3 3 -- B
        B: 3pA 3 3 3 -- A
        M: SAB
        positions: Line(A,B)`
        , 2, false, false, true)

    const substitutedPass = g.pattern.findThrow(0,0)
    assert(substitutedPass && substitutedPass.markers?.some(m => m.kind === "S"), "found substituted pass")

    assert.throws(() => findPriorSubstitutionOrCarryAction(g.pattern, substitutedPass))
})

Deno.test('findPriorSubstitutionOrCarryAction: scrambled v', () => {
    const g = createGroupPattern(
        `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
        , 2, false, false, true)

    const carriedPass = g.pattern.findThrow(0,3)
    assert(carriedPass && carriedPass.markers?.some(m => m.kind === "C"), "not found carried pass")
    const substitutedSelf = g.pattern.findThrow(2,1)
    assert(substitutedSelf && substitutedSelf.markers?.some(m => m.kind === "S" && (m as SubstitutionMarker).throw === "P"), "not found substituted self")
    const interceptedSelf = g.pattern.findThrow(4,2)
    assert(interceptedSelf && interceptedSelf.markers?.some(m => m.kind === "I"), "not found intercepted self")

    assert.equal(findPriorSubstitutionOrCarryAction(g.pattern, substitutedSelf), carriedPass)
    assert.deepEqual(findPriorSubstitutionOrCarryAction(g.pattern, interceptedSelf), substitutedSelf)
    assert.equal(findPriorIntercept(g.pattern, carriedPass), interceptedSelf)
})
