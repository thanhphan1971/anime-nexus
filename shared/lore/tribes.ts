export interface TribeCharacter {
  id: string;
  name: string;
  title: string;
  bio: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  role: 'leader' | 'warrior' | 'support' | 'mystic' | 'scout';
  element: string;
  flavorText: string;
}

export interface TribeGameplayMechanic {
  name: string;
  type: 'passive' | 'active' | 'synergy' | 'bonus';
  description: string;
  effect: string;
}

export interface Tribe {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  element: string;
  color: string;
  accentColor: string;
  symbol: string;
  lore: {
    origin: string;
    beliefs: string;
    culture: string;
    conflict: string;
  };
  summary: string;
  characters: TribeCharacter[];
  gameplayMechanics: TribeGameplayMechanic[];
}

export const TRIBE_VEIL: Tribe = {
  id: 'veil-of-the-fractured-void',
  name: 'Veil of the Fractured Void',
  shortName: 'The Veil',
  tagline: 'What breaks does not vanish. It lingers.',
  element: 'Spirit',
  color: 'violet',
  accentColor: '#8B5CF6',
  symbol: '☽',

  lore: {
    origin: `The Veil of the Fractured Void are beings who survived the Fracture by existing between presence and absence. They are not fully alive nor truly dead, but echo-bound entities partially untethered from physical reality when the Continuum shattered. Where others fled or fought, they simply... remained, caught in the space between what was and what became.`,

    beliefs: `"What breaks does not vanish. It lingers." The Veil believes memory is a form of existence, death is displacement rather than an end, and truth survives as echoes rather than records. They do not mourn the lost world — they hear it still, whispering from the spaces between moments.`,

    culture: `Quiet, ritualistic, and observant. The Veil moves through the world like half-remembered dreams. Their forms are ethereal, semi-transparent, glowing with fractured light. They mark sacred spaces with spirit motifs and gather in echo zones where the Continuum's residue still pulses. Their palette is pale blues, violets, silvers, and ghost-white — colors of things that linger.`,

    conflict: `They endured the Fracture by binding themselves to spirit remnants, echo zones, and lingering Continuum residue. This granted survival at the cost of physical stability and identity cohesion. Some among them fade a little more each day. Others grow stronger but less... certain of who they once were.`,
  },

  summary: `The Veil of the Fractured Void are echo-bound entities who survived the Fracture by existing between presence and absence. They believe what breaks does not vanish — it lingers. Their power comes from binding to spirit remnants and Continuum residue, but this survival came at the cost of physical stability and identity.`,

  characters: [
    {
      id: 'veil_001',
      name: 'Aisling the Fade',
      title: 'High Seer of the Void',
      bio: 'Aisling was the first to return from the deepest fracture — and the only one who came back with her mind intact. She leads the Veil not by command, but by clarity. Her whispers carry the weight of a thousand echoes.',
      rarity: 'mythic',
      role: 'leader',
      element: 'Spirit',
      flavorText: '"What breaks does not vanish. It lingers."',
    },
    {
      id: 'veil_002',
      name: 'Wraith Hollow',
      title: 'Echo Walker',
      bio: 'Once a scout for a fallen city, Hollow was caught between presence and absence during the Fracture. Now more echo than flesh, he phases between states, gathering secrets the living cannot reach.',
      rarity: 'legendary',
      role: 'scout',
      element: 'Spirit',
      flavorText: '"I am the shadow your shadow fears."',
    },
    {
      id: 'veil_003',
      name: 'Mira of the Echoes',
      title: 'Memory Keeper',
      bio: 'Mira hosts fragments of seven lost souls within her mind. She speaks in echoes — half her words are hers, half belong to those who came before. Her counsel is cryptic but never wrong.',
      rarity: 'epic',
      role: 'mystic',
      element: 'Spirit',
      flavorText: '"We speak as one. We remember as many."',
    },
    {
      id: 'veil_004',
      name: 'Nox the Unraveled',
      title: 'Void Blade',
      bio: 'Nox wields a blade forged from condensed Continuum residue. Each strike carries the weight of forgotten moments. He fights not for glory, but to give the echoes purpose.',
      rarity: 'epic',
      role: 'warrior',
      element: 'Spirit',
      flavorText: '"Every swing is a requiem."',
    },
    {
      id: 'veil_005',
      name: 'Sera Lighthollow',
      title: 'Luminous Guide',
      bio: 'Sera\'s sigils glow brighter than any other Veil. She guides lost souls — both present and absent — through the fractured paths. Her light is the last thing many see before they fade.',
      rarity: 'rare',
      role: 'support',
      element: 'Spirit',
      flavorText: '"Follow the light. It knows the way."',
    },
    {
      id: 'veil_006',
      name: 'Pale Vesper',
      title: 'Echo Singer',
      bio: 'Vesper sings songs that only echoes can hear. Her melodies call fragments from the Void, temporarily manifesting them as allies in battle.',
      rarity: 'rare',
      role: 'support',
      element: 'Spirit',
      flavorText: '"Every note is a name. Every song, a summoning."',
    },
    {
      id: 'veil_007',
      name: 'Cinder Dusk',
      title: 'Fading Warrior',
      bio: 'Dusk has phased between presence and absence so many times that parts of him no longer return. His left arm is pure residue. He knows his time is short, but he fights harder because of it.',
      rarity: 'common',
      role: 'warrior',
      element: 'Spirit',
      flavorText: '"I\'m already half gone. What\'s there to fear?"',
    },
    {
      id: 'veil_008',
      name: 'Whisper Moth',
      title: 'Silent Messenger',
      bio: 'A young Veil who cannot speak — her voice was taken by the Fracture. Instead, she communicates through luminous moths that carry her thoughts. She is underestimated by enemies, which is their last mistake.',
      rarity: 'common',
      role: 'scout',
      element: 'Spirit',
      flavorText: '"..."',
    },
  ],

  gameplayMechanics: [
    {
      name: 'Lingering Presence',
      type: 'passive',
      description: 'Veil cards persist longer than expected.',
      effect: '+10% power for each other Veil card in your active deck. Effects linger 1 extra turn.',
    },
    {
      name: 'Echo Ward',
      type: 'passive',
      description: 'Partially untethered from reality, harder to strike.',
      effect: 'Veil cards have a 15% chance to phase through incoming damage.',
    },
    {
      name: 'Memory Fragment',
      type: 'active',
      description: 'Draw upon echoes of past battles.',
      effect: 'Once per battle, reveal the opponent\'s next move.',
    },
    {
      name: 'Phase Slip',
      type: 'active',
      description: 'Briefly exist outside physical reality.',
      effect: 'Veil Scout cards can evade one attack per battle.',
    },
    {
      name: 'Residue Bond',
      type: 'synergy',
      description: 'Veil Support cards share Continuum residue with allies.',
      effect: 'When a Veil Support card is active, all ally cards gain +5% power.',
    },
    {
      name: 'Delayed Impact',
      type: 'bonus',
      description: 'Some wounds only manifest later.',
      effect: 'Marked enemies take 10% more damage from all Veil attacks for 2 turns.',
    },
    {
      name: 'Fade Threshold',
      type: 'passive',
      description: 'The less present they are, the harder they strike.',
      effect: 'Veil cards below 30% health gain +25% power (risk/reward mechanic).',
    },
    {
      name: 'Echo Convergence',
      type: 'synergy',
      description: 'Unlock the full disruptive potential of the Veil.',
      effect: 'Having 4+ Veil cards in deck unlocks "Void Pulse" — once per match, reduce all enemy power by 20% for 3 turns. Costs 2 turns to charge.',
    },
  ],
};

export const ALL_TRIBES: Tribe[] = [
  TRIBE_VEIL,
];

export function getTribeById(id: string): Tribe | undefined {
  return ALL_TRIBES.find(t => t.id === id);
}

export function getTribeByElement(element: string): Tribe | undefined {
  return ALL_TRIBES.find(t => t.element.toLowerCase() === element.toLowerCase());
}
