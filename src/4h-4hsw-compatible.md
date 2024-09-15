# Compatible Siteswaps

Prerequisites: [Reading Four-Handed Siteswaps]() & [Beginner patterns]().

In four-handed siteswaps, usually both passers juggle the same sequence, just offset of each other. However, this is not necessary -- just like there are many synchronous passing patterns that match different patterns, such as throwing an early double (see [advanced synchronous patterns]()). 

Matching and easier and a harder four-handed siteswap allows passers with different skills to both juggle interesting patterns. A good example is matching the easy *5-club one-count* (744) against the harder 7-club pattern *french three-count* (786):

<siteswap>784746</siteswap>

Matching compatible siteswaps also helps to stabilize passes for a passing partner when learning hard patterns. A common example is learning the 8-club pattern *978*, where one passer at a time can drop a club to switch to *972*, which usually provides them with much more room to recover and still provide good passes. 

<siteswap>978972</siteswap>

## Theory: What makes two siteswaps compatible?

Two patterns are compatible if they have the same length and the same sequence of *catching* passes and non-passes. The sequence of catching passes and non-passes is the *interface*. For example, 744 and 768 both require catching one pass followed by two non-passes (interface *pxx*), and 972 and 978 require catching two passes followed by one non-pass (interface *ppx*). 

Importantly, it does not matter when clubs are thrown, but when they land, since it only matters whether an incoming club comes from another passer or one-self. For example, in *maybe* (72786), the passer throws two consecutive singles, but in *maybe not* (96627), the passer throws a double and a single a pass apart -- nevertheless, in both cases the passes arrive on consecutive beats, so they are compatible with the interface *ppxxx*.

<siteswap>7279662786</siteswap>

Note that *ppxxx*, *xppxx*, *xxppx* and so forth are all the same interface, simply by shifting where to start each siteswap.

Unfortunately, figuring out the interface of a siteswap is nontrivial and often requires pen and paper -- or simply look it up in a table like in the [appendix](). Many standard siteswap transformations preserve the interface, as we will discuss in [siteswap theory](). Also figuring out how to start is not always obvious and may require some trial and error or scribbling of causal diagrams.

## Compatible Common Patterns

Here is a table with the compatibility of some common period 1, 3 and 5 siteswaps -- all patterns in the same row are compatible:

| Interface | 4 and 5 club patterns                                        | 6 and 7 club patterns                                        | 8 and 9 club patterns |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------- |
| pxx       | 5-club one count (744), 726, 564, 582, 528                   | French three-count (786), 7-club three count (966), 588, 56a | a89, a7a              |
| ppx       | 552                                                          | 756, 774, 558, 945, 972                                      | 996, a77              |
| ppp       | 555                                                          | 777, holy grail (975)                                        | 999                   |
| pxxxx     | 5-club why not (78622), 56464                                | 5-count popcorn (78686, 7a666)                               | aaa69, aaaa5          |
| ppxxx     | 72722                                                        | maybe (72786), maybe not (79662), 747a2                      | 969a6                 |
| pxpxx     | inverted parsnip (72227)                                     | Jim's two-count (77466), why not (77862), not why (77286), not likely (96672), suicide bunny (56784) | 789a6                 |
| pppxx     | Kaatzi (75724), Dragon cat (95524)                           | 99692, 96956, 96857                                          |                       |
| ppxpx     | Parsnip (77722), funky magazin rack (55564), Dragonfly (97522) | Funky bookends (77786), funky bookends friend (77966), 95678, 97586 | 999a8                 |
| ppppx     |                                                              | Martin's one-count (77772), 75756, 57585, a5555              | 97978                 |

## Even-length siteswaps

In siteswaps of an even length, both passers perform their own sequence. The most common example of this is *8-club one-count on singles versus doubles*, which is simply the siteswap 97:

<siteswap style='{"iterations": 6, "startingJuggler": 1}'>97</siteswap>

All combinations of two odd-length siteswaps, discussed above, turn into even-length siteswaps. For example, the combination of *maybe* (72786) and *maybe not* (96627) turns into the siteswap **7**2**7**9**6**6**2**7**8**6, as visible in the diagram above. Since it is interleaving the *local* actions of each passer and requires finding the right start, doing this combination manually is nontrivial.

More interestingly, even-length siteswaps open possibilities for combining two sequences that are *not* a valid four-handed siteswap on their own. A typical example is 777726, where the passers throw pass-pass-zip versus pass-pass-self:

<siteswap>777726</siteswap>

Such patterns are fairly uncommon in the passing community right now, but there is a large space of possible patterns to explore. This includes the possibility of finding patterns that work against pass-self-self and thus feel like traditional 6-club three-count on one side, such as **7**8**6**9**6**6 and 7**7**a**6**6**6**: 

<siteswap>786966</siteswap>

<siteswap>77a666</siteswap>

To find more patterns, use any siteswap generator (such as [passist.org](https://passist.org/siteswap-generator)) to generate patterns with an even length and exclude any patterns with 1 or 3s. 

## Programming

TODO

7->77772->77722

77[s,h,7...]

common combination