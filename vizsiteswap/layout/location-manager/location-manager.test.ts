import type { AnimationSpec, GroupPattern } from "../layout.ts"
import { createGroupPattern, createSyncGroupPattern } from "../../parsing/pattern-fromgroup.ts"
import assert from "node:assert"
import test from "node:test"
import { Hand, type Role } from "@modernpassing/pattern"
import { assertEqualLocation, assertLocationBetween, assertLocationInFrontOf } from "../location-test-helpers.ts"
import { createBaseLocationManager, createFullLocationManager, type LocationManager } from "./location-manager.ts"
import { createPasserIdx, type PasserIdx } from "./helpers.ts"
import { computeLocationInBetween, computeLocationInFrontOf, createResolvedMovementSegmentFromSegmentSpec, ignoreOngoingOrNextDueToFirstIteration, MovementSegment, type MovementTracker, overlap } from "./relative-movement.ts"
import type { Svg } from "@svgdotjs/svg.js"
import { createSVG } from "@modernpassing/svg-utils"
import { createAnimationPlan } from "../create-animation-plan.ts"
import path from "node:path"

Deno.test("baseLocationMgr for moving feed (V)", () => {
    const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const baseAnimations = createBaseLocationManager(gp.layout!.animation)
    assertVLocationManager(baseAnimations)
})

function hasMovement(locationMgr: LocationManager, time: number, passerId: number): boolean {
    return locationMgr.movementTracker.movements.some((m) => m.onBeat === time && m.passerIdx === passerId)
}

function assertVLocationManager(locationMgr: LocationManager) {
    // check basic internal structures
    assert.equal(locationMgr.mod, 72)

    assert.ok(hasMovement(locationMgr, 4.9, 1)) // B in the first iteration
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find((r) => r[0] === 0)![1], ["A", "B", "C"])

    assert.ok(hasMovement(locationMgr, 4.9 + 6, 0)) // B after relabeling, which was A at the beginning
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find((r) => r[0] === 6)![1], ["B", "C", "A"])

    assert.ok(hasMovement(locationMgr, 4.9 + 12, 2))
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find((r) => r[0] === 12)![1], ["C", "A", "B"])

    assert.ok(hasMovement(locationMgr, 4.9 + 18, 1))
    assert.deepEqual(locationMgr.roleTracker.roleMapping.find((r) => r[0] === 18)![1], ["A", "B", "C"])

    // now let's try locations
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), [0.5, 0]) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0.75, 0.933]) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "C"), [0.25, 0.933]) // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, "C"), [0, 0.53]) // should be at the start again, but this time mid-walk

    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), locationMgr.getLocationByRole(4.8, "B")) // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, "C"), [.933, .25]) // B fully moved (and is now C)
    assertEqualLocation(locationMgr.getLocationByRole(5, "B"), [0.77, 0.919]) // moved only a bit
    assertEqualLocation(locationMgr.getLocationByRole(7.8, "C"), [0.9455, 0.273]) // almost arrived
}

