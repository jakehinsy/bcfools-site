export const eventCategories = {
  training: { label: "Training", color: "#ff5964" },
  chapter: { label: "Chapter", color: "#5c9eff" },
  community: { label: "Community", color: "#66c58a" },
  fundraiser: { label: "Fundraiser", color: "#f0b94b" },
} as const;

export type EventCategory = keyof typeof eventCategories;

export type PublicEvent = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category: EventCategory;
  summary?: string;
  href?: string;
};

// This remains empty until Brew City FOOLS has an approved source of public
// event data. The events page is ready to accept the same shape from Platoon.
export const publicEvents: readonly PublicEvent[] = [];
