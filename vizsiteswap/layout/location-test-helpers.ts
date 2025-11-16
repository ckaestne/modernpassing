import assert from "node:assert";


export function xy(pos: { x: number, y: number } | { toX: number, toY: number }): [number, number] {
    if ('toX' in pos) {
        return [pos.toX, pos.toY]
    }
    return [pos.x, pos.y]
}

export function assertEqualLocation(actual: number[], expected: number[], label?: string) {
    assert(actual.length === 2 && expected.length === 2, "assertEqualLocation: actual and expected must be [x,y]");
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? 'assertEqualLocation'}: X location mismatch: expected ${expected} but got ${actual}`);
    assert(Math.round(100 * actual[1]) / 100 === Math.round(100 * expected[1]) / 100, `${label ?? 'assertEqualLocation'}: Y location mismatch: expected ${expected} but got ${actual}`);
}

export function assertLocationSouthOf(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? 'assertEqualLocation'}: X location mismatch: expected ${expected} but got ${actual}`);
    assert(actual[1] > expected[1], `${label ?? 'assertLocationSouthOf'}: Y location ${actual[1]} is not south of expected ${expected[1]}`);
}
export function assertLocationNorthOf(actual: [number, number], expected: [number, number], label?: string) {
    assert(Math.round(100 * actual[0]) / 100 === Math.round(100 * expected[0]) / 100, `${label ?? 'assertEqualLocation'}: X location mismatch: expected ${expected} but got ${actual}`);
    assert(actual[1] < expected[1], `${label ?? 'assertLocationNorthOf'}: Y location ${actual[1]} is not north of expected ${expected[1]}`);
}

// check that the location is anywhere between the two expected locations
export function assertLocationBetween(actual: [number, number], expectedA: [number, number], expectedB: [number, number], label?: string) {
    assert(actual[0] >= Math.min(expectedA[0], expectedB[0]) && actual[0] <= Math.max(expectedA[0], expectedB[0]), `${label ?? 'assertLocationBetween'}: X location ${actual[0]} not between ${expectedA[0]} and ${expectedB[0]}`);
    assert(actual[1] >= Math.min(expectedA[1], expectedB[1]) && actual[1] <= Math.max(expectedA[1], expectedB[1]), `${label ?? 'assertLocationBetween'}: Y location ${actual[1]} not between ${expectedA[1]} and ${expectedB[1]}`);
    // Interpolate y based on x position along the line
    if ((expectedB[0] - expectedA[0]) !== 0) {
        const xRatio = (actual[0] - expectedA[0]) / (expectedB[0] - expectedA[0]);
        const expectedY = expectedA[1] + xRatio * (expectedB[1] - expectedA[1]);
        assert(Math.abs(actual[1] - expectedY) < 0.01, `${label ?? 'assertLocationBetween'}: Y location ${actual[1]} not on line between points, expected ${expectedY}`);
    }
}

// somewhat fuzzy: not the same location, but near it (usually for intercept next to or in front of)
export function assertNearbyLocation(actual: [number, number], expected: [number, number], label?: string) {
    assert((Math.round(100 * actual[0]) / 100 !== Math.round(100 * expected[0]) / 100)
        || (Math.round(100 * actual[1]) / 100 === Math.round(100 * expected[1]) / 100), `${label ?? 'assertEqualLocation'}: locations expected to be different but found the same: expected not ${expected}, but got ${actual}`);

    const acceptedDistance = 0.2; // acceptable distance for "nearby"
    assert(Math.abs(actual[0] - expected[0]) < acceptedDistance && Math.abs(actual[1] - expected[1]) < acceptedDistance, `${label ?? 'assertNearbyLocation'}: location ${actual} not near expected ${expected}`);

}