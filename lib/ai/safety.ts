/**
 * Server-side safety net applied AFTER schema validation. Deliberately small and conservative:
 * any hit discards the whole Gemini response and the canned fallback is used instead.
 */
const BLOCKED: RegExp[] = [
  /\b(fuck|shit|bitch|bastard|asshole|dick|piss|crap|damn)\w*/i,
  /\b(sex|sexy|nude|naked|porn|horny)\b/i,
  /\b(beer|wine|vodka|whiskey|drunk|hangover|booze|cocktail|weed|cocaine|stoned|high as)\b/i,
  /\b(layoffs?|laid off|fired|firing|severance|salary|salaries|paycheck|hr complaint|lawsuit)\b/i,
  /\b(democrat|republican|election|president|congress|politic\w*|religio\w*|church|jesus|allah)\b/i,
  /\b(cancer|disease|diabet\w*|depress\w*|suicid\w*|anorexi\w*|trauma\w*|blood\w*|bruis\w*|wound\w*|hospital\w*)\b/i,
  /\b(fat|ugly|old man|old lady|boomer|gay|lesbian|trans\b|racist|ethnic\w*)\b/i,
  /\b(kill yourself|die in|stupid|idiot|moron|dumb)\b/i,
];

export function findUnsafe(value: unknown): string | null {
  if (typeof value === 'string') return BLOCKED.some(pattern => pattern.test(value)) ? value : null;
  if (Array.isArray(value)) { for (const item of value) { const hit = findUnsafe(item); if (hit) return hit; } return null; }
  if (value && typeof value === 'object') { for (const item of Object.values(value)) { const hit = findUnsafe(item); if (hit) return hit; } }
  return null;
}