Deno.test("full locationMgr for moving feed (V) should be the same as base", () => {
    const pattern = `A: 3pB3  3pC3  3pB3  -- B
    B: 3pA3  3  3  3pA3 -- C
    C: 3 3 3pA3  3  3  -- A
    positions: V(A,B,C)
    move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const fullLocationMgr = createFullLocationManager(gp.layout!.animation)

    assertVLocationManager(fullLocationMgr)
})

Deno.test("locationMgr for scrambled v -- movement", () => {
    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    assert.deepEqual(locationMgr.roleTracker.roles, ["A", "B", "C", "M"])

    // 1/B walks first
    function assertMovement(time: number, passerIdx: PasserIdx, asRole: string) {
        assert(locationMgr.roleTracker._getPasserIdx(time, asRole) === passerIdx, `Expected passerIdx for role ${asRole} at time ${time} to be ${passerIdx}, but got ${locationMgr.roleTracker._getPasserIdx(time, asRole)}`)
        const movementLookupByPasserIdx = locationMgr.movementTracker.movements.find((m) => m.onBeat === time && m.passerIdx === passerIdx)
        assert.ok(movementLookupByPasserIdx, `Expected movement for ${passerIdx} at time ${time} to be defined`)
        // assert.equal(locationMgr._getMovementByRole(time, asRole), movementLookupByPasserIdx, `Expected movement lookup by role ${asRole} to match that by passerIdx ${passerIdx}`);
    }

    // original B walks first
    assertMovement(4.9, createPasserIdx(1), "B")
    // next previous A, now B walks
    assertMovement(4.9 + 6, createPasserIdx(0), "B")
    // next previous A, now B walks
    assertMovement(4.9 + 6 * 2, createPasserIdx(3), "B")
    // next previous A, now B walks
    assertMovement(4.9 + 6 * 3, createPasserIdx(2), "B")
})

Deno.test("locationMgr for scrambled v -- locations", () => {
    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // now let's try locations
    const initialC: [number, number] = [0.25, 0.933]
    const initialA: [number, number] = [0.5, 0]
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), initialA) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0.75, 0.933]) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "C"), initialC) // should be at start, skipping the initial mid-walk start
    // in the second round, C is still moving for the first few beats
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, "C"), [0, 0.53]) // should be at the start again, but this time mid-walk
    assertEqualLocation(locationMgr.getLocationByRole(1 + locationMgr.mod, "C"), [0.08, 0.77])
    assertEqualLocation(locationMgr.getLocationByRole(1.5 + locationMgr.mod, "C"), [0.17, 0.87])

    // B is moving, not affected by manipulation
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), locationMgr.getLocationByRole(3.8, "B")) // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, "C"), [.933, .25]) // B fully moved (and is now C)
    assertEqualLocation(locationMgr.getLocationByRole(5, "B"), [0.77, 0.919]) // moved only a bit
    assertEqualLocation(locationMgr.getLocationByRole(7.8, "C"), [0.9455, 0.273]) // almost arrived

    // once M becomes C on beat 5, they move to C's old spot for 1 beat
    assert.equal(locationMgr.roleTracker._getPasserIdx(4.9, "M"), locationMgr.roleTracker._getPasserIdx(5, "C")) // relabel, nothing else changes
    assert.equal(locationMgr.roleTracker._getPasserIdx(4.9, "C"), locationMgr.roleTracker._getPasserIdx(5, "M")) // relabel, nothing else changes
    assert.equal(locationMgr.roleTracker._getPasserIdx(5, "C"), createPasserIdx(3)) // former M is now C
    assert.equal(locationMgr.roleTracker._getPasserIdx(6, "A"), createPasserIdx(3)) // former M is A in the next cycle
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), initialC)
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), locationMgr.getLocationByRole(4.9, "C")) // stay there and come A

    // so, now let's track what M is doing
    // M starts with a carry, between A and B
    assertLocationBetween(locationMgr.getLocationByRole(0, "M"), locationMgr.getLocationByRole(0, "A"), locationMgr.getLocationByRole(0, "B"))
    // after that M moves to stand in front of B
    assertLocationBetween(locationMgr.getLocationByRole(2, "M"), locationMgr.getLocationByRole(2, "B"), [.5, .5])
    // then M stands in front of C to intercept a self
    const inFrontOfC = locationMgr.getLocationByRole(4, "M")
    assertLocationBetween(inFrontOfC, locationMgr.getLocationByRole(4, "C"), [.5, .5])
    assertEqualLocation(locationMgr.getLocationByRole(4, "C"), initialC) // C still moving, not switched roles yet
    assert.equal(locationMgr.roleTracker._getPasserIdx(4, "C"), 2)
    // afterward M becomes C, still in old position about to walk
    assert.equal(locationMgr.roleTracker._getPasserIdx(5, "C"), 3)
    assertEqualLocation(locationMgr.getLocationByRole(5, "M"), initialC) // new C
    assertEqualLocation(locationMgr.getLocationByRole(5, "C"), inFrontOfC)
    // now C and M both walk
    assertLocationBetween(locationMgr.getLocationByRole(5.5, "C"), initialC, inFrontOfC) // prior M, now C
    assertLocationBetween(locationMgr.getLocationByRole(5.5, "M"), initialC, initialA) // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), initialC) // prior M, was briefly C, is now A
    assertLocationBetween(locationMgr.getLocationByRole(6, "M"), locationMgr.getLocationByRole(6, "A"), locationMgr.getLocationByRole(6, "B")) // prior C as M between A and B
})

Deno.test("locationMgr for scrambled v, with bend in take", () => {
    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SBl z ICl↺  
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // everything same as above
    const initialC: [number, number] = [0.25, 0.933]

    // now C and M both walk, but both walk on a curve
    assertEqualLocation(locationMgr.getLocationByRole(5.5, "C"), [0.30, 0.73]) // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(5.5, "M"), [0.4, 0.67]) // prior M, now C
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), initialC) // prior M, was briefly C, is now A
    assertLocationBetween(locationMgr.getLocationByRole(6, "M"), locationMgr.getLocationByRole(6, "A"), locationMgr.getLocationByRole(6, "B")) // prior C as M between A and B
})

Deno.test("locationMgr for minied (weird start with take on 0)", () => {
    // here we expect to see differences between the first and later iterations

    const pattern = `A: 3pB 3pC 3  3pB 3   3 -- B
B: 3pA 3   3  3pA 3pC 3 -- C
C: 3   3pA 3  3   3pB 3 -- A
M: CB  .   SBe .   SCl  IC 
positions: VL(A,B,C)
move: Vmove(C,1.9,2)Vmove(A,3.9,2)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const plan = createAnimationPlan(gp.layout!.animation, .1)

    assert.deepEqual(locationMgr.roleTracker.roles, ["M", "B", "C", "A"])

    assert.equal(locationMgr.mod, 72)

    // now let's try locations
    const initialC: [number, number] = [0.25, 0.933]
    const initialB: [number, number] = [0.75, 0.933]
    const walkingCStart: [number, number] = [0, 0.53]
    const initialA: [number, number] = [0.5, 0]
    const inFrontOfA: [number, number] = [0.5, 0.4]
    const center: [number, number] = [0.5, 0.5]
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), initialA)
    assertEqualLocation(locationMgr.getLocationByRole(72, "A"), inFrontOfA)
    assertEqualLocation(locationMgr.getLocationByRole(1, "A"), initialA)
    assertEqualLocation(locationMgr.getLocationByRole(73, "A"), initialA)

    assertLocationBetween(locationMgr.getLocationByRole(72, "M"), inFrontOfA, initialB)
    assertLocationBetween(locationMgr.getLocationByRole(0, "M"), initialA, initialB)

    const iA = locationMgr.getInitialPositions().find((p) => p[0] === 3)!
    assertEqualLocation([iA[1], iA[2]], initialA)
})
Deno.test("locationMgr for wankel engine (mid-walk swap with manipulator)", () => {
    // here we expect to see differences between the first and later iterations

    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const plan = createAnimationPlan(gp.layout!.animation, .1)

    assert.deepEqual(locationMgr.roleTracker.roles, ["A", "B", "C", "M"])

    assert.equal(locationMgr.mod, 72)

    // now let's try locations
    const initialC: [number, number] = [0.25, 0.933]
    const walkingCStart: [number, number] = [0, 0.53]
    const initialA: [number, number] = [0.5, 0]
    const center: [number, number] = [0.5, 0.5]
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), initialA) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0.75, 0.933]) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "C"), initialC) // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, "C"), walkingCStart) // should be at the start again, but this time mid-walk
    assertEqualLocation(locationMgr.getLocationByRole(71.999, "B"), walkingCStart) // just before the start, walking position, both in first and later iterations
    assertEqualLocation(locationMgr.getLocationByRole(71.999 + 72, "B"), walkingCStart) // just before the start, walking position, both in first and later iterations
    const cMoving = plan.movementAnimations.filter((m) => m.passerIdx === 2 && m.onBeat === 70.9)
    assert(cMoving.length === 1, "Expected one movement for C at 70.9")

    assertLocationBetween(locationMgr.getLocationByRole(0, "M"), center, initialC)
    const inFrontOfC = locationMgr.getLocationByRole(0, "M")
    assertLocationBetween(locationMgr.getLocationByRole(72, "M"), center, walkingCStart)
    const inFrontOfWalkingC = locationMgr.getLocationByRole(72, "M")

    // 0: IC
    assertLocationBetween(locationMgr.getLocationByRole(locationMgr.mod, "M"), center, walkingCStart)
    assert.equal(locationMgr.roleTracker._getPasserIdx(1, "C"), locationMgr.roleTracker._getPasserIdx(0, "M"))
    assert.equal(locationMgr.roleTracker._getPasserIdx(1, "M"), locationMgr.roleTracker._getPasserIdx(0, "C"))

    // console.log("inFrontOfC:", inFrontOfC);
    // console.log("inFrontOfWalkingC:", inFrontOfWalkingC);
    const firstMoveMFirstRound = plan.movementAnimations.find((m) => m.onBeat === 1 && m.passerIdx === 3 && m.firstIteration === true)
    const firstMoveMSecondRound = plan.movementAnimations.find((m) => m.onBeat === 1 && m.passerIdx === 3 && m.firstIteration === false)
    assertEqualLocation([firstMoveMFirstRound!.movementSpec.fromX, firstMoveMFirstRound!.movementSpec.fromY], inFrontOfC)
    assertEqualLocation([firstMoveMFirstRound!.movementSpec.toX, firstMoveMFirstRound!.movementSpec.toY], initialC)
    assertEqualLocation([firstMoveMSecondRound!.movementSpec.toX, firstMoveMSecondRound!.movementSpec.toY], initialC)
    assertEqualLocation([firstMoveMSecondRound!.movementSpec.fromX, firstMoveMSecondRound!.movementSpec.fromY], inFrontOfWalkingC)
    // M takes C's position
    assertEqualLocation(locationMgr.getLocationByRole(1, "C"), inFrontOfC)
    assertLocationBetween(locationMgr.getLocationByRole(1.5, "C"), inFrontOfC, initialC)
    assertEqualLocation(locationMgr.getLocationByRole(2, "C"), initialC) // should be at start, skipping the initial mid-walk start

    for (let beat = 2; beat <= locationMgr.mod; beat += 1) {
        for (const role of ["A", "B", "C", "M"] as Role[]) {
            assertEqualLocation(locationMgr.getLocationByRole(beat, role), locationMgr.getLocationByRole(beat + locationMgr.mod, role), `Expected location for role ${role} at beat ${beat} to be the same in first and second iteration`)
        }
    }
})

