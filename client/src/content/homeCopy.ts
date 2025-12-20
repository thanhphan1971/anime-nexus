export const worldHook = {
  title: "Welcome to AniRealm",
  subtitle: "A fractured anime universe where cards, events, and community shape your legend.",
  microline: "Claim rewards, enter live draws, and post your story inside Aurelith.",
};

export const todayActions = {
  header: "Today's Actions",
  subheader: "3 fast ways to earn, win, or create.",
  actions: [
    {
      icon: "gift",
      title: "Claim Daily Summon",
      body: "Free pulls reset every day.",
      ctaLabel: "Summon",
      route: "/cards",
    },
    {
      icon: "dice",
      title: "Enter Live Draws",
      body: "Weekly + monthly winners.",
      ctaLabel: "Enter",
      route: "/draws",
    },
    {
      icon: "pen",
      title: "Create a Post",
      body: "Share a moment in Aurelith.",
      ctaLabel: "Post",
      route: "/create",
    },
  ],
};

export const fieldReport = {
  label: "FIELD REPORT",
  teasers: [
    "Continuum fractures are surging near the Void Sector. Citizens report unstable echoes.",
    "Aurelith's relic signals spiked overnight. Summons feel unusually volatile.",
    "Wardens issued a caution: 'Do not approach blue-cracked crystals without a stabilizer.'",
    "The Ironbound Legion marched again. Their armor hums with sealed Continuum residue.",
    "A new anomaly appeared above the Wells. Some claim it's a message.",
  ],
};

export const worldLoreModal = {
  bullets: [
    "Summon cards daily",
    "Win rewards in weekly/monthly draws",
    "Post stories & fan art",
    "Level up your identity badge",
  ],
};

export function getDailyTeaser(): string {
  const today = new Date();
  const dateKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = dateKey % fieldReport.teasers.length;
  return fieldReport.teasers[index];
}
