# Moving Group Patterns

<progressions>

**Prerequisite —** [Basic synchronous passing patterns](2b-basic-sync.md)

**Helpful —** [Static group patterns](5c-static-groups.md)

**Next —** [Takeouts](6a-intro.md)

</progressions>


Movement adds interesting variations and challenges to group passing patterns. We mostly discuss patterns that are symmetric in that all passers cycle through all positions during the pattern. The following patterns are roughly sorted by increasing difficulty.


## Notation and Relabeling

To notate the pattern, we usually rely on a sequence of diagrams of passer positions from above that illustrate the positions and movement. In the notation, we underline the beats where movement happens. 

In most patterns, it takes a while until all passers cycle through all positions, to get back to the original start. 
However, conceptually, the pattern is usually composed of smaller repeating steps, similarly to how siteswaps repeat over and over again even if we write the most compact version showing only the first half of the pattern.
With walking and takeout patterns, it is common to write down only one transition of the pattern and then describe how it repeats.

For illustration, here is the full notation for the *rotating feed* in *two-count* vs *four-count* (described in more detail below). It is 18 beats long to get back to the start where passer A feeds (though the orientation in the room will have changed). However, the first six beats already describe all that is happening in the pattern. After those six beats, a different passer (who started as C before) will now feed; after another six beats the third passer will be the feeder.

<sync-group frames="1,3,5,7,9,11,13,15,17">
A: 3pB3  3pC3  3pB3     3pC3  3  3  3pC3      3  3  3pB3  3  3  
B: 3pA3  3  3  3pA3     3  3  3pC3  3  3      3pC3  3pA3  3pC3  
C: 3  3  3pA3  3  3     3pA3  3pB3  3pA3      3pB3  3  3  3pB3 
positions: V(A,B,C)
move: Vmove(B,4.9,3)Vmove(A,10.9,3)Vmove(C,16.9,3)
</sync-group>


**Relabeling.**
The standard approach to notate those patterns compactly is to describe only one transition, but then explain how the roles change. 
That is, the same passer (identified with a colored circle in the diagram) will go through all three roles – in this pattern, first A, then B, then C. The role changes (how passers are relabeled) are indicated as arrows at the end of each line in the notation.
While the relabeling approach makes patterns much more compact to notate, it can require some practice to read the notation and follow how roles change for each passer during the pattern.

<sync-group frames="1,3,5,7,9,11,13,15,17">
A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3 -- C
C: 3  3  3pA3  3  3  -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)
</sync-group>

**Changing starts: Turning back.**
While learning longer patterns, it is a good idea to change the start when the first beats of the pattern work well, but the group rarely gets to later beats to practice them. The best way to change the start is to go *backward* in the pattern by one segment. This way, everybody can learn the new segment and then gets to a point that they already know (whereas turning forward, everybody gets to more unknown parts of the pattern and never practices previous parts again until getting around).

For most walking patterns, it is obvious how to turn back. However, when not obvious, this step-by-step process always works:
Look at role changes in the notation. Identify which role gets relabeled *to* your current role; that's the role in the previous start – for example, in the rotating feed above, the passer with role A has role C in the previous start (because C turns into A). When everybody has identified their role, simply move to the starting positions for each role. 
For teaching more complicated patterns, after turning back, the passer who previously held a role can typically explain well what to do to the new passer in that role.





## Rotating Y (4 passers)

![starter pattern](figures/start-here.svg)


A good beginner pattern with easy movement is the *Rotating Y*. The Y is a formation of two passers next to each other facing two passers behind each other (a feed with an extra passer behind the feeder). The rightmost passer throws a long pass to the passer in the back, who throws a long pass to the passer on the left, who throws a much shorter pass to the feeder in the middle, who then throws another short pass to the rightmost passer. For movement, consider that the two passers standing next to each other are on the left and right of a circle, whereas the other two passers are in the front and back of another circle; for each movement, each passer moves a quarter position counter-clockwise on their circle (all walking at the same time), yielding another Y. Note that after movement, everybody still passes to the same passer (now in a different location, possibly with a different distance) and receives from the same passer.

