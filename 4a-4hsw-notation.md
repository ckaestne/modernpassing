# Introduction to Four-Handed Siteswaps & Notation

Prerequisites: [Learn to pass / teach to pass](1-1); Next: [Beginner four-handed siteswaps]()

Four-handed siteswaps describe a large class of two-person passing patterns. They are all ambidextrous and symmetric, performing the same sequence both one the right and the left side. They are all characterized by an asynchronous beat where both passers juggle the same sequence but offset from each other and by having one passer throw crossing passes. Here we only describe how to read a pattern; for understanding why the notation works this way and why some passes are crossing, see [four-handed siteswap theory]().

## Reading a pattern

A four-handed siteswap is written as a sequence of numbers such as *744*, *77722* or *8686777*. Similarly to the [letters used for synchronous patterns](), each number denotes a throw: 

| Nr   | Name   | Description                                                  |
| ---- | ------ | ------------------------------------------------------------ |
| 2    | Zip    | Hand-across without rotation; 1 in solo siteswap             |
| 4    | Flip   | Holding or flipping a club in the same hand; 2 in solo siteswap |
| 5    | Zap    | Fast, low pass with a half rotation; crossing for juggler A, straight for juggler B |
| 6    | Self   | Normal self; 3 in solo siteswap                              |
| 7    | Single | Lofty pass with a single rotation; straight for juggler A, crossing for juggler B |
| 8    | Heff   | Double-spin self to the same hand, as in a basic four-club solo pattern; 4 in solo siteswap |
| 9    | Double | Double-spin pass; crossing for juggler A, straight for juggler B |
| a    | Trelf | Triple-spin self |

The number sequence describes the infinitely-repeating alternating actions of both jugglers; the first digit is the first action of juggler A, the second digit is the first action of juggler B, the third digit is the second action of juggler A and so forth. To see what each juggler is doing, take every second digit and loop around. For example, the (fairly advanced) siteswap 75864 from the perspective of juggler A is 7-8-4-5-6 (single-heff-flip-zap-self) -- reading the first, third, and fifth digit, then looping around to the second and fourth digit).

A common and helpful way to think of (and write) siteswaps is to repeat a siteswap twice and write it alternating the numbers between two rows. For example, write can 75864 as:

<siteswap style='{"showExtraThrows": false,"showCausalLines": false,"showLeftRight": false, "showStraightCross": false, "showStartingHands": false}'>75864</siteswap>

Now we can read the actions of juggler A in the first row and the actions of the juggler B in the second row. It also shows the start, with juggler A starting with a *single* (7) and juggler B starting just afterward with a *zap* (5) in this example. Note how both jugglers do the same sequence of throws in the same order, but start in different places of the sequence.

## Starting a pattern

Juggler A always starts the pattern with a right-hand action (the first digit of the siteswap) and juggler B always follows slightly afterward with a right-hand action (the second digit of the siteswap). Technically, juggler B should start between juggler A's first and second action; in practice most patterns are fairly forgiving to fudge the timing a bit.

It is possible to start a siteswap on any beat, or conversely to shift siteswaps -- for example, *786* is the same pattern as *867* and *678*. In most lists, siteswaps are normalized to start with the highest digit, but in this book, we write all siteswaps as they would usually be started.

While there are ways to figure out who is holding how many clubs in each hand, it's mostly the obvious start of both jugglers having the same number of clubs or juggler A having one more club (for 5 and 7 club patterns). If the obvious start does not seem to work, look up the start with an online tool like [passist.org](http://passist.org). 

We use the more verbose notation with two lines for many siteswaps. When we do, we additionally include hints about which hand does the action for the initial throws (R and L for right and left), whether to throw a pass straight (||) or crossing (X), and how many clubs are in each hand at the start (read "right|left"):

<siteswap>75864</siteswap>








## More details

Even numbers are self-throws, they are always double of the equivalent number in a solo siteswap; odd numbers are passes. The numbers 0, 1 and 3 are not used in popular patterns, because it is difficult to pass fast enough for a 1 and 3 and because having an empty hand for a 0 is awkward. Higher numbers are possible -- for example, *b* for a triple pass -- but less common.

