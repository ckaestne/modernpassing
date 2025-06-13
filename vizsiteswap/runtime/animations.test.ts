
// import { SVG } from "@svgdotjs/svg.js";
// import { addPosition, addRelabeling, animateBaseMovement, setPasses, Data, getLocationByRoleInFuture, initialize, initializeSegments } from './animations.ts';
// import { createSVG } from '@modernpassing/svg-utils';
// import assert from "node:assert";

// Deno.test("basic setup", () => {
//     const svg = createSVG(350, 350);

//     const data = initialize('#' + svg.id(), 1);
// })

// Deno.test("compute future locations: speedy moving V", () => {
//     const data = createSpeedyMovingV()
//     // startAnimation(data, 6);

//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 0, 'B'), [101, 121])
//     // B doesn't move or get relabeled for a while (movement starts at 4.5)
//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 1, 'B'), [101, 121])
//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 2, 'B'), [101, 121])
//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 1.5, 'B'), [101, 121])
//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 4.4, 'B'), [101, 121])
//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 4.5, 'B'), [101, 121])
//     // after the movement ends (at 5.0) B is at the new location
//     assert.deepEqual(getLocationByRoleInFuture(data, 0, 5.0, 'B'), [121, 47])
// })
// function createStandardMovingV(): Data {
//     const data = createV();
//     animateBaseMovement(data, 4.9, 6, 'B', 3);
//     return data
// }
// function createSpeedyMovingV(): Data {
//     // movement only goes from 4.5 to 5.5 so B arrives before relabeling
//     const data = createV();
//     animateBaseMovement(data, 4.5, 6, 'B', 0.5);
//     return data
// }

// function createV(): Data {
//     // generated from the pattern
//     const svg = createSVG(350, 350);
//     const data = initialize('#' + svg.id())
//     addPosition(data, 'A', 74, 20, '#SvgjsG1003', '#SvgjsText1004', [0, 1, 2, 3]);
//     addPosition(data, 'B', 101, 121, '#SvgjsG1005', '#SvgjsText1006', [4, 5, 6, 7]);
//     addPosition(data, 'C', 47, 121, '#SvgjsG1007', '#SvgjsText1008', [8, 9, 10, 11]);
//     initializeSegments(data, [{
//         "fromX": 74,
//         "fromY": 20,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 20,
//         "toY": 74
//     }, {
//         "fromX": 20,
//         "fromY": 74,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 74,
//         "toY": 128
//     }, {
//         "fromX": 74,
//         "fromY": 128,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 128,
//         "toY": 74
//     }, {
//         "fromX": 128,
//         "fromY": 74,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 74,
//         "toY": 20
//     }, {
//         "fromX": 101,
//         "fromY": 121,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 121,
//         "toY": 47
//     }, {
//         "fromX": 121,
//         "fromY": 47,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 47,
//         "toY": 27
//     }, {
//         "fromX": 47,
//         "fromY": 27,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 27,
//         "toY": 101
//     }, {
//         "fromX": 27,
//         "fromY": 101,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 101,
//         "toY": 121
//     }, {
//         "fromX": 47,
//         "fromY": 121,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 121,
//         "toY": 101
//     }, {
//         "fromX": 121,
//         "fromY": 101,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 101,
//         "toY": 27
//     }, {
//         "fromX": 101,
//         "fromY": 27,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 27,
//         "toY": 47
//     }, {
//         "fromX": 27,
//         "fromY": 47,
//         "path": ["A", 54, 54, 0, 0, 0],
//         "toX": 47,
//         "toY": 121
//     }]);
//     setPasses(data, 0, 18, 'A', 0, 'B', 1, '', 1);
//     setPasses(data, 0, 18, 'B', 0, 'A', 1, '', 1);
//     setPasses(data, 2, 18, 'A', 0, 'C', 1, '', 1);
//     setPasses(data, 2, 18, 'C', 0, 'A', 1, '', 1);
//     setPasses(data, 4, 18, 'A', 0, 'B', 1, '', 1);
//     setPasses(data, 4, 18, 'B', 0, 'A', 1, '', 1);
//     setPasses(data, 6, 18, 'A', 0, 'B', 1, '', 1);
//     setPasses(data, 6, 18, 'B', 0, 'A', 1, '', 1);
//     setPasses(data, 8, 18, 'A', 0, 'C', 1, '', 1);
//     setPasses(data, 8, 18, 'C', 0, 'A', 1, '', 1);
//     setPasses(data, 10, 18, 'A', 0, 'B', 1, '', 1);
//     setPasses(data, 10, 18, 'B', 0, 'A', 1, '', 1);
//     setPasses(data, 12, 18, 'A', 0, 'B', 1, '', 1);
//     setPasses(data, 12, 18, 'B', 0, 'A', 1, '', 1);
//     setPasses(data, 14, 18, 'A', 0, 'C', 1, '', 1);
//     setPasses(data, 14, 18, 'C', 0, 'A', 1, '', 1);
//     setPasses(data, 16, 18, 'A', 0, 'B', 1, '', 1);
//     setPasses(data, 16, 18, 'B', 0, 'A', 1, '', 1);
//     addRelabeling(data, 0, 6, [["A", "B"], ["B", "C"], ["C", "A"]]);
//     return data
// }
