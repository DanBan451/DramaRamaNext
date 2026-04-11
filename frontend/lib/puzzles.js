/**
 * The 6 puzzles from Edward Burger's Making Up Your Own Mind.
 * These are the weights in the mental gym.
 */

export const PUZZLES = [
  {
    id: "whos-who",
    number: "I",
    title: "Who's Who?",
    text: `One afternoon, on a college campus, two students — one a math major, the other a philosophy major — were conversing.\n\n"I'm a math major," said the one with black hair.\n"I'm a philosophy major," said the one with red hair.\n\nGiven that at least one of these students is lying, what color hair does the math major have?`,
    category: "logic",
    visual: "two students standing on a college campus path, one with black hair, one with red hair, speaking to each other, stylized minimal ink illustration",
  },
  {
    id: "six-equals-eight",
    number: "II",
    title: "When Six Equals Eight",
    text: `Draw six straight-line segments of equal length so that they produce eight equilateral triangles.\n\nRecall that a triangle is equilateral if all three sides have the same length, which also implies that each of its angles measures 60 degrees.\n\nThere are many ways to answer this puzzle — use different practices of effective thinking to create as many different solutions as you can.`,
    category: "geometry",
    visual: "six equal line segments floating in space, geometric construction, equilateral triangles forming, minimal black ink on white",
  },
  {
    id: "three-switches",
    number: "III",
    title: "Three Switches, Two Rooms, and One Bulb",
    text: `Two windowless rooms in an unusual building are connected by a long and winding hallway — so winding that it is impossible to see any part of one room while in the other.\n\nThe first room has three identical light switches on the wall, all in the down (off) position — two of which do nothing and the third of which turns on and off an old-fashioned desk lamp that sits on a table in the second room.\n\nWhat are the fewest number of trips up and down that winding hall required to determine which switch is the one that controls the lamp in the other room?`,
    category: "lateral",
    visual: "a winding dark hallway connecting two rooms, three light switches on a wall, a single desk lamp glowing in the distance, ink illustration",
  },
  {
    id: "top-10-list",
    number: "IV",
    title: "A Top 10 List",
    text: `For each of the following ten statements, determine if the statement is true or false:\n\n1. Exactly one statement on this list is false.\n2. Exactly two statements on this list are false.\n3. Exactly three statements on this list are false.\n4. Exactly four statements on this list are false.\n5. Exactly five statements on this list are false.\n6. Exactly six statements on this list are false.\n7. Exactly seven statements on this list are false.\n8. Exactly eight statements on this list are false.\n9. Exactly nine statements on this list are false.\n10. Exactly ten statements on this list are false.`,
    category: "logic",
    visual: "a numbered list from 1 to 10 on old parchment, some numbers circled, some crossed out, self-referential paradox, ink illustration",
  },
  {
    id: "five-to-four",
    number: "V",
    title: "Going from 5 to 4 in Two Moves",
    text: `In the figure, you see five 1×1 match squares arranged in an L-shape: three across the top row, and two below the left side.\n\nBy just changing the positions of two matches (you cannot break or remove any match), change the number of 1×1 match squares from five to four.\n\nNote that each match must be a full side of a match square — that is, no loose ends or dangling matches are allowed. Furthermore, you are not allowed to place one match on top of another.`,
    category: "spatial",
    visual: "matchsticks arranged in five squares in an L-shape pattern, wooden matches with red tips, minimal illustration on white",
  },
  {
    id: "star-is-born",
    number: "VI",
    title: "A Star Is Born",
    text: `The standard five-pointed star drawn with five straight lines has five disjoint triangles (that is, no triangle is contained inside of or overlaps another triangle).\n\nDraw two straight lines that cross one five-pointed star in such a manner that the resulting drawing contains ten disjoint triangles.`,
    category: "geometry",
    visual: "a five-pointed star drawn with clean black lines, geometric precision, two additional lines crossing through it creating triangles, ink on white",
  },
];
