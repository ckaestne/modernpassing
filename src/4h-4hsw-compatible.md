# Compatible Siteswaps


<progressions>

**Prerequisites —** [Beginner four-handed siteswaps](4b-4hsw-beginner.md) and [notation](4a-4hsw-notation.md)

</progressions>

In four-handed siteswaps, usually both passers juggle the same sequence, just offset from each other. However, this is not necessary – just like there are many synchronous passing patterns that match different patterns, such as throwing an early double (see [basic synchronous patterns](2b-basic-sync.md)). 

Matching an easier and a harder four-handed siteswap allows passers with different skills to both juggle interesting patterns. A good example is matching the easy *5-club one-count* (744) with the harder 7-club pattern *French three-count* (786):

<siteswap>784746</siteswap>

Matching compatible siteswaps also helps to stabilize passes for a passing partner when learning hard patterns. A common example is learning the 8-club pattern *978*, where one passer at a time can drop a club to switch to *972*, which usually provides them with much more room to recover and still provide good passes. 

<siteswap>978972</siteswap>

## Theory: What makes two siteswaps compatible?

Two patterns are compatible if they have the same length and the same sequence of *catching* passes and non-passes. The sequence of catching passes and non-passes is the *interface*. For example, *744* and *786* both require catching one pass followed by two non-passes (interface *pxx*), and *972* and *978* require catching two passes followed by one non-pass (interface *ppx*). 

Importantly, it does not matter when clubs are thrown, but when they land, since it only matters whether an incoming club comes from another passer or oneself. For example, in *maybe* (72786), the passer throws two consecutive singles, but in *maybe not* (96627), the passer throws a double and a single a pass apart – nevertheless, in both cases the passes arrive on consecutive beats, so they are compatible with the interface *ppxxx*.

<siteswap>7279662786</siteswap>

Note that *ppxxx*, *xppxx*, *xxppx*, and so forth are all the same interface, simply by shifting where to start each siteswap.

