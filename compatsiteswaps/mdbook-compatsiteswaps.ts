import fs from 'node:fs';
import process from "node:process";
import { defaultConfig, loadCompatSiteswapList, Pattern } from './load-siteswaplist.ts';

/**
 * mdbook preprocessor to replace $siteswapslist with a complete, sorted list of siteswaps
 */


if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") || process.argv.includes("typst") ? 0 : 1);
}

const file = fs.readFileSync(0, 'utf-8');

const book = extractBook(JSON.parse(file));

const config = {
    includeB: false,
    includeDragon: true,
    dragonPostfix: "",//"$^\\dagger$",
    maxLength: 7
}

const generatedSiteswapList = await genCompatSiteswapList()


forEachChapter(book, (chapter) => {
    if (typeof chapter.content === "string") {
        chapter.content = chapter.content.replace("$siteswapslist", generatedSiteswapList)
    }
})

function extractBook(rawInput: unknown): unknown {
    if (Array.isArray(rawInput) && rawInput.length >= 2) {
        return rawInput[1]
    }
    if (rawInput && typeof rawInput === "object" && "book" in rawInput) {
        return (rawInput as { book: unknown }).book
    }
    return rawInput
}

type ChapterNode = {
    content?: string
    [key: string]: unknown
}

function forEachChapter(node: unknown, callback: (chapter: ChapterNode) => void): void {
    if (Array.isArray(node)) {
        for (const item of node) {
            forEachChapter(item, callback)
        }
        return
    }
    if (!node || typeof node !== "object") {
        return
    }

    const record = node as Record<string, unknown>
    if (record.Chapter && typeof record.Chapter === "object") {
        callback(record.Chapter as ChapterNode)
    }

    for (const value of Object.values(record)) {
        if (value && typeof value === "object") {
            forEachChapter(value, callback)
        }
    }
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
