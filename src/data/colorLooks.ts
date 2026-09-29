// Answers to quiz v2's "What is your preferred lipstick color look?". The
// first sentence of each option is its headline, the rest the smaller line
// beneath; name is the short form the admin panel uses.
export const COLOR_LOOKS = [
  {
    id: "natural",
    name: "Super natural, everyday",
    title: "Something super natural looking and easy for everyday.",
    detail: "I don't want people to realize I have lipstick on even though I'm wearing it.",
  },
  {
    id: "pop",
    name: "Brighter pop of color",
    title: "A brighter pop of color.",
    detail: "I want it to really look like I have something on.",
  },
  {
    id: "both",
    name: "Open to both",
    title: "I'm open to both!",
    detail: "Depends on my mood or time of day.",
  },
] as const;

export type ColorLook = (typeof COLOR_LOOKS)[number]["id"];
