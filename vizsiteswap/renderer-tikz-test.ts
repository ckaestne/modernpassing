import test from "node:test";
import { FourHandedSiteswap } from './siteswap.js'
import assert from "node:assert";
import { createSiteswapPattern } from "./pattern-fromsiteswap.js";
import { checkValidPattern } from "./pattern-structure.js";
import fs from "node:fs";
import { renderPattern } from "./renderer-tikz.js";



test("create examples file", async (t) => {

    const patterns =["77722","972","759","45678","456789a","77a","567","786"]

    let content = "\\documentclass{article}\\usepackage{tikz}\\usepackage[T1]{fontenc}\\begin{document}"
    
    for (const p of patterns) {
        const pattern = createSiteswapPattern(new FourHandedSiteswap(p),{})
        const errors = checkValidPattern(pattern)
        const tikz = renderPattern(pattern, {showLines:true, lineKind:"causal",showStraightCross:true,iterations:4,yMargin:30})

        content += `\\section{${p}}\n\n${tikz}   \n\n${errors}`
    }

    content += "\\end{document}"
    fs.writeFileSync("test/test.tex", content);


})