The rotating Y is commonly juggled in [four-count](2b-basic-sync.md) with movement after every other pass or after every pass. To learn the pattern, it is common to try every position without moving during the pattern, and move to the new positions between attempts when resetting. When moving during the pattern, only fairly little movement is needed, typically only a step or two without turning, making this a good beginner pattern.

<sync-group frames="1,5,9,13">
A: 3pC333 3pC333 -- D
B: 3pD333 3pD333 -- C
C: 3pB333 3pB333 -- A
D: 3pA333 3pA333 -- B
positions: Y(A,B,C,D)
move: move(A,4.9,3)move(B,4.9,3)move(C,4.9,3)move(D,4.9,3)
</sync-group>



## Rotating Feeds (3 passers)

![starter pattern](figures/start-here.svg)


The rotating feed is a good introduction to walking and turning on a four-count (usually), which is an important foundation for many other walking and takeout patterns. So even though the rotating feed on two-count versus four-count can be rather boring, it is an important milestone.

In all these patterns, one feedee (usually the left one) is walking across the pattern while turning to a position beside the previous feeder. The other feedee becomes the new feeder, feeding the passer who just walked and the previous feeder.

**Two-count vs. four-count.** The standard pattern, shown already in the notation section above, is a *two-count* feed with feedees on *four-count*.
This pattern is the foundation for many [four-person manipulator patterns](6f-aidan-patterns.md).

To begin, the left feedee can walk across the pattern after any pass with or without announcing it. There is enough time for both the previous feeder and the new feeder to adjust patterns; the previous feeder will simply do a self where they would have passed to the feedee who just walked, resulting in a switch to four-count; the third passer will throw a pass to the passer who just walked instead of a self, thus switching to a two-count feed.

The most common pattern is for the left feedee to walk every six beats; which passer is currently in the left feedee position will change. The feeder typically counts the two-count passes as 1 - 2 - 3 and the left feeder would start walking after the pass on 3. After this, the right feedee takes over counting (and feeding) 1 - 2 - 3 after that, which is when the next passer (the first feeder) will start walking, and so forth.

<sync-group frames="1,3,5,7,9,11,13,15,17">
A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3 -- C
C: 3 3 3pA3  3  3  -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)
</sync-group>


Walking and turning while juggling can initially be somewhat challenging. Usually the passer walking will walk immediately after their pass and catch the incoming pass somewhat along the way (ask the feeder to throw it shorter if necessary). It is possible to practice walking and turning while juggling alone, simply walking around while maintaining a 3-club cascade. Less confident passers can also collect all clubs and walk across the pattern holding all three clubs to then restart with a pass on the other side.

![intermediate pattern](figures/intermediate.svg)


**Pass-pass-self feeds.**
The following pattern is a nice approximation of a pass-pass-self feed (technically pass-pass-self-pass-pass-self-pass-self), which still allows walking on a right-handed four-count. That is, the pattern is ambidextrous and slightly more challenging, but the walking is the same as in the two-count vs. four-count version.

<sync-group>
A: 3pC3pB3 3pC3pB3 3pC3  -- B
B: 33pA3   33pA3  33 -- C
C: 3pA33   3pA3  3 3pA3  -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)
</sync-group>


A pure pass-pass-self feed is also possible, but substantially harder. It requires walking on a three-count and alternates between walking on a right-handed three-count and a left-handed three-count. Walking after a left-handed pass is harder for most people, because it is easier to turn with the angle of the incoming pass.

<sync-group>
A: 3pB3pC3 3pB3pC3 3pB3pC3  33pC3   33pC3   33pC3  -- C
B: 3pA33   3pA33   3pA33  3pC33   3pC33   3pC33   -- A
C: 33pA3  33pA3   33pA3    3pB3pA3 3pB3pA3 3pB3pA3 -- B
positions: V(A,B,C)
move: Vmove(B,6.9,2)Vmove(A,16.9,2)
</sync-group>


