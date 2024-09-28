
/**
 * mdbook preprocessor to replace <siteswap> tags with inline SVG images
 */

import { FourHandedSiteswap } from './siteswap.js';
import { createSiteswapPattern, SiteswapPatternConfig } from './pattern-fromsiteswap.js';
import { renderPattern } from './renderer-svg.js';
import { RendererConfig } from './renderer-config.js';
import fs from 'fs';
import { replaceElement } from './replace-util.js';
import { createSyncPattern } from './pattern-fromsync.js';


if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');

// fs.writeFileSync("tmp_mdbook.json", file);


const [_, book] = JSON.parse(file);



const startTime = Date.now();
let nrPatterns =[0,0]
for (const sec of book.sections) {
    if (sec.Chapter && sec.Chapter.content) {
        sec.Chapter.content = replaceElement("siteswap",sec.Chapter.content, (match, inner, config) => {
            nrPatterns[0]++
            const sw = new FourHandedSiteswap(inner)
            if (!sw.isValid()) {
                console.error(`Invalid siteswap: ${inner}`);
                process.exit(1);
            }   
            const pattern = createSiteswapPattern(sw, config);
            const svg = renderPattern(pattern, config);
            return svg.svg();
        });
        sec.Chapter.content = replaceElement("sync", sec.Chapter.content, (match, p, config) => {
            nrPatterns[1]++
            const pattern = createSyncPattern(p, config)
            const svg = renderPattern(pattern, config);
            return svg.svg();
        });
    }
}

const endTime = Date.now();
const elapsedTime = endTime - startTime;
console.error(`mdbook-siteswapsvg processed ${nrPatterns[1]} sync patterns and ${nrPatterns[0]} siteswap patterns in ${elapsedTime} milliseconds`);



console.log(JSON.stringify(book));



