import { createSiteswapPattern } from "@modernpassing/parsing";
import fs from "node:fs";
import test from "node:test";
import { customRendererConfigDefaults } from "@modernpassing/rendering-core";
import { renderPattern } from "./renderer-tikz.ts";


if (!fs.existsSync("test")) fs.mkdirSync("test");

test("create examples file", async (t) => {

    const patterns = ["77722", "972", "759", "45678", "456789a", "77a", "567", "786"]

    let content = "\\documentclass{article}\\usepackage{tikz}\\usepackage[T1]{fontenc}\\begin{document}"

    for (const p of patterns) {
        const pattern = createSiteswapPattern(p, {})
        const errors = pattern.getValidationError()
        const tikz = renderPattern(pattern, { ...customRendererConfigDefaults(4, 2), showLines: true, lineKind: "causal", showStraightCross: true, iterations: 4, yMargin: 30 })

        content += `\\section{${p}}\n\n${tikz}   \n\n${errors}`
    }

    content += "\\end{document}"

    fs.writeFileSync("test/test.tex", content);


})