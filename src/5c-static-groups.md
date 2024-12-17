# Static Group Patterns

Prerequisite: [Basic Synchronous Passing Patterns](2b-basic-sync.md) |  Next: Feeds, Moving Patterns, Takeouts

Beyond feeds, there are many static group patterns for different sizes of groups and different difficulty levels. We group them roughly the number of passers and shape of the positions. Almost all of these patterns are based on the [basic synchronous 6-club passing patterns](2b-basic-sync.md). Most of these patterns are easy to medium difficulty. 


## Triangles (3 passers)

Triangle patterns conceptually simple and versatile. In contrast to feeds, they are usually symmetric in that all passers juggle the same pattern.

![starter pattern](https://img.shields.io/badge/-start%20here-green.svg)

**Three-count, insides.** 
A good first pattern is to juggle three-count with *inside* throws, that is right-handed passes go to the left hand of the passer on the left and left-handed passes to the right hand of the passer on the right. Everybody passes at the same time, count out loud if necessary to synchronize timing and avoid collisions. 

<sync-group>
A: 3pB333pC33
B: 3pC333pA33
C: 3pA333pB33
positions: Circe(A,B,C)
</sync-group>

Once this works, there are many more variations to explore that are interestingly different without drastically increasing difficulty.

**Three-count, outsides.**
Stay on the same three-count rhythm, but throw the passes *outside*, that is right-handed passes go to the left hand of the passer on the right and left-handed passes to the right hand of the passer on the left. Outside throws tend to be less collision prone but harder to watch due to much wider angle -- do not watch the outgoing club but look for the incoming one. 
Actively provide feedback about incoming passes and where you would like to receive them (usually likely slightly behind you), as other passers also will not see their passes land.

<sync-group>
A: 3pC333pB33
B: 3pA333pC33
C: 3pB333pAC33
positions: Circe(A,B,C)
</sync-group>


**Three-count, outside-inside-inside-outside.**
Several further good variation come from exploring different sequences of inside and outside throws. For example, alternating outside and inside results in all clubs being thrown to the same person. The sequence *outside-inside-inside-outside* is interesting in that it passes to all four hands of the other two passers, from right to left.

![intermediate pattern](https://img.shields.io/badge/-intermediate-orange.svg)

**Pass-pass-self and one-count.** 
The same triangle idea also works for all other base patterns (including *four-count* if somebody insists). *Pass-pass-self* and *one-count* can be interesting challenges with different combinations of *inside* and *outside* throws. *Pass-pass-self* with *inside-inside-self-outside-outside-self* throws feels similar to [pass-pass-self feeds](5b-feeds.md). *One-count* with all-*outside* passes is particularly challenging as it requires constant head movement to see incoming passes.

**Getting creative.**
Similar to variations in a feed, it is possible to design many different passing sequences in a triangle. Essentially, the group needs to decide for each beat whether (a) everybody passes in a circle to the left or the right, (b) two passers exchange passes while the other does a self, or (c) everybody does a self. Here is a typical pattern where on beat one each passer passes to the right, on beat two passers A and C pass with each other, and on beat three everybody does a self, resulting in different sequence for each passer (pass-pass-self feed, pass-pass-self to the right, three-count):

<sync-group>
A: 3pB 3pC 3
B: 3pC 3   3
C: 3pA 3pA 3
positions: Circe(A,B,C)
</sync-group>

To extend this sequence for a more challenging pattern, we can swap roles after every *n* iterations. For example, a passer starts in role A (pass-pass-self feed) for two iterations, followed by two iterations in role B (three-count), followed by two iterations in role C (pass-pass-self to the right), the others similarly shift through the roles but start with a different role.

![intermediate pattern](https://img.shields.io/badge/-intermediate-orange.svg)

**Extra club three-count.** 
With all passes thrown as crossing doubles, it is easy to add a 10th club to a triangle three-count pattern, with double passes all going in a circle in one direction:

<sync-group>
A: 4pB33   
B: 34pC3 
C: 334pA 
positions: Circe(A,B,C)
</sync-group>

(All passers start at the same time with the same hand. Crossing passes can be awkward to throw in a triangle with left-hand passes being much longer than right-hand passes; provide feedback.)

![advanced pattern](https://img.shields.io/badge/-advanced-red.svg)

**Six-handed siteswap triangles.** Six-handed siteswaps are naturally juggled in triangle positions, as described in the context of [four-handed siteswap theory](4l-4hsw-theory.md), but they are not commonly passed in the community. Use a siteswap generator like [passist.org](http://passist.org) to find interesting patterns with "a" as single passes or "7" as zaps, such as [aaa69](https://passist.org/siteswap/aaa69?jugglers=3) or [a37979999](https://passist.org/siteswap/a37979999?jugglers=3) (Mayday Zap).



## Feast (3+ passers)

![starter pattern](https://img.shields.io/badge/-start%20here-green.svg)

The *feast* is an elegant and scalable pattern that theoretically works with any number of passers and on any base pattern: The passers stand in a circle. Each passer has a starting partner such that no passing lanes cross (with odd numbers of passers, one passer has no partner). On the first passing beat each passer passes with their starting partner (or a self if they have no starting partner). On every next passing beat, they pass to the passer on right (in the circle) of their previous pass. If the previous pass was to the last passer on the right, they do a self on the next passing beat, and continue with the passer on their left on the passing beat after. That is, everybody passes with everybody in the circle in order (including themself). 

The feast is commonly juggled on four-count or two-count, but we strongly recommend three-count or another ambidextrous pattern. Here is the pattern for five jugglers on three-count:

<sync-group>
A: 3pB33 3pC33 3pD33 3pE33 3  33
B: 3pA33 3  33 3pC33 3pD33 3pE33
C: 3pE33 3pA33 3pB33 3  33 3pD33
D: 3  33 3pE33 3pA33 3pB33 3pC33
E: 3pC33 3pD33 3  33 3pA33 3pB33
positions: Circe(A,B,C,D,E)
</sync-group>

(Notice the starting partners A+B and C+E resulting in parallel passes and passer D starting with a self. Notice that everybody passes with every other passer in order, including themselves.)


**One-count feast.** 
Three passers juggling the *feast* in a *one-count*  results in an interesting triangle variation: All passers juggling *pass-pass-self* in the typical *inside-inside-self-outside-outside-self* sequence, but on offset beats, so that always two passers exchange a passes while the third passer has a self:

<sync-group>
A: 3pB 3pC 3   3pB 3pC 3
B: 3pA 3   3pC 3pA 3   3pC
C: 3   3pA 3pB 3   3pA 3pB
positions: Circe(A,B,C)
</sync-group>

**Scaling the feast.**
For more than 6 or 7 passers, the length of different passes starts to differ a lot, making it hard to throw long passes and making it hard to keep the time consistent. One trick to scale the feast for very large groups is to turn it into a moving pattern that keeps the shape of an oval or two roughly parallel lines (instead of a circle), so that all passes are always roughly at the same distance.





## Double feeds (4 passers)

![intermediate pattern](https://img.shields.io/badge/-intermediate-orange.svg)

By arranging four passers in a rectangle with two facing the other two, each passer can feed two other passers. The challenge is to find patterns that do not collide in the middle, sometimes involving selective double passes. The most elegant of these patterns is a *double pass-pass-self feed*:

<sync-group>
A: 3pD 3 3 3pC 3 3 3pB 3 3 3pC 3 3
B: 3pC 3 3pD 3 3pD 3 3pA 3 3pD 3 3pD 3
C: 3pB 3 3 3pA 3 3 3pD 3 3 3pA 3 3
D: 3pA 3 3pB 3 3pB 3 3pC 3 3pD 3 3pD 3
positions: Circle(A,B,C,D)
</sync-group>

![advanced pattern](https://img.shields.io/badge/-advanced-red.svg)


**Eight-handed siteswaps.** [Eight-handed siteswaps](4l-4hsw-theory.md), such as [fcc](https://passist.org/siteswap/fcc?jugglers=4) (three-count friction), also generally are arranged in this double-feed position, but not commonly juggled.


## Square (4 passers)

![starter pattern](https://img.shields.io/badge/-start%20here-green.svg)

In a square arrangement, everybody can pass with everybody. Aside from feasts (see above), the following pattern combines two-count and three-count in a somewhat interesting arrangement:

<sync-group>
A: 3pC 3pD 3
B: 3pD 3   3pC
C: 3pA 3   3pB
D: 3pB 3pA 3
positions: Circle(A,B,C,D)
</sync-group>

Again it is easy to be creative and create many more patterns by deciding who passes to whom on each beat (pairs, triangles, and a full circular exchange are all possible), just usually avoiding that everybody passes through the middle at the same time.

This also includes trivial patterns where just two (or more) pairs of passers pass through the same space but do not otherwise interact:

<sync-group>
A: 3pC 3 3
B: 3 3pD3
C: 3pA 3   3
D: 33pB3
positions: Circle(A,B,C,D)
</sync-group>

## Star (5 passers)

![starter pattern](https://img.shields.io/badge/-start%20here-green.svg)

A common pattern for a group of five passers is in a circle where each passer juggles with the two people opposite in the circle, resulting in a five-pointed star formation. Like in standard triangle patterns, all passers pass to a different person than from whom they receive the incoming pass; like in triangle patterns many variations are possible by deciding the sequence of *"inside"* and *"outside"* passes. Since all passes go through the middle on the same beat, it is important to be consistent on timing and length of all passes, especially *inside* passes.

Here is a standard 5-passer star pattern on three-count with all outside throws:

<sync-group>
A: 3pD33 3pC33
B: 3pE33 3pD33
C: 3pA33 3pE33
D: 3pB33 3pA33
E: 3pC33 3pB33
positions: Circle(A,B,C,D,E)
</sync-group>

![advanced pattern](https://img.shields.io/badge/-advanced-red.svg)

**Adding clubs.** The easiest way to add a 16th club is to pass five-count on doubles all in one direction (i.e., left and right-hand passes go to the same person), either with all passes crossing or with every other passer starting left-handed. To add another club (17 total), pass-self-pass-pass-self on doubles is a good sequence to try, and in theory every other self can be replaced by a double pass if adding one more club. A simpler 20-club version is simply two-count on doubles, where everybody starts with 4 clubs and passes the gallopy [8-club two-count on doubles](2e-beyond.md).



**Ten-handed siteswaps.**
Ten-handed siteswaps can be naturally juggled in a star pattern. Actually, by throwing slightly lower or higher passes, many four-handed siteswaps have equivalent ten-handed versions, such as french three-count with very lofty singles ([jkf](https://passist.org/siteswap/jkf?jugglers=5&hands=ar-dr-br-er-cr-al-dl-bl-el-cl)) and seven-count popcorn with either lofty zaps or doubles ([efkfkfk](https://passist.org/siteswap/efkfkfk?jugglers=5&hands=ar-dr-br-er-cr-al-dl-bl-el-cl) or [lfkfkfk](https://passist.org/siteswap/lfkfkfk?jugglers=5&hands=ar-dr-br-er-cr-al-dl-bl-el-cl)), but none of those are common or intuitive to figure out.

## Trapezoid (5 passers)

![intermediate pattern](https://img.shields.io/badge/-intermediate-orange.svg)

**Chocolate box.**
Another common setup is two passers A and B facing three passers C, D, and E in a trapeze shape. A common pattern of intermediate difficulty is *chocolate box* where the two passers A and B each juggle *pass-pass-self-self* (which is a synchronous pattern called *chocolate bar*) and the three other passers juggle *three-count*, in the following sequence:

<sync-group>
A: 3pC 3pD 3   3   3pD 3pE 3   3   3pE 3pC 3   3
B: 3   3   3pE 3pC 3   3   3pC 3pD 3   3   3pD 3pE
C: 3pA 3   3   3pB 3   3   3pB 3   3   3pA 3   3
D: 3   3pA 3   3   3pA 3   3   3pB 3   3   3pB 3 
E: 3   3   3pB 3   3   3pA 3   3   3pA 3   3   3pB
positions: Trapezoid(A,B,C,D,E)
</sync-group>

Rotate through all positions and let the passer who previously held a position explain the sequence to the new passer in that position.

## Other Shapes for Static Patterns

There are endless variations to arrange passers in different shapes, letting them pass on different lanes, either in pairs or in longer loops. This includes formations in a Y shape, in a T shape, and in a line -- some patterns include drop-back and drop-forward passes (not discussed here) -- others add double passes and extra clubs. There are several pattern collections that feature many of these, including the [Madison Area Jugglers Pattern Book](https://madjugglers.com/majpatternbook/) and the [Passing Patterns Compendium](https://jugglingedge.com/pdf/passingpatternscompendium.pdf). The patterns in this chapter are our suggestions for beginner to intermediate patterns in a modern passing style; beyond those, we rather suggest to add [movement](5d-moving.md) and [manipulators](6a-intro.md) for variety and challenges.

