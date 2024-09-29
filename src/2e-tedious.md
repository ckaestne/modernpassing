# Tedious synchronous patterns

There are various ways to make juggling patterns harder mentally without making them harder physically, typically by requiring nontrivial counting or introducing randomness. They can be an interesting challenge, but few people practice them regularly. I include them more for completeness.

**Passing colors.** Pick clubs with some distinct colors and assign different counts to different clubs. The number of colors and the assigned counts do not really matter; for example, 2 red clubs = 3 count, 1 blue club = 4 count, 3 white clubs = 2 count. Now focus on the passes of juggler A and the pass thrown determines the next count. Colors can also be assigned as double passes, whether passer A throws crossing or straight passes (see [Jim's](2c-jims.md)), or other variations. This will result in a random new sequence for every start.

**Random passing.** Any random sequence of single passes and selfs can be passed synchronously. Also double passes and heffs can be added to the mix, typically pausing the pattern for a beat to continue when they land (doing random valid sequences without pauses is possible by walking a siteswap state chart, but not trivial without paper or a program). The sequence could be called out by one passer or by a third person watching the pattern. Experiment with the timing of calling out the throws, typically calling them one beat before throwing them works quite well.

**Patterns from hell.** These patterns involve counting. Pass three count and throw a double on every fifth throw (double pass or double self, whichever happens on that beat) waiting for it to land to continue. If that becomes too easy start walking in one direction (e.g., passer A walks forward, passer B walks backward) one step per throw for 7 beats, and then walk in the other direction for the next 7 beats. This works with any other numbers and other actions on those counts, particularly if actions are always on multiples of prime numbers.

<sync style='{"iterations":6,"emphasizeThrows": [8,9,18,19,28,29,38,39]}'>3p33</sync>

Another hard pattern is *Jim's pass-pass-self-pass-self (brainstroming)* with switch who is passing the crossing passes. The most common variation is for passer A to throw crossing-crossing-straight-crossing-straight (counting only the passes) and for passer B to do the opposite. This pattern will have a lot of hurries and only repeats after 120 beats.

<crossreference>For four-handed siteswaps, randomness is very difficult since both passers do different actions, but consider trying very long siteswaps, such as 796827726867726 or 777928892296626.</crossreference>
