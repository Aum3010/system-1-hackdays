import type { ObjectAnalysis } from '@/types/object';
import type { CharacterDecision } from '@/types/game';
import type { DecisionEngine } from './DecisionEngine';
import { CharacterDecisionSchema } from '@/lib/validation/schemas';

const traitCriteria = {
  very_low: 'Minimal tendency', low: 'Below average tendency', medium: 'Average tendency',
  high: 'Above average tendency', very_high: 'Exceptional tendency',
};
const choice = (instructions: string, criteria: Record<string, string>) => ({ type: 'choice', instructions, criteria });
const configuredTimeout = () => {
  const value = Number(process.env.LAYA_TIMEOUT_MS || 2500);
  return Number.isFinite(value) ? Math.max(250, Math.min(15000, value)) : 2500;
};

/** Legacy one-shot adapter (all six answers from Laya). The service now defaults to LayaProfileEngine,
 * because live tests showed this class question returns "balanced" for almost every object.
 * Laya is a typed decision model, not a text-generation endpoint.
 * Protocol: https://huggingface.co/convaiinnovations/laya#self-hosting-jev-compatible-http-server
 */
export const LAYA_QUESTIONS = {
  combatClass: choice('Choose the most fitting game combat style for this physical object.', {
    tank: 'Heavy durable defensive object', fighter: 'Sturdy sharp or mechanical attacker',
    speedster: 'Light mobile aerodynamic object', trickster: 'Small flexible unusual object',
    balanced: 'No strong physical specialization', glass_cannon: 'Powerful but fragile object', support: 'Protective or nurturing object',
  }),
  primaryType: choice('Choose the elemental affinity of this object.', {
    heat: 'Heating, fire or hot drinks', water: 'Water, liquid containers or rain',
    electric: 'Electronics and electricity', nature: 'Plants, wood, natural fibers or food',
    metal: 'Metal structures and mechanical tools', chaos: 'Other unusual objects',
  }),
  attackTier: choice('Rate attack tendency based on sharpness and physical function.', traitCriteria),
  defenseTier: choice('Rate defensive tendency based on durability versus fragility.', traitCriteria),
  healthTier: choice('Rate stamina tendency based on weight, size and sturdiness.', traitCriteria),
  speedTier: choice('Rate speed tendency based on mobility, flexibility and low weight.', traitCriteria),
};

export class LayaDecisionEngine implements DecisionEngine {
  constructor(
    private endpoint = process.env.LAYA_ENDPOINT,
    private token = process.env.LAYA_API_KEY || process.env.HUGGINGFACE_API_TOKEN,
    private timeoutMs = configuredTimeout(),
  ) {}

  async classify(analysis: ObjectAnalysis): Promise<CharacterDecision> {
    if (!this.endpoint) throw new Error('Laya endpoint not configured');
    const url = new URL(this.endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid Laya endpoint');
    if (url.pathname === '/' || url.pathname === '') url.pathname = '/v1/systemone';
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const request = async () => {
      const response = await fetch(url, {
        method: 'POST', cache: 'no-store', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
        body: JSON.stringify({
          state: { object: analysis.objectName, category: analysis.category, materials: analysis.materials, ...analysis.properties },
          questions: LAYA_QUESTIONS,
        }),
      });
      if (!response.ok) throw new Error(`Laya returned HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('answers' in data) || !data.answers || typeof data.answers !== 'object') {
        throw new Error('Invalid Laya response');
      }
      const answers = data.answers as Record<string, unknown>;
      const fields = Object.fromEntries(Object.keys(LAYA_QUESTIONS).map(key => {
        const answer = answers[key];
        return [key, answer && typeof answer === 'object' && 'choice' in answer ? answer.choice : undefined];
      }));
      return CharacterDecisionSchema.parse({ ...fields, decisionProvider: 'laya' });
    };
    try {
      return await Promise.race([
        request(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => { abort.abort(); reject(new Error('Laya timed out')); }, this.timeoutMs);
        }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
  }
}
