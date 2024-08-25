import fs from 'fs';

/**
 * mdbook preprocessor to replace <siteswap> tags with inline SVG images
 */

import { replaceSiteswapElements, siteswapToSvg } from './svggen.js';


if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');

// fs.writeFileSync("tmp/mdbook.json", file);


const [_, book] = JSON.parse(file);



for (const sec of book.sections)
    if (sec.Chapter && sec.Chapter.content) {
        sec.Chapter.content = replaceSiteswapElements(sec.Chapter.content, (match, sw, config) => {
            const svg = siteswapToSvg(sw, config);
            return svg.svg();
        });
    }



console.log(JSON.stringify(book));
