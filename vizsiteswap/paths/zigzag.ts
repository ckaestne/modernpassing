/**
 * simple script to generate svg showing a massive circular zig-zag pattern
 */


import { createSVG } from "../renderer-svg.ts";

const w = 300
const innerR = 100
const outerR = 140
const passerR = 8
const svg = createSVG(w,w);

// svg.circle(outerR*2).center(w/2,w/2).fill("none").stroke({width:1, color:"lightgray"})
// svg.circle(innerR*2).center(w/2,w/2).fill("none").stroke({width:1, color:"lightgray"})

const angleInc = 24
for (let degree = 0; degree < 360; degree += angleInc) {
    const rad = degree * Math.PI / 180
    const rad2 = (degree+angleInc/2) * Math.PI / 180
    const rad3 = (degree+angleInc) * Math.PI / 180
    const x1 = w/2 + Math.cos(rad) * innerR
    const y1 = w/2 + Math.sin(rad) * innerR
    const x2 = w/2 + Math.cos(rad2) * outerR
    const y2 = w/2 + Math.sin(rad2) * outerR
    const x3 = w/2 + Math.cos(rad3) * innerR
    const y3 = w/2 + Math.sin(rad3) * innerR
    svg.line(x1,y1,x2,y2).stroke({width:1, color:"gray"}).back()
    svg.line(x2,y2,x3,y3).stroke({width:1, color:"gray"}).back()
    svg.circle(passerR*2).center(x2,y2).fill('white').stroke({width:2, color:"black"})
    svg.circle(passerR*2).center(x1,y1).fill('white').stroke({width:2, color:"black"})
}



Deno.writeFileSync("../src/figures/zigzag.svg", new TextEncoder().encode(svg.svg()), {create: true, append: false});