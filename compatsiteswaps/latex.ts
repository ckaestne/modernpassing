import { program } from 'commander';
import fs from 'fs';
import { defaultConfig, loadCompatSiteswapList, Pattern } from './load-siteswaplist.js';



const config = {
    includeB: false,
    includeDragon: true,
    dragonPostfix: "",//"$^\\dagger$",
    maxLength: 7
}

program
    .name("compatsiteswaps")

program.option('-i, --input <file>', 'input file to read')
    .option('-o, --output <file>', 'target file to write')
    .action((options) => {
        main(options.input, options.output);
    });

program.parse(process.argv);






async function main(input: string | undefined, output: string | undefined) {


    const file = input ? fs.readFileSync(input, 'utf8') : fs.readFileSync(0, 'utf8');

    const newFile = file.replace("$siteswapslist", await genCompatSiteswapList())


    if (output)
        fs.writeFileSync(output, newFile);
    else console.log(newFile);



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
    return p.siteswap + (p.hasDragon ? config.dragonPostfix : "")
}


