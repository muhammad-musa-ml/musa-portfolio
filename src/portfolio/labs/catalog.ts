export const LABS = [
  {
    id: "pathfinding",
    number: "01",
    title: "Find a way through.",
    subject: "Search & systems",
    description:
      "Draw a wall. Move the destination. Watch two algorithms find their way through the same problem.",
    action: "Build a route",
    project: "lookup",
    connection: "Explore my distributed-systems work",
  },
  {
    id: "learning",
    number: "02",
    title: "Teach a boundary.",
    subject: "Machine learning",
    description:
      "Give a small model some examples. Train it, change the data, and find the limits of a straight line.",
    action: "Train a model",
    project: "shahmukhi",
    connection: "Explore my language-modeling work",
  },
] as const;

export type LabId = (typeof LABS)[number]["id"];
