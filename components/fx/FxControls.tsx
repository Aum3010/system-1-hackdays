'use client';

import { useState } from 'react';
import { Volume2, VolumeX, FastForward, Flame, UserRound } from 'lucide-react';
import { SPICES, type OwnerInfo, type Spice } from '@/lib/ai/persona';

const TEAMS: NonNullable<OwnerInfo['team']>[] = ['Eng', 'Sales', 'Design', 'Ops', 'Other'];

interface Props {
  skip: boolean; muted: boolean; reducedMotion: boolean; spice: Spice;
  onChange: (patch: { skip?: boolean; muted?: boolean; spice?: Spice }) => void;
  /** Optional, session-only owner details for the player currently scanning. */
  owner?: { player: number; info: OwnerInfo; onChange: (info: OwnerInfo) => void };
}

/** Floating (position: fixed) preferences pill, so it never shifts page layout. */
export function FxControls({ skip, muted, reducedMotion, spice, onChange, owner }: Props) {
  const [ownerOpen, setOwnerOpen] = useState(false);
  return <div className="fx-controls" role="group" aria-label="Animation and sound settings">
    <label className="fx-spice" title="Narrator spice for Gemini flavor text (session setting)">
      <Flame size={13}/>
      <select aria-label="Narrator spice" value={spice} onChange={e => onChange({ spice: e.target.value as Spice })}>
        {SPICES.map(level => <option key={level} value={level}>{level}</option>)}
      </select>
    </label>
    {owner && <button type="button" className={owner.info.name || owner.info.team ? 'is-set' : ''} onClick={() => setOwnerOpen(o => !o)} aria-expanded={ownerOpen} aria-label={`Player ${owner.player} owner details (optional)`}><UserRound size={14}/></button>}
    <label title={reducedMotion ? 'Your system prefers reduced motion, so animations are already skipped.' : undefined}>
      <input type="checkbox" checked={skip || reducedMotion} disabled={reducedMotion} onChange={e => onChange({ skip: e.target.checked })}/>
      <FastForward size={13}/>Skip animations
    </label>
    <button type="button" onClick={() => onChange({ muted: !muted })} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>
      {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
    </button>
    {owner && ownerOpen && <div className="fx-owner" role="dialog" aria-label="Owner details">
      <p><b>Player {owner.player}’s object owner</b> (optional, never saved)</p>
      <input aria-label="Owner first name" placeholder="First name" maxLength={24} value={owner.info.name ?? ''} onChange={e => owner.onChange({ ...owner.info, name: e.target.value || undefined })}/>
      <select aria-label="Owner team" value={owner.info.team ?? ''} onChange={e => owner.onChange({ ...owner.info, team: (e.target.value || undefined) as OwnerInfo['team'] })}>
        <option value="">Team (optional)</option>
        {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
      </select>
      <button type="button" className="text-button" onClick={() => setOwnerOpen(false)}>Done</button>
    </div>}
  </div>;
}
