import { MovementSegment, MovementSequence, PositionLayout } from "./pattern-structure.ts";




type PatternPath = {
    initialPositions: number[],//index of the segment where each juggler starts
    movementSegments: MovementSegment[],
    movementSequences: MovementSequence[], // segment indices for each jugger (not role), by the order of initial roles
}  


const brunos: PatternPath = {
    initialPositions:[
        0 /*A, left bottom*/,
        3, /*B, right bottom*/
        2, /*C, right top*/
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

const y: PatternPath = {
  movementSegments:  [
    {
      "fromX": 0.4,
      "fromY": 0.5,
      "toX": 0.2,
      "toY": 0.3,
      "path": [
        "M",
        0.4,
        0.5,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0.2,
        0.3
      ]
    },
    {
      "fromX": 0.2,
      "fromY": 0.3,
      "toX": 0,
      "toY": 0.5,
      "path": [
        "M",
        0.2,
        0.3,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0,
        0.5
      ]
    },
    {
      "fromX": 0,
      "fromY": 0.5,
      "toX": 0.2,
      "toY": 0.7,
      "path": [
        "M",
        0,
        0.5,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0.2,
        0.7
      ]
    },
    {
      "fromX": 0.2,
      "fromY": 0.7,
      "toX": 0.4,
      "toY": 0.5,
      "path": [
        "M",
        0.2,
        0.7,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0.4,
        0.5
      ]
    },
    {
      "fromX": 0.8,
      "fromY": 0.7,
      "toX": 1,
      "toY": 0.5,
      "path": [
        "M",
        0.8,
        0.7,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        1,
        0.5
      ]
    },
    {
      "fromX": 1,
      "fromY": 0.5,
      "toX": 0.8,
      "toY": 0.3,
      "path": [
        "M",
        1,
        0.5,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0.8,
        0.3
      ]
    },
    {
      "fromX": 0.8,
      "fromY": 0.3,
      "toX": 0.6,
      "toY": 0.5,
      "path": [
        "M",
        0.8,
        0.3,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0.6,
        0.5
      ]
    },
    {
      "fromX": 0.6,
      "fromY": 0.5,
      "toX": 0.8,
      "toY": 0.7,
      "path": [
        "M",
        0.6,
        0.5,
        "A",
        0.5,
        0.5,
        0,
        0,
        0,
        0.8,
        0.7
      ]
    }
  ],
  "initialPositions": [2,0,4,6],
  movementSequences: [
    [2,3,0,1],
    [0,1,2,3],
    [4,5,6,7],
    [6,7,4,5]
  ]
}

const weave: PatternPath = {
  movementSegments:  [
    {
      "fromX": 0,
      "fromY": 0.75,
      "toX": 0.125,
      "toY": 0.5335,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        1
      ]
    },
    {
      "fromX": 0.125,
      "fromY": 0.5335,
      "toX": 0.375,
      "toY": 0.5335,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        1
      ]
    },
    {
      "fromX": 0.375,
      "fromY": 0.5335,
      "toX": 0.5,
      "toY": 0.75,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        1
      ]
    },
    {
      "fromX": 0.5,
      "fromY": 0.75,
      "toX": 0.625,
      "toY": 0.9665,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        0
      ]
    },
    {
      "fromX": 0.625,
      "fromY": 0.9665,
      "toX": 0.875,
      "toY": 0.9665,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        0
      ]
    },
    {
      "fromX": 0.875,
      "fromY": 0.9665,
      "toX": 1,
      "toY": 0.75,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        0
      ]
    },
    {
      "fromX": 1,
      "fromY": 0.75,
      "toX": 0.875,
      "toY": 0.5335,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        0
      ]
    },
    {
      "fromX": 0.875,
      "fromY": 0.5335,
      "toX": 0.625,
      "toY": 0.5335,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        0
      ]
    },
    {
      "fromX": 0.625,
      "fromY": 0.5335,
      "toX": 0.5,
      "toY": 0.75,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        0
      ]
    },
    {
      "fromX": 0.5,
      "fromY": 0.75,
      "toX": 0.375,
      "toY": 0.9665,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        1
      ]
    },
    {
      "fromX": 0.375,
      "fromY": 0.9665,
      "toX": 0.125,
      "toY": 0.9665,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        1
      ]
    },
    {
      "fromX": 0.125,
      "fromY": 0.9665,
      "toX": 0,
      "toY": 0.75,
      "path": [
        "A",
        0.25,
        0.25,
        0,
        0,
        1
      ]
    }
  ],
  initialPositions: [0,8,4],
  movementSequences: [
    [0,1,2,3,4,5,6,7,8,9,10,11],
    [8,9,10,11,0,1,2,3,4,5,6,7],
    [4,5,6,7,8,9,10,11,0,1,2,3],
  ]
}

const clover: PatternPath = {
  initialPositions: [5,2,3,1],
  movementSegments:  [
    {
      "fromX": 0.5,
      "fromY": 0.5,
      "toX": 0.5,
      "toY": 0,
      path: [
        "C",
        0.5417,
        0.4278,
        0.8333,
        0
      ]
    },
    {
      "fromX": 0.067,
      "fromY": 0.75,
      "toX": 0.5,
      "toY": 0.5,
      path: [
        "C",
        0.2337,
        1.0387,
        0.4583,
        0.5722
      ]
    },
    {
      "fromX": 0.5,
      "fromY": 0.5,
      "toX": 0.067,
      "toY": 0.75,
      path: [
        "C",
        0.4167,
        0.5,
        -0.0997,
        0.4613
      ]
    },
    {
      "fromX": 0.933,
      "fromY": 0.75,
      "toX": 0.5,
      "toY": 0.5,
      path: [
        "C",
        1.0997,
        0.4613,
        0.5833,
        0.5
      ]
    },
    {
      "fromX": 0.5,
      "fromY": 0.5,
      "toX": 0.933,
      "toY": 0.75,
      path: [
        "C",
        0.5417,
        0.5722,
        0.7663,
        1.0387
      ]
    },
    {
      "fromX": 0.5,
      "fromY": 0,
      "toX": 0.5,
      "toY": 0.5,
      path: [
        "C",
        0.1667,
        0,
        0.4583,
        0.4278
      ]
    }
  ],
  movementSequences: [
    [5,4,3,2,1,0],
    [2,1,0,5,4,3],
    [3,2,1,0,5,4],
    [1,0,5,4,3,2]
  ]
}

export const PatternPaths = {
  weave,
  brunos,
  clover,
    y,
  
} 