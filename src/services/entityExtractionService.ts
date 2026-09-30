import type { NormalizedEntity } from '../types/domain';

// Canonical entity dictionary mapping aliases to canonical IDs and names
const CANONICAL_ENTITIES: Record<string, { id: string; name: string; type: NormalizedEntity['type']; aliases: string[] }> = {
  // Companies & Startups
  'ent_openai': {
    id: 'ent_openai',
    name: 'OpenAI',
    type: 'company',
    aliases: ['openai', 'open ai', 'openai inc', 'chatgpt', 'gpt-5.6', 'gpt5', 'gpt4'],
  },
  'ent_nvidia': {
    id: 'ent_nvidia',
    name: 'NVIDIA',
    type: 'company',
    aliases: ['nvidia', 'nvidia corp', 'nvidia corporation', 'jensen huang'],
  },
  'ent_ather_energy': {
    id: 'ent_ather_energy',
    name: 'Ather Energy',
    type: 'company',
    aliases: ['ather', 'ather energy', 'konarc', 'ather konarc', 'konarc ev'],
  },
  'ent_vigyanlabs': {
    id: 'ent_vigyanlabs',
    name: 'Vigyanlabs',
    type: 'company',
    aliases: ['vigyanlabs', 'vigyanlabs innovation', 'femto', 'femto sovereign ai'],
  },
  'ent_npci': {
    id: 'ent_npci',
    name: 'NPCI',
    type: 'organization',
    aliases: ['npci', 'national payments corporation of india', 'upi', 'bhim', 'fimi banking', 'ainxt', 'atom'],
  },
  'ent_coforge': {
    id: 'ent_coforge',
    name: 'Coforge',
    type: 'company',
    aliases: ['coforge', 'coforge ai', 'value gates framework'],
  },
  'ent_isro': {
    id: 'ent_isro',
    name: 'ISRO',
    type: 'organization',
    aliases: ['isro', 'indian space research organisation', 'in-space', 'gslv-f17', 'semi-cryogenic', 'eos-05', 'navic', 'nvs-03'],
  },
  'ent_fuel_cycle': {
    id: 'ent_fuel_cycle',
    name: 'Fuel Cycle',
    type: 'company',
    aliases: ['fuel cycle', 'fuel cycle india', 'fuelcycle'],
  },
  'ent_salesforce': {
    id: 'ent_salesforce',
    name: 'Salesforce',
    type: 'company',
    aliases: ['salesforce', 'agentforce', 'salesforce india'],
  },
  'ent_google': {
    id: 'ent_google',
    name: 'Google',
    type: 'company',
    aliases: ['google', 'google cloud', 'gemini 3.7', 'gemini 3.7 flash', 'deepmind'],
  },
  'ent_meta': {
    id: 'ent_meta',
    name: 'Meta',
    type: 'company',
    aliases: ['meta', 'meta ai', 'muse code', 'muse glimmer', 'llama'],
  },
  'ent_sarvam_ai': {
    id: 'ent_sarvam_ai',
    name: 'Sarvam AI',
    type: 'company',
    aliases: ['sarvam', 'sarvam ai', 'sarvam.ai', 'bulbul', 'bulbul:v3'],
  },
  'ent_bharatgpt': {
    id: 'ent_bharatgpt',
    name: 'BharatGPT',
    type: 'organization',
    aliases: ['bharatgpt', 'hanooman', 'hanooman indic', 'seetha ai'],
  },
  'ent_matel_motion': {
    id: 'ent_matel_motion',
    name: 'Matel Motion',
    type: 'company',
    aliases: ['matel motion', 'matel', 'magnetless powertrain'],
  },
  'ent_tsmc': {
    id: 'ent_tsmc',
    name: 'TSMC',
    type: 'company',
    aliases: ['tsmc', 'taiwan semiconductor', 'tata-tsmc'],
  },
  'ent_tata_electronics': {
    id: 'ent_tata_electronics',
    name: 'Tata Electronics',
    type: 'company',
    aliases: ['tata electronics', 'tata', 'dholera semiconductor fab'],
  },
  'ent_tcs': {
    id: 'ent_tcs',
    name: 'TCS',
    type: 'company',
    aliases: ['tcs', 'tata consultancy services', 'tcs hypervault'],
  },
  'ent_cdac': {
    id: 'ent_cdac',
    name: 'C-DAC',
    type: 'organization',
    aliases: ['c-dac', 'cdac', 'param vidya', 'param shavak-qs', 'ioncology.ai', 'param rudra'],
  },
  'ent_aiims': {
    id: 'ent_aiims',
    name: 'AIIMS',
    type: 'organization',
    aliases: ['aiims', 'aiims delhi', 'all india institute of medical sciences'],
  },
  'ent_brics': {
    id: 'ent_brics',
    name: 'BRICS',
    type: 'organization',
    aliases: ['brics', 'brics new delhi declaration', 'brics summit', 'brics ai', 'brics pay'],
  },
  'ent_rbi': {
    id: 'ent_rbi',
    name: 'Reserve Bank of India',
    type: 'organization',
    aliases: ['rbi', 'reserve bank of india'],
  },
  'ent_sebi': {
    id: 'ent_sebi',
    name: 'SEBI',
    type: 'organization',
    aliases: ['sebi', 'securities and exchange board of india', 'sebi techsprint'],
  },
  'ent_meity': {
    id: 'ent_meity',
    name: 'MeitY',
    type: 'organization',
    aliases: ['meity', 'ministry of electronics and information technology', 'indiaai', 'indiaai mission'],
  },
  'ent_bhashini': {
    id: 'ent_bhashini',
    name: 'BHASHINI',
    type: 'organization',
    aliases: ['bhashini', 'vyoma challenge', 'bharatgen', 'ai4bharat'],
  },
  'ent_indo_russia_hub': {
    id: 'ent_indo_russia_hub',
    name: 'India-Russia Technology Hub',
    type: 'organization',
    aliases: ['indo-russia technology hub', 'india-russia technology hub', 'indo-russia tech hub', 'india-russia tech hub'],
  },


  // Key Geographic Hubs
  'ent_loc_navi_mumbai': {
    id: 'ent_loc_navi_mumbai',
    name: 'Navi Mumbai',
    type: 'location',
    aliases: ['navi mumbai'],
  },
  'ent_loc_bengaluru': {
    id: 'ent_loc_bengaluru',
    name: 'Bengaluru',
    type: 'location',
    aliases: ['bengaluru', 'bangalore'],
  },
  'ent_loc_hyderabad': {
    id: 'ent_loc_hyderabad',
    name: 'Hyderabad',
    type: 'location',
    aliases: ['hyderabad', 'telangana'],
  },
  'ent_loc_gujarat': {
    id: 'ent_loc_gujarat',
    name: 'Gujarat',
    type: 'location',
    aliases: ['gujarat', 'gandhinagar', 'ahmedabad', 'dholera'],

  },
  'ent_loc_pune': {
    id: 'ent_loc_pune',
    name: 'Pune',
    type: 'location',
    aliases: ['pune', 'maharashtra'],
  },
};