Unfortunately, figuring out the interface of a siteswap is nontrivial and often requires pen and paper (see [theory](4l-4hsw-theory.md)) – or simply look it up with a tool like [passist.org](https://passist.org/). Many standard siteswap transformations preserve the interface. Figuring out how to start is also not always obvious and may require some trial and error or scribbling of causal diagrams (see [siteswap theory](4l-4hsw-theory.md)).

## Compatible Common Patterns

Here is a table with the compatibility of some common period 1, 3, and 5 siteswaps – all patterns in the same row are compatible:

| Interface | 4 and 5 club patterns                                        | 6 and 7 club patterns                                        | 8 and 9 club patterns |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------- |
| pxx       | 5-club one-count (744), 726, 564, 582, 528                   | French three-count (786), 7-club three-count (966), 588, 56a | a89, a7a              |
| ppx       | 552                                                          | 756, 774, 558, 945, 972                                      | 996, a77              |
| ppp       | 555                                                          | 777, holy grail (975)                                        | 999                   |
| pxxxx     | 5-club why not (78622), 56464                                | five-count popcorn (78686, 7a666)                            | aaa69, aaaa5          |
| ppxxx     | 72722                                                        | maybe (72786), maybe not (79662), 747a2                      | 969a6                 |
| pxpxx     | inverted parsnip (72227)                                     | Jim's two-count (77466), why not (77862), not why (77286), not likely (96672), suicide bunny (56784) | 789a6                 |
| pppxx     | Kaatzi (75724), Dragon cat (95524)                           | 99692, 96956, 96857                                          |                       |
| ppxpx     | Parsnip (77722), funky magazin rack (55564), Dragonfly (97522) | Funky bookends (77786), funky bookends friend (77966), 95678, 97586 | 999a8                 |
| ppppx     |                                                              | Martin's one-count (77772), 75756, 57585, a5555              | 97978                 |

## Even-length siteswaps

In siteswaps of an even length, both passers perform their own sequence. The most common example of this is *8-club one-count on singles versus doubles*, which is simply the siteswap *97*:

<siteswap style='{"iterations": 6, "startingJuggler": 1}'>97</siteswap>

All combinations of two odd-length siteswaps, discussed above, turn into even-length siteswaps. For example, the combination of *maybe* (72786) and *maybe not* (96627) turns into the siteswap **7**2**7**9**6**6**2**7**8**6, as visible in the diagram above. Since it is interleaving the *local* actions of each passer and requires finding the right start, doing this combination manually is nontrivial.

More interestingly, even-length siteswaps open possibilities for combining two sequences that are *not* a valid four-handed siteswap on their own. A typical example is *777726*, where the passers throw pass-pass-zip (very good for beginners after one-counts) versus pass-pass-self:

<siteswap>777726</siteswap>

Such patterns are fairly uncommon in the passing community right now, but there is a large space of possible patterns to explore. This includes the possibility of finding patterns that work against pass-self-self and thus feel like traditional 6-club three-count on one side, such as **7**8**6**9**6**6 and 7**7**a**6**6**6**: 

<siteswap>786966</siteswap>

<siteswap>77a666</siteswap>

<!-- typ-no-link-footnote: passist.org -->

To find more patterns, use any siteswap generator (such as [passist.org](https://passist.org/siteswap-generator)) to generate patterns with a length of 6, 10, or 14 and exclude any patterns with 1s or 3s. 

## Hijacking

In siteswaps of length 5, every single pass can be replaced with a zip to get a pattern with one fewer club (the same works for doubles in siteswaps of length 7; this is a standard [siteswap transformation](4l-4hsw-theory.md)). It is fairly intuitive to continue a pattern after dropping a club by replacing a pass with a zip if the next hand would be empty otherwise. 

A classic sequence is to start in *7-club one-count* (77777), dropping down to *Martin's one-count* (77772) when dropping a club (by accident or intentionally), dropping further down to *parsnip* (77722) or *77272*, and so forth. The inverse direction is possible by adding a club to a pattern (e.g., tugged between the legs), replacing a zip with a pass. It is possible to intentionally go from *77777* down all the way to *72222* and then back up by tucking clubs.

The same automatism of intuitively replacing an action with a zip for a missing incoming pass is also the foundation for hijacking patterns: Hijacking is an idea where one passer changes their pattern into one with one more club, which forces the other passer into a compatible pattern with fewer clubs (introducing a zip for the missing incoming pass). Conversely, they can throw an extra pass to arrive at a time where the other passer would have zipped into the hand, to force them to pass that club and switch into a pattern with one more club -- the latter is mostly done to restore from the pattern after hijacking to the original one.

The classic example is hijacking from *6-club why not* (77862) into the 7-club pattern *five-count popcorn* (78686), forcing the other passer into the compatible *5-club why not* (78622).
* Hijacking: A passer forces the transition with a *self* instead of a pass, throwing pass-*self*-self-heff-heff instead of pass-self-*pass*-heff-zip. The skipped pass forces the other passer to compensate with a zip which replaces a pass they would otherwise do -- which again is a fairly natural and intuitive transition. From here, the pattern is stable with two different compatible siteswaps.
* Transitioning back: The passer with *five-count popcorn* (78686) throws an extra pass at the time of the forced zip in the other passer's pattern: pass-self-*pass*-heff-zip instead of pass-self-*self*-heff-heff. The other passer has a fairly intuitive transition from *5-club why not* to regular *why not*.


<siteswap style='{"iterations": 1, "emphasizeThrows": [[0,14],[1,19],[0,24],[1,29]]}'>78627 78627 7862 6 786827862 778627</siteswap>

Another well-known hijacking pattern is from *Martin's one-count* (77772) into *funky bookends* (77786) versus *parsnip* (77722). Here the hijacking passer skips a pass by throwing pass-*heff*-pass-pass-self rather than pass-*pass*-pass-pass-zip, which forces the other passer to transition from pass-zip-pass-pass-pass to pass-zip-pass-*zip*-pass. The hijacker can transition back by simply returning from pass-*heff*-pass-pass-self to pass-*pass*-pass-pass-zip.

Using *Martin's one-count* (77772) as a base pattern actually affords a different style of hijacking (or programming). Instead of pass-pass-pass-pass-zip, one passer can throw *pass-pass-self* to force *pass-pass-zip*, *pass-heff* to force *pass-zip*, a *trelf* to force a *zip* and *pass-pass-pass-flip* to force *pass-pass-pass-zip*. Any of these sequences can be chained, so funky bookends vs parsnip follows simply as the combination of *pass-pass-self* and *pass-heff*.

<!-- typ-no-link-footnote: passing.zone -->


Aidan Burns' [Highgate Collection](https://passing.zone/wp-content/uploads/highgate.pdf) describes a couple of these patterns and their transitions (page 36ff) and Ed Clark explains the mechanics more generally with many additional patterns on [passing.zone/hijacking](https://passing.zone/hijacking/).


<!-- typst: #qr_with_label_pair("https://passing.zone/wp-content/uploads/highgate.pdf", [Highgate Collection], "https://passing.zone/hijacking/", [Hijacking article on passing.zone]) -->


