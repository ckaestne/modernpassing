
/**
 * mdbook preprocessor to replace <siteswap> tags with inline SVG images
 */

import { FourHandedSiteswap } from './siteswap.js';
import { createSiteswapPattern, SiteswapPatternConfig } from './pattern-fromsiteswap.js';
import { renderPattern } from './renderer-svg.js';
import { RendererConfig } from './renderer-config.js';
import fs from 'fs';
import { JSDOM } from 'jsdom';


if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');

// fs.writeFileSync("tmp/mdbook.json", file);


const [_, book] = JSON.parse(file);



const startTime = Date.now();
let nrPatterns =0
for (const sec of book.sections) {
    if (sec.Chapter && sec.Chapter.content) {
        sec.Chapter.content = replaceSiteswapElements(sec.Chapter.content, (match, sw, config) => {
            nrPatterns++
            const pattern = createSiteswapPattern(sw, config);
            const svg = renderPattern(pattern, config);
            return svg.svg();
        });
    }
}

const endTime = Date.now();
const elapsedTime = endTime - startTime;
console.error(`mdbook-siteswapsvg processed ${nrPatterns} patterns in ${elapsedTime} milliseconds`);



console.log(JSON.stringify(book));



export function replaceSiteswapElements(text: string, transform: (raw: string, siteswap: FourHandedSiteswap, config: any) => string): string {
    return text.replace(/<siteswap(.*?)>(.*?)<\/siteswap>/g, (match: string, config: string, siteswap: string) => {
        const sw = new FourHandedSiteswap(siteswap)
        if (!sw.isValid()) {
            console.error(`Invalid siteswap: ${siteswap}`);
            process.exit(1);
        }
        let c = {}
        if (config)
            try {
                const el = JSDOM.fragment(match);
                const configStr = el.firstElementChild?.getAttribute("style");
                if (configStr)
                    try {
                        c = JSON.parse(configStr);
                    } catch (e) {
                        console.error(`Invalid config: ${configStr}: ${e}`);
                        process.exit(1);
                    }

            } catch (e) {
                console.error(`Invalid html: ${match}, ${e}`);
                process.exit(1);
            }


        return transform(match, sw, c)
    });
}

