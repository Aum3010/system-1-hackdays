import { Briefcase, LoaderCircle } from 'lucide-react';
import type { GameCharacter } from '@/types/game';

/** Lore Pack panel on the reveal screen. Text only; purely cosmetic. */
export function HrFile({ character, originAnswer, onOriginAnswer }: { character: GameCharacter; originAnswer: string; onOriginAnswer: (answer: string) => void }) {
  const lore = character.lore;
  if (!lore) return <div className="hr-file is-loading" role="status"><LoaderCircle size={14} className="spin"/>HR is drafting this fighter’s personnel file…</div>;
  return <section className="hr-file" aria-label="Personnel file">
    <p className="mono"><Briefcase size={12}/>PERSONNEL FILE{character.loreSource === 'fallback' ? ' · STANDARD ISSUE' : ''}</p>
    <strong className="hr-title">{lore.corporateTitle}</strong>
    <p className="hr-headline">{lore.linkedInHeadline}</p>
    <p className="hr-tenure">{lore.yearsAtCompany}</p>
    <dl className="hr-standup">
      <div><dt>Yesterday</dt><dd>{lore.standupUpdate.yesterday}</dd></div>
      <div><dt>Today</dt><dd>{lore.standupUpdate.today}</dd></div>
      <div><dt>Blockers</dt><dd>{lore.standupUpdate.blockers}</dd></div>
    </dl>
    <label className="hr-origin"><span>{lore.originQuestion}</span>
      <input maxLength={120} placeholder="Optional answer (kept for this session only)" value={originAnswer} onChange={e => onOriginAnswer(e.target.value)}/>
    </label>
  </section>;
}
