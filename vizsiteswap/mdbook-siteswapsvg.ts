
/**
 * mdbook preprocessor to replace <siteswap> tags with inline SVG images
 */

import fs from 'node:fs';
import process from "node:process";
import { createSiteswapPattern } from './pattern-fromsiteswap.ts';
import { createSyncPattern } from './pattern-fromsync.ts';
import { renderGroupPattern, renderLayoutFrames, renderPattern, renderStaticLayout } from './renderer-svg.ts';
import { replaceElement } from './replace-util.ts';
import { FourHandedSiteswap } from './siteswap.ts';
import { createLayout, createSyncGroupPattern } from './pattern-fromgroup.ts';


if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');

// fs.writeFileSync("tmp_mdbook.json", file);


const [_, book] = JSON.parse(file);



const startTime = Date.now();
const nrPatterns = [0, 0, 0]
for (const sec of book.sections) {
    if (sec.Chapter && sec.Chapter.content) {
        sec.Chapter.content = replaceElement("siteswap", sec.Chapter.content, (match, inner, config) => {
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
        //sync-group
        sec.Chapter.content = replaceElement("sync-group", sec.Chapter.content, (match, p, config) => {
            nrPatterns[2]++
            let result = ""

            try {
                if (!config.renderFramesOnly && !config.renderLayoutOnly) {
                    const pattern = createSyncGroupPattern(p, config)
                    const [svg, js] = renderGroupPattern(pattern, config);
                    result = svg.svg()+`\n<script>window.addEventListener("load",function(){console.log('start');\n${js}\n})\n</script>`;
                }
                if (config.renderFramesOnly) {
                    const pattern = createSyncGroupPattern(p, config)
                    const frames = renderLayoutFrames(pattern.layout!.frames!, 148, 148, config);
                    result = '<div class="group-pattern-frames">'
                        + frames.map((f) => f.svg()).join("\n")
                        + '</div>'
                }
            } catch (e) {
                console.error(`Error rendering syncgroup ${p}: ${e}`)
                result = `<pre>ERROR rendering syncgroup:\n${p}: ${e}</pre>`
            }
            return result
        });
        sec.Chapter.content = replaceElement("positions", sec.Chapter.content, (match, p, config) => {
            nrPatterns[1]++
            const layout = createLayout(p)
            const svg = renderStaticLayout(layout.static,148, 148,  config);
            return svg.svg();
        });
    }
}

const endTime = Date.now();
const elapsedTime = endTime - startTime;
console.error(`mdbook-siteswapsvg processed ${nrPatterns[1]} sync, ${nrPatterns[0]} siteswap, and ${nrPatterns[2]} sync-group patterns in ${elapsedTime} milliseconds`);



console.log(JSON.stringify(book));



