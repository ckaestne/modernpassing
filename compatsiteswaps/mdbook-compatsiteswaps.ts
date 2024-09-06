import fs from 'fs';
import { defaultConfig, loadCompatSiteswapList, Pattern } from './load-siteswaplist.js';

/**
 * mdbook preprocessor to replace $siteswapslist with a complete, sorted list of siteswaps
 */


if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');


const [_, book] = JSON.parse(file);

const config = {
    includeB: false,
    includeDragon: true,
    dragonPostfix: "",//"$^\\dagger$",
    maxLength: 7
}


for (const sec of book.sections)
    if (sec.Chapter && sec.Chapter.content) {
        sec.Chapter.content = sec.Chapter.content.replace("$siteswapslist", await genCompatSiteswapList())
    }




async function genCompatSiteswapList(): Promise<string> {
    try {

        const patternsByInterface = await loadCompatSiteswapList({ ...defaultConfig, ...config })

        let output = ""
        for (const [intf, patternsByObjects] of patternsByInterface) {
            output += `**${intf.replaceAll("s", "x")}**\n\n`
            for (const [o, p] of patternsByObjects) {
                output += `${o} clubs: ${p.map(formatPattern).join(", ")}\n\n`
            }
        }

        output = output.split(config.dragonPostfix + ", ").join("," + config.dragonPostfix + " ")
        return output
    } catch (error) {
        console.error('Error:', error);
        return '';
    }

}

function formatPattern(p: Pattern): string {
    return `[${p.siteswap}](${p.link})` + (p.hasDragon ? config.dragonPostfix : "")
}



console.log(JSON.stringify(book));
