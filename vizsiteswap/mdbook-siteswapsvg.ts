
/**
 * mdbook preprocessor to replace <siteswap> <siteswap-group> <sync> <sync-group> and <positions> 
 * (each possibly with a style attribute parsed as JSON for rendererConfig/renderLayoutConfig/SiteswapPatternConfig) 
 * with inline SVG images (and sometimes some javascript for animations)
 */

import fs from 'node:fs';
import process from "node:process";
import { createSyncPattern, createSiteswapPattern, createGroupPattern } from '@modernpassing/parsing';
import { replaceElement } from './replace-util.ts';
import { assert } from "node:console";

// handling of mdbook specific protocol
if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');

// fs.writeFileSync("tmp_mdbook.json", file);


const [_, book] = JSON.parse(file);



const startTime = Date.now();
const nrPatterns = [0, 0, 0]
for (const sec of book.sections) {
    try {
        if (sec.Chapter && sec.Chapter.content) {
            sec.Chapter.content = replaceElement("siteswap", sec.Chapter.content, (match, inner, config) => {
                nrPatterns[0]++
                const pattern = createSiteswapPattern(inner, config)
                if (!pattern.isValid()) {
                    console.error(`Invalid siteswap: ${inner}: \n${pattern.getValidationError()}`);
                    process.exit(1);
                }
                const svg = renderPattern(pattern, config);
                return svg.svg();
            });
            sec.Chapter.content = replaceElement("sync", sec.Chapter.content, (match, p, config) => {
                nrPatterns[1]++
                const pattern = createSyncPattern(p)
                if (!pattern.isValid()) {
                    console.error(`Invalid siteswap: ${p}: \n${pattern.getValidationError()}`);
                    process.exit(1);
                }
                const svg = renderPattern(pattern, config);
                return svg.svg();
            });
            //sync-group
            sec.Chapter.content = replaceElement("sync-group", sec.Chapter.content, (match, p, config) => {
                return handleGroupPattern(p, 2, config)
            });
            sec.Chapter.content = replaceElement("positions", sec.Chapter.content, (match, p, config) => {
                nrPatterns[1]++
                const layout = createLayout(p)
                const svg = renderStaticLayout(layout.static, 148, 148, config);
                return svg.svg();
            });
        }
    } catch (e) {
        console.error(`Error processing section ${sec.Chapter?.source_path}`)
        throw e
    }

}

function handleGroupPattern(p: string, nrHands: number, config: any): string {
    assert(nrHands === 2 || nrHands === 4, "Only 2 or 4 hands supported for group patterns");
    nrPatterns[2]++
    let result = ""
    const pattern = createGroupPattern(p, nrHands)

    try {
        if (!config.renderFramesOnly) {
            const [svg, js] = renderGroupPattern(pattern, config);
            result = svg.svg() + `\n<script>window.addEventListener("load",function(){${js}\n})\n</script>`;
        } else {
            const frames = renderLayoutFrames(pattern.layout!.frames!, 148, 148, config);
            result = '<div class="group-pattern-frames">'
                + frames.map((f) => f.svg()).join("\n")
                + '</div>'
        }
    } catch (e) {
        console.error(`Error rendering syncgroup ${p}: ${e}\n${(e as Error).stack}`)
        result = `<pre>ERROR rendering syncgroup:\n${p}: ${e}</pre>`
    }
    return result

}

const endTime = Date.now();
const elapsedTime = endTime - startTime;
console.error(`mdbook-siteswapsvg processed ${nrPatterns[1]} sync, ${nrPatterns[0]} siteswap, and ${nrPatterns[2]} group patterns in ${elapsedTime} milliseconds`);



console.log(JSON.stringify(book));



