import type { LorePack, AnnouncerEvent } from '../validation/lore';
import { JARGON, type JargonRuleId } from '../game/jargon';

/**
 * Canned, still-funny flavor used whenever Gemini is unavailable, slow, invalid or unsafe.
 * The demo is fully playable with GEMINI_API_KEY unset.
 */
type Category = 'electronics' | 'container' | 'office' | 'kitchen' | 'soft' | 'general';
export function categoryOf(text: string, electronic = false): Category {
  const t = text.toLowerCase();
  if (electronic || /laptop|phone|charger|keyboard|mouse|tablet|monitor|electronic/.test(t)) return 'electronics';
  if (/bottle|mug|cup|flask|jar|thermos|container|drink/.test(t)) return 'container';
  if (/staple|pen|pencil|paper|tape|clip|office|notebook|scissor/.test(t)) return 'office';
  if (/spoon|fork|pan|kettle|kitchen|plate|bowl|toaster/.test(t)) return 'kitchen';
  if (/pillow|plush|towel|sock|blanket|cushion/.test(t)) return 'soft';
  return 'general';
}

const TITLES: Record<Category, (o: string) => string> = {
  electronics: o => `Principal ${o} Uptime Evangelist`,
  container: o => `Head of ${o} Hydration Strategy`,
  office: o => `Senior ${o} Consolidation Specialist`,
  kitchen: o => `VP of ${o} Culinary Synergy`,
  soft: o => `Chief ${o} Comfort Officer`,
  general: o => `Associate Director of ${o} Operations`,
};
const TENURE: Record<Category, string> = {
  electronics: '4 years at Charging Cable Holdings', container: '6 years at Desk Drawer Inc.', office: '11 years at Supply Closet LLC',
  kitchen: '3 years at Break Room Ventures', soft: '7 years at Couch Cushion Partners', general: '5 years at Miscellaneous Shelf Co.',
};

const BANK: Record<AnnouncerEvent, string[]> = {
  reveal: ['{self} has entered the conference room.', 'Please welcome {self}, fresh from a very long onboarding.'],
  counter: ['{self} saw that {move} coming in last quarter’s forecast.', '{self} blocks it and replies-all with violence.'],
  guardBroken: ['{self} bulldozes straight through {opponent}’s boundaries.', 'That guard has been deprecated by {self}.'],
  special: ['{self} escalates this to leadership.', '{self} unleashes a {move} that was never on the roadmap.'],
  mirror: ['Both fighters chose {move}. Alignment achieved, unfortunately.', 'Synergy detected. It hurts.'],
  bothGuard: ['Two defensive postures. A very productive meeting about nothing.', 'Both parties agree to revisit this next sprint.'],
  bigHit: ['{self} lands a hit that will show up in the quarterly numbers.', 'That one from {self} needs a follow-up ticket.'],
  comeback: ['{self} refuses to be sunset.', '{self} pivots from the brink. Investors are intrigued.'],
  ko: ['{opponent} has been moved to the archive.', '{self} closes the deal. {opponent} is now a legacy system.'],
  victory: ['{self} is promoted to Champion, effective immediately.', 'All hail {self}, Employee of the Moment.'],
};

export function fallbackLore(input: { objectName: string; materials: string[]; electronic: boolean; jargon: JargonRuleId; ownerName?: string }): LorePack {
  const object = input.objectName.replace(/\b\w/g, c => c.toUpperCase());
  const material = input.materials[0] ?? 'mystery material';
  const category = categoryOf(`${input.objectName} ${input.materials.join(' ')}`, input.electronic);
  return {
    corporateTitle: TITLES[category](object).slice(0, 70),
    linkedInHeadline: `Turning ${material} into measurable outcomes. Open to synergy. Not open to being misplaced.`,
    yearsAtCompany: TENURE[category],
    originQuestion: `Where did you and this ${input.objectName.toLowerCase()} first meet?`,
    standupUpdate: {
      yesterday: `Sat perfectly still. Stakeholders were impressed.`,
      today: `Defending my ${material} reputation in the arena.`,
      blockers: 'Someone keeps moving me to a different desk.',
    },
    jargonSpecial: { name: JARGON[input.jargon].defaultName, flavor: `A move so corporate it has its own calendar invite.` },
    announcerBank: BANK,
    trashTalk: [
      `My ${material} has survived more reorgs than you have.`,
      `I was built for this. Literally, in a factory.`,
      input.ownerName ? `${input.ownerName} believes in me. Mostly.` : 'I have never once been left on read.',
    ],
  };
}
export const FALLBACK_ANNOUNCER = BANK;
