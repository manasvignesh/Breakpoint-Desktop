import type { PlatformArticleRecord } from '../types/platform';
import type { StructuredFact } from '../types/timeline';

/**
 * Normalizes text to lower-case alphanumeric tokens for subject matching.
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Extracts structured, typed facts from a published article record.
 */
export function extractStructuredFacts(article: PlatformArticleRecord): StructuredFact[] {
  const facts: StructuredFact[] = [];
  const articleId = article.id;
  const observedAt = (typeof article.publishedAt === 'string'
    ? article.publishedAt
    : (typeof article.createdAt === 'string' ? article.createdAt : new Date().toISOString()));

  const seenSubjects = new Set<string>();

  function addFact(
    subject: string,
    label: string,
    value: string | number,
    category: StructuredFact['category'],
    unit?: string
  ) {
    const key = normalizeKey(subject);
    if (!key || seenSubjects.has(key)) return;
    seenSubjects.add(key);

    facts.push({
      id: `fact_${articleId}_${key}`,
      subject: key,
      label,
      value,
      unit,
      category,
      sourceArticleId: articleId,
      observedAt,
    });
  }

  // 1. Extract from key_number in quick_brief
  const keyNumber = article.quick_brief?.key_number;
  if (keyNumber && keyNumber.value && keyNumber.label) {
    const label = keyNumber.label.trim();
    const value = keyNumber.value.trim();
    const isLocation = /\b(location|city|hub|state|country)\b/i.test(label);
    const isStatus = /\b(status|stage|phase)\b/i.test(label);
    const category = isLocation ? 'location' : (isStatus ? 'status' : 'metric');
    addFact(label, label, value, category);
  }

  // 2. Extract from key_stats in full_article
  const keyStats = article.full_article?.key_stats;
  if (Array.isArray(keyStats)) {
    for (const stat of keyStats) {
      if (stat && stat.label !== undefined && stat.value !== undefined) {
        const label = String(stat.label).trim();
        const value = String(stat.value).trim();
        const isMetric = /\b(capacity|power|mw|kw|space|size|area|sq\s*ft|count|speed|rate|workforce|amount|valuation|price|funding|investment|headcount|duration|seconds)\b/i.test(label);
        const isStatus = /\b(status|approval|distribution|stage|phase|clearance)\b/i.test(label);
        const isLocation = /\b(location|city|facility|hub|headquarters|state|country)\b/i.test(label);
        const isDate = /\b(date|timeline|deadline|target\s*date|schedule)\b/i.test(label);

        const category: StructuredFact['category'] = isMetric
          ? 'metric'
          : (isStatus
            ? 'status'
            : (isLocation
              ? 'location'
              : (isDate ? 'date' : 'metric')));

        addFact(label, label, value, category);
      }
    }
  }

  // 3. Extract metrics and facts from text fields (headline, what_happened, why_this_matters, takeaways)
  const textCorpus = [
    article.title || '',
    article.quick_brief?.headline || '',
    article.quick_brief?.quick_summary || '',
    article.full_article?.what_happened || '',
    article.full_article?.why_this_matters || '',
    ...(article.quick_brief?.three_things_to_know || []),
    ...(article.full_article?.takeaways || []),
  ].join(' ');

  // 3a. Workforce / Employees: e.g. "50 employees", "120 workforce", "headcount of 350", "hiring 200 engineers"
  const workforceMatch = textCorpus.match(/(?:workforce|headcount|employees?|engineers?|team size)\s*(?:of|to|target|reached)?\s*[:]?\s*(\d+[\d,]*)/i)
    || textCorpus.match(/(\d+[\d,]*)\s*(?:employees|engineers|staff|personnel)/i);
  if (workforceMatch && workforceMatch[1]) {
    const num = parseInt(workforceMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 10000000) {
      addFact('workforce_target', 'Planned Workforce', num, 'metric', 'employees');
    }
  }

  // 3b. Investment / Funding / Capital: e.g. "₹130 crore", "$4.5 million", "Rs 500 cr", "$200M"
  const currencyMatch = textCorpus.match(/(₹|Rs\.?|INR|\$)\s*(\d+(?:\.\d+)?)\s*(crore|cr|million|m|billion|b|lakh)?/i);
  if (currencyMatch) {
    const symbol = currencyMatch[1];
    const val = currencyMatch[2];
    const unit = (currencyMatch[3] || '').toLowerCase();
    const fullVal = `${symbol}${val} ${unit}`.trim();
    addFact('investment_amount', 'Investment / Capital', fullVal, 'metric');
  }

  // 3c. Specific locations / Facilities: e.g. "Hyderabad", "Navi Mumbai", "Pune", "Bengaluru", "Chennai", "Noida"
  const locationMatches = ['Hyderabad', 'Navi Mumbai', 'Pune', 'Bengaluru', 'Bangalore', 'Chennai', 'Noida', 'Gurugram', 'Gurgaon', 'Mumbai', 'Ahmedabad', 'California', 'San Francisco', 'Taiwan', 'Tokyo', 'London'];
  const foundLocations: string[] = [];
  for (const loc of locationMatches) {
    const regex = new RegExp(`\\b${loc}\\b`, 'i');
    if (regex.test(textCorpus)) {
      foundLocations.push(loc);
    }
  }
  if (foundLocations.length > 0) {
    addFact('primary_location', 'Primary Facility Location', foundLocations[0], 'location');
    if (foundLocations.length > 1) {
      addFact('secondary_location', 'Expansion Location', foundLocations[1], 'location');
    }
  }

  // 3d. Status keywords (operational, launched, approved, commissioned, testing, expanding, acquired)
  const statusKeywords = [
    { regex: /\b(commissioned|operational|inaugurated)\b/i, val: 'operational', label: 'Operational' },
    { regex: /\b(approved|sanctioned|cleared)\b/i, val: 'approved', label: 'Approved' },
    { regex: /\b(testing|hot test|trials)\b/i, val: 'testing', label: 'In Testing' },
    { regex: /\b(expanding|expansion|scaling)\b/i, val: 'expanding', label: 'Expanding' },
    { regex: /\b(launched|unveiled|rolled out)\b/i, val: 'launched', label: 'Launched' },
  ];
  for (const sk of statusKeywords) {
    if (sk.regex.test(textCorpus)) {
      addFact('operational_status', 'Operational Status', sk.label, 'status');
      break;
    }
  }

  // 3e. Product model / platform names (e.g. Konarc, FEMTO, PARAM Rudra, 123Pay, Bharat BillPay)
  const productMatches = [
    { name: 'Konarc', label: 'Platform Architecture' },
    { name: 'FEMTO', label: 'Optimization Engine' },
    { name: 'PARAM Rudra', label: 'Supercomputer System' },
    { name: 'UPI 123Pay', label: 'Payment Protocol' },
    { name: 'Bharat BillPay', label: 'Bill Payment Network' },
    { name: 'BRICS Pay', label: 'Cross-border Payment Network' },
  ];
  for (const p of productMatches) {
    if (textCorpus.toLowerCase().includes(p.name.toLowerCase())) {
      addFact(`product_${normalizeKey(p.name)}`, p.label, p.name, 'other');
    }
  }

  return facts;
}
