#set text(
  lang: "en",
  size: 8pt,
  font: "noto sans"

)


#show link: underline

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

#show heading.where(level: 1): it => [
  #pagebreak(weak: true)
  #it
]

#let figure_scale = (
  plain: 100%,
  siteswap: 100%,
  sync: 40%,
  sync-group: 100%,
  siteswap-group: 100%,
)

#let fit_to_available(body, factor: 1.0) = layout(size => {
  let scaled = scale(x: factor, y: factor, reflow: true, body)
  let scaled_width = measure(scaled).width

  if scaled_width > size.width {
    let downscale = size.width / scaled_width * 100%
    scale(x: downscale, y: downscale, reflow: true, scaled)
  } else {
    scaled
  }
})

#let scale_figure_images(it, factor) = {
  show image: img => fit_to_available(img, factor: factor)
  it
}


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

#show figure.where(kind: "plain"): it => {
  scale_figure_images(it, figure_scale.plain)
}


#align(center, text(17pt)[
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