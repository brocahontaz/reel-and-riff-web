/**
 * NPC dialogue content for the overworld slice. Ids match the world's npc ids.
 */

export type NpcDialogue = { id: string; name: string; lines: string[] };

export const NPC_DIALOGUES: NpcDialogue[] = [
  {
    id: 'marlin',
    name: 'Old Marlin',
    lines: [
      "Morning, kid. The lake's calm today — the fish can hear your footsteps, so walk soft.",
      'See the dock? Press E at the very end of it. Deep water past the planks holds shy fish.',
      'Cast far and rare fish notice. Short casts catch breakfast, long casts catch stories.',
      'Coins buy better rods, and better rods bring up better fish. Simple math.',
      "If the line hums, ease off. If it sings, reel. You'll learn the difference the wet way.",
    ],
  },
  {
    id: 'june',
    name: 'June',
    lines: [
      "Oh hey, you found the hall! It's dead quiet right now — quiet as a closed tackle box.",
      'The stage stays dark until the band shows up. Musicians keep odd hours, trust me.',
      "There's a guitar mat back in your cabin. Honest fingers need daily practice, trust me.",
      'When the band finally plays, you want every chord in your hands and none in your way.',
      "Come find me when the lights come on. I'll save you a spot by the speakers.",
    ],
  },
];

export const dialogueFor = (npcId: string): NpcDialogue | undefined =>
  NPC_DIALOGUES.find((dialogue) => dialogue.id === npcId);