Deno.test("location manager for opernball", () => {
    const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   . 
positions: Line(A, B, 0.2) `
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const plan = createAnimationPlan(gp.layout!.animation, .1)

    const lA: [number, number] = [0.2, 0.5]
    const lB: [number, number] = [0.8, 0.5]
    const lMleft: [number, number] = [.44, 0.7]
    const lMright: [number, number] = [.56, 0.7]
    const lN: [number, number] = [0.5, 0.3]
    const lO: [number, number] = [.92, 0.5]
    const lOM: [number, number] = [.08, 0.5]
    const pA = locationMgr.roleTracker._getPasserIdx(0, "A")
    const pB = locationMgr.roleTracker._getPasserIdx(0, "B")
    const pM = locationMgr.roleTracker._getPasserIdx(0, "M")
    const pN = locationMgr.roleTracker._getPasserIdx(0, "N")
    const pO = locationMgr.roleTracker._getPasserIdx(0, "O")

    const mt = locationMgr.movementTracker
    assertEqualLocation(mt._getLocation(0, pA), lA)
    assertEqualLocation(mt._getLocation(0, pB), lB)
    // M starts south in the middle and N north
    assertEqualLocation(mt._getLocation(0, pM), lMright)
    assertEqualLocation(mt._getLocation(0, pN), lN)
    // O starts behind B
    assertEqualLocation(mt._getLocation(0, pO), lO)

    // original B starts moving to carry pass on 1;
    const carry = plan.movementAnimations.filter((m) => m.passerIdx === pB && m.onBeat === 0.5)
    assert(carry.length === 1, "Expected one carry movement for B at 0.5")
    assertLocationBetween(mt._getLocation(1, pB), lB, lA)
    // on beat 1, O moves into B's position
    assertEqualLocation(mt._getLocation(2, pO), lB)
    // on beat 2, M moves to N's position, N moves behind A, O moves to M's position -- O is a bit offset here, because they stand between O and N (the passer behind A), not A
    assertEqualLocation(mt._getLocation(3, pM), lN)
    assertEqualLocation(mt._getLocation(3, pN), lOM)
    const _OsmoveAfterCarry = plan.movementAnimations.filter((m) => m.passerIdx === pB && m.onBeat === 2)
    assert(_OsmoveAfterCarry.length === 1, "Expected one movement for B at 2 (to M's initial position)")
    assertEqualLocation(mt._getLocation(3, pB), lMleft)

    // now A moved to the middle for the carry on 4
    assertLocationBetween(mt._getLocation(4, pA), lA, lB)
    // on beat 5, N has moved into A's position
    assertEqualLocation(mt._getLocation(5, pN), lA)
    // on beat 6, M has moved to O's initial position, O moved to N's position, A moved to M's position
    assertEqualLocation(mt._getLocation(6, pM), lO)
    assertEqualLocation(mt._getLocation(6, pB), lN)
    assertEqualLocation(mt._getLocation(6, pA), lMright)

    // now O moved to the middle for the carry on 7
    assertLocationBetween(mt._getLocation(7, pO), lB, lA)
    // on beat 8, M has moved into O's position
    assertEqualLocation(mt._getLocation(8, pM), lB)
    // on beat 9, N has moved to A's position, B to N's position, O to M's position
    assertEqualLocation(mt._getLocation(9, pN), lA)
    assertEqualLocation(mt._getLocation(9, pB), lOM)
    const _MsmoveAfterCarry = plan.movementAnimations.filter((m) => m.passerIdx === pO && m.onBeat === 8)
    assert(_MsmoveAfterCarry.length === 1, "Expected one movement for O at 8 (to M's initial position)")
    // console.log(_MsmoveAfterCarry)
    assertEqualLocation(mt._getLocation(9, pO), lMleft)
})

test("location manager for 567-about", () => {
    const pattern = `A: 7 6 5 7 6 -- B
B:, 5 7 6 5  -- A
M:, . IAb,Co
positions: Line(A, B, 0.2) `
    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const mt = locationMgr.movementTracker

    const lA: [number, number] = [0.2, 0.5]
    const lB: [number, number] = [0.8, 0.5]
    const carryOffset = .012
    const lCarryTL: [number, number] = [.5 - carryOffset, 0.3]
    const lCarryTR: [number, number] = [.5 + carryOffset, 0.3]
    const lCarryBL: [number, number] = [.5 - carryOffset, 0.7]
    const lCarryBR: [number, number] = [.5 + carryOffset, 0.7]
    const lBehindA: [number, number] = [.08, 0.5]
    const lBehindB: [number, number] = [.92, 0.5]
    const pA = locationMgr.roleTracker._getPasserIdx(0, "A")
    const pB = locationMgr.roleTracker._getPasserIdx(0, "B")
    const pM = locationMgr.roleTracker._getPasserIdx(0, "M")

    // initial positions
    assertEqualLocation(mt._getLocation(0, pA), lA)
    assertEqualLocation(mt._getLocation(0, pB), lB)
    // assertEqualLocation(mt._getLocation(0, pM), lBehindA)

    // M intercepts pass on 3, arriving on 6
    assert.ok(gp.pattern.findThrow(3, pB, pM)!.markers?.find((m) => m.kind === "I"), "expected intercepted pass on 3")
    assertEqualLocation(mt._getLocation(6, pM), lBehindA)

    // next A carries on 6, arriving for the intercept behind B on 9+6, M steps in arriving on 7
    assert.ok(gp.pattern.findThrow(6, pA)!.markers?.find((m) => m.kind === "C"), "expected carry on 6")
    assertEqualLocation(mt._getLocation(9, pA), lCarryTR)
    assertEqualLocation(mt._getLocation(15, pA), lBehindB)
    assertEqualLocation(mt._getLocation(7, pM), lA)

    // next B carries on 9+6, arriving behind M on 9*2+6, A steps in arriving on 9+7
    assertEqualLocation(mt._getLocation(9 + 6, pB), lCarryTL)
    assertEqualLocation(mt._getLocation(9 * 2 + 6, pB), lBehindA)
    assertEqualLocation(mt._getLocation(9 + 7, pA), lB)

    // next M carries on 9*2+6, arriving behind A on 9*3+6, B steps in arriving on 9*2+7
    assertEqualLocation(mt._getLocation(9 * 2 + 6, pM), lCarryBR)
    assertEqualLocation(mt._getLocation(9 * 3 + 6, pM), lBehindB)
    assertEqualLocation(mt._getLocation(9 * 2 + 7, pB), lA)

    // next A carries on 9*3+6, arriving for the intercept behind B on 9*4+6, M steps in arriving on 9*3+7
    assertEqualLocation(mt._getLocation(9 * 3 + 6, pA), lCarryBL)
    assertEqualLocation(mt._getLocation(9 * 4 + 6, pA), lBehindA)
    assertEqualLocation(mt._getLocation(9 * 3 + 7, pM), lB)

    // repeat with shifted roles
    assertEqualLocation(mt._getLocation(9 * 4 + 6, pB), lCarryTR)
    assertEqualLocation(mt._getLocation(9 * 5 + 6, pB), lBehindB)
    assertEqualLocation(mt._getLocation(9 * 4 + 7, pA), lA)
})

Deno.test("locationMgr for brunos", () => {
    const pattern = `A: 3pB 3pC 3pB -- B
B: 3pA 3   3pA -- C
C: 3   3pA 3   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1,1.9)Bmove(B,2.9,1.5)Bmove(C,1.4,1.5)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const locationMgr = createFullLocationManager(gp.layout!.animation)

    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), [0, .8])
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [1, .8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "B"), [.69, .80])
    assertEqualLocation(locationMgr.getLocationByRole(2.9, "B"), [.5, .6])
    assertEqualLocation(locationMgr.getLocationByRole(3, "C"), [.48, .58])
    assertEqualLocation(locationMgr.getLocationByRole(3.1, "C"), [.45, .55])

    assertEqualLocation(locationMgr.getLocationByRole(2, "A"), [0, .8])
    assertEqualLocation(locationMgr.getLocationByRole(2.9, "A"), [0, .8])
    assertEqualLocation(locationMgr.getLocationByRole(3, "B"), [0, .8])
    assertEqualLocation(locationMgr.getLocationByRole(3.1, "B"), [0, .8])
})

