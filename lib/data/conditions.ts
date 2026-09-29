/** Item condition options, in the order they're shown in the publish form. */
export const ITEM_CONDITIONS = [
  { value: "new", label: "New with tags", hint: "Unused, original tags still attached." },
  { value: "like-new", label: "Like new", hint: "Used once or twice, no visible flaws." },
  { value: "good", label: "Good", hint: "Light signs of wear, works as it should." },
  { value: "fair", label: "Fair", hint: "Clear wear, but fully usable." },
  { value: "for-parts", label: "For parts", hint: "Faulty or incomplete. Say what's wrong in the description." },
] as const;

export type ItemCondition = (typeof ITEM_CONDITIONS)[number]["value"];
