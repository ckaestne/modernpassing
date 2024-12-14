// import { createSVGWindow } from 'svgdom'
// import { SVG, registerWindow, Svg, Element } from '@svgdotjs/svg.js'
// import express from 'express';
// import livereload from 'livereload';
// import connectLiveReload from 'connect-livereload';

// const liveReloadServer = livereload.createServer();
// // liveReloadServer.watch(__dirname);
// liveReloadServer.server.once("connection", () => {
//     setTimeout(() => {
//         liveReloadServer.refresh("/svg");
//     }, 100);
// });


// const app = express();
// const port = 2000;
// app.use(connectLiveReload());


// app.get('/svg', (req: any, res: { setHeader: (arg0: string, arg1: string) => void; send: (arg0: string) => void; }) => {
//     // returns a window with a document and an svg root node
//     const window = createSVGWindow()
//     const document = window.document

//     // register window and document
//     registerWindow(window, document)
//     // @ts-ignore
//     const svg: Svg = SVG(document.documentElement)
//     svg.size(350, 350)//.viewbox(0,0,width,height)
//     // svg.rect("100%", "100%").fill("white").stroke("black")

//     const offset = 50

//     //big circle
//     const bc = 250
//     svg.circle(bc).move(offset, offset).fill('none').stroke({ color: 'lightgrey' })

//     const passer = 50

//     function getPos(angle: number, dist: number, centerX: number, centerY: number): [number, number] {
//         const radians = (angle * Math.PI) / 180;
//         const x = dist * Math.cos(radians);
//         const y = dist * Math.sin(radians);
//         return [x + centerX, y + centerY];
//     }
//     function gp(angle: number): [number, number] {
//         return getPos(angle, bc / 2, offset + bc / 2, offset + bc / 2)
//     }

//     const angles = [270, 90 + 30, 90 - 30, 330]

//     for (let angle of angles) {
//         const [x, y] = gp(angle);
//         svg.circle(passer).move(x - passer / 2, y - passer / 2);
//     }



//     // curved arrow from angle 2 to angle 3
//     const [from, to] = [angles[2], angles[3]]
//     svg.path(`M ${gp(from-20)[0]} ${ gp(from-20)[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(to+20)[0]},${gp(to+20)[1]}`).fill('none').stroke({ color: 'red' }).marker('end', 10, 10, add => add.path('M0,0 L10,5 L0,10').fill('red')) // arrow


//     function arrow(x1: number, y1: number, x2: number, y2: number, color: string='blue') {
//         svg.line(x1, y1, x2, y2).stroke({ color }).marker('end', 10, 10, add => add.path('M0,0 L10,5 L0,10').fill(color))
//     }
//     function pass(angle1:number, hand1:0|1, angle2:number, hand2:0|1) {
//         const [x1, y1] = gp(angle1)
//         const [x2, y2] = gp(angle2)

//         //angle between the two points
//         const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
//         //move 20 pixel 45 degree from that angle from the first point
//         const armLength = 40
//         const armAngle = 30
//         const direction1 = hand1 === 0 ? armAngle : -armAngle
//         const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180) 
//         const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

//         const direction2 = hand2 === 0 ? armAngle : -armAngle
//         const x4 = x2 + armLength * Math.cos((180+angle + direction2) * Math.PI / 180) 
//         const y4 = y2 + armLength * Math.sin((180+angle + direction2) * Math.PI / 180)
        
//         // svg.line(x1,y1,x1 + armLength * Math.cos((angle + direction) * Math.PI / 180), y1 + armLength * Math.sin((angle + direction) * Math.PI / 180)).stroke({color:'green'})
//         // svg.line(x1,y1,x1 + armLength * Math.cos((angle ) * Math.PI / 180), y1 + armLength * Math.sin((angle) * Math.PI / 180)).stroke({color:'green'})
//         // svg.line(x1,y1,x1 + armLength * Math.cos((angle - direction) * Math.PI / 180), y1 + armLength * Math.sin((angle - direction) * Math.PI / 180)).stroke({color:'green'})

//         // svg.line(x2,y2,x2 + armLength * Math.cos((180+angle + direction2) * Math.PI / 180), y2 + armLength * Math.sin((180+angle + direction2) * Math.PI / 180)).stroke({color:'red'})
//         // svg.line(x2,y2,x2 + armLength * Math.cos((180+angle ) * Math.PI / 180), y2 + armLength * Math.sin((180+angle) * Math.PI / 180)).stroke({color:'green'})
//         // svg.line(x2,y2,x2 + armLength * Math.cos((180+angle - direction2) * Math.PI / 180), y2 + armLength * Math.sin((180+angle - direction2) * Math.PI / 180)).stroke({color:'green'})

//         arrow(x3, y3, x4, y4, 'green')

//     }

//     // arrow(gp(angles[0])[0], gp(angles[0])[1], gp(angles[1])[0], gp(angles[1])[1])
//     // arrow(gp(angles[1])[0], gp(angles[1])[1], gp(angles[0])[0], gp(angles[0])[1])
//     pass(angles[0], 0, angles[1], 1)
//     pass(angles[1], 0, angles[0], 1)


//     const [x, y] = gp(angles[2])
//     svg.circle(passer).move(-passer/2,-passer/2).fill('purple')
//         .element('animateMotion').attr({ dur: '5s', repeatCount: 'indefinite', path: `M ${gp(angles[2])[0]},${gp(angles[2])[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(angles[3])[0]},${gp(angles[3])[1]}` })
        
        
//         // add('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: `M ${gp(angles[2])[0]},${gp(angles[2])[1]} A ${bc / 2} ${bc / 2} 0 0 0 ${gp(angles[3])[0]},${gp(angles[3])[1]}` })
    

//     // const [x, y] = getPos(350, bc / 2)
//     // console.log(x,y)
//     // svg.circle(passer).move(x + offset - passer / 2, y + offset - passer / 2)


//     //  <path
//     //  fill="none"
//     //  stroke="lightgrey"
//     //  d="M 300,150 A 100,100 0 0,1 100,150" />

//     //  <circle cx="100" cy="150" r="50" fill="black" />
//     //  <circle cx="200" cy="150" r="50" fill="black" />
//     //  <circle id="movingCircle" r="50" fill="black" >
//     //      <animateMotion dur="5s" repeatCount="indefinite" path="M 300,150 A 100,100 0 0,1 100,150" />
//     //      </circle>
//     //  <text x="100" y="150" font-family="Verdana" font-size="20" fill="white" text-anchor="middle" dy=".3em">A</text>
//     //  <text x="200" y="150" font-family="Verdana" font-size="20" fill="white" text-anchor="middle" dy=".3em">B</text>
//     //  <text x="300" y="150" font-family="Verdana" font-size="20" fill="white" text-anchor="middle" dy=".3em">C</text>




//     const svgContent = svg.svg();

//     const html = `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>SVG Example</title>
//     </head>
//     <body>
//         ${svgContent}
//     </body>
//     </html>
//     `;

//     res.setHeader('Content-Type', 'text/html');
//     res.send(html);
// });

// app.listen(port, () => {
//     console.log(`Server is running at http://localhost:${port}`);
// });