// Event Action / Predicate patterns for story event alignment
export const EVENT_PREDICATES = [
  { type: 'launch', terms: ['launch', 'launches', 'unveil', 'unveils', 'introduce', 'introduces', 'releases', 'debut'] },
  { type: 'expansion', terms: ['expand', 'expands', 'expansion', 'opens', 'opening', 'hub', 'centre', 'gcc', 'facility'] },
  { type: 'funding', terms: ['raise', 'raises', 'funding', 'fund', 'invest', 'investment', 'secures', 'valuation'] },
  { type: 'partnership', terms: ['partner', 'partners', 'partnering', 'signs', 'mou', 'agreements', 'tie-up', 'collaboration'] },
  { type: 'testing_milestone', terms: ['tests', 'testing', 'flight', 'flies', 'thrust', 'validation', 'trial', 'manoeuvre'] },
  { type: 'policy_regulation', terms: ['policy', 'declaration', 'framework', 'guideline', 'warns', 'rules', 'clearance', 'approves'] },
  { type: 'legal_dispute', terms: ['court', 'ruling', 'copyright', 'stay', 'ani vs openai', 'sues', 'lawsuit'] },
];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'and', 'or', 'but', 'if', 'then', 'else',
  'when', 'up', 'down', 'out', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'its', 'their',
  'across', 'into', 'about', 'first', 'time', 'says', 'plans', 'moves', 'sets', 'adds'
]);

/**
 * Normalizes an arbitrary text string into lowercase informative alphanumeric token array.
 */
export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Extracts normalized entities from text (headline, summary, content).
 */
export function extractEntities(text: string): NormalizedEntity[] {
  const normalizedText = ` ${text.toLowerCase()} `;
  const matchedEntities = new Map<string, NormalizedEntity>();

  // 1. Match known canonical entities
  for (const entity of Object.values(CANONICAL_ENTITIES)) {
    for (const alias of entity.aliases) {
      // Use regex with word boundary
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      if (regex.test(normalizedText)) {
        matchedEntities.set(entity.id, {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          aliases: entity.aliases,
        });
        break;
      }
    }
  }

  // 2. Extract capitalized noun phrases if no canonical entities were matched
  if (matchedEntities.size === 0) {
    const capitalizedMatches = text.match(/\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\b/g);
    if (capitalizedMatches) {
      const stopWords = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'For', 'With', 'By', 'To', 'From', 'How', 'What', 'Why']);
      for (const phrase of capitalizedMatches.slice(0, 5)) {
        if (!stopWords.has(phrase) && phrase.length > 2) {
          const id = `ent_dyn_${phrase.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          matchedEntities.set(id, {
            id,
            name: phrase,
            type: 'company',
            aliases: [phrase.toLowerCase()],
          });
        }
      }
    }
  }

  return Array.from(matchedEntities.values());
}

/**
 * Detects the dominant event predicate in an article.
 */
export function detectEventPredicate(text: string): string {
  const lower = text.toLowerCase();
  for (const pred of EVENT_PREDICATES) {
    for (const term of pred.terms) {
      if (lower.includes(term)) {
        return pred.type;
      }
    }
  }
  return 'general_development';
}

/**
 * Calculates Jaccard similarity between two sets of normalized entity IDs.
 */
export function calculateEntityJaccard(entitiesA: string[], entitiesB: string[]): number {
  if (entitiesA.length === 0 || entitiesB.length === 0) return 0.0;
  const setA = new Set(entitiesA);
  const setB = new Set(entitiesB);
  let intersectionCount = 0;
  for (const id of setA) {
    if (setB.has(id)) intersectionCount++;
  }
  const unionCount = new Set([...entitiesA, ...entitiesB]).size;
  return unionCount === 0 ? 0.0 : intersectionCount / unionCount;
}
