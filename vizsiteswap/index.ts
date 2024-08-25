import { program, Option } from 'commander';
import { Config, replaceSiteswapElements, siteswapToSvg } from './svggen.js';
import { FourHandedSiteswap } from './siteswap.js';
import fs from 'fs';
import child_process from 'child_process';
import crypto from 'crypto';


program
    .name("vizsiteswap")

program.command('svg')
    .description('Generate an SVG for a siteswap')
    .option('-o, --output <file>', 'target svg file to write')
    .argument('<siteswap>', 'the siteswap to visualize')
    .action((siteswap, options) => {
        printSiteswapSvg(siteswap, options.output);
    });

program.command('preprocess')
    .description('Preprocess a text file to replace <siteswap> tags with Latex image includes')
    .requiredOption('-i, --input <file>', 'input file to read')
    .option('-o, --output <file>', 'target file to write')
    .requiredOption('-d, --dir <dir>', 'to directory to store the generated svg and pdf images')
    .option('--includeDir <dir>', 'import path for modified file')
    .addOption(new Option('--type <type>', 'kind of replacement (latex includegraphics, inline)').choices(['latex', 'inline']).default('latex'))
    .action((options) => {
        preprocessLatex(options.input, options.output, options.dir, options.includeDir, options.type);
    });

program.parse(process.argv);


// const configOptions: any = program.opts();


function printSiteswapSvg(siteswap: string, output: string | undefined) {
    const sw = new FourHandedSiteswap(siteswap)
    if (!sw.isValid()) {
        console.error(`Invalid siteswap: ${siteswap}`);
        process.exit(1);
    }

    const svg = siteswapToSvg(sw);

    if (output) {
        fs.writeFileSync(output, svg.svg());
    } else
        console.log(svg.svg());
}




function preprocessLatex(input: string, output: string | undefined, dir: string, includeDir: string | undefined, type: string) {
    const layoutConf: Partial<Config> = {
        xDist: 16,
        yDist: 20,
        xMargin: 2,
        yMargin: 2,
        circleSize: 20,
        startingHandsOffset: 20,
        throwTextSize: 14,
        labelTextSize: 5,
        startingHandsTextSize: 8
    }

    const file = fs.readFileSync(input, 'utf8');

    if (!fs.existsSync(dir)) {
        console.error(`Directory does not exist: ${dir}`);
        process.exit(1);
    }

    function genFilename(sw: FourHandedSiteswap, config: Partial<Config>): string {
        const configStr = JSON.stringify(config);
        if (configStr=="{}")
            return sw.siteswapString()
        return sw.siteswapString()+"_"+crypto.createHash("md5").update(configStr).digest('hex').substring(0,6);
    }

    const newFile = replaceSiteswapElements(file, (raw, sw, config) => {
        const siteswapFilename = genFilename(sw, config)
        const svg = siteswapToSvg(sw, { ...layoutConf, ...config });

        if (type === 'latex') {
            fs.writeFileSync(dir + "/" + siteswapFilename + ".svg", svg.svg());

            const shellCommand = `cairosvg ${dir}/${siteswapFilename}.svg -o ${dir}/${siteswapFilename}.pdf`;
            try {
                child_process.execSync(shellCommand);
            } catch (e) {
                console.error(`Failed to convert SVG to PDF: ${e}`);
            }

            return "\\includegraphics{" + (includeDir || dir) + "/" + siteswapFilename + ".pdf}";
        } else {
            return svg.svg();
        }
    });

    if (output)
        fs.writeFileSync(output, newFile);
    else console.log(newFile);



}