**Four-handed siteswap feeds.** Rotating feeds on four-handed siteswaps are not common and usually very challenging since they require changing between straight and crossing passes and accounting for the half-beat timing difference between the two sides. To make this work, the common trick is that the feeder throws straight single passes to feedee B and crossing single passes to feedee C, and feedee B responds with crossing single passes and feedee C with straight single passes. When walking, passer B juggles slightly slower (to lose half a beat; written as 7x in the notation) and maintains the crossing passes with the previous feeder, but starts throwing straight passes to the other feedee. 

Here is an example of this based on a [why-not vs five-count popcorn feed](5b-feeds.md).

<siteswap-group style='{"emphasizeThrows":[[1,9]],"components":["pattern","turntable"]}'>
A: 7B 6 7Cx 827Cx -- B
B: , a67A67x -- C
C: !, 66a67Ax -- A
positions: V(A,B,C)
move: Vmove(B, 7, 5)
</siteswap-group>

<crossreference>Extra club Bruno's (see below) uses the same idea. The [appendix](7-test-ian.md) has a few more patterns to explore.</crossreference>



**Other feeds.** Generally any feed can be turned into a rotating feed if there are enough selfs to walk across.
It is also possible that multiple passers walk before the pattern repeats (as in the rotating pure pass-pass-self feed above). Here is an example of a very short pattern (the base pattern for [MiniEd](6h-zippy-etc.md)), with a lot of walking on right-handed three-counts:


<sync-group>
A: 3 3pC3pB3 3pC3   -- C
B: 3 33pA3   33pC     -- A
C: 3 3pA33   3pA3pB   -- B
positions: V(A,B,C)
move: Vmove(A,4.9,2)Vmove(B,2.9,2)
</sync-group>



## Extra Club Rotating Feed (3 passers)

![intermediate pattern](figures/intermediate.svg)


The two-count vs. four-count feed with 10 clubs (see [Feeds](5b-feeds.md)) can also be turned into a walking rotating pattern, similar to other feeds.
In this pattern, on all double passes, the feeder throws one more pass to their right feedee before switching to four-count and the walk happens on a five-count (resulting locally in the sequence pass left, pass right, pass left, pass right, pass right).

To maintain the usual approach to throw all double passes straight instead of crossing, the feedees start left-handed or one beat late (see *[7-club two-count](2d-advanced.md)* and [adding clubs to synchronous feeds](5b-feeds.md)). Since the walking technically changes from the left-handed to the right-handed side of the pattern, there can only be three selfs in the five-count and the passer walking needs to take one of these options: (a) juggle a four-count very slowly to match the speed of a five-count, (b) throw one of the three selfs of a four-count as a double self followed by a wait to gain an extra beat of time, or (c) walk on a normal four-count and throw an early triple pass followed by a wait. In either case, the timing is right if, after walking, the first pass responds to an incoming pass with the offset timing common for *7-club two-count*.

<sync-group>
A: 4pBx3  4pCx3  4pBx3  4pCx -- B
B: !34pAx  3  3  34pAx  4x  -- C
C: !2 33 4pAx 3  3  3   -- A
positions: V(A,B,C)
move: Vmove(B,5.9,3)
</sync-group>

With a bit of galloping, this pattern can also be juggled on single passes (see [7-club two-count on singles](2e-beyond.md)).


## Bruno's Nightmare (3 passers)

![starter pattern](figures/start-here.svg)

The conceptual idea behind all "Bruno's" patterns is that the passers move as if they were balls thrown by a giant. In the basic Bruno's nightmare pattern, the passers move in a simple cascade pattern, being "thrown" to one side of the room and then "falling" back down to the other (see the diagram below). Many other patterns, including passing patterns, are possible beyond a simple three-ball cascade. While the passers are moving in the shape of a juggling pattern, they exchange clubs.

