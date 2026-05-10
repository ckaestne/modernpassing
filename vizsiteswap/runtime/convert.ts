import { transpile } from "jsr:@deno/emit"
import { parseArgs } from "jsr:@std/cli/parse-args"

// Parse command line arguments
const args = parseArgs(Deno.args, {
    string: ["input", "output"],
    alias: {
        i: "input",
        o: "output",
        h: "help",
    },
    boolean: ["help"],
})

// Show help if requested or if required arguments are missing
if (args.help || !args.input || !args.output) {
    console.log(`
Usage: deno run convert.ts --input <input-file> --output <output-file>

Options:
  -i, --input   Input TypeScript file to convert
  -o, --output  Output JavaScript file path
  -h, --help    Show this help message

Example:
  deno run convert.ts --input animations.ts --output ../dist/animations.js
  `)
    Deno.exit(args.help ? 0 : 1)
}

const inputFile = args.input
const outputFile = args.output

console.log(`Converting ${inputFile} to ${outputFile}`)

// Read the input file
const source = await Deno.readTextFile(inputFile)
const sourceWithoutImports = source.replace(/^import.*$/gm, "")
const u = new URL(`data:text/typescript,${encodeURIComponent(sourceWithoutImports)}`)
const result = await transpile(u)
const code = await result.get(u.href)?.replaceAll("export", "")

// Write the output file
await Deno.writeTextFile(outputFile, "// GENERATED CODE. DO NOT MODIFY //\n" + code!)
console.log("Conversion completed successfully")
