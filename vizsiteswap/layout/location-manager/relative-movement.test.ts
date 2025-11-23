import assert from "node:assert"
import { createPasserIdx, genPath, helperSvg } from "./helpers.ts"
import test from "node:test";
import { MovementSegment, MovementTracker, ResolvedMovementSegment, TeleportMovementSegment, UnresolvedMovementSegment } from "./relative-movement.ts";


const A = createPasserIdx(0);
const B = createPasserIdx(1);

const AB_initial: MovementSegment[] = [
    new TeleportMovementSegment(A, 0, 0, 0),
    new TeleportMovementSegment(B, 0, 1, 1),
]

test("basic setup, stationary", () => {
    // two passers, teleport for initial positions, no movement
    const movementTracker = new MovementTracker(6, AB_initial)

    // no movements to resolve
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(10, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(10, B), [1, 1]);

});

const A_simpleWalk: MovementSegment[] = [
    new ResolvedMovementSegment(A, 2, 2, { fromX: 0, fromY: 0, toX: .5, toY: 0, path: [] }),
    new ResolvedMovementSegment(A, 4, 2, { fromX: .5, fromY: 0, toX: 0, toY: 0, path: [] }),
]

test("basic setup, simple walk", () => {
    // two passers, teleport for initial positions, A walks back and forth
    const movementTracker = new MovementTracker(6, [...AB_initial, ...A_simpleWalk])

    // no movements to resolve
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);
});