Deno.test.ignore("debugging: plot location dependencies for opernball", () => {
    const pattern = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   .  `
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const svg = plotRelativeDependencies(locationMgr.movementTracker)
    Deno.writeFileSync("opernball-relative-movements.svg", new TextEncoder().encode(svg.svg()), { create: true, append: false })
})

Deno.test.ignore("debugging: plot location dependencies in locationMgr for scrambled v", () => {
    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)

    const locationMgr = createFullLocationManager(gp.layout!.animation)
    const svg = plotRelativeDependencies(locationMgr.movementTracker)
    Deno.writeFileSync("scrambled-v-relative-movements.svg", new TextEncoder().encode(svg.svg()), { create: true, append: false })
})

Deno.test("skipInFirstIteration spec: setup only", () => {
    const [locationMgr, _m1, _m2] = createBasicTwoMoveAnimation(0, false, 2, false)
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(3, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0, 1])
    assertEqualLocation(locationMgr.getLocationByRole(3, "B"), [0, 1])
    assertEqualLocation(locationMgr.getLocationByRole(6, "B"), [0, 1])
})

Deno.test("skipInFirstIteration spec: basic test", () => {
    const [locationMgr, _m1, _m2] = createBasicTwoMoveAnimation(0, false, 2, false)
    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(1, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(4, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.2])
})

Deno.test("skipInFirstIteration spec: basic skip", () => {
    const [locationMgr, _m1, _m2] = createBasicTwoMoveAnimation(0, true, 2, false)
    assert(!locationMgr.movementTracker.hasUnresolvedMovements(), "Expected all movements to be resolved")
    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(1, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(3, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(4, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(7, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0, 0.8])
})

Deno.test("skipInFirstIteration spec: wrap around", () => {
    const [locationMgr, _m1, _m2] = createBasicTwoMoveAnimation(5, true, 2, false)
    // assert(!locationMgr.movementTracker.hasUnresolvedMovements(), "Expected all movements to be resolved")

    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(3, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(4, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(5, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(7, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0, 0.8])
})

Deno.test("skipInFirstIteration spec: wrap around without explicit skipFirst=true", () => {
    // we still expect to skip the wrap movement in the first iteration because it wraps
    const [locationMgr, _m1, _m2] = createBasicTwoMoveAnimation(5, false, 2, false)

    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(3, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(4, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(5, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(7, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0, 0.8])
})

Deno.test("skipInFirstIteration spec: wrap around order check", () => {
    // the order of the steps should not matter
    const [locationMgr, _m1, _m2] = createBasicTwoMoveAnimation(2, false, 5, false)

    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(3, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(4, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(5, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(7, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0, 0.2])
})

const inFrontOf08 = [0.4, 0.56]
const inFrontOf05 = [0.4, 0.5]
const inFrontOf02 = [0.4, 0.44]
Deno.test("skipInFirstIteration spec: dependent movements no skipFirst", () => {
    // the order of the steps should not matter
    const [locationMgr, _m1, _m2, _d1, _d2] = createDependentMoveAnimation(0, false, 2, false, 0, false, 1, false)

    assertEqualLocation(locationMgr.getLocationByRole(1, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(1, "N"), inFrontOf05)
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "N"), inFrontOf08)
})
Deno.test("skipInFirstIteration spec: dependent movements 1", () => {
    // the order of the steps should not matter
    const [locationMgr, _m1, _m2, _d1, _d2] = createDependentMoveAnimation(0, true, 2, false, 0, false, 1, false)

    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(1, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(7, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0, 0.8])

    assertEqualLocation(locationMgr.getLocationByRole(0, "N"), inFrontOf08)
    assertEqualLocation(locationMgr.getLocationByRole(1, "N"), inFrontOf08)
    assertEqualLocation(locationMgr.getLocationByRole(2, "N"), inFrontOf08)
    assertEqualLocation(locationMgr.getLocationByRole(7, "N"), inFrontOf05)
    assertEqualLocation(locationMgr.getLocationByRole(8, "N"), inFrontOf08)
})
Deno.test("skipInFirstIteration spec: dependent movements 2", () => {
    // the order of the steps should not matter
    const [locationMgr, _m1, _m2, _d1, _d2] = createDependentMoveAnimation(5, false, 2, false, 0, false, 1, false)

    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(1, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(5, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [0, 0.5])
    assertEqualLocation(locationMgr.getLocationByRole(7, "M"), [0, 0.8])

    assertEqualLocation(locationMgr.getLocationByRole(1, "N"), inFrontOf08)
    assertEqualLocation(locationMgr.getLocationByRole(2, "N"), inFrontOf08)
    assertEqualLocation(locationMgr.getLocationByRole(7, "N"), inFrontOf08)
    assertEqualLocation(locationMgr.getLocationByRole(8, "N"), inFrontOf08)
})

Deno.test("skipInFirstIteration spec: A position differs in first round and M position depends on A", () => {
    const [locationMgr, m1, m2] = createMovingAAnimation(0, true, 2, false)
    // basics
    assertEqualLocation(locationMgr.movementTracker._getLocation(-3, 0 as PasserIdx), [0, 0])
    assertEqualLocation(locationMgr.movementTracker._getLocation(-1, 0 as PasserIdx), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(2, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(5, "A"), [1, 0])
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), [.666, 0])
    assertEqualLocation(locationMgr.getLocationByRole(8, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0, 1])
    assertEqualLocation(locationMgr.getLocationByRole(3, "B"), [0, 1])
    assertEqualLocation(locationMgr.getLocationByRole(6, "B"), [0, 1])

    assert(m1.skipInFirstIteration)
    // assertEqualLocation(m1.fromPositionNextIteration!, [.266, 0.2])
    assertEqualLocation(m1.toPositionFirstIteration!, [0, 0.8])
    assertEqualLocation(m1.toPositionNextIteration!, [.066, 0.8])

    // assert(!m2.skipInFirstIteration)
    // assertEqualLocation(m2.fromPositionFirstIteration!, [0.0, 0.8])
    // assertEqualLocation(m2.fromPositionNextIteration!, [0.066, 0.8])
    // assertEqualLocation(m2.toPositionFirstIteration!, [0.266, 0.2])
    // assertEqualLocation(m2.toPositionNextIteration!, [0.266, 0.2])

    // assertEqualLocation(m1.fromPositionFirstIteration!, [0,0.8])
    // assertEqualLocation(m1.fromPositionNextIteration!, [0,0.8])
    // assertEqualLocation(m1.toPositionFirstIteration!, [0,0.8])

    // now M
    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(3, "M"), [.266, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [.266, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0.066, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(9, "M"), [.266, 0.2])
})

Deno.test("skipInFirstIteration spec 2: A position differs in first round and M position depends on A", () => {
    const [locationMgr, m1, m2] = createMovingAAnimation(0, false, 2, false)
    // basics
    assertEqualLocation(locationMgr.movementTracker._getLocation(-3, 0 as PasserIdx), [0, 0])
    assertEqualLocation(locationMgr.movementTracker._getLocation(-1, 0 as PasserIdx), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(2, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(5, "A"), [1, 0])
    assertEqualLocation(locationMgr.getLocationByRole(6, "A"), [.666, 0])
    assertEqualLocation(locationMgr.getLocationByRole(8, "A"), [0, 0])
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0, 1])
    assertEqualLocation(locationMgr.getLocationByRole(3, "B"), [0, 1])
    assertEqualLocation(locationMgr.getLocationByRole(6, "B"), [0, 1])

    // now M
    assertEqualLocation(locationMgr.getLocationByRole(0, "M"), [0, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(3, "M"), [.266, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(6, "M"), [.266, 0.2])
    assertEqualLocation(locationMgr.getLocationByRole(8, "M"), [0.066, 0.8])
    assertEqualLocation(locationMgr.getLocationByRole(9, "M"), [.266, 0.2])
})

function createBasicTwoMoveAnimation(move1Time: number, move1SkipFirst: boolean, move2Time: number, move2SkipFirst: boolean): [LocationManager, MovementSegment, MovementSegment] {
    const spec: AnimationSpec = {
        initialPositions: [{ x: 0, y: 0, role: "A" }, { x: 0, y: 1, role: "B" }],
        passAnimations: [],
        baseMovementSegments: [],
        baseMovementSequences: [],
        baseMovementTriggers: [],
        basePatternRelabeling: { initial: ["A", "B"], relabelActions: [] },
        relativeMovements: [
            {
                onBeat: move1Time,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 2,
                positionSpec: { type: "between", betweenRoles: ["A", "B"], side: 0.2, offset: 0, direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: move1SkipFirst,
            },
            {
                onBeat: move2Time,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 2,
                positionSpec: { type: "between", betweenRoles: ["A", "B"], side: 0.8, offset: 0, direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: move2SkipFirst,
            },
        ],
        relabeling: { initial: ["A", "B", "M"], relabelActions: [] },
    }
    const locationMgr = createFullLocationManager(spec)
    const m1 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === move1Time)!
    const m2 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === move2Time)!
    return [locationMgr, m1, m2]
}

function createDependentMoveAnimation(
    move1Time: number,
    move1SkipFirst: boolean,
    move2Time: number,
    move2SkipFirst: boolean,
    depMov1Time: number,
    depMov1SkipFirst: boolean,
    depMov2Time: number,
    depMov2SkipFirst: boolean,
): [LocationManager, MovementSegment, MovementSegment, MovementSegment, MovementSegment] {
    const spec: AnimationSpec = {
        initialPositions: [{ x: 0, y: 0, role: "A" }, { x: 0, y: 1, role: "B" }],
        passAnimations: [],
        baseMovementSegments: [],
        baseMovementSequences: [],
        baseMovementTriggers: [],
        basePatternRelabeling: { initial: ["A", "B"], relabelActions: [] },
        relativeMovements: [
            {
                onBeat: move1Time,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 2,
                positionSpec: { type: "between", betweenRoles: ["A", "B"], side: 0.2, offset: 0, direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: move1SkipFirst,
            },
            {
                onBeat: move2Time,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 2,
                positionSpec: { type: "between", betweenRoles: ["A", "B"], side: 0.8, offset: 0, direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: move2SkipFirst,
            },
            {
                onBeat: depMov1Time,
                mod: 6,
                role: "N",
                roleAtMovementEnd: "N",
                duration: 1,
                positionSpec: { type: "infront", toRole: "M", direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: depMov1SkipFirst,
            },
            {
                onBeat: depMov2Time,
                mod: 6,
                role: "N",
                roleAtMovementEnd: "N",
                duration: 1,
                positionSpec: { type: "infront", toRole: "M", direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: depMov2SkipFirst,
            },
        ],
        relabeling: { initial: ["A", "B", "M", "N"], relabelActions: [] },
    }
    const locationMgr = createFullLocationManager(spec)
    const m1 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === move1Time)!
    const m2 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === move2Time)!
    const d1 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 3 && m.onBeat === depMov1Time)!
    const d2 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 3 && m.onBeat === depMov2Time)!
    return [locationMgr, m1, m2, d1, d2]
}

/**
 * A walks between two positions, over the iteration boundary, so position of A differs between time 0 and 6
 *
 * Now M's movements are dependent on that of A
 * @returns
 */
function createMovingAAnimation(move1Time: number, move1SkipFirst: boolean, move2Time: number, move2SkipFirst: boolean): [LocationManager, MovementSegment, MovementSegment] {
    const spec: AnimationSpec = {
        initialPositions: [{ x: 0, y: 0, role: "A" }, { x: 0, y: 1, role: "B" }],
        passAnimations: [],
        baseMovementSegments: [{
            fromX: 0,
            fromY: 0,
            toX: 1,
            toY: 0,
            path: [],
        }, {
            fromX: 1,
            fromY: 0,
            toX: 0,
            toY: 0,
            path: [],
        }],
        baseMovementSequences: [[0, 1]],
        baseMovementTriggers: [{
            onBeat: 5,
            mod: 6,
            role: "A",
            duration: 3,
        }, { onBeat: 2, mod: 6, role: "A", duration: 3 }],
        basePatternRelabeling: { initial: ["A", "B"], relabelActions: [] },
        relativeMovements: [
            {
                onBeat: move1Time,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 1,
                positionSpec: { type: "between", betweenRoles: ["A", "B"], side: 0.2, offset: 0, direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: move1SkipFirst,
            },
            {
                onBeat: move2Time,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 1,
                positionSpec: { type: "between", betweenRoles: ["A", "B"], side: 0.8, offset: 0, direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: move2SkipFirst,
            },
        ],
        relabeling: { initial: ["A", "B", "M"], relabelActions: [] },
    }
    const locationMgr = createFullLocationManager(spec)
    const m1 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === move1Time)!
    const m2 = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === move2Time)!
    return [locationMgr, m1, m2]
}

// createBasicTwoMoveAnimation(5, false, 2, false)
// createBasicTwoMoveAnimation(5, true, 2, false)
// createBasicTwoMoveAnimation(0, false, 2, true)
// createBasicTwoMoveAnimation(5, false, 2, true)

Deno.test("skipInFirstIteration spec: no movement across iteration boundary", () => {
    const [_locationMgr, m1, _m2] = createBasicTwoMoveAnimation(1, true, 3, false)

    // no movement across iteration boundary in this test

    // during movement
    assert(ignoreOngoingOrNextDueToFirstIteration(m1, 1.5, 6))

    // time is before movement (movement is not wrapping, so this will be the first movement)
    assert(ignoreOngoingOrNextDueToFirstIteration(m1, 0, 6))

    // time is after movement, so before the second iteration's movement
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 3.5, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 3, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 6, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 6.5, 6))
})

Deno.test("skipInFirstIteration spec: movement across iteration boundary", () => {
    const [_locationMgr, m1, _m2] = createBasicTwoMoveAnimation(5, true, 2, false)

    // movement across iteration boundary in this test

    // during movement in first iteration
    assert(ignoreOngoingOrNextDueToFirstIteration(m1, 0.5, 6))
    assert(ignoreOngoingOrNextDueToFirstIteration(m1, 0, 6))

    // during movement in second iteration
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 6.5, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 5.5, 6))

    // time is before movement (movement is wrapping, so nothing is before)

    // time is after movement (movement is wrapping, so pretty much everything is after)
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 3, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 1, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 6, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 7, 6))
})

Deno.test("skipInFirstIteration spec: movement across iteration boundary without skipFirst", () => {
    const [_locationMgr, m1, _m2] = createBasicTwoMoveAnimation(5, false, 2, false)

    // movement across iteration boundary in this test

    // during movement in first iteration
    assert(ignoreOngoingOrNextDueToFirstIteration(m1, 0.5, 6))
    assert(ignoreOngoingOrNextDueToFirstIteration(m1, 0, 6))

    // during movement in second iteration
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 6.5, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 5.5, 6))

    // time is before movement (movement is wrapping, so nothing is before)

    // time is after movement (movement is wrapping, so pretty much everything is after)
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 3, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 1, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 6, 6))
    assert(!ignoreOngoingOrNextDueToFirstIteration(m1, 7, 6))
})

function plotRelativeDependencies(movementTracker: MovementTracker): Svg {
    const w = 50
    const svg = createSVG(200 + w * movementTracker.mod, 600)
    const x = (t: number): number => t * w + 20
    const y = (p: PasserIdx): number => 80 + p * 30

    for (let time = 0; time < movementTracker.mod; time++) {
        // vertical line for each time
        svg.line(x(time), 0, x(time), 10).stroke({ color: "#ccc", width: 1 })
        // label
        svg.text(`${time}`).move(x(time), 10)
    }

    for (const mov of movementTracker.movements) {
        // bold lines for resolved movements
        if (mov.isResolved()) {
            svg.line(x(mov.onBeat), y(mov.passerIdx), x(mov.onBeat + mov.duration), y(mov.passerIdx))
                .stroke({ color: "black", width: 8, linecap: "round" })
        }
        // dashed lines for unresolved movements
        if (!mov.isResolved()) {
            const m = mov
            svg.line(x(mov.onBeat), y(mov.passerIdx), x(mov.onBeat + mov.duration), y(mov.passerIdx))
                .stroke({ color: "red", width: 6, linecap: "round", dasharray: "1,1" })

            if (m.toPositionNextIteration) {
                svg.circle(12).fill("black").move(x(mov.onBeat + mov.duration) - 6, y(mov.passerIdx) - 6)
            } else {
                // arrow for dependency
                if (m.spec!.positionSpec.type === "infront") {
                    const targetPasserIdx = m.spec!.positionSpec.toPasserIdx
                    const targetTime = mov.onBeat + mov.duration
                    const line = svg.line(x(targetTime), y(mov.passerIdx), x(targetTime), y(targetPasserIdx))
                        .stroke({ color: "blue", width: 2, linecap: "round", dasharray: "2,2" })
                    line.marker("end", 6, 6, (marker) => {
                        marker.path("M0,0 L0,6 L6,3 z").fill("blue")
                    })
                }
                if (m.spec!.positionSpec.type === "between") {
                    const targetPasserIdx1 = m.spec!.positionSpec.between[0]
                    const targetPasserIdx2 = m.spec!.positionSpec.between[1]
                    const targetTime = mov.onBeat + mov.duration
                    svg.line(x(targetTime), y(mov.passerIdx), x(targetTime), y(targetPasserIdx1))
                        .stroke({ color: "green", width: 2, linecap: "round", dasharray: "2,2" })
                        .marker("end", 6, 6, (marker) => {
                            marker.path("M0,0 L0,6 L6,3 z").fill("green")
                        })
                    svg.line(x(targetTime), y(mov.passerIdx), x(targetTime), y(targetPasserIdx2))
                        .stroke({ color: "green", width: 2, linecap: "round", dasharray: "2,2" })
                        .marker("end", 6, 6, (marker) => {
                            marker.path("M0,0 L0,6 L6,3 z").fill("green")
                        })
                }
            }

            if (m.fromPositionNextIteration) {
                svg.circle(12).fill("black").move(x(mov.onBeat) - 6, y(mov.passerIdx) - 6)
            } else {
                // backward arrow for start position dependency
                const lastPriorMovement = movementTracker.movements.findLast((m) => m.passerIdx === mov.passerIdx && m.onBeat < mov.onBeat)
                if (lastPriorMovement) {
                    const endTime = Math.min(mov.onBeat, lastPriorMovement.onBeat + lastPriorMovement.duration)
                    svg.line(x(mov.onBeat), y(mov.passerIdx), x(endTime), y(mov.passerIdx))
                        .stroke({ color: "purple", width: 2, linecap: "round", dasharray: "2,2" })
                        .marker("end", 6, 6, (marker) => {
                            marker.path("M0,0 L0,6 L6,3 z").fill("purple")
                        })
                }
            }
        }
        // // small circle for teleport
        // if (mov.isTeleport()) {
        //     svg.circle(12).fill('yellow').move(x(mov.onBeat) - 6, y(mov.passerIdx) - 6);
        // }
    }

    return svg
}

const regressionTestsJsonFile = path.join(import.meta.dirname!, "regression-tests.json")

Deno.test("location mgr regression tests", () => {
    const regressionTests: RegressionData[] = JSON.parse(Deno.readTextFileSync(regressionTestsJsonFile))
    for (const t of regressionTests) {
        console.log(`### Running regression test: ${t.name}`)

        const gp: GroupPattern = createGroupPattern(t.pattern, t.nrHands)
        const locationMgr = createFullLocationManager(gp.layout!.animation)

        const expected: Array<[number, Role, number, number, number]> = t.expectedPositions
        for (let time = 0; time < locationMgr.mod + 10; time += 0.5) {
            for (const role of locationMgr.roleTracker.roles) {
                const passerIdx = locationMgr.roleTracker._getPasserIdx(time, role)
                const expectedLoc = expected.find((e) => e[0] === time && e[1] === role)
                if (!expectedLoc) {
                    throw new Error(`Missing expected location for time ${time} role ${role}`)
                }
                const [locX1, locY1] = locationMgr.getLocationByRole(time, role)
                assert.equal(passerIdx, expectedLoc[2], `passerIdx mismatch at time ${time} role ${role}`)
                assert(locX1 - expectedLoc[3] < 0.001, `x mismatch at time ${time} role ${role}`)
                assert(locY1 - expectedLoc[4] < 0.001, `y mismatch at time ${time} role ${role}`)
            }
        }
    }
})

