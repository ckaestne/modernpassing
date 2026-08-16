# Modern Passing Book and Visualizations

This is the source for the *Modern Club Passing* book ([website](https://modernpassing.com), [pdf](https://modernpassing.com/book.pdf)). The text is in folder `src/` as easy to edit markdown files.

## Validation, Visualization, and Animation

The project has substantial code for validating and rendering patterns as SVG graphics
and animations from minimal descriptions. For example, the following 

```
<siteswap style='{"emphasizeThrows": [[0,2],[1,9]]}'>7746666</siteswap> 
```

renders as 

![7746666.svg](7746666.svg)

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

`vizsiteswap/` contains the implementation of the validation, visualization, and animation tooling. The project is written in TypeScript for the [Deno](https://deno.com) runtime.

[mdbook](https://github.com/rust-lang/mdBook) is used to translate the markdown sources into HTML and Typst files, while rendering the patterns with the siteswapviz implementation. The vizsiteswap and pdf code bases includes mdbook extensions for this rendering.

`compatsiteswaps/` contains a simple mdbook plugin to insert a [list of compatible siteswaps](https://www.cs.cmu.edu/~ckaestne/siteswaps.xhtml)

`takeout-explorer/` contains a simple web frontend for the vizsiteswap implementation, which can be used to test and debug patterns.

`css/` contains custom formatting for the rendered svgs and book.

`pdf/` contains an mdbook plugin to translate the markdown source to typst files for producing a pdf.




