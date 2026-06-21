# Style conventions



Named siteswap is the name in italics followed by the number in parentheses: 

* "*Name* (siteswap)" -- e.g., "*7-club three-count* (966)"

Unnamed siteswap is just the number in italics

* *siteswap* -- e.g., *789*


Avoid period or complicated constructions for length:
* "Siteswap of length 6", not period-6 siteswap

Use number literals to indicate the numbers of clubs:
* "7-club", not "seven-club"

Use words not number literals to indicate counts of the base pattern; this always uses a hyphen even when not modifying another word:
* "three-count", not "3-count" or "three count"

-> "7-club three-count"


People are called passers, not jugglers or person. They are identified by letters
* "Passer A", not "Passer 1" or "Juggler 1"


The number of passers is indicated with a number literal not a word
* 3-person pattern (not three-person, not three-passer)

Capitalization generally follows sentence capitalization. There are a couple of proper names for patterns that are always capitalized, including:
* Scrambled V (also Scrambled V-B, Scrambled V on Toast, Scrambled 3, Scrambled 3-V) but generally just "scrambleds"
* Bruno's, Jim's, Martin's
* Roundabout when used as a distinct pattern name, but "three-count roundabout" when modified
* French, German
* Phoenicean
* MinuEd
* Zippy
* Long Beach
* Ambled V (also Ambled B, Ambled Toast, Ambled B on Toast, Unscrambled B, Toast)
* BrunEd
* Brunickolf
* El Niño
* Magermix

The following can but do not need to be capitalized, based on context:
* why not
* holy grail
* heff, double, single, trelf


Section headings are capitalized sentence style. So are all the paragraph lead ins in bold; which must end with a period.


# Output-dependent text (HTML vs PDF)

The same markdown produces both the website (HTML) and the printed book (PDF). When a passage needs to differ between the two, use one of these markers:

* **PDF only (markdown):** wrap the text in a `pdf:` comment. It is invisible on the website (it is just an HTML comment) and rendered in the PDF. The content is processed as markdown.
  * Inline: `... as shown above<!-- pdf: (see Figure 3) -->.`
  * Block (markdown inside is rendered):

    ```
    <!-- pdf:
    This whole paragraph appears only in the printed book.
    -->
    ```

* **PDF only (raw Typst):** wrap the code in a `typst:` comment. Like `pdf:`, it is invisible on the website and emitted only in the PDF, but the content is passed through verbatim as Typst markup — it is *not* processed as markdown and `#` is *not* escaped. Use this to call Typst functions directly.
  * Inline: `... see the website <!-- typst: #qr_with_label("https://modernpassing.com", [modernpassing.com]) -->.`
  * Block: put the comment on its own line, e.g. `<!-- typst: #qr_with_label("https://modernpassing.com", [modernpassing.com], size: 1cm) -->`.

* **HTML only:** wrap the text in `<html-only>...</html-only>`. It appears on the website and is dropped from the PDF.
  * Inline: `Watch the <html-only>animation below</html-only> diagram.`
  * Block: put the tags on their own lines around the content.

Caveat for `<html-only>`: markdown formatting is processed inside it when used *inline*, but mdBook does not reformat markdown inside a *block-level* `<html-only>` element (a CommonMark raw-HTML-block rule). For block use, keep the content as plain HTML or move formatting to inline `<html-only>` spans.