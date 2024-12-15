import { SVG, registerWindow, Svg, Element } from '@svgdotjs/svg.js'
import { skip } from 'node:test'
import { Pattern, State, nextState as getNextState } from './movingpattern'



function assert(condition: any) {
    if (!condition) throw new Error('assertion failed')
}

// @ts-ignore
const svg: Svg = SVG().addTo(window.document.documentElement)
svg.size(350, 350)//.viewbox(0,0,width,height)
svg.rect("100%", "100%").fill("white").stroke("black")

const offset = 50

//big circle
const bc = 250
const bigCircle = svg.circle(bc).move(offset, offset).fill('none').stroke({ color: 'lightgrey' })
const center: [number, number] = [offset + bc / 2, offset + bc / 2]

const passer = 50

function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
    const radians = (angle * Math.PI) / 180;
    const x = dist * Math.cos(radians);
    const y = dist * Math.sin(radians);
    return [x + centerX, y + centerY];
}
function gp(angle: number): [number, number] {
    return getPos(angle, bc / 2, offset + bc / 2, offset + bc / 2)
}

// const angles = [270, 90 + 30, 90 - 30, 330]

// for (let angle of angles) {
//     const [x, y] = gp(angle);
//     svg.circle(passer).move(x - passer / 2, y - passer / 2);
// }


// computed locations for each juggler (derived from circle for normal positions and from other jugglers for manipulators)
function getLocation(state: State, jugglerIdx: number, pattern: Pattern): [number, number] {
    const jugglerLabel = state.labels[jugglerIdx]
    if (!pattern.manipulatorIds.includes(jugglerLabel)) {
        // non-manipulator
        const angle = state.positionsOnCircle[jugglerIdx]
        return gp(angle)
    } else {
        // manipulator
        const instructions = pattern.manipulatorPositions.get(jugglerLabel)![state.beat % pattern.passes.length]
        assert(instructions)
        instructions.forEach(i => assert(pattern.jugglerLabels.includes(i) && !pattern.manipulatorIds.includes(i)))//must be in relation to other juggler, not manipulator
        if (instructions.length === 1) {
            return halfway(center, gp(state.positionsOnCircle[state.labels.indexOf(instructions[0])]))
        } else if (instructions.length === 2) {
            return halfway(gp(state.positionsOnCircle[state.labels.indexOf(instructions[0])]), gp(state.positionsOnCircle[state.labels.indexOf(instructions[1])]))
        } else throw new Error('invalid manipulator position')
    }
}


// // curved arrow from angle 2 to angle 3
// const [from, to] = [angles[2], angles[3]]
// svg.path(`M ${gp(from-20)[0]} ${ gp(from-20)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to+20)[0]},${gp(to+20)[1]}`).fill('none').stroke({ color: 'red' })//.marker('end', 10, 10, add => add.path('M0,0 L10,5 L0,10').fill('red')) // arrow

function halfway([x1, y1]: [number, number], [x2, y2]: [number, number]): [number, number] {
    return [(x1 + x2) / 2, (y1 + y2) / 2]
}

function arrow(x1: number, y1: number, x2: number, y2: number, color: string = 'blue') {
    return svg.line(x1, y1, x2, y2).stroke({ color }).marker('end', 10, 10, add => add.path('M0,0 L10,5 L0,10').fill(color))
}
function pass([x1, y1]: [number, number], hand1: 0 | 1, [x2, y2]: [number, number], hand2: 0 | 1) {
    //angle between the two points
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    //move 20 pixel 45 degree from that angle from the first point
    const armLength = 30
    const armAngle = 30
    const direction1 = hand1 === 0 ? armAngle : -armAngle
    const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
    const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

    const direction2 = hand2 === 0 ? armAngle : -armAngle
    const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
    const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

    return arrow(x3, y3, x4, y4, 'green')
}

// // arrow(gp(angles[0])[0], gp(angles[0])[1], gp(angles[1])[0], gp(angles[1])[1])
// // arrow(gp(angles[1])[0], gp(angles[1])[1], gp(angles[0])[0], gp(angles[0])[1])
// pass(angles[0], 0, angles[1], 1)
// pass(angles[1], 0, angles[0], 1)


// const [x, y] = gp(angles[2])
// const w=svg.circle(passer).move(gp(angles[2])[0]-passer/2,gp(angles[2])[1]-passer/2).fill('purple')

// const wp = svg.path(`M ${gp(from)[0]} ${ gp(from)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to)[0]},${gp(to)[1]}`).fill('none')
// w.animate(3000).during(function(pos:number){
//     var p = wp.pointAt(pos * wp.length())
//     w.center(p.x, p.y)
// })


