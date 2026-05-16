#set text(
  lang: "en",
  size: 9pt,
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


#align(center, text(17pt)[
  *Modern Club Passing*
])

#include "frontmatter.typ"

#pagebreak()
#outline(depth: 2)
#pagebreak()

#set page(
  columns: 2,
  margin: (x: 1in, y: 1in),
  header: context {
    if counter(page).get().first() > 1 [
      Modern Club Passing
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #counter(page).display(
        "1/1",
        both: true,
      )
    ]
  },
)

#include "maincontent.typ"