
import { SVG } from "@svgdotjs/svg.js";
import { initialize } from './animations.ts';
import { createSVG } from '@modernpassing/svg-utils';

Deno.test("basic setup", () => {    
    const svg = createSVG(350, 350);
    
    const data = initialize('#'+svg.id(), 1);
})