// notation
// Circle(A: 270, B: 60, C: 120) walk('B',3,.5,1.5,arc(-90)) //who, when, delay, duration, path

//style config:
const jugglerColors = ['darkblue', 'darkred', 'darkgreen', 'purple']

const scrambledV: Pattern = {
    //needed spec
    initialJugglerPositionsOnCircle: [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30, 0],
    walking: [null, null, 'B'],
    walkPositionChange: [-30, -60],

    //from pattern notation
    jugglerLabels: ['A', 'B', 'C', 'M'],
    manipulatorIds: ['M'],// subset of jugglerLabels
    swapManipulator: [[/*beat*/2, /*manipulator name*/'M',/*swap with*/'C']],
    manipulatorPositions: new Map([['M', [['B'], ['B'], ['C']]]]),
    relabel: new Map([['A', 'B'], ['B', 'C'], ['C', 'A'], ['M', 'M']]),
    passes: [[['M', 'B'], ['B', 'A']], [['A', 'C'], ['C', 'A'], ['B', 'M'], ['M', 'B']], [['A', 'B'], ['B', 'A'], ['C', 'M']]]
}

const pattern = scrambledV

const beatDuration = 2000/*ms*/
const walkDuration = beatDuration * 1.5
const walkDelay = beatDuration * .5
const passDuration = beatDuration * .4

assert(pattern.initialJugglerPositionsOnCircle.length === pattern.jugglerLabels.length)
assert(pattern.initialJugglerPositionsOnCircle.length === jugglerColors.length)


const initialState: State = {
    prior: null,
    positionsOnCircle: pattern.initialJugglerPositionsOnCircle.slice(),
    labels: pattern.jugglerLabels.slice(),
    passes: pattern.passes[0],
    beat: 0
}




const svgLabels = pattern.jugglerLabels.map((_, idx) =>
    svg.text(initialState.labels[idx]).amove(passer / 2, passer / 2).
        font({ size: 30, 'text-anchor': "middle", fill: 'white', 'dominant-baseline': "central", 'font-weight': "bold" }))
const svgJugglers = pattern.jugglerLabels.map((_, idx) =>
    svg.group().
        add(svg.circle(passer).fill(jugglerColors[idx])).
        add(svgLabels[idx])
)

// todo: should be between locations
function drawPass(p1: number, p2: number) {
    return pass([svgJugglers[p1].cx(), svgJugglers[p1].cy()], 0, [svgJugglers[p2].cx(), svgJugglers[p2].cy()], 1)
}


function updateAllPositions(svgJugglers: Element[], state: State, pattern: Pattern) {
    for (let idx = 0; idx < pattern.jugglerLabels.length; idx++) {
        const [x, y] = getLocation(state, idx, pattern)
        svgJugglers[idx].cx(x).cy(y)
    }
}

updateAllPositions(svgJugglers, initialState, pattern)


const svgBeatTxt = svg.text('1').move(5, 30).font({ size: 60 })



