/**
 * playground to try different paths with test rendering and 
 * producing data structures for pattern-paths.ts
 */

import { Circle, Containable, Container, Element, G, Line, registerWindow, SVG, Svg, Text } from '@svgdotjs/svg.js';
import { createSVGWindow } from 'svgdom';
import * as fs from 'node:fs';
import { scaler } from "../renderer-svg.ts";
import { MovementSegment, PositionLayout } from "../pattern-structure.ts";
import { MovementSequence } from "../pattern-structure.ts";


type Result = {initialPositions:PositionLayout[],paths:MovementSegment[],sequence:MovementSequence[]}

// create output html file
let output = "<!DOCTYPE html><html><body>"

const canvasWidth = 350
const canvasHeight = 350

//big circle
const offset = 50
const bc = 250
const center: [number, number] = [offset + bc / 2, offset + bc / 2]
const scale = scaler(50, 50, 250);
function a(x:number):number {
    return Math.round(10000*(x-50)/250)/10000
}


function fV(): [string,Svg, Result] {
    // @ts-ignore hacking to make `document` work
    const svg: Svg = createSVG()
    svg.rect("100%", "100%").fill("white").stroke("black")

    const out:Result = { initialPositions: [], paths: [],sequence:[]}

    const bigCircle = svg.circle(bc).move(offset, offset).fill('none').stroke({ color: 'lightgrey' })

    function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
        const radians = (angle * Math.PI) / 180;
        const x = dist * Math.cos(radians);
        const y = dist * Math.sin(radians);
        return [x + centerX, y + centerY];
    }
    function gp(angle: number): [number, number] {
        return getPos(angle, bc / 2, offset + bc / 2, offset + bc / 2)
    }
    function gpa(angle: number): [number, number] {
        const [x,y] = gp(angle)
        return [a(x),a(y)]
    }


    const passer = 50


    // v-path *************

    const initialJugglerPositionsOnCircle = [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30]
    for (let i = 0; i < 3; i++) {
        const [x, y] = gp(initialJugglerPositionsOnCircle[i])
        svg.circle(50).fill("blue").center(x, y)
        svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")

        out.initialPositions.push({i,x:a(x),y:a(y)})
    }

    let angle = initialJugglerPositionsOnCircle[1]
    for (let i = 0; i < 4; i++) {
        const [x, y] = gp(angle)
        svg.line(center[0], center[1], x, y).stroke({ color: 'lightgrey' })
        svg.circle(20).fill("red").center(x, y)
        svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")

        const from = angle
        const to = angle - 90
        const p = `M ${gp(from)[0]} ${gp(from)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to)[0]},${gp(to)[1]}`
        const pa = ['A', .5, .5, 0, 0, 0]
        const walkingPath = svg.path(p).fill('none')
        walkingPath.stroke({ color: 'red', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey'))

        out.paths.push({fromX:a(gp(from)[0]),fromY:a(gp(from)[1]),toX:a(gp(to)[0]),toY:a(gp(to)[1]),path:pa})

        angle -= 90
    }

    angle = initialJugglerPositionsOnCircle[0]
    for (let i = 0; i < 4; i++) {
        const [x, y] = gp(angle)
        svg.line(center[0], center[1], x, y).stroke({ color: 'lightgrey' })
        svg.circle(20).fill("blue").center(x, y)
        svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")

        angle -= 90
    }

    angle = initialJugglerPositionsOnCircle[2]
    for (let i = 0; i < 4; i++) {
        const [x, y] = gp(angle)
        svg.line(center[0], center[1], x, y).stroke({ color: 'lightgrey' })
        svg.circle(20).fill("green").center(x, y)
        svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")

        angle -= 90
    }

    return ['V',svg, out]
}



// v-path *************


// (function fY() {
//     // @ts-ignore hacking to make `document` work
//     const svg: Svg = SVG().addTo(globalThis.document.documentElement)
//     svg.size(350, 350)//.viewbox(0,0,width,height)
//     svg.rect("100%", "100%").fill("white").stroke("black")

//     const offset = 50

//     //big circle
//     const bc = 100
//     const center1: [number, number] = [100, 350 / 2]
//     const center2: [number, number] = [250, 350 / 2]
//     const c1 = svg.circle(bc).center(center1[0], center1[1]).fill('none').stroke({ color: 'lightgrey' })
//     const c2 = svg.circle(bc).center(center2[0], center2[1]).fill('none').stroke({ color: 'lightgrey' })


//     function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
//         const radians = (angle * Math.PI) / 180;
//         const x = dist * Math.cos(radians);
//         const y = dist * Math.sin(radians);
//         return [x + centerX, y + centerY];
//     }
//     function gp1(angle: number): [number, number] {
//         return getPos(angle, bc / 2, center1[0], center1[1])
//     }
//     function gp2(angle: number): [number, number] {
//         return getPos(angle, bc / 2, center2[0], center2[1])
//     }

//     const out:{initialPositions:any[],paths:any[]} = { initialPositions: [], paths: []}


//     // v-path *************

//     const initialJugglerPositionsOnCircle = [0, 180, 90, 270]
//     for (let i = 0; i < 2; i++) {
//         const [x, y] = gp1(initialJugglerPositionsOnCircle[i])
//         svg.circle(50).fill("blue").center(x, y)
//         svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")
//         out.initialPositions.push({i,x:a(x),y:a(y)})
//     }
//     for (let i = 2; i < 4; i++) {
//         const [x, y] = gp2(initialJugglerPositionsOnCircle[i])
//         svg.circle(50).fill("blue").center(x, y)
//         svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")
//         out.initialPositions.push({i,x:a(x),y:a(y)})
//     }

//     let idx =0
//     for (const j of [0,2]) {
//         let angle = initialJugglerPositionsOnCircle[j]
//         for (let i = 0; i < 4; i++) {
//             let gp = gp2
//             let center = center2
//             if (j<2){
//              gp =gp1
//              center = center1
//             }
//             const [x, y] = gp(angle)
//             svg.line(center[0], center[1], x, y).stroke({ color: 'lightgrey' })
//             svg.circle(20).fill("red").center(x, y)
//             svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")

//             const from = angle
//             const to = angle - 90
//             const pa = ['M', a(gp(from)[0]), a(gp(from)[1]), 'A',.5, .5, 0, 0, 0, a(gp(to)[0]),a(gp(to)[1])]
//             const walkingPath = svg.path(`M ${gp(from)[0]} ${gp(from)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to)[0]},${gp(to)[1]}`).fill('none')
//             walkingPath.stroke({ color: 'red', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey'))
//             svg.text(idx.toString()).center(walkingPath.cx(), walkingPath.cy()).fill("black")
//             idx++

//             out.paths.push({fromX:a(gp(from)[0]),fromY:a(gp(from)[1]),toX:a(gp(to)[0]),toY:a(gp(to)[1]),path:pa})

//             angle -= 90
//         }
//     }
//     appendOut('Y',svg, out)

// })();



function fBrunos(): [string,Svg, Result] {
    // @ts-ignore hacking to make `document` work
    const svg: Svg = createSVG()
    
    const out:Result = { initialPositions: [], paths: [], sequence:[]}

    const offsetx = 0
    const offsety = 100/250
    //big circle
   
    const dx = 1
    const dy = 100/250
    const po = 20/250
    const p: [number, number][] =  [
        [offsetx+po, offsety],
        [offsetx + dx-po, offsety],
        [offsetx + dx, offsety + dy],
        [offsetx, offsety + dy],
        [offsetx + dx/2, offsety + dy/2],
    ]
    

    // v-path *************

    for (let i = 1; i < 4; i++) {
        const [x, y] = p[i]
        svg.circle(50).fill("blue").center(scale.scalex(x), scale.scaley(y))
        svg.text(i.toString()).cx(scale.scalex(x)).cy(scale.scaley(y)).font({ size: 20 }).fill("white")

        out.initialPositions.push({
          x: (x), y: (y),
          passerIdx: i,
          role: ""
        })
    }

    const segments = [
        [3, 4, dx*.75/2, dy/4, -dy/4, dy/4],
        [4, 1, dy/2, -dy/2, -dx/8, -dy/4],
        [1,2,dx/8,dy/4,0,-dy/2],

        [2, 4, -dx*.75/2, dy/4, dy/4, dy/4],
        [4, 0, -dy/2, -dy/2, dx/8, -dy/4],
        [0,3,-dx/8,dy/4,0,-dy/2]

    ]

    let idx = 0
    for (const [from, to, dx, dy, dx2, dy2] of segments) {
        svg.line(scale.scalex(p[from][0]), scale.scaley(p[from][1]), scale.scalex(p[from][0]+dx), scale.scaley(p[from][1]+dy)).stroke({ color: 'grey' })
        svg.line(scale.scalex(p[to][0]), scale.scaley(p[to][1]), scale.scalex(p[to][0]+dx2), scale.scaley(p[to][1]+dy2)).stroke({ color: 'grey' })

        const ap= ['M', (p[from][0]), (p[from][1]), 'C', (p[from][0]+dx), (p[from][1]+dy), (p[to][0]+dx2), (p[to][1]+dy2), (p[to][0]), (p[to][1])]
        const path = scale.scalePath(ap).join(' ')
        const walkingPath = svg.path(path).fill('none')
        walkingPath.stroke({ color: 'red', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey'))
        svg.text(idx.toString()).center(walkingPath.cx(), walkingPath.cy()).fill("black")

        out.paths.push({fromX:(p[from][0]),fromY:(p[from][1]),toX:(p[to][0]),toY:(p[to][1]),path:ap.slice(2,7)})

        idx++
    }



    for (let i = 0; i < p.length; i++) {
        const [x, y] = p[i]
        svg.circle(20).fill("red").center(x, y)
    }

    return ['brunos' , svg, out]

}


function fMagermix(): [string,Svg, Result] {
    // @ts-ignore hacking to make `document` work
    const svg: Svg = createSVG()
    
    const out:Result = { initialPositions: [], paths: [], sequence:[]}

    const offsetx = .25
    //big circle
   
    const dx = .6
    const dy = 100/250
    const po = 20/250
    const p: [number, number][] =  [
        [1-offsetx,0],
        [.5,.25],
        [offsetx,0],[offsetx,.5],[offsetx,1],
        [.5,.75],
        [1-offsetx,1],[1-offsetx,.5]
    ]
    

    // v-path *************

    
    for (let i = 0; i < p.length; i++) {
        const [x, y] = p[i]
        svg.circle(3).fill("red").center(scale.scalex(x), scale.scaley(y))
        svg.text(i.toString()).cx(scale.scalex(x)).cy(scale.scaley(y)).font({ size: 20 }).fill("red")
    }

    // for (let i = 1; i < 4; i++) {
    //     const [x, y] = p[i]
    //     svg.circle(50).fill("blue").center(scale.scalex(x), scale.scaley(y))
    //     svg.text(i.toString()).cx(scale.scalex(x)).cy(scale.scaley(y)).font({ size: 20 }).fill("white")

    //     out.initialPositions.push({
    //       x: (x), y: (y),
    //       passerIdx: i,
    //       role: ""
    //     })
    // }

    const segments = [
        [4, 5, dx/4, dy/4, -dy/4, dy/4],
        [5, 7, dy/2, -dy/2, -dx/8, -dy/4],
        [7,6,dx/8,dy/4,dx/4,0],
        [6,7,-dx/4,0,-dx/8,dy/4],
        [7,0,dx/8,-dy/4 ,dx/8,0],

        [0, 1, -dx/4, -dy/4, dy/4, -dy/4],
        [1, 3, -dy/2, dy/2, dx/8, dy/4],
        [3,2,-dx/8,-dy/4,-dx/4,0],
        [2,3,dx/4,0,dx/8,-dy/4],
        [3,4,-dx/8,dy/4 ,-dx/8,0],


        // [2, 4, -dx*.75/2, dy/4, dy/4, dy/4],
        // [4, 0, -dy/2, -dy/2, dx/8, -dy/4],
        // [0,3,-dx/8,dy/4,0,-dy/2]

    ]

    let idx = 0
    for (const [from, to, dx, dy, dx2, dy2] of segments) {
        svg.line(scale.scalex(p[from][0]), scale.scaley(p[from][1]), scale.scalex(p[from][0]+dx), scale.scaley(p[from][1]+dy)).stroke({ color: 'grey' })
        svg.line(scale.scalex(p[to][0]), scale.scaley(p[to][1]), scale.scalex(p[to][0]+dx2), scale.scaley(p[to][1]+dy2)).stroke({ color: 'grey' })

        const ap= ['C', (p[from][0]+dx), (p[from][1]+dy), (p[to][0]+dx2), (p[to][1]+dy2)]
        const path = scale.scalePath(['M', (p[from][0]), (p[from][1]), ...ap, (p[to][0]), (p[to][1])]).join(' ')
        const walkingPath = svg.path(path).fill('none')
        walkingPath.stroke({ color: 'red', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey'))
        svg.text(idx.toString()).center(walkingPath.cx(), walkingPath.cy()).fill("black")

        out.paths.push({fromX:(p[from][0]),fromY:(p[from][1]),toX:(p[to][0]),toY:(p[to][1]),path:ap})

        idx++
    }



    // for (let i = 0; i < p.length; i++) {
    //     const [x, y] = p[i]
    //     svg.circle(20).fill("red").center(x, y)
    // }

    return ['magermix' , svg, out]

}



// (function fWeave() {
//     // @ts-ignore hacking to make `document` work
//     const svg: Svg = SVG().addTo(globalThis.document.documentElement)
//     svg.size(350, 350)//.viewbox(0,0,width,height)
//     svg.rect("100%", "100%").fill("white").stroke("black")
//     const out:{initialPositions:any[],paths:any[]} = { initialPositions: [], paths: []}

//      //big circle
//      const bc = 250/2
//      const center1: [number, number] = [50+bc/2, 300-bc/2]
//      const center2: [number, number] = [300-bc/2, 300-bc/2]
//      const feeder: [number, number] = [350/2,bc/2]
//      const c1 = svg.circle(bc).center(center1[0], center1[1]).fill('none').stroke({ color: 'lightgrey' })
//      const c2 = svg.circle(bc).center(center2[0], center2[1]).fill('none').stroke({ color: 'lightgrey' })
 
 
//      function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
//          const radians = (angle * Math.PI) / 180;
//          const x = dist * Math.cos(radians);
//          const y = dist * Math.sin(radians);
//          return [x + centerX, y + centerY];
//      }
//      function gp1(angle: number): [number, number] {
//          return getPos(angle, bc / 2, center1[0], center1[1])
//      }
//      function gp2(angle: number): [number, number] {
//          return getPos(angle, bc / 2, center2[0], center2[1])
//      }

//      const p = [
//         gp1(180),
//         gp1(180+60),
//         gp1(180+120),
//         gp2(180),
//         gp2(120),
//         gp2(60),
//         gp2(0),
//         gp2(-60),
//         gp2(-120),
//         gp1(0),
//         gp1(60),
//         gp1(120)
//      ]
//      const s = [0,8,4]
     

//     // v-path *************
//     for (let i = 0; i < p.length; i++) {
//         const [x, y] = p[i]
//         svg.circle(20).fill("red").center(x, y)

//     }

//     for (let i = 0; i < s.length; i++) {
//         const [x, y] = p[s[i]]
//         svg.circle(50).fill("blue").center(x, y)
//         svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")
//         out.initialPositions.push({i,x:a(x),y:a(y)})
//     }
//     svg.circle(50).fill("blue").center(feeder[0], feeder[1])
//     out.initialPositions.push({i:3,x:a(feeder[0]),y:a(feeder[1])})


//     for (let i = 0; i < p.length; i++) {
//         const flip = i<3 || i>=9
//         // const [x1, y1] = p[!flip?i:(i+1)%12]
//         // const [x2, y2] = p[!flip?(i+1)%12:i]
//         const [x1, y1] = p[i]
//         const [x2, y2] =  p[(i+1)%12]

//         const dir = flip?1:0
//         const pa = [ 'A',a(bc/2), a(bc/2), 0, 0, dir]
//         const walkingPath = svg.path(`M ${x1} ${y1} A ${bc / 2} ${bc / 2} 0 0 ${dir} ${x2},${y2}`).fill('none')
//         walkingPath.stroke({ color: 'red', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('black'))
//         svg.text(i.toString()).center(walkingPath.cx(), walkingPath.cy()).fill("black")

//         out.paths.push({fromX:a(x1),fromY:a(y1),toX:a(x2),toY:a(y2),path:pa})

//     }

//     appendOut('Weave',svg, out)


// })();



// (function fClover() {
//     // @ts-ignore hacking to make `document` work
//     const svg: Svg = SVG().addTo(globalThis.document.documentElement)
//     svg.size(350, 350)//.viewbox(0,0,width,height)
//     svg.rect("100%", "100%").fill("white").stroke("black")
//     const out:{initialPositions:any[],paths:any[]} = { initialPositions: [], paths: []}

//     const offset = 50
//     //big circle
   
//     const d = 250

//     function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
//         const radians = (angle * Math.PI) / 180;
//         const x = dist * Math.cos(radians);
//         const y = dist * Math.sin(radians);
//         return [x + centerX, y + centerY];
//     }
//     function gp(angle: number): [number, number] {
//         return getPos(angle, d / 2, offset + d / 2, offset + d / 2)
//     }


//     const corners :[number, number][] =  [
//         gp(-90),
//         gp(-90+2*360/3),
//         gp(-90+360/3),
//         // [offset+d/2, offset],
//         // [offset+d,offset+d],
//         // [offset,offset+d],
//     ]
//     function halfway(a: [number,number], b: [number,number]): [number,number] {
//         // return [(a[0]+b[0])/2, (a[1]+b[1])/2]
//         return [offset+d/2, offset+d/2]
//     }


//     const p: [number, number][] =  [
//         corners[0],
//         halfway(halfway(corners[0],corners[1]),corners[2]),
//         corners[1],
//         halfway(halfway(corners[1],corners[2]),corners[0]),
//         corners[2],
//         halfway(halfway(corners[2],corners[0]),corners[1]),
//     ]

    
//     const s = [0,3,4,2]

//     // v-path *************

//     for (let i = 0; i < s.length; i++) {
//         const [x, y] = p[s[i]]
//         svg.circle(50).fill("blue").center(x, y)
//         svg.text(i.toString()).cx(x).cy(y).font({ size: 40 }).fill("white")

//         out.initialPositions.push({i,x:a(x),y:a(y)})
//     }

//     function ad(angle: number, dist: number): [number, number] {
//         const radians = (angle * Math.PI) / 180;
//         const x = dist * Math.cos(radians);
//         const y = dist * Math.sin(radians);
//         return [x ,y];
//     }
//     function ang(i1: number, i2: number): number {
//         const [x1, y1] = p[i1]
//         const [x2, y2] = p[i2]
//         return Math.atan2(y2-y1,x2-x1)*180/Math.PI
//     }
//     const o = d/3
//     const segments: [number,number,[number,number],[number,number]][] = [
//         [0, 1, ad(ang(2,4),o),  ad(ang(2,0),o/4)],
//         [1,2,ad(ang(2,0),-o/4),  ad(ang(0,4),o)],
//         [2, 3, ad(ang(0,4),-o),  ad(ang(4,2),o/4)],
//         [3, 4, ad(ang(4,2),-o/4),  ad(ang(2,0),o)],
//         [4, 5, ad(ang(2,0),-o),  ad(ang(0,4),o/4)],
//         [5, 0, ad(ang(0,4),-o/4),  ad(ang(2,4),-o)],
//         // // [1, 2, ad(ang(2,0),o),  ad(ang(0,1),-o)],
//         // [2, 0, ad(ang(0,1),o),  ad(ang(2,1),o)],
//         // [1,2,d/2,-d/2,d/2,-d/2],
//         // [4, 1, dy/2, -dy/2, -dx/8, -dy/4],
//         // [1,2,dx/8,dy/4,0,-dy/2],

//         // [2, 4, -dx*.75/2, dy/4, dy/4, dy/4],
//         // [4, 0, -dy/2, -dy/2, dx/8, -dy/4],
//         // [0,3,-dx/8,dy/4,0,-dy/2]

//     ]
//     console.log(segments)
//     for (let i = 0; i < p.length; i++) {
//         const [x, y] = p[i]
//         svg.circle(20).fill("red").center(x, y)
//     }

//     let idx = 0
//     for (const [from, to, [dx, dy], [dx2, dy2]] of segments) {
//         svg.line(p[from][0], p[from][1], p[from][0]+dx, p[from][1]+dy).stroke({ color: 'grey' })
//         svg.line(p[to][0], p[to][1], p[to][0]+dx2, p[to][1]+dy2).stroke({ color: 'grey' })

//         const pa = ['C', a(p[to][0]+dx2), a(p[to][1]+dy2), a(p[from][0]+dx), a(p[from][1]+dy)]
//         const walkingPath = svg.path(`M ${p[to][0]} ${p[to][1]} C ${p[to][0]+dx2},${p[to][1]+dy2} ${p[from][0]+dx},${p[from][1]+dy}  ${p[from][0]},${p[from][1]}`).fill('none')
//         walkingPath.stroke({ color: 'red', width: 2 }).marker('end', 5, 5, add => add.path('M0,0 L5,2.5 L0,5').fill('grey'))
//         svg.text(idx.toString()).center(walkingPath.cx(), walkingPath.cy()).fill("black")
//         idx++


//         out.paths.push({fromX:a(p[to][0]),fromY:a(p[to][1]),toX:a(p[from][0]),toY:a(p[from][1]),p:pa})

//     }


//     appendOut('Clover',svg, out)

   
// })();



// (function fCircle() {
//     // @ts-ignore hacking to make `document` work
//     const svg: Svg = SVG().addTo(globalThis.document.documentElement)
//     svg.size(350, 350)//.viewbox(0,0,width,height)
//     svg.rect("100%", "100%").fill("white").stroke("black")

//     const offset = 50

//     //big circle
//     const bc = 250
//     const bigCircle = svg.circle(bc).move(offset, offset).fill('none').stroke({ color: 'lightgrey' })
//     const center: [number, number] = [offset + bc / 2, offset + bc / 2]

//     function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
//         const radians = (angle * Math.PI) / 180;
//         const x = dist * Math.cos(radians);
//         const y = dist * Math.sin(radians);
//         return [Math.round(1000*(x + centerX))/1000, Math.round(1000*(y + centerY))/1000];
//     }
//     function gp(angle: number): [number, number] {
//         return getPos(angle, bc / 2, offset + bc / 2, offset + bc / 2)
//     }
//     function gp1(angle: number): [number, number] {
//         return getPos(angle, .5, .5, .5)
//     }


//     const passer = 50


//     // v-path *************

//     const initialJugglerPositionsOnCircle = [270,270+360/5,270+2*360/5,270+3*360/5,270+4*360/5]
//     const positions = initialJugglerPositionsOnCircle.map(gp1)
//     console.log(positions)
//     for (let i = 0; i < initialJugglerPositionsOnCircle.length; i++) {
//         const [x, y] = gp(initialJugglerPositionsOnCircle[i])
//         svg.circle(50).fill("blue").center(x, y)
//         svg.text(i.toString()).cx(x).cy(y).font({ size: 20 }).fill("white")
//     }

// })();



function createSVG(): Svg {
    const window = createSVGWindow();
    const document = window.document;
    registerWindow(window, document);

    const svg: any = SVG(document.documentElement);

    svg.size(canvasWidth, canvasHeight).viewbox(0,0,canvasWidth,canvasHeight)
    svg.rect("100%", "100%").fill("white").stroke("black")
    return svg
}



function appendOut(name: string, svg: Svg, o: Result){
    output += `<h2>${name}</h2>`
    output += svg.svg()
    output += `<pre>${JSON.stringify(o,null,2)}</pre>`
}


appendOut(...fV());

appendOut(...fBrunos());
appendOut(...fMagermix());


fs.writeFileSync("out/paths.html", output);
