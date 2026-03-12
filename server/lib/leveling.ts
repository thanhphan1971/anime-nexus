export function calculateLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp || 0));

  let level = 1;
  let required = 100;
  let spent = 0;

  while (safeXp >= spent + required) {
    spent += required;
    level += 1;
    required = level * 100;
  }

  return level;
}

export function getXpProgress(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp || 0));

  let level = 1;
  let required = 100;
  let spent = 0;

  while (safeXp >= spent + required) {
    spent += required;
    level += 1;
    required = level * 100;
  }

  return {
    level,
    currentLevelXp: safeXp - spent,
    nextLevelXp: required,
    totalXp: safeXp,
  };
}