export const programs = [
  {
    id: "01",
    title: "After Hours Radio",
    creator: "Studio Meridian",
    category: "Music",
    art: "after-hours",
    viewers: 1240,
    description:
      "A vinyl-only session of deep house, warm grooves, and late-night finds from the Meridian record shelves.",
  },
  {
    id: "02",
    title: "Form Studies: Objects in Motion",
    creator: "Mira Sol",
    category: "Design",
    art: "form-studies",
    viewers: 386,
    description:
      "Inside the studio with Mira: turning simple shapes into playful three-dimensional objects.",
  },
  {
    id: "03",
    title: "Build Log: From Zero to Terminal",
    creator: "Dev Frequency",
    category: "Technology",
    art: "build-log",
    viewers: 214,
    description:
      "A live coding session building a small terminal tool, one command at a time.",
  },
  {
    id: "04",
    title: "Side B: The Listening Room",
    creator: "Echo Archive",
    category: "Music",
    art: "side-b",
    viewers: 572,
    description:
      "Pull up a chair for deep cuts, field recordings, and the stories behind the samples.",
  },
] as const;
export type Program = (typeof programs)[number];
export const artwork = (p: Program) => "/art/" + p.art + ".svg";
