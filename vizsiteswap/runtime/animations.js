/**
 * runtime library for animations
 */

// type data = {
//  positions: [role, x, y, svgCircle, svgLabel][]
//  segmentOffset: number
//  segments: MovementSegment[]
// }


function getSegment(data, idx) {
    return data.segments[(idx+data.segmentOffset)%data.segments.length]
}

function getLocationByRole(data, role) {
    const r= data.positions.find(([r]) => r === role)
    return [r[1], r[2]]
}
function getCircleByRole(data, role) {    
    return data.positions.find(([r]) => r === role)[3]
}
function updateLocation(data, role, x, y) {
    for (let idx = 0; idx < data.positions.length; idx++) {
        if (data.positions[idx][0] === role) {
            data.positions[idx][1] = x
            data.positions[idx][2] = y
        }
    }
}

function relabel(data, changes, shiftSegment) {
    // console.log("relabel", changes, shiftSegment)
    for (let idx = 0; idx < data.positions.length; idx++) {
        const role = data.positions[idx][0]
        const change = changes.find(([from, _]) => from === role)
        if (change) {
            data.positions[idx][0] = change[1]
            data.positions[idx][4].text(change[1])
        }
    }

    data.segmentOffset = (data.segmentOffset + shiftSegment) % data.segments.length
}

function renderPass(data, canvas, fromRole, fromHand, toRole, toHand, label) {
    const [x1, y1] = getLocationByRole(data, fromRole)
    const [x2, y2] = getLocationByRole(data, toRole)
    const [fromX, fromY, toX, toY, labelX, labelY] = computePass(x1, y1, fromHand, x2, y2, toHand)
    const g= canvas.group()
    const a = arrow(canvas, fromX, fromY, toX, toY, "black")
    g.add(a)
    if (label) 
        g.add(canvas.text(label).font({ size: 8 }).cx(labelX).cy(labelY).fill("black"))
    return g
}

function arrow(canvas, x1, y1, x2, y2, color = 'blue') {
    const line = canvas.line(x1, y1, x2, y2).stroke({ color })
    line.marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill(color))
    return line
}

function computePass(x1, y1, hand1, x2, y2, hand2, armLength = 25, labelDistance = 4) {
    //angle between the two points
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
    //move 20 pixel 45 degree from that angle from the first point
    const armAngle = 40 //todo make this configurable
    const throwOutside = 1

    const direction1 = hand1 === 0 ? armAngle : -armAngle
    const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
    const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

    const direction2 = hand2 === 0 ? armAngle * throwOutside : -armAngle * throwOutside
    const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
    const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

    const length = Math.sqrt((x3 - x4) ** 2 + (y3 - y4) ** 2)

    let labelX = (x3 + x4) / 2
    let labelY = (y3 + y4) / 2

    const passAngle = Math.atan2(y4 - y3, x4 - x3) * 180 / Math.PI

    const labelAngle =
        hand1 === 0 && hand2 === 1 ? 90 : // right hand pass to the right
            hand1 === 1 && hand2 === 0 ? 90 : // left hand pass to the left
                hand1 === 0 && hand2 === 0 ? -90 :
                    90 // crossing pass toward the target

    //sideways adjustment for label
    // if (labelAngle !== 0) {
    labelX += labelDistance * Math.cos((angle + labelAngle) * Math.PI / 180)
    labelY += labelDistance * Math.sin((angle + labelAngle) * Math.PI / 180)
    // }
    //forward adjustment for label
    labelX += length / 4 * Math.cos(passAngle * Math.PI / 180)
    labelY += length / 4 * Math.sin(passAngle * Math.PI / 180)


    return [Math.round(x3), Math.round(y3), Math.round(x4), Math.round(y4), Math.round(labelX), Math.round(labelY)]
}


function genPath(canvas, segment) {
    let p = []
    if (segment.path.length === 0) p = ['M', segment.fromX, segment.fromY, 'L', segment.toX, segment.toY]
    else p = ['M', segment.fromX, segment.fromY, ...segment.path, segment.toX, segment.toY]
    return canvas.path(p.join(' '))
}