Deno.test.ignore("create location mgr regression tests", () => {
    const patterns: [string, string, number?][] = [[
        "moving feed (V)",
        `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    ], [
        "scrambled v",
        `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB.SBl z ICl 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    ], [
        "wankel engine",
        `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: IC . CA. SC 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    ], [
        "phoenicean waltz",
        `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
positions: Line(A, B, 0.2) `,
    ], [
        "opernball",
        `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   . 
positions: Line(A, B, 0.2) `,
    ], [
        "567-about",
        `A: 7 6 5 7 6 -- B
B:, 5 7 6 5  -- A
M:, . IAb,Co
positions: Line(A, B, 0.2) `,
        4,
    ]]
    const result: RegressionData[] = []
    for (const p of patterns) {
        console.log(`### Generating regression test for pattern: ${p[0]}`)

        const gp: GroupPattern = createGroupPattern(p[1], p[2] ?? 2)
        const locationMgr = createFullLocationManager(gp.layout!.animation)

        const log: Array<[number, Role, PasserIdx, number, number]> = []
        for (let time = 0; time < locationMgr.mod + 10; time += 0.5) {
            for (const role of locationMgr.roleTracker.roles) {
                const passerIdx = locationMgr.roleTracker._getPasserIdx(time, role)
                const [locX1, locY1] = locationMgr.getLocationByRole(time, role)
                log.push([time, role, passerIdx, locX1, locY1])
            }
        }

        result.push({ name: p[0], pattern: p[1], nrHands: p[2] ?? 2, expectedPositions: log })
    }
    Deno.writeTextFileSync(regressionTestsJsonFile, JSON.stringify(result, null, 2))
})

type RegressionData = {
    name: string
    pattern: string
    nrHands: number
    expectedPositions: Array<[number, Role, number, number, number]>
}

Deno.test("overlap", () => {
    const m = (beat: number, duration: number) => createResolvedMovementSegmentFromSegmentSpec(0 as PasserIdx, beat, duration, { fromX: 0, fromY: 0, path: [], toX: 0, toY: 0 }, false)
    const mov0 = m(0, 2)
    const mov1 = m(1, 2)
    const mov2 = m(2, 2)
    const mov4 = m(4, 2)
    const mov5 = m(5, 2)
    assert(overlap(mov1, mov2, 6))
    assert(!overlap(mov0, mov2, 6))
    assert(!overlap(mov0, mov4, 6))
    assert(overlap(mov4, mov5, 6))
    assert(overlap(mov5, mov0, 6))
    assert(!overlap(mov5, mov1, 6))
})

Deno.test("locationMgr for 3 -- locations", () => {
    const pattern = `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CCz   SAz   IBe.   -- M
positions: V(A,B,C)
move: Vmove(B,4.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const locationMgr = createFullLocationManager(gp.layout!.animation)

    // now let's try locations
    const initialC: [number, number] = [0.25, 0.933]
    const initialA: [number, number] = [0.5, 0]
    const bAfterMove: [number, number] = [0.933, 0.25]
    assertEqualLocation(locationMgr.getLocationByRole(0, "A"), initialA) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), [0.75, 0.933]) // should be at start
    assertEqualLocation(locationMgr.getLocationByRole(0, "C"), initialC) // should be at start, skipping the initial mid-walk start
    assertEqualLocation(locationMgr.getLocationByRole(locationMgr.mod, "C"), initialC)
    assertLocationInFrontOf(locationMgr.getLocationByRole(0, "M"), initialC)

    // movement of B is kind of skipped through manipulation
    assertEqualLocation(locationMgr.getLocationByRole(0, "B"), locationMgr.getLocationByRole(3.8, "B")) // not moving yet
    assertEqualLocation(locationMgr.getLocationByRole(8, "C"), [.933, .25]) // B fully moved (and is now C)

    // on 4 M intercepts pass to B
    assert.equal(locationMgr.roleTracker._getPasserIdx(4.9, "M"), locationMgr.roleTracker._getPasserIdx(5, "B")) // relabel, nothing else changes
    assert.equal(locationMgr.roleTracker._getPasserIdx(4.9, "B"), locationMgr.roleTracker._getPasserIdx(5, "M")) // relabel, nothing else changes

    // on 5, old manipulator (now B, C on arrival) moves to new position
    assertEqualLocation(locationMgr.getLocationByRole(6, "C"), bAfterMove)
    // on 5 old B (now M) moves to in front of where it would have walked (bAfterMove)
    assertLocationInFrontOf(locationMgr.getLocationByRole(6, "M"), bAfterMove)
})

Deno.test("locationMgr for 3v", () => {
    const pattern = `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3  -- C
C: 3 3   3pA3  3  3  -- A
M: CBz   SBz   IC.   -- M
N: CCz   SAz   IBe.   -- N
positions: V(A,B,C)
move: Vmove(B,4.9,3)`

    const gp: GroupPattern = createSyncGroupPattern(pattern)
    const locationMgr = createFullLocationManager(gp.layout!.animation)
})
Deno.test("locationMgr for 456-about", () => {
    const pattern = `A: 5 4 6 5 4 -- B
            B: ,6 5 4 6 -- A
            M: .IAo -- M`

    const gp: GroupPattern = createGroupPattern(pattern, 4)
    const locationMgr = createFullLocationManager(gp.layout!.animation, true)

    const moveAfterIntercept = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === 2)!
    // console.log(moveAfterIntercept)
    assert(moveAfterIntercept.spec!.positionSpec.type === "take")
    assert(moveAfterIntercept.toPositionNextIteration![0] === 0 && moveAfterIntercept.toPositionNextIteration![1] === .5, "wrong to pos: " + JSON.stringify(moveAfterIntercept.toPositionNextIteration))

    const moveToIntercept = locationMgr.movementTracker.movements.find((m) => m.passerIdx === 2 && m.onBeat === 0)!
    // console.log(moveToIntercept)
    assert(
        moveToIntercept.spec!.positionSpec.type === "infront" &&
            moveToIntercept.spec!.positionSpec.toPasserIdx === 0 &&
            moveToIntercept.spec!.positionSpec.direction === 90,
        "wrong spec: " + JSON.stringify(moveToIntercept.spec),
    )

    for (let iteration = 0; iteration <= 4; iteration++) {
        const moveToIntercept = locationMgr.movementTracker.movements.find((m) => m.onBeat === 0 + iteration * 9)!
        if (iteration % 4 < 2) {
            assert(
                moveToIntercept.spec!.positionSpec.type === "infront" &&
                    moveToIntercept.spec!.positionSpec.direction === 90,
                `wrong spec for iteration ${iteration}: ` + JSON.stringify(moveToIntercept.spec),
            )
        } else {
            assert(
                moveToIntercept.spec!.positionSpec.type === "infront" &&
                    moveToIntercept.spec!.positionSpec.direction === -90,
                `wrong spec for iteration ${iteration}: ` + JSON.stringify(moveToIntercept.spec),
            )
        }
    }

    // let's check the specific position for the intercept

    // left hand to left hand, while the manipulator (now A) is standing to the right of the passer (now M)
    const interceptedPass = gp.layout!.animation.passAnimations.find((p) => p.onBeat === 2)
    // console.log(interceptedPass)
    assert.equal(interceptedPass!.pass.fromHand, Hand.Left)
    assert.equal(interceptedPass!.pass.toHand, Hand.Left)
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.5]) // A is starting at (0, 0.5) and is now M at the time of the intercept
    assertEqualLocation(locationMgr.getLocationByRole(2, "A"), [0, 0.9]) // the manipulator intercepts a left handed pass and stands to the right (so below here)
    const plan = createAnimationPlan(gp.layout!.animation)
    const interceptedPassPlan = plan.passAnimations.find((p) => p.onBeat === 2)!

    // TODO: the pass rendering is weird, because the prior manipulator takes the passers position by the time the pass arrives
    // the old passer does not move until they move for the intercept, several beats later -- we may finally need a mechanism to specify the walking delays
    // console.log(interceptedPassPlan)
    // assertEqualLocation([interceptedPassPlan?.debug_center.toX, interceptedPassPlan?.debug_center.toY], [0, 0.9])
})

function createInFrontMoveAnimation(direction: number): LocationManager {
    const spec: AnimationSpec = {
        initialPositions: [{ x: 0, y: 0.5, role: "A" }, { x: 1, y: 0.5, role: "B" }],
        passAnimations: [],
        baseMovementSegments: [],
        baseMovementSequences: [],
        baseMovementTriggers: [],
        basePatternRelabeling: { initial: ["A", "B"], relabelActions: [] },
        relativeMovements: [
            {
                onBeat: 0,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 2,
                positionSpec: { type: "infront", toRole: "A", direction },
                targetRoleTime: "onBeat",
                skipInFirstIteration: false,
            },
            // second movement back to "in front of B" so the spec has the
            // required >=2 movements per passer
            {
                onBeat: 3,
                mod: 6,
                role: "M",
                roleAtMovementEnd: "M",
                duration: 2,
                positionSpec: { type: "infront", toRole: "B", direction: 0 },
                targetRoleTime: "onBeat",
                skipInFirstIteration: false,
            },
        ],
        relabeling: { initial: ["A", "B", "M"], relabelActions: [] },
    }
    return createFullLocationManager(spec)
}

Deno.test("InFront movement: direction=0 places M between A and the center", () => {
    const locationMgr = createInFrontMoveAnimation(0)
    // A at (0, 0.5); default vector toward center (0.5, 0.5) scaled 0.8 = (0.4, 0)
    // direction=0: position = (0.4, 0.5)
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0.4, 0.5])
})

Deno.test("InFront movement: direction=90 rotates M clockwise around A", () => {
    const locationMgr = createInFrontMoveAnimation(90)
    // default vector (0.4, 0) rotated clockwise on screen by 90° → (0, 0.4)
    // position = (0, 0.5) + (0, 0.4) = (0, 0.9)
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.9])
})

Deno.test("InFront movement: direction=-90 rotates M counter-clockwise around A", () => {
    const locationMgr = createInFrontMoveAnimation(-90)
    // default vector (0.4, 0) rotated counter-clockwise on screen by 90° → (0, -0.4)
    // position = (0, 0.5) + (0, -0.4) = (0, 0.1)
    assertEqualLocation(locationMgr.getLocationByRole(2, "M"), [0, 0.1])
})

test("computeLocationInFrontOf with direction=0 matches between(loc, loc) with side=0.6", () => {
    const samples: [number, number][] = [
        [0.2, 0.2],
        [0.8, 0.8],
        [0.5, 0],
        [0, 0.5],
        [0.25, 0.75],
        [0.9, 0.1],
    ]
    for (const loc of samples) {
        const fromInFront = computeLocationInFrontOf(loc, 0)
        const fromBetween = computeLocationInBetween(loc, loc, {
            type: "between",
            between: [createPasserIdx(0), createPasserIdx(0)],
            side: 0.6,
            offset: 0,
            direction: 0,
        })
        assertEqualLocation(fromInFront, fromBetween, `loc=${JSON.stringify(loc)}`)
    }
})
