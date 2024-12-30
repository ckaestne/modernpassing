import { MovementSegment, MovementSequence, PositionLayout } from "./pattern-structure.ts";




type PatternPath = {
    initialPositions: number[],//index of the segment where each juggler starts
    movementSegments: MovementSegment[],
    movementSequences: MovementSequence[], // segment indices for each jugger (not role), by the order of initial roles
}  


const brunos: PatternPath = {
    initialPositions:[
        0 /*A, left bottom*/,
        2, /*B, right bottom*/
        3, /*C, right top*/
    ],
  movementSegments: [
    {//left feeder to middle
      "fromX": 0,
      "fromY": 0.8,
      "toX": 0.5,
      "toY": 0.6,
      "path": [
        "M",
        0,
        0.8,
        "C",
        0.375,
        0.9,
        0.4,
        0.7,
        0.5,
        0.6
      ]
    },
    {//middle to right peak
      "fromX": 0.5,
      "fromY": 0.6,
      "toX": 0.92,
      "toY": 0.4,
      "path": [
        "M",
        0.5,
        0.6,
        "C",
        0.7,
        0.4,
        0.795,
        0.3,
        0.92,
        0.4
      ]
    },
    {//right falling
      "fromX": 0.92,
      "fromY": 0.4,
      "toX": 1,
      "toY": 0.8,
      "path": [
        "M",
        0.92,
        0.4,
        "C",
        1.045,
        0.5,
        1,
        0.6,
        1,
        0.8
      ]
    },
    {//right feeder to middle
      "fromX": 1,
      "fromY": 0.8,
      "toX": 0.5,
      "toY": 0.6,
      "path": [
        "M",
        1,
        0.8,
        "C",
        0.625,
        0.9,
        0.6,
        0.7,
        0.5,
        0.6
      ]
    },
    {//middle to left peak
      "fromX": 0.5,
      "fromY": 0.6,
      "toX": 0.08,
      "toY": 0.4,
      "path": [
        "M",
        0.5,
        0.6,
        "C",
        0.3,
        0.4,
        0.205,
        0.3,
        0.08,
        0.4
      ]
    },
    {//left falling
      "fromX": 0.08,
      "fromY": 0.4,
      "toX": 0,
      "toY": 0.8,
      "path": [
        "M",
        0.08,
        0.4,
        "C",
        -0.045,
        0.5,
        0,
        0.6,
        0,
        0.8
      ]
    }
  ],
  movementSequences: [
    //123 456 789 123 456 789
    [0,1,2,3,4,5]/*A*/,
    [3,4,5,0,1,2]/*B*/,
    [2,3,4,5,0,1]/*C*/,
  ]
}


export const PatternPaths = {
    brunos
} 