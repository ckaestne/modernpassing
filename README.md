# Modern Passing Book and Visualizations

This is the source for the *Modern Club Passing* book ([website](https://modernpassing.com), [pdf](https://modernpassing.com/book.pdf)). The text is in folder `src/` as easy to edit markdown files.

## Validation, Visualization, and Animation

The project has substantial code for validating and rendering patterns as SVG graphics
and animations from minimal descriptions. For example, the following 

```
<siteswap style='{"emphasizeThrows": [[0,2],[1,9]]}'>7746666</siteswap> 
```

renders as 

<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="591" height="108" viewbox="0 0 591 108" class="passingpattern"><g><circle r="20" cx="79" cy="34" fill="black"></circle><text x="79" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">7</text><text><tspan x="79" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">R ∥</tspan></text><circle r="20" cx="111" cy="74" fill="black"></circle><text x="111" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">7</text><text><tspan x="111" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">R X</tspan></text><circle r="20" cx="143" cy="34" fill="red"></circle><text x="143" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">4</text><text><tspan x="143" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">L</tspan></text><circle r="20" cx="175" cy="74" fill="black"></circle><text x="175" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="175" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">L</tspan></text><circle r="20" cx="207" cy="34" fill="black"></circle><text x="207" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="207" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">R</tspan></text><circle r="20" cx="239" cy="74" fill="black"></circle><text x="239" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="239" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">R</tspan></text><circle r="20" cx="271" cy="34" fill="black"></circle><text x="271" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="271" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">L</tspan></text><circle r="20" cx="303" cy="74" fill="black"></circle><text x="303" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">7</text><text><tspan x="303" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">L X</tspan></text><circle r="20" cx="335" cy="34" fill="black"></circle><text x="335" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">7</text><text><tspan x="335" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">R ∥</tspan></text><circle r="20" cx="367" cy="74" fill="red"></circle><text x="367" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">4</text><text><tspan x="367" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">R</tspan></text><circle r="20" cx="399" cy="34" fill="black"></circle><text x="399" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="399" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">L</tspan></text><circle r="20" cx="431" cy="74" fill="black"></circle><text x="431" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="431" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">L</tspan></text><circle r="20" cx="463" cy="34" fill="black"></circle><text x="463" y="34" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="463" y="14" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-after-edge">R</tspan></text><circle r="20" cx="495" cy="74" fill="black"></circle><text x="495" y="74" font-size="28" text-anchor="middle" fill="white" dominant-baseline="central" font-weight="bold">6</text><text><tspan x="495" y="94" class="throw-label" font-size="10" text-anchor="middle" fill="black" dominant-baseline="text-before-edge">R</tspan></text><text x="31.5" y="34" class="starting-hands" font-size="12" text-anchor="middle" fill="black" dominant-baseline="central">2R|1L</text><text x="31.5" y="74" class="starting-hands" font-size="12" text-anchor="middle" fill="black" dominant-baseline="central">2R|1L</text></g></svg>

and this is the notation for Scrambled V


```
<sync-group>
A: 3pB 3 3pC 3 3pB 3 -- B
B: 3pA 3 3   3 3pA 3 -- C
C: 3   3 3pA 3 3   3 -- A
M: CB↺ . SBl z ICl↺ 
positions: V(A,B,C)
move: Vmove(B,4.9,3)
</sync-group>
```

which turns into the animation on https://modernpassing.com/6f-aidan-patterns.html and the corresponding frames in the [pdf version](https://modernpassing.com/book.pdf). That is, none of these figures are drawn manually, starts and hands and movement are all computed from notation to avoid mistakes.


The validation and animation code can be used in isolation in the [Takeout Explorer](https://takeout-explorer.modernpassing.deno.net) tool.

## Supported Patterns

The validation and animation code currently supports synchronous patterns and four-handed siteswaps, as well as movement, relabeling and takeouts.

File `pattern notation.md` describes what is supported. For manipulator patterns, file `manipulator notation.md` describes the corresponding notation. The book has many examples and the [Takeout Explorer](https://takeout-explorer.modernpassing.deno.net) has most of the book's patterns as easy to load examples.


## Implementation overview

`src/` contains the text of the book.

`siteswapviz/` contains the implementation of the validation, visualization, and animation tooling. The project is written in TypeScript for the [Deno](https://deno.com) runtime.

[mdbook](https://github.com/rust-lang/mdBook) is used to translate the markdown sources into HTML and Typst files, while rendering the patterns with the siteswapviz implementation. The siteswapviz and pdf code bases includes mdbook extensions for this rendering.

`compatsiteswaps/` contains a simple mdbook plugin to insert a [list of compatible siteswaps](https://www.cs.cmu.edu/~ckaestne/siteswaps.xhtml)

`takeout-explorer/` contains a simple web frontend for the siteswapviz implementation, which can be used to test and debug patterns.

`css/` contains custom formatting for the rendered svgs and book.

`pdf/` contains an mdbook plugin to translate the markdown source to typst files for producing a pdf.