In the basic Bruno's nightmare pattern, the passers start in a V shape and one feedee walks *through* the middle of the pattern to arrive at the opposite side of the former feeder to where they would have walked in a rotating feed; during that time the other feedee "falls down" to take the place of the feedee who just walked from where they will feed next. The initial feeder first throws to the feedee walking, then to the other feedee, and then once more to the feedee walking while they are in the middle of the pattern. From here the pattern repeats with the previous feeder now walking through the pattern, the previous "falling" feedee now feeding, and the passer who previously walked falling down.

The standard way to juggle this pattern is on *three-count vs. six-count*, which gives passers a lot of time to walk and turn. 

<sync-group>
A: 3pB33 3pC33 3pB33 -- B
B: 3pA33 333   3pA33 -- C
C: 333   3pA33 333   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.9,4)Bmove(B,6.9,5)Bmove(C,3.9,5)
</sync-group>

The pattern can also be juggled on many other baseline beats. Feeding two-count vs. four-count is fairly common too, but since the pattern requires turning both clockwise and counter-clockwise, one of those turns is usually more challenging. A much slower version has five instead of three passes before it repeats, where the walking passer passes twice while walking through the middle of the pattern. Less conventional base patterns are pass-pass-self or pass-pass-self-pass-self feeds. See the [appendix](7-appendix-brunos.md) for illustrations of these.






**Beyond the cascade.** The idea of a giant juggling passers can be conceptually extended to other base patterns. Walking can follow any solo pattern as a base pattern, such as *423*, *441*, *33441*, and the box for three passers, or *534* and *531* for four passers (see the [appendix](7-appendix-brunos.md) for an example).
There is no principled way to decide when to pass and to whom to pass (that I am aware of), so it is easy to create lots of different patterns by first picking a pattern for the walking and then fitting passes in there.

This is an easy pattern based on the five-ball cascade:

<sync-group>
A: 333   3pE33  -- B
B: 3pE33 3pD33  -- C
C: 3pD33 3  33  -- D
D: 3pC33 3pB33  -- E
E: 3pB33 3pA33  -- A
positions: Svg(5bcascade.svg,A,0,B,2,C,4,D,6,E,8)
move: move(A,0.9,2)move(B,0.9,2)move(C,0.9,2)move(D,0.9,2)move(E,0.9,2)
move: move(A,3.9,2)move(B,3.9,2)move(C,3.9,2)move(D,3.9,2)move(E,3.9,2)
</sync-group>


Beyond solo patterns, Bruno's patterns can also be extended to passing patterns, when imagining two giants facing each other passing with each other. The most common of these (known as *Magermix* when juggled in one-count, see below) is a six-person pattern where the passers move as if they were passed in two-count:

<sync-group>
A: 3pB33 3pC33 3pB33 3pC33 3  33 3pC33 -- C
B: 3pA33 3  33 3pA33 3  33 3pF33 3  33 -- D
C: 3  33 3pA33 3  33 3pA33 3pE33 3pA33 -- B
D: 3pE33 3pF33 3pE33 3pF33 3  33 3pF33 -- F
E: 3pD33 3  33 3pD33 3  33 3pC33 3  33 -- A
F: 3  33 3pD33 3  33 3pD33 3pB33 3pD33 -- E
positions: Svg(magermix.svg,A,0,B,3,C,2,D,6,E,9,F,8)
move: move(B,2.9,3)move(C,3.9,5) move(B,6.9,5) move(A,11.9,3) move(A,15.9,5)move(B,12.9,5)
move: move(E,2.9,3)move(F,3.9,5) move(E,6.9,5) move(D,11.9,3) move(D,15.9,5)move(E,12.9,5)
</sync-group>


**Turbo.** *Turbo* is a Bruno's variation (same walking paths) where the walking passer turns around to pass back to the passer who started next to them when walking through the pattern, after which they back up to their target position. While it looks like a feed setup at the start, the passer "in the air" (in the Bruno's analogy of juggling people) starts as feeder one pass into the pattern. Again, *Turbo* can be juggled on different baseline patterns, but *two-count* vs. *four-count* is the most common.

