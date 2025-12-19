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

export const TRIBE_VEILBORN: Tribe = {
  id: 'veilborn',
  name: 'The Veilborn',
  shortName: 'Veilborn',
  tagline: 'Between worlds, we endure.',
  element: 'Spirit',
  color: 'violet',
  accentColor: '#8B5CF6',
  symbol: '☽',

  lore: {
    origin: `When the Continuum shattered, most survivors clung to the physical remnants of Aurelith. But some were caught in the space between — the Veil, a liminal realm where spirit and matter blur. These survivors didn't just survive; they transformed. Their bodies became translucent, their voices echoed across dimensions, and their memories merged with the echoes of the dead. They emerged as the Veilborn — neither fully living nor truly gone.`,

    beliefs: `The Veilborn believe the Fracture was not destruction, but revelation. They see the physical world as an illusion — a fragment of something greater. To them, true reality exists in the Veil, where ancestors whisper secrets and forgotten histories still breathe. They do not mourn the old world; they commune with it. Death is not an ending but a transition, and the Veilborn walk freely between both states.`,

    culture: `Veilborn society is built around Circles — gatherings where the living and the echoes of the dead share wisdom. They mark their skin with luminescent sigils that glow when spirits are near. Their leaders are not chosen by strength or lineage but by "clarity" — the ability to hear the Veil's whispers without losing oneself. Music, dreams, and silence are sacred. They speak in riddles because truth, they believe, cannot be stated directly.`,

    conflict: `Other tribes fear the Veilborn. The Ironclad see them as unnatural; the Emberclan call them death-touched. But the Veilborn's greatest threat comes from within: the deeper one walks into the Veil, the harder it becomes to return. Some Veilborn fade entirely, becoming echoes themselves. The tribe walks a razor's edge between enlightenment and oblivion.`,
  },

  summary: `The Veilborn are spirit-touched survivors who emerged from the space between worlds. They commune with echoes of the dead and see the Fracture as a revelation, not a tragedy. Their power comes from the Veil — a liminal realm of memory and spirit — but the deeper they go, the more they risk becoming echoes themselves.`,

  characters: [
    {
      id: 'veilborn_001',
      name: 'Aisling the Fade',
      title: 'High Seer of the Veil',
      bio: 'Aisling was the first to return from the deepest layer of the Veil — and the only one who came back with her mind intact. She leads the Veilborn not by command, but by clarity. Her whispers carry the weight of a thousand ancestors.',
      rarity: 'mythic',
      role: 'leader',
      element: 'Spirit',
      flavorText: '"The dead do not rest. They wait."',
    },
    {
      id: 'veilborn_002',
      name: 'Wraith Hollow',
      title: 'Veil Walker',
      bio: 'Once a scout for a fallen city, Hollow was consumed by the Veil during the Fracture. Now more spirit than flesh, he phases between realms, gathering secrets the living cannot reach.',
      rarity: 'legendary',
      role: 'scout',
      element: 'Spirit',
      flavorText: '"I am the shadow your shadow fears."',
    },
    {
      id: 'veilborn_003',
      name: 'Mira of the Echoes',
      title: 'Circle Keeper',
      bio: 'Mira hosts the spirits of seven ancestors within her mind. She speaks in fragments — half her words are hers, half belong to those who came before. Her counsel is cryptic but never wrong.',
      rarity: 'epic',
      role: 'mystic',
      element: 'Spirit',
      flavorText: '"We speak as one. We remember as many."',
    },
    {
      id: 'veilborn_004',
      name: 'Nox the Unraveled',
      title: 'Spirit Blade',
      bio: 'Nox wields a sword forged from condensed Veil energy. Each strike carries the weight of forgotten souls. He fights not for glory, but to give the echoes purpose.',
      rarity: 'epic',
      role: 'warrior',
      element: 'Spirit',
      flavorText: '"Every swing is a requiem."',
    },
    {
      id: 'veilborn_005',
      name: 'Sera Lighthollow',
      title: 'Luminous Guide',
      bio: 'Sera\'s sigils glow brighter than any other Veilborn. She guides lost souls — both living and dead — through the Veil\'s treacherous paths. Her light is the last thing many see before they cross over.',
      rarity: 'rare',
      role: 'support',
      element: 'Spirit',
      flavorText: '"Follow the light. It knows the way."',
    },
    {
      id: 'veilborn_006',
      name: 'Pale Vesper',
      title: 'Echo Singer',
      bio: 'Vesper sings songs that only the dead can hear. Her melodies call spirits from the Veil, temporarily manifesting them as allies in battle.',
      rarity: 'rare',
      role: 'support',
      element: 'Spirit',
      flavorText: '"Every note is a name. Every song, a summoning."',
    },
    {
      id: 'veilborn_007',
      name: 'Cinder Dusk',
      title: 'Fading Warrior',
      bio: 'Dusk has walked the Veil so many times that parts of him no longer return. His left arm is pure spirit energy. He knows his time is short, but he fights harder because of it.',
      rarity: 'common',
      role: 'warrior',
      element: 'Spirit',
      flavorText: '"I\'m already half gone. What\'s there to fear?"',
    },
    {
      id: 'veilborn_008',
      name: 'Whisper Moth',
      title: 'Silent Messenger',
      bio: 'A young Veilborn who cannot speak — her voice was taken by the Veil. Instead, she communicates through luminous moths that carry her thoughts. She is underestimated by enemies, which is their last mistake.',
      rarity: 'common',
      role: 'scout',
      element: 'Spirit',
      flavorText: '"..."',
    },
  ],

  gameplayMechanics: [
    {
      name: 'Veil Resonance',
      type: 'passive',
      description: 'Veilborn cards gain power from spirit synergy.',
      effect: '+10% power for each other Veilborn card in your active deck.',
    },
    {
      name: 'Echo Shield',
      type: 'passive',
      description: 'Spirit energy protects against the first strike.',
      effect: 'Veilborn cards have a 15% chance to negate the first damage taken in battle.',
    },
    {
      name: 'Ancestral Whisper',
      type: 'active',
      description: 'Call upon the echoes for guidance.',
      effect: 'Once per battle, reveal the opponent\'s next move.',
    },
    {
      name: 'Phase Walk',
      type: 'active',
      description: 'Briefly enter the Veil to avoid attacks.',
      effect: 'Veilborn Scout cards can dodge one attack per battle.',
    },
    {
      name: 'Spirit Link',
      type: 'synergy',
      description: 'Veilborn Support cards empower nearby allies.',
      effect: 'When a Veilborn Support card is active, all ally cards gain +5% power.',
    },
    {
      name: 'Luminous Sigil',
      type: 'bonus',
      description: 'Mark enemies with spirit energy.',
      effect: 'Marked enemies take 10% more damage from all Veilborn attacks for 2 turns.',
    },
    {
      name: 'Fade Threshold',
      type: 'passive',
      description: 'The closer to defeat, the stronger they become.',
      effect: 'Veilborn cards below 30% health gain +25% power (risk/reward mechanic).',
    },
    {
      name: 'Circle of Seven',
      type: 'synergy',
      description: 'Unlock the full power of the tribe.',
      effect: 'Having 4+ Veilborn cards in deck unlocks "Spirit Storm" — once per match, deal 50 spirit damage to all enemy cards and reduce their power by 15% for 3 turns. Costs 2 turns to charge.',
    },
  ],
};

export const ALL_TRIBES: Tribe[] = [
  TRIBE_VEILBORN,
];

export function getTribeById(id: string): Tribe | undefined {
  return ALL_TRIBES.find(t => t.id === id);
}

export function getTribeByElement(element: string): Tribe | undefined {
  return ALL_TRIBES.find(t => t.element.toLowerCase() === element.toLowerCase());
}
