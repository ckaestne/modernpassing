import { SVG, registerWindow, Svg, Element } from '@svgdotjs/svg.js'


// @ts-ignore
const svg: Svg = SVG().addTo(window.document.documentElement)
svg.size(350, 350)//.viewbox(0,0,width,height)
svg.rect("100%", "100%").fill("white").stroke("black")

const offset = 50

//big circle
const bc = 250
svg.circle(bc).move(offset, offset).fill('none').stroke({ color: 'lightgrey' })

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



// // curved arrow from angle 2 to angle 3
// const [from, to] = [angles[2], angles[3]]
// svg.path(`M ${gp(from-20)[0]} ${ gp(from-20)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to+20)[0]},${gp(to+20)[1]}`).fill('none').stroke({ color: 'red' })//.marker('end', 10, 10, add => add.path('M0,0 L10,5 L0,10').fill('red')) // arrow


function arrow(x1: number, y1: number, x2: number, y2: number, color: string = 'blue') {
    return svg.line(x1, y1, x2, y2).stroke({ color }).marker('end', 10, 10, add => add.path('M0,0 L10,5 L0,10').fill(color))
}
function pass(angle1: number, hand1: 0 | 1, angle2: number, hand2: 0 | 1) {
    const [x1, y1] = gp(angle1)
    const [x2, y2] = gp(angle2)

    //angle between the two points
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    //move 20 pixel 45 degree from that angle from the first point
    const armLength = 40
    const armAngle = 30
    const direction1 = hand1 === 0 ? armAngle : -armAngle
    const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
    const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

    const direction2 = hand2 === 0 ? armAngle : -armAngle
    const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
    const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

    // svg.line(x1,y1,x1 + armLength * Math.cos((angle + direction) * Math.PI / 180), y1 + armLength * Math.sin((angle + direction) * Math.PI / 180)).stroke({color:'green'})
    // svg.line(x1,y1,x1 + armLength * Math.cos((angle ) * Math.PI / 180), y1 + armLength * Math.sin((angle) * Math.PI / 180)).stroke({color:'green'})
    // svg.line(x1,y1,x1 + armLength * Math.cos((angle - direction) * Math.PI / 180), y1 + armLength * Math.sin((angle - direction) * Math.PI / 180)).stroke({color:'green'})

    // svg.line(x2,y2,x2 + armLength * Math.cos((180+angle + direction2) * Math.PI / 180), y2 + armLength * Math.sin((180+angle + direction2) * Math.PI / 180)).stroke({color:'red'})
    // svg.line(x2,y2,x2 + armLength * Math.cos((180+angle ) * Math.PI / 180), y2 + armLength * Math.sin((180+angle) * Math.PI / 180)).stroke({color:'green'})
    // svg.line(x2,y2,x2 + armLength * Math.cos((180+angle - direction2) * Math.PI / 180), y2 + armLength * Math.sin((180+angle - direction2) * Math.PI / 180)).stroke({color:'green'})

    return arrow(x3, y3, x4, y4, 'green')

}
function drawPasses(angle1: number, angle2: number) {
    return svg.group().
        add(pass(angle1, 0, angle2, 1)).
        add(pass(angle2, 0, angle1, 1))

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



const jugglerPositions = [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30]
const jugglerColors = ['red', 'blue', 'green']
const walking = [null, null, 1, null, null, 0, null, null, 2]
const walkPositionChange = -90
const initialLabel = ['A', 'B', 'C']
const relabel = { 'A': 'B', 'B': 'C', 'C': 'A' }
const passes = [[0, 1], [0, 2], [0, 1], [0, 2], [1, 2], [0, 2], [1, 2], [0, 1], [1, 2]]
const beatDuration = 1000/*ms*/
const walkDuration = beatDuration * 1.5
const walkDelay = beatDuration * .5
const passDuration = beatDuration * .4

const labels = [0, 1, 2].map(() =>
    svg.text("X").amove(passer / 2, passer / 2).
        font({ size: 30, 'text-anchor': "middle", fill: 'white', 'dominant-baseline': "central", 'font-weight': "bold" }))
const jugglers = [0, 1, 2].map((idx) =>
    svg.group().
        add(svg.circle(passer).fill(jugglerColors[idx])).
        add(labels[idx])
)


for (let idx of [0, 1, 2]) {
    const [x, y] = gp(jugglerPositions[idx]);
    jugglers[idx].move(x - passer / 2, y - passer / 2);
}

const beatTxt = svg.text('1').move(5, 30).font({ size: 60 })

let beat = -1
const beatCount = passes.length
let label = initialLabel
svg.animate(beatDuration * beatCount).loop().during(function (pos: number) {
    if (Math.floor(pos * beatCount) !== beat) {
        beat = Math.floor(pos * beatCount)
        beatTxt.text(`${beat + 1}`)


        for (let idx of [0, 1, 2]) {
           labels[idx].text(label[idx])
        }

        const p = drawPasses(jugglerPositions[passes[beat][0]], jugglerPositions[passes[beat][1]])
        p.animate(passDuration).after(function () {
            p.remove()
        })

        const whoIsWalking = walking[beat]
        if (whoIsWalking !== null) {
            const from = jugglerPositions[whoIsWalking]
            const to = (from + walkPositionChange) % 360
            jugglerPositions[whoIsWalking] = to

            // jugglers[whoIsWalking].animate(beatDuration * 2.5, beatDuration * .4).move(gp(to)[0] - passer / 2, gp(to)[1] - passer / 2)


            const walkingPath = svg.path(`M ${gp(from)[0]} ${gp(from)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to)[0]},${gp(to)[1]}`).fill('none')
            jugglers[whoIsWalking].animate(walkDuration, walkDelay).
                during(function (pos: number) {
                    var p = walkingPath.pointAt(pos * walkingPath.length())
                    jugglers[whoIsWalking].center(p.x, p.y)
                })


        }

    }

})
