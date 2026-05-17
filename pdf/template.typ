#set text(
  lang: "en",
  size: 8pt,
  font: "noto sans"

)


// #show link: underline

#show raw.where(block: true): block.with(
  width: 100%,
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
)

#show quote.where(block: true): block.with(
  width: 100%,
  fill: rgb("#f1f6f9"),
  inset: 10pt,
  radius: 4pt,
)

#import "@preview/booktabs:0.0.4": booktabs-default-table-style
#import "helpers.typ": *

#show: booktabs-default-table-style

#show table: set table(
  inset: (x: 0.6em, y: 0.3em),
)
#show table.cell.where(y: 0): it => {
  set block(inset: (y: .5em))
  set block(above: 2.5em)
  set text(weight: "bold")
  it
}

#show heading.where(level: 1): it => [
  #set text(size: 16pt, fill: rgb("#222978"))
  #pagebreak(weak: true)
  #it
]

#let unary(.., last) = str(last)+"."
#show heading.where(level: 1): set heading(numbering: none)
#show heading.where(level: 2): set heading(numbering: unary)
  
#show heading.where(level: 2): it => [
  #set text(size: 12pt, fill: rgb("#222978"))
  #it
]

#show heading.where(level: 3): it => [
  #set text(fill: rgb("#222978"))
  #it
]


#show figure.where(kind: "siteswap"): it => {
  scale_figure_images(it, figure_scale.siteswap)
}

#show figure.where(kind: "sync"): it => {
  scale_figure_images(it, figure_scale.sync)
}

#show figure.where(kind: "sync-group"): it => {
  scale_figure_images(it, figure_scale.sync-group)
}

#show figure.where(kind: "siteswap-group"): it => {
  scale_figure_images(it, figure_scale.siteswap-group)
}

#show image.where(source: "figures/advanced.svg"): _ => []
#show image.where(source: "figures/intermediate.svg"): _ => []
#show image.where(source: "figures/start-here.svg"): _ => []


#align(center, text(28pt)[
  *Modern Club Passing*
])




#include "frontmatter.typ"


#set page(
  columns: 2,
  margin: (x: 1in, y: 1in),
  header: context {
    if counter(page).get().first() > 1 [
      #align(right)[#text(8pt)[#emph[Modern Club Passing]]]
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #align(right)[#text(8pt)[#counter(page).display(
        "1/1",
        both: true,
      )]]
    ]
  },
)

#pagebreak()
#show outline.entry.where(
  level: 1
): it => {
  set text(weight: "bold")
  set block(above: 1.2em) 
  it
}

#outline(depth: 2)
#pagebreak()


#include "maincontent.typ"