<sync-group>
A: 3pB3 3pC3 33   -- B
B: 3pA3 33   3pC3 -- C
C: 33   3pA3 3pB3 -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.9,2)Bmove(B,4.9,3)Bmove(C,2.9,1)
</sync-group>




![advanced pattern](figures/advanced.svg)


**Bruno's one-count.** A particularly challenging variation of Bruno's nightmare is Bruno's nightmare on one-count vs. two-count, usually known as *Bruno's one-count*. This pattern usually requires very lofty passes and lofty selfs, fast turns under a single self, and fairly precise passes. 

<sync-group>
A: 3pB 3pC 3pB -- B
B: 3pA 3   3pA -- C
C: 3   3pA 3   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.3,.6)Bmove(B,2.4,1.5)Bmove(C,1.4,1.5)
</sync-group>



This pattern is very difficult to learn from scratch. By far the best way to learn this pattern is with two passers who can run it. Here are a couple of hints: Juggle very lofty and slow; count out loud to synchronize. After the first pass of the feed, the walking passer should take a step forward to give the "falling" passer space, but should not yet move sideways. The second pass of the feed needs to be long to avoid collisions with the short pass after; for the passer walking through the pattern, this is the first pass on the other side after turning (likely the most difficult pass of the pattern); collisions are most commonly caused by the walking passer's pass being too short here. The third pass of the feed needs to be lofty but very short; usually the feeder is leading the walking passer quite a bit; the outgoing and incoming passes usually cross, and the walking passer should aim to the nose or even the wrong hand of the feeder. For the feeder, the second and third pass are usually roughly in the same direction; the third pass is just much shorter. The walking passer has a single self to turn all the way around; usually they already turn a lot after throwing their short pass *before* catching the incoming short pass, so that they need to turn much less under the self.

*Bruno's one-count* is possible on all the other variations, like *Magermix* for six passers moving as if they were thrown in *two-count* (see above) and various three-ball siteswaps like *441* and *33441* (known as *Babymix*). See the [appendix](7-appendix-brunos.md) for illustrations of these.




![advanced pattern](figures/advanced.svg)

**Extra club Bruno's.** Similar to the rotating feed, it is possible to add a club and juggle the entire pattern on doubles.
However, since this is juggled on a four-handed siteswap feed, the walking and notation is somewhat unusual:
The feeder always throws crossing passes to the feedee walking and straight passes to the other one; the first pass after walking is always crossing, and the passes while walking are always straight. Feedee B walks on 7.5 beats, but the half beat is barely noticeable and it can be juggled as a normal seven-count (in the notation, the extra half beat is visible in the 7 on the last beat of B, which is a slow self (!) to make up for switching the half beat between sides).

<siteswap-group>
A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B
B: , 6   9A  6   6   6   6   6   9A  6   7x  -- C
C: !, 6   6   6   6   9Ax 6   6   6   6   6  -- A
positions: Brunos(A,B,C)
move: Bmove(B,4.9,8)Bmove(B,15.9,5)Bmove(C,9.9,5)
</siteswap-group>

