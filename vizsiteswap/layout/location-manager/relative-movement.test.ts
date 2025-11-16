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

test("resolve takePosition without further dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        new UnresolvedMovementSegment(B, 3, 0, { positionSpec: { type: "take", toPasserIdx: A } }),
        new ResolvedMovementSegment(B, 4, 1, { fromX: .25, fromY: 0, toX: 1, toY: 1, path: [] })
    ])

    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolveNextMovement();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);

    // B
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.25 + 1) / 2, 0.5]);
});



test("resolve takePosition with a walk without further dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        new UnresolvedMovementSegment(B, 2, 1, { positionSpec: { type: "take", toPasserIdx: A } }),
        new ResolvedMovementSegment(B, 4, 1, { fromX: .25, fromY: 0, toX: 1, toY: 1, path: [] })
    ])

    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolveNextMovement();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6, B), [1, 1]);

    // B walking
    assert.deepEqual(movementTracker._getLocation(2, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(2.5, B), [(0.25 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.25 + 1) / 2, 0.5]);
});


test("resolve takePosition with indirect dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        new UnresolvedMovementSegment(B, 2, 1, { positionSpec: { type: "take", toPasserIdx: A } }),
        new UnresolvedMovementSegment(B, 3, 1, { positionSpec: { type: "take", toPasserIdx: A } }),
        new ResolvedMovementSegment(B, 4, 1, { fromX: .5, fromY: 0, toX: 1, toY: 1, path: [] })
    ])


    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolve();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6, B), [1, 1]);

    // B first part to .25,0
    assert.deepEqual(movementTracker._getLocation(2, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(2.5, B), [(0.25 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    // B second part to .5,0
    assert.deepEqual(movementTracker._getLocation(3.5, B), [.75 / 2, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [.5, 0]);
    // B go home to 1,1
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.5 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);

});



test("resolve takePosition with reverse-order indirect dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        new UnresolvedMovementSegment(B, 2, 1, { positionSpec: { type: "take", toPasserIdx: A } }),
        new ResolvedMovementSegment(B, 4, 1, { fromX: .25, fromY: 0, toX: 1, toY: 1, path: [] }),
        new UnresolvedMovementSegment(B, 5, 3, { positionSpec: { type: "take", toPasserIdx: A } }),
    ])


    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolve();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);

    // B walk to A on 5
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6.5, B), [0.5, 0.5]);
    assert.deepEqual(movementTracker._getLocation(8, B), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0.5, B), [0.5, 0.5]);
    assert.deepEqual(movementTracker._getLocation(2, B), [0, 0]);
    // B first part to .25,0
    assert.deepEqual(movementTracker._getLocation(2, B), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2.5, B), [0.25 / 2, 0]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    // B go home to 1,1
    assert.deepEqual(movementTracker._getLocation(4, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.25 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);

});