const beatCount = pattern.passes.length
let skipFirst = true
let currentState = initialState
let nextState = getNextState(currentState, pattern)
svg.animate(beatDuration * beatCount).loop().during(function (pos: number) {
    if (Math.floor(pos * beatCount) !== currentState.beat % beatCount) {
        currentState = nextState
        nextState = getNextState(currentState, pattern)

        svgBeatTxt.text(`${(currentState.beat % beatCount) + 1}`)

        for (let jugglerIdx = 0; jugglerIdx < pattern.jugglerLabels.length; jugglerIdx++) {
            const [x, y] = getLocation(currentState, jugglerIdx, pattern)
            // svgJugglers[jugglerIdx].cx(x).cy(y)
            svgLabels[jugglerIdx].text(currentState.labels[jugglerIdx])
        }

        for (let pass of currentState.passes) {
            const passerFrom = currentState.labels.indexOf(pass[0])
            const passerTo = currentState.labels.indexOf(pass[1])
            if (pass[1] === 'M')
                console.log(pass, passerFrom, passerTo)
            const p = drawPass(passerFrom, passerTo)
            p.animate(passDuration).after(function () {
                p.remove()
            })
        }


        const whoIsWalking = pattern.walking[currentState.beat % beatCount]
        if (whoIsWalking !== null) {
            const whoIsWalkingIdx = currentState.labels.indexOf(whoIsWalking)
            const from = currentState.positionsOnCircle[whoIsWalkingIdx]
            const to = (from + pattern.walkPositionChange.reduce((a, b) => a + b, 0)) % 360

            const walkingPath = svg.path(`M ${gp(from)[0]} ${gp(from)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to)[0]},${gp(to)[1]}`).fill('none')
            walkingPath.stroke({ color: 'grey', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey')).
                after(svgJugglers[whoIsWalkingIdx]).
                animate(walkDuration, walkDelay).after(() => walkingPath.remove())

            svgJugglers[whoIsWalkingIdx].animate(walkDuration, walkDelay).
                during(function (pos: number) {
                    var p = walkingPath.pointAt(pos * walkingPath.length())
                    svgJugglers[whoIsWalkingIdx].center(p.x, p.y)
                })


        }
        //if we just relabeled the manipulator, move the former manipulator to the right place
        for (let id of pattern.manipulatorIds) {
            const jugglerMIdx = currentState.labels.indexOf(id)
            const nextJugglerMIdx = nextState.labels.indexOf(id)
            if (jugglerMIdx !== nextJugglerMIdx) {
                // find manipulator's location on the next beat
                const [x, y] = getLocation(nextState, jugglerMIdx, pattern)
                svgJugglers[jugglerMIdx].animate(.5 * beatDuration, walkDelay).move(x - passer / 2, y - passer / 2);
            }
        }

        //update manipulator position after every beat
        for (let id of pattern.manipulatorIds) {
            const jugglerIdx = nextState.labels.indexOf(id)
            // find manipulator's location on the next beat
            const [x, y] = getLocation(nextState, jugglerIdx, pattern)
            svgJugglers[jugglerIdx].animate(.5 * beatDuration, walkDelay).move(x - passer / 2, y - passer / 2);
        }
    }

})

// let skipFirst = true
// svg.animate(beatDuration * beatCount).loop().during(function (pos: number) {
//     if (Math.floor(pos * beatCount) !== beat) {
//         beat = Math.floor(pos * beatCount)
//         svgBeatTxt.text(`${beat + 1}`)


//         for (let pass of passes[beat]) {
//             const passerFrom = label.indexOf(pass[0])
//             const passerTo = label.indexOf(pass[1])
//             const p = drawPass(passerFrom, passerTo)
//             p.animate(passDuration).after(function () {
//                 p.remove()
//             })
//         }


//         if (!skipFirst) label = doRelabel(label, beat)
//         skipFirst = false

//         for (let idx of [0, 1, 2, 3])
//             svgLabels[idx].text(label[idx])



//         const whoIsWalking = walking[beat]
//         if (whoIsWalking !== null) {
//             const whoIsWalkingIdx = label.indexOf(whoIsWalking)
//             const from = jugglerPositions[whoIsWalkingIdx]
//             const to = (from + walkPositionChange) % 360
//             jugglerPositions[whoIsWalkingIdx] = to

//             // jugglers[whoIsWalking].animate(beatDuration * 2.5, beatDuration * .4).move(gp(to)[0] - passer / 2, gp(to)[1] - passer / 2)


//             const walkingPath = svg.path(`M ${gp(from)[0]} ${gp(from)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to)[0]},${gp(to)[1]}`).fill('none')
//             walkingPath.stroke({ color: 'grey', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey')).
//                 after(svgJugglers[whoIsWalkingIdx]).
//                 animate(walkDuration, walkDelay).after(() => walkingPath.remove())

//             svgJugglers[whoIsWalkingIdx].animate(walkDuration, walkDelay).
//                 during(function (pos: number) {
//                     var p = walkingPath.pointAt(pos * walkingPath.length())
//                     svgJugglers[whoIsWalkingIdx].center(p.x, p.y)
//                 })


//         }
//         //if we just relabeled the manipulator, move the former manipulator to the right place
//         for (let [b/*beat*/, newManipulatorName, formerManipulatorName] of swapManipulator) {
//             if (beat === b) {
//                 const formerManipulatorIdx = label.indexOf(formerManipulatorName)
//                 jugglerPositions[formerManipulatorIdx] = jugglerPositions[label.indexOf(newManipulatorName)]
//                 const targetPosition = gp(jugglerPositions[formerManipulatorIdx])
//                 svgJugglers[formerManipulatorIdx].animate(.5 * beatDuration, walkDelay).
//                     move(targetPosition[0] - passer / 2, targetPosition[1] - passer / 2);
//             }
//         }
//         //update manipulator position after every beat
//         for (let id of manipulatorIds) {
//             const jugglerIdx = label.indexOf(id)
//             const [x, y] = getManipulatorPosition(id, (beat + 1) % passes.length, doRelabel(label, (beat + 1) % passes.length))
//             svgJugglers[jugglerIdx].animate(.5 * beatDuration, walkDelay).move(x - passer / 2, y - passer / 2);
//         }
//     }

// })
