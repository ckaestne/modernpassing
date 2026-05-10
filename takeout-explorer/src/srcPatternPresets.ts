// Auto-generated from /src markdown sync-group/siteswap-group blocks
// Run: node takeout-explorer/scripts/generate-src-pattern-presets.mjs

export const SRC_PATTERN_PRESETS = [
  {
    name: "Passing with 3+ People",
    pattern: `A: 3pB333pC33
B: 3pC333pA33
C: 3pA333pB33
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Passing with 3+ People (2)",
    pattern: `A: 3pB333pC33
B: 3pC333pA33
C: 3pA333pB33
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds",
    pattern: `A: 3pB33pC3
B: 3pA333
C: 333pA3
positions: V(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (2)",
    pattern: `A: 3pB3pC3
B: 3pA33
C: 33pA3
positions: V(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (3)",
    pattern: `A: 3pB3pC3pD
B: 3pA33
C: 33pA3
D: 333pA
positions: V(A,B,C,D)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (4)",
    pattern: `A: 3pB33
B: 3pA3pC3
C: 3pD3pB3
D: 3pC33
positions: Free(A,0.1,0.0,B,0.35,1.0,D,0.85,1.0,C,0.6,0.0)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (5)",
    pattern: `A: 3pB3pB3pC3pB3pD
B: 3pA3pA33pA3
C: 333pA33
D: 3pE3pE333pA
E: 3pD3pD333
positions: Free(A, 0.4, 0.1, B, 0.0, 0.9, C, 0.4,1, D, 0.8, 0.9,E,1.0,0.1)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (6)",
    pattern: `A: 3pB3pC3
B: 3pA33
C: 4pA23
positions: V(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (7)",
    pattern: `A: 4pBx34pCx3
B: !34pAx33
C: !3334pAx
positions: V(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Synchronous feeds (8)",
    pattern: `A: 4pBx4pCx4
B: !4pAx44
C: !44pAx4
positions: V(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps",
    pattern: `A: 7B7C4
B: ,47A4
C: ,447A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps (2)",
    pattern: `A: 7B7C267B7C6
B: ,7A667A466
C: ,67A667A46
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps (3)",
    pattern: `A: 7B7C7B7C2
B: ,827A67A
C: ,7A827A6
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps (4)",
    pattern: `A: 7B67C82
B: ,a67A66
C: ,66a67A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps (5)",
    pattern: `A: 7B7B7C7B7C
B: ,7A87A7A6
C: ,67A827A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps (6)",
    pattern: `A: 7B   9C    2 
B: ,  8   7A   6 
C: ,  6   6    9A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Feeds - Feeding four-handed siteswaps (7)",
    pattern: `A: 9B9C6
B: ,69A6
C: ,669A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "Static Group Patterns - Triangles (3 passers)",
    pattern: `A: 3pB333pC33
B: 3pC333pA33
C: 3pA333pB33
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Triangles (3 passers) (2)",
    pattern: `A: 3pC333pB33
B: 3pA333pC33
C: 3pB333pA33
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Triangles (3 passers) (3)",
    pattern: `A: 3pB 3pC 3
B: 3pC 3   3
C: 3pA 3pA 3
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Triangles (3 passers) (4)",
    pattern: `A: 4pB33   
B: 34pC3 
C: 334pA 
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Feast (3+ passers)",
    pattern: `A: 3pB33 3pC33 3pD33 3pE33 3  33
B: 3pA33 3  33 3pC33 3pD33 3pE33
C: 3pE33 3pA33 3pB33 3  33 3pD33
D: 3  33 3pE33 3pA33 3pB33 3pC33
E: 3pC33 3pD33 3  33 3pA33 3pB33
positions: Circle(A,B,C,D,E)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Feast (3+ passers) (2)",
    pattern: `A: 3pB 3pC 3   3pB 3pC 3
B: 3pA 3   3pC 3pA 3   3pC
C: 3   3pA 3pB 3   3pA 3pB
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Double feeds (4 passers)",
    pattern: `A: 3pD 3   3pC 
B: 3pC 3pD 3   
C: 3pB 3   3pA 
D: 3pA 3pB 3   
positions: Box(A,B,C,D)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Square (4 passers)",
    pattern: `A: 3pD 3 3 3pC 3 3 3pB 3 3 3pC 3 3
B: 3pC 3 3pD 3 3pD 3 3pA 3 3pD 3 3pD 3
C: 3pB 3 3 3pA 3 3 3pD 3 3 3pA 3 3
D: 3pA 3 3pB 3 3pB 3 3pC 3 3pB 3 3pB 3
positions: Circle(A,B,C,D)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Square (4 passers) (2)",
    pattern: `A: 3pC 3 3
B: 3 3pD3
C: 3pA 3   3
D: 33pB3
positions: Circle(A,B,C,D)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Star (5 passers)",
    pattern: `A: 3pD33 3pC33
B: 3pE33 3pD33
C: 3pA33 3pE33
D: 3pB33 3pA33
E: 3pC33 3pB33
positions: Circle(A,B,C,D,E)`,
    patternType: "sync",
  },
  {
    name: "Static Group Patterns - Trapezoid (5 passers)",
    pattern: `A: 3pC 3pD 3   3   3pD 3pE 3   3   3pE 3pC 3   3
B: 3   3   3pE 3pC 3   3   3pC 3pD 3   3   3pD 3pE
C: 3pA 3   3   3pB 3   3   3pB 3   3   3pA 3   3
D: 3   3pA 3   3   3pA 3   3   3pB 3   3   3pB 3 
E: 3   3   3pB 3   3   3pA 3   3   3pA 3   3   3pB
positions: Trapezoid(A,B,C,D,E)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Notation and Relabeling",
    pattern: `A: 3pB3  3pC3  3pB3     3pC3  3  3  3pC3      3  3  3pB3  3  3  
B: 3pA3  3  3  3pA3     3  3  3pC3  3  3      3pC3  3pA3  3pC3  
C: 3  3  3pA3  3  3     3pA3  3pB3  3pA3      3pB3  3  3  3pB3 
positions: V(A,B,C)
move: Vmove(B,4.9,3)Vmove(A,10.9,3)Vmove(C,16.9,3)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Notation and Relabeling (2)",
    pattern: `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3 -- C
C: 3  3  3pA3  3  3  -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Rotating Y (4 passers)",
    pattern: `A: 3pC333 3pC333 -- D
B: 3pD333 3pD333 -- C
C: 3pB333 3pB333 -- A
D: 3pA333 3pA333 -- B
positions: Y(A,B,C,D)
move: move(A,4.9,3)move(B,4.9,3)move(C,4.9,3)move(D,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Rotating Feeds (3 passers)",
    pattern: `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3 -- C
C: 3 3 3pA3  3  3  -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Rotating Feeds (3 passers) (2)",
    pattern: `A: 3pC3pB3 3pC3pB3 3pC3  -- B
B: 33pA3   33pA3  33 -- C
C: 3pA33   3pA3  3 3pA3  -- A
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Rotating Feeds (3 passers) (3)",
    pattern: `A: 3pB3pC3 3pB3pC3 3pB3pC3  33pC3   33pC3   33pC3  -- C
B: 3pA33   3pA33   3pA33  3pC33   3pC33   3pC33   -- A
C: 33pA3  33pA3   33pA3    3pB3pA3 3pB3pA3 3pB3pA3 -- B
positions: V(A,B,C)
move: Vmove(B,6.9,2)Vmove(A,16.9,2)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Rotating Feeds (3 passers) (4)",
    pattern: `A: 3 3pC3pB3 3pC3   -- C
B: 3 33pA3   33pC     -- A
C: 3 3pA33   3pA3pB   -- B
positions: V(A,B,C)
move: Vmove(A,4.9,2)Vmove(B,2.9,2)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Extra Club Rotating Feed (3 passers)",
    pattern: `A: 4pBx3  4pCx3  4pBx3  4pCx -- B
B: !34pAx  3  3  34pAx  4x  -- C
C: !2 33 4pAx 3  3  3   -- A
positions: V(A,B,C)
move: Vmove(B,5.9,3)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Bruno's Nightmare (3 passers)",
    pattern: `A: 3pB33 3pC33 3pB33 -- B
B: 3pA33 333   3pA33 -- C
C: 333   3pA33 333   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.9,4)Bmove(B,6.9,5)Bmove(C,3.9,5)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Bruno's Nightmare (3 passers) (2)",
    pattern: `A: 333   3pE33  -- B
B: 3pE33 3pD33  -- C
C: 3pD33 3  33  -- D
D: 3pC33 3pB33  -- E
E: 3pB33 3pA33  -- A
positions: Svg(shapes/5bcascade.svg,A,0,B,2,C,4,D,6,E,8)
move: move(A,0.9,2)move(B,0.9,2)move(C,0.9,2)move(D,0.9,2)move(E,0.9,2)
move: move(A,3.9,2)move(B,3.9,2)move(C,3.9,2)move(D,3.9,2)move(E,3.9,2)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Bruno's Nightmare (3 passers) (3)",
    pattern: `A: 3pB33 3pC33 3pB33 3pC33 3  33 3pC33 -- C
B: 3pA33 3  33 3pA33 3  33 3pF33 3  33 -- D
C: 3  33 3pA33 3  33 3pA33 3pE33 3pA33 -- B
D: 3pE33 3pF33 3pE33 3pF33 3  33 3pF33 -- F
E: 3pD33 3  33 3pD33 3  33 3pC33 3  33 -- A
F: 3  33 3pD33 3  33 3pD33 3pB33 3pD33 -- E
positions: Svg(shapes/magermix.svg,A,0,B,3,C,2,D,6,E,9,F,8)
move: move(B,2.9,3)move(C,3.9,5) move(B,6.9,5) move(A,11.9,3) move(A,15.9,5)move(B,12.9,5)
move: move(E,2.9,3)move(F,3.9,5) move(E,6.9,5) move(D,11.9,3) move(D,15.9,5)move(E,12.9,5)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Bruno's Nightmare (3 passers) (4)",
    pattern: `A: 3pB3 3pC3 33   -- B
B: 3pA3 33   3pC3 -- C
C: 33   3pA3 3pB3 -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.9,2)Bmove(B,4.9,3)Bmove(C,2.9,1)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Bruno's Nightmare (3 passers) (5)",
    pattern: `A: 3pB 3pC 3pB -- B
B: 3pA 3   3pA -- C
C: 3   3pA 3   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.3,.6)Bmove(B,2.4,1.5)Bmove(C,1.4,1.5)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Bruno's Nightmare (3 passers) (6)",
    pattern: `A: 9B  6   6   9Cx 6   6   9B  6   6   9Cx 6 -- B
B: , 6   9A  6   6   6   6   6   9A  6   7x  -- C
C: !, 6   6   6   6   9Ax 6   6   6   6   6  -- A
positions: Brunos(A,B,C)
move: Bmove(B,4.9,8)Bmove(B,15.9,5)Bmove(C,9.9,5)`,
    patternType: "fourHanded",
  },
  {
    name: "Moving Group Patterns - El Niño (4 passers)",
    pattern: `A: 3pC 3pB 3pD 3pC -- B
B: 3   3pA 3   3 -- C 
C: 3pA 3   3   3pA -- D
D: 3   3   3pA 3   -- A
positions: V(A,B,C,D)
move: Vmove(B,1.9,2),Vmove(C,3.9,2)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - El Niño (4 passers) (2)",
    pattern: `A: 3pB 3pC  -- B
B: 3pA   3  -- C 
C: 3  3pA   -- D
D: 3   3      -- A
positions: V(A,B,C,D)
move: Vmove(B,0.9,2),Vmove(C,1.9,2)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Shooting Star (4 passers)",
    pattern: `A: 3pD 333   -- C
B: 2 333-- D
C: 3pA   222   -- B
D: 3pB   333 -- A
positions: Circle(A,B,C,D,_)
move: Cmove(C,0.9,2.5,144,1)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Other Classic Patterns  (4 passers)",
    pattern: `A: 3pD3 3pB3  -- D
B: 33   3pA3 -- C
C: 33   33   -- A
D: 3pA3 33   -- B
positions: Clover(A,B,C,D)
move: move(D,.9,5)move(B,2.9,5)`,
    patternType: "sync",
  },
  {
    name: "Moving Group Patterns - Other Classic Patterns  (4 passers) (2)",
    pattern: `A: 3pB3 3pC3 3pD3 -- A
B: 3pA3 33   33    -- B
C: 33   3pA3 33    -- C
D: 33  33   3pA3  -- D
positions: Weave(A,B,C,D)
move: move(B,0.5,1.5)move(B,2,2)move(B,4,2)  move(C,0,2)move(C,2.5,1.5)move(C,4,2)  move(D,0,2)move(D,2,2)move(D,4.5,1.5)`,
    patternType: "sync",
  },
  {
    name: "Large Patterns - Speed Passing",
    pattern: `A: 3pJ3pJ3pJ3pJ333pI3pI3pI3pI33 -- B
B: 3pI3pI3pI3pI333pH3pH3pH3pH33 -- C
C: 3pH3pH3pH3pH333pG3pG3pG3pG33 -- D
D: 3pG3pG3pG3pG333pF3pF3pF3pF33 -- E
E: 3pF3pF3pF3pF33333333 -- F
F: 3pE3pE3pE3pE333pD3pD3pD3pD33 -- G
G: 3pD3pD3pD3pD333pC3pC3pC3pC33 -- H
H: 3pC3pC3pC3pC333pB3pB3pB3pB33 -- I
I: 3pB3pB3pB3pB333pA3pA3pA3pA33 -- J
J: 3pA3pA3pA3pA33333333 -- A
positions: Svg(shapes/speedpassing.svg,A,0,B,2,C,4,D,6,E,8, F,10,G,12,H,14,I,16,J,18)
move:move(*,3.9,1)move(*,9.9,1)`,
    patternType: "sync",
  },
  {
    name: "Large Patterns - Skinny Loopy Feast",
    pattern: `A: 3pI3 -- B
B: 3pH3 -- C
C: 3pG3 -- D
D: 3pF3 -- E
E: 3  3 -- F
F: 3pD3 -- G
G: 3pC3 -- H
H: 3pB3 -- I
I: 3pA3 -- J
J: 3  3 -- A
positions: Svg(shapes/skinnyfeast.svg,A,0,B,1,C,2,D,3,E,4, F,5,G,6,H,7,I,8,J,9)
move:move(*,0.9,1)`,
    patternType: "sync",
  },
  {
    name:
      "Starting Manipulator Patterns: Concepts and Nicki's 3-Count Roundabout",
    pattern: `A: 3pB3 33   3pB3 33 -- B
B: 3pA3 33   3pA3 33  -- A
M: SB z SB z  IB . CB↺ z`,
    patternType: "sync",
  },
  {
    name:
      "Starting Manipulator Patterns: Concepts and Nicki's 3-Count Roundabout - The First Manipulator Pattern: Nicki's 3-Count Roundabout",
    pattern: `A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..`,
    patternType: "sync",
  },
  {
    name: "Manipulator Pattern Notation - The Aidan Notation",
    pattern: `A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..`,
    patternType: "sync",
  },
  {
    name: "Manipulator Pattern Notation - The Aidan Notation (2)",
    pattern: `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3  -- C
C: 3 3   3pA3  3  3  -- A
M: CBz   SBz   IC.   -- M
N: CCz   SAz   IBe.   -- N
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Manipulator Pattern Notation - Changing Roles",
    pattern: `A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..`,
    patternType: "sync",
  },
  {
    name: "Manipulator Pattern Notation - Movement",
    pattern: `A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SBl↑.IBl↑↻   C↻..`,
    patternType: "sync",
  },
  {
    name: "Manipulator Pattern Notation - Local Notation (experimental)",
    pattern: `A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..`,
    patternType: "sync",
  },
  {
    name: "Roundabout",
    pattern: `A: 3pB333 3pB333 -- B
B: 3pA333 3pA333 -- A
M: SBe↑ z SBl↓ z IBvo . CB↺↑ z
positions: Line(A,B)`,
    patternType: "sync",
  },
  {
    name: "Roundabout Variations - Conceptually Related Patterns",
    pattern: `A: 3pB3 33   3pB3 33   3pB3 33 -- B
B: 3pA3 33   3pA3 33   3pA3 33 -- A
M: SBcz SAlz SAcz SAlz IAv . CA`,
    patternType: "sync",
  },
  {
    name: "Roundabout Variations - Conceptually Related Patterns (2)",
    pattern: `A: 3pB 3 3   3pB 3 3 -- B
B: 3pA 3 3   3pA 3 3 -- A
M: CB↺↑  z SBl↑ z   IB↺`,
    patternType: "sync",
  },
  {
    name: "Roundabout Variations - Conceptually Related Patterns (3)",
    pattern: `A: 3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3 -- A
M: IB  CA  z   z   SAc z`,
    patternType: "sync",
  },
  {
    name: "Roundabout Variations - 4 and 5 Person Patterns based on Roundabout",
    pattern: `A: 3pB333 3pB333 -- B
B: 3pA333 3pA333 -- A
M: SBe z SBl z IBvo . CB↺ z
N: SAe z SAl z IAvo . CA↺ z`,
    patternType: "sync",
  },
  {
    name:
      "Roundabout Variations - 4 and 5 Person Patterns based on Roundabout (2)",
    pattern: `A: 3pD 333 3pD 333   -- C
B: 0 1 22 2 333-- D
C: 3pA 222 3pA   202   -- B
D: 3pB   333 3pB   333 -- A
N: SAe z SAl z IAvo . CA↺ z
positions: Circle(A,B,C,D,_)
move: Cmove(C,4.9,2.5,144,1)`,
    patternType: "sync",
  },
  {
    name:
      "Roundabout Variations - 4 and 5 Person Patterns based on Roundabout (3)",
    pattern: `A: 3pB3 3pC3 3pC3 3pC3 33   -- B
B: 3pA3 33   3pA3 33   3pC3 -- C
C: 33   3pA3 3pB3 3pA3 3pB3 -- A
N: SAe z SBl z IBvo . CB↺ z SCe z  
positions: Circle(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Roundabout Variations - Adding Extra Clubs",
    pattern: `A: 3B 4 4 4pB 4 4 4 4pB -- B
B: 4pA 333 3pA 333 -- A
M: SBe z SBl IBvo .. CB↺ z`,
    patternType: "sync",
  },
  {
    name: "Roundabout Variations - Adding Extra Clubs (2)",
    pattern: `A: 4pBx 3   5 3 4pBx 3   5 3 4pBx -- B
B: !3   4pAx 3 3 3   4pAx 3 3 3 -- A
M: SBe! . 1x     SBl IBv.. CB↺  -- M`,
    patternType: "sync",
  },
  {
    name: "North-Wall Patterns - Phoenicean Waltz",
    pattern: `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBlo z   zf  SBlo z   .   IBvb CA  .`,
    patternType: "sync",
  },
  {
    name: "North-Wall Patterns - MinuEd",
    pattern: `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: .   SBl IB↻ CA  .   .   SBe .   SBe`,
    patternType: "sync",
  },
  {
    name: "Dolby Söround",
    pattern: `A: 3pB333 3pB33 -- B
B: 3pA333 3pA33 -- A
M: SBezSBlz IBv CBz`,
    patternType: "sync",
  },
  {
    name: "Opernball (5 Person)",
    pattern: `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvb CA  . 
N: SAloz   .   IAvb CB  .   SBloz   zf  
O: IBvb CA  .   SAlo z   zf  SAlo z   .   
positions: Line(A,B,0.14)`,
    patternType: "sync",
  },
  {
    name: "Scrambled V and other Scrambled Patterns - Scrambed V",
    pattern: `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: CB↺.SBl z ICl↺ 
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Scrambled V and other Scrambled Patterns - Toast",
    pattern: `A: 3pB3 3pC3 3pB3 -- B
B: 3pA3 33   3pA3 -- C
C: 33   3pA3 33   -- A
M: SBe z ICv . CC↺ z
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name:
      "Scrambled V and other Scrambled Patterns - Combining Scrambles (5+ Persons)",
    pattern: `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3  -- C
C: 3 3   3pA3  3  3  -- A
M: CBz   SBz   IC.   -- M
N: CCz   SAz   IBe.   -- N
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
    patternType: "sync",
  },
  {
    name: "Ambled Patterns - Ambled V",
    pattern: `A: 4pBx3  4pCx3  4pBx3  4pCx -- B
B: !34pAx  3  3  34pAx  4x  -- C
C: !2 33 4pAx 3  3  3   -- A
M: CB↺ 1 !1x    SB . IC↺ ..  -- M
positions: V(A,B,C)
move: Vmove(B,5.9,3)`,
    patternType: "sync",
  },
  {
    name: "Zippy and other advanced 4-5 person patterns - Zippy",
    pattern: `A: 3pC 3pB 3  3pC 3pB 3  3pC 3 -- B
B: 3   3pA 3  3   3pA 3  3   3 -- C
C: 3pA 3   3  3pA 3   3  3pA 3 -- A
M: z   SAe zf IAv CB  z  SB  z 
positions: V(A,B,C)
move: Vmove(B,4.2,3.7)`,
    patternType: "sync",
  },
  {
    name: "Zippy and other advanced 4-5 person patterns - Beyond Zippy",
    pattern: `A: 3pB 3pC 3  3pB 3pC 3  3pC 3pB 3 3pC 3pB 3 -- A
B: 3pA 3   3  3pA 3   3  3   3pA 3 3   3pA 3 -- B
C: 3   3pA 3  3   3pA 3  3pA 3   3 3pA 3   3 -- C
M: z   IC  CC z   z   IB .   CA  z  IA CB  z
positions: V(A,B,C)`,
    patternType: "sync",
  },
  {
    name: "Zippy and other advanced 4-5 person patterns - Beyond Zippy (2)",
    pattern: `A: 3pB 3pC 3  3pB 3pC 3  3pB 3pC 3 -- B
B: 3pA 3   3  3pA 3   3  3pA 3   3 -- C
C: 3   3pA 3  3   3pA 3  3   3pA 3 -- A
M: CB  .   .  SA  .   SA .   SC  IC
positions: Brunos(A,B,C)
move: Bmove(B,1.9,4)Bmove(B,6.9,5)Bmove(C,3.9,4)`,
    patternType: "sync",
  },
  {
    name: "Zippy and other advanced 4-5 person patterns - Beyond Zippy (3)",
    pattern: `A: 3pB 3 3  3pC 3 3  3pB 3 3 -- B
B: 3pA 3 3  3   3 3  3pA 3 3 -- C
C: 3   3 3  3pA 3 3  3   3 3 -- A
M: SB  z   IB .   C  z  SB  z   z
N: SC  z z  SC  z IC .   CC z
positions: Brunos(A,B,C)
move: Bmove(B,1.9,4)Bmove(B,6.9,5)Bmove(C,3.9,5)`,
    patternType: "sync",
  },
  {
    name: "Zippy and other advanced 4-5 person patterns - Beyond Zippy (4)",
    pattern: `A: 3pB 3pC 3  3pB 3   3 -- B
B: 3pA 3   3  3pA 3pC 3 -- C
C: 3   3pA 3  3   3pB 3 -- A
M: CB  .   SBe .   SCl  IC↻ 
positions: VL(A,B,C)
move: Vmove(C,1.9,2)Vmove(A,3.9,2)`,
    patternType: "sync",
  },
  {
    name: "Siteswap takeout patterns - 567-about",
    pattern: `A: 7 6 5 7 6 -- B
B:, 5 7 6 5  -- A
M:, . IAb,Co`,
    patternType: "fourHanded",
  },
  {
    name: "Appendix: 8-club one-counts",
    pattern: `A:  9Bx 7B
B: , (9A 7Ax)`,
    patternType: "fourHanded",
  },
  {
    name: "Appendix: Bruno's Variations",
    pattern: `A: 3pB3 3pC3 3pB3 3pC3 3pB3 -- B
B: 3pA3 3  3 3pA3 33   3pA3 -- C
C: 33   3pA3 33   3pA3 33   -- A
positions: Svg(shapes/bruno5.svg,A,0,B,4,C,3)
move: move(B,1.9,2)move(B,4.9,3)move(B,8.9,3)move(C,2.9,3)`,
    patternType: "sync",
  },
  {
    name: "Appendix: Bruno's Variations (2)",
    pattern: `A: 3pB3pB3 3pC3pC3 3pB3pB3 -- B
B: 3pA3pA3 333   3pA3pA3 -- C
C: 333   3pA3pA3 333   -- A
positions: Brunos(A,B,C)
move: Bmove(B,2.9,3)Bmove(B,7.9,4)Bmove(C,4.9,4)`,
    patternType: "sync",
  },
  {
    name: "Appendix: Bruno's Variations (3)",
    pattern: `A: 3pB3pC3 3pB3pC3 3pB3pC3 -- B
B: 3pA33   3pA33   3pA33 -- C
C: 33pA3   33pA3 33pA3   -- A
positions: Svg(shapes/bruno5.svg,A,0,B,4,C,3)
move: move(B,0.9,2)move(B,3.9,2)move(B,6.9,2)move(C,1.9,2)`,
    patternType: "sync",
  },
  {
    name: "Appendix: Bruno's Variations (4)",
    pattern: `A: 3pB33pC3pB3 -- B
B: 3pA33  3pA3 -- C
C: 333pA33   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.3,1.6)Bmove(B,3.9,3)Bmove(C,2.9,2)`,
    patternType: "sync",
  },
  {
    name: "Appendix: Bruno's Variations (5)",
    pattern: `A: 3pB 3pC 3pB 3pC 3   3pC -- C
B: 3pA 3   3pA 3   3pF 3   -- D
C: 3   3pA 3   3pA 3pE 3pA -- B
D: 3pE 3pF 3pE 3pF 3   3pF -- F
E: 3pD 3   3pD 3   3pC 3   -- A
F: 3   3pD 3   3pD 3pB 3pD -- E
positions: Svg(shapes/magermix.svg,A,0,B,3,C,2,D,6,E,9,F,8)
move: move(B,0.9,1)move(C,1.6,1.3) move(B,2.9,1)move(A,3.9,1)move(A,5.9,1)move(B,4.9,1)
move: move(E,1.3,.6)move(F,1.6,1.3)move(E,2.9,1) move(D,3.9,1)move(D,5.9,1)move(E,4.9,1)`,
    patternType: "sync",
  },
  {
    name: "Appendix: Bruno's Variations (6)",
    pattern: `A: 3pB33 3pC33 3pB33 3pC33 333   3pC33 -- C
B: 3pA33 333   3pA33 333   3pC33 333   -- A
C: 333   3pA33 333   3pA33 3pB33 3pA33 -- B
positions: Svg(shapes/bruno441.svg,A,8,B,1,C,4)
move: move(B,0.9,5)move(C,3.9,5)move(A,9.9,5)move(C,12.9,2)move(B,12.9,5)`,
    patternType: "sync",
  },
  {
    name: "Appendix: Bruno's Variations (7)",
    pattern: `A: 3pB 3pC 3pB 3pC 3   3pC -- C
B: 3pA 3   3pA 3   3pC 3   -- A
C: 3  3pA 3   3pA 3pB 3pA -- B
positions: Svg(shapes/bruno441.svg,A,8,B,1,C,4)
move: move(B,0.6,1.3)move(C,1.6,1.3)move(A,3.9,1)move(C,4.6,0.3)move(B,4.9,1)`,
    patternType: "sync",
  },
  {
    name: "For Ian - 5-count popcorn vs why not moving feed",
    pattern: `A: 7B 6 7Cx 827Cx -- B
B: , a67A67x -- C
C: !, 66a67Ax -- A
positions: V(A,B,C)
move: Vmove(B, 7, 5)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Longer version",
    pattern: `A: !7B 6 7Cx 82 7B 6 7Cx 827Cx -- B
B: !, a67A66a67A67x -- C
C: , 66a67Ax66a67Ax -- A
positions: V(A,B,C)
move: Vmove(B, 17, 1)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Maria's original version",
    pattern: `A: 7B 6 7Cx 8 2 7B 6 6 8 8 7B -- C
B: , 88 7A 6 6 8 8 7A 6 6 -- A
C: !, 6 6 8 8 7Ax 6 6 6 6 7 -- B
positions: VL(A,B,C)
move: Vmove(C, 11, 5)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Maria's original version (2)",
    pattern: `A: !7C 6 7Bx 8 2 7C 6 6 8 8 7C -- B
B: !, 6 6 8 8 7A 6 6 6 6 7x -- C
C: , 88 7Ax 6 6 8 8 7Ax 6 6 -- A
positions: V(A,B,C)
move: Vmove(B, 11, 5)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Martin's one count vs Why not",
    pattern: `A: !7B 7Cx 7B 7Cx 2 7Cx -- B
B: !, 8 2 7A 6 7x -- C
C: , 7Ax 8 2 7Ax 6  -- A
positions: V(A,B,C)
move: Vmove(B, 7, 2)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Martin's one count vs Why not (2)",
    pattern: `A: !7B 7Cx 7B 7Cx 2 7B 7Cx 7B 7Cx 2 7Cx -- B
B: !, 8 2 7A 6 7A 8 2 7A 6 7x -- C
C: , 7Ax 8 2 7Ax 6 7Ax 8 2 7Ax 6  -- A
positions: V(A,B,C)
move: Vmove(B, 17, 2)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Martin's one count vs Why not (3)",
    pattern: `A: !7B 7Cx 7B 7Cx 2 7B 7Cx 7B 7Cx 2 6 7Cx -- B
B: !, 8 2 7A 6 7A 8 2 7A 6 6 7x  -- C
C: , 7Ax 8 2 7Ax 6 7Ax 8 2 7Ax 6 6  -- A
positions: V(A,B,C)
move: Vmove(B, 17, 4)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Takeouts",
    pattern: `A: 7B 6 7Cx 827Cx -- B
B: , 887A67x -- C
C: !, 66887Ax -- A
M: IB,C
positions: V(A,B,C)
move: Vmove(B, 7, 5)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Example",
    pattern: `A: 7B7C267B7C6 -- A
B: , 7A667A466 -- B
C: , 67A667A46 -- C
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Example (2)",
    pattern: `A: 7B7Cx267B7Cx6 -- A
B: , 7A667A466 -- B
C: !, 67Ax667Ax46 -- C
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Example (3)",
    pattern: `A: 7B7Cx267B7Cx66 -- B
B: , 7A667A467x -- C
C: !, 67Ax667Ax46 -- A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
  {
    name: "For Ian - Example (4)",
    pattern: `A: 7B7B7C7B7C
B: , 7A27A7A2
C: , 27A227A
positions: V(A,B,C)`,
    patternType: "fourHanded",
  },
] as const;
