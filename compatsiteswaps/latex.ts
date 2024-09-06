import { program } from 'commander';
import fs from 'fs';
import { JSDOM } from 'jsdom'; // Import the JSDOM class


program
    .name("compatsiteswaps")

program.option('-i, --input <file>', 'input file to read')
    .option('-o, --output <file>', 'target file to write')
    .action((options) => {
        main(options.input, options.output);
    });

program.parse(process.argv);



const config = {
    includeB: false,
    includeDragon: true,
    dragonPostfix: "",//"$^\\dagger$",
    maxLength: 7
}




async function main(input: string | undefined, output: string | undefined) {


    const file = input ? fs.readFileSync(input, 'utf8') : fs.readFileSync(0, 'utf8');

    const newFile = file.replace("$siteswapslist", await genCompatSiteswapList())


    if (output)
        fs.writeFileSync(output, newFile);
    else console.log(newFile);



}



async function genCompatSiteswapList(): Promise<string> {
    try {
        const dom = await JSDOM.fromURL('https://www.cs.cmu.edu/~ckaestne/siteswaps.xhtml')

        // let swinterface: string = ""
        let output = ""

        const patterns = dom.window.document.getElementById("patterns")!.querySelector("div")!
        for (let el of patterns.childNodes!) {
            if (el.nodeName === "h2") {
                // swinterface = el.textContent!
                // output += `\\paragraph{${el.textContent?.replaceAll("s", "x")}}\\\n\n`
                output += `**${el.textContent?.replaceAll("s", "x")}**\n\n`
            } else if (el.nodeName === "div" && (el as Element).classList.contains("p")) {
                const patternsByObjects: { [objects: number]: Pattern[] } = {};
                for (const e of el.childNodes!) {
                    const p = getPattern(e as Element)
                    if (p) {

                        if (!patternsByObjects[p.objects]) {
                            patternsByObjects[p.objects] = [];
                        }
                        patternsByObjects[p.objects].push(p);
                    }
                }

                for (const o in patternsByObjects) {
                    output += `${o} clubs: ${patternsByObjects[o].map(formatPattern).join(", ")}\n\n`
                }


            }

        }

        output = output.split(config.dragonPostfix+", ").join(","+config.dragonPostfix+" ")

        return output
    } catch (error) {
        console.error('Error:', error);
        return '';
    }

}

type Pattern = {
    siteswap: string,
    objects: number,
    hasDragon: boolean,
    name: string | undefined
}

function getPattern(node: Element): Pattern | undefined {
    if (node.nodeName !== "div") return undefined
    const siteswap = node.querySelector("a")!.innerHTML!
    const name = node.lastChild?.nodeName === "span" ? node.lastChild.textContent : undefined
    const hasDragon = node.classList.contains("dr")
    const objects = node.querySelector("span[class='num']")?.textContent

    if (hasDragon && !config.includeDragon) return undefined
    if (siteswap.includes('b') && !config.includeB) return undefined
    if (siteswap.length>config.maxLength) return undefined

    return { siteswap: siteswap, objects: parseFloat(objects!) * 2, hasDragon: hasDragon, name: name === "" || name === null ? undefined : name }
}

function formatPattern(p: Pattern): string {
    return p.siteswap + (p.hasDragon? config.dragonPostfix:"")
}


