import { z } from 'zod';

/** Short text field: trims, and truncates on the server if the model overshoots the cap. */
export const capped = (max: number) => z.string().trim().min(1).overwrite(s => s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s).describe(`at most ${max} characters`);

export const ANNOUNCER_EVENTS = ['reveal', 'counter', 'guardBroken', 'special', 'mirror', 'bothGuard', 'bigHit', 'comeback', 'ko', 'victory'] as const;
export type AnnouncerEvent = typeof ANNOUNCER_EVENTS[number];
const bankLines = z.array(capped(110)).min(2).max(3).describe('Use only the placeholders {self}, {opponent}, {move}.');

export const loreSchema = z.object({
  corporateTitle: capped(70).describe('8 words or fewer'),
  linkedInHeadline: capped(150).describe('20 words or fewer'),
  yearsAtCompany: capped(70),
  originQuestion: capped(120).describe('ONE kind icebreaker question for the owner about this object'),
  standupUpdate: z.object({ yesterday: capped(100), today: capped(100), blockers: capped(100) }),
  jargonSpecial: z.object({ name: capped(40), flavor: capped(120) }),
  announcerBank: z.object(Object.fromEntries(ANNOUNCER_EVENTS.map(e => [e, bankLines])) as Record<AnnouncerEvent, typeof bankLines>),
  trashTalk: z.array(capped(120)).min(3).max(3),
});
export type LorePack = z.infer<typeof loreSchema>;