(Technically the approach also works for 10-club *Bruno's one-count* by leaving out the extra selfs.)


## El Niño (4 passers)

![intermediate pattern](figures/intermediate.svg)

*El Niño* is a version of a rotating feed for 4 passers, based on the feeder passing *one-count* to three feedees in *three-count*.
The feeder feeds the feedees in the following order: middle feedee, left feedee, right feedee, and middle feedee. First the left feedee walks in three-count after their pass, and then the middle feedee after their second pass, turning the right feedee into the new feeder. The pattern is usually started left-handed so that all walking happens after right-hand passes.


<sync-group>
A: 3pC 3pB 3pD 3pC -- B
B: 3   3pA 3   3 -- C 
C: 3pA 3   3   3pA -- D
D: 3   3   3pA 3   -- A
positions: V(A,B,C,D)
move: Vmove(B,1.9,2),Vmove(C,3.9,2)
</sync-group>

And a much faster version of the same idea (requires walking both on left and right-handed passes):


<sync-group>
A: 3pB 3pC  -- B
B: 3pA   3  -- C 
C: 3  3pA   -- D
D: 3   3      -- A
positions: V(A,B,C,D)
move: Vmove(B,0.9,2),Vmove(C,1.9,2)
</sync-group>


## Shooting Star (4 passers)

![starter pattern](figures/start-here.svg)

The shooting star describes a family of patterns in which one passer is missing from a standard 5-person [star pattern](5c-static-groups.md). Since one passer is missing, one passer (role C) will not receive clubs and one passer (role B) would pass into a hole. In the standard four-count version, passer B, who would pass into the hole, starts with two clubs and skips the first pass, whereas passer C, who does not receive clubs, walks immediately after their first pass through the middle of the pattern to the hole while holding two clubs; they receive the next pass there when they arrive. On the next beat, another passer does not receive a club and walks to the hole, and so forth.

<sync-group>
A: 3pD 333   -- C
B: 2 333-- D
C: 3pA   222   -- B
D: 3pB   333 -- A
positions: Circle(A,B,C,D,_)
move: Cmove(C,0.9,2.5,144,1)
</sync-group>

Note: The passer with role C starts with two clubs.

*Variations:* It is possible to remove clubs and walk with one club or no clubs to slow down the pattern. 
* Walking with one club: Removing one more club, passer B (facing the hole) starts with *one* club and passer C (not receiving clubs) passes until they are down to a single club for walking. 
* Walking the last pass: As before, passer B starts with one club. After their first pass, passer C is down to two clubs and walks their last pass to passer A, to then walk (run) around behind A with their last club to their target position in the hole.
* Walking without clubs: Passer B (facing the hole) starts without clubs and passer C (not receiving clubs) walks without any clubs after passing their last club. This slows down the pattern and results in walking only every other or every third pass. 



**Two-count shooting star.** In the two-count version of the shooting star, the person moving stops in the middle to let passes go by before making it to the hole. Typically they walk when they have one club, but they can also walk to the middle with two and pass a last one from the middle.


## Other Classic Patterns (4 passers)

The [Madison Area Jugglers Pattern Book](https://madjugglers.com/majpatternbook/) has a huge number of walking patterns, including *Turbo* and *El Niño* discussed above. Here are two more common patterns from that collection that are also the basis for many other variations. 

![starter pattern](figures/start-here.svg)

**3-leaf clover.**
In this pattern, all passers continuously walk in and out of the middle of the pattern, through three loops (see diagram below). Essentially, a feeder throws two-count to three feedees in six-count. The Madison book has many more variations, including ambidextrous ones.

<sync-group>
A: 3pD3 3pB3  -- D
B: 33   3pA3 -- C
C: 33   33   -- A
D: 3pA3 33   -- B
positions: Clover(A,B,C,D)
move: move(D,.9,5)move(B,2.9,5)
</sync-group>




**The weave.** 
In the weave, three passers walk in a figure of 8 on six-count all while facing a feeder outside the pattern who feeds them in two-count. This pattern does not cycle through all positions, since the feeder stays fixed, but it is intuitive and easy to learn and there are many variations (including ambidextrous ones) in the Madison book.

<sync-group>
A: 3pB3 3pC3 3pD3 -- A
B: 3pA3 33   33    -- B
C: 33   3pA3 33    -- C
D: 33  33   3pA3  -- D
positions: Weave(A,B,C,D)
move: move(B,0.5,1.5)move(B,2,2)move(B,4,2)  move(C,0,2)move(C,2.5,1.5)move(C,4,2)  move(D,0,2)move(D,2,2)move(D,4.5,1.5)
</sync-group>

