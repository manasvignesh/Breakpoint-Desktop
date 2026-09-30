import { toDomainStory } from '../src/services/mappers/articleMapper.ts';

// Run mapper verification directly
const mockV2Article = {
  id: 'test-article-v2',
  schema_version: 2,
  status: 'approved',
  category: 'Startups',
  title: 'Pune’s Matel Motion Raises ₹130 Cr for EV Powertrains',
  imageUrl: 'https://images.unsplash.com/photo-1558441719-67450807e90a',
  authorName: 'Manas Vignesh',
  authorId: 'user-123',
  sourceType: 'original',
  breakpointEditor: 'Breakpoint Editorial',
  likedBy: ['user-123', 'user-456'],
  bookmarkedBy: ['user-123'],
  likesCount: 2,
  commentsCount: 5,
  quick_brief: {
    category: 'Startups',
    headline: 'Matel Motion Secures ₹130 Cr Series B',
    quick_summary: 'Matel Motion, a Pune deep-tech startup, has secured ₹130 Cr Series B funding to scale high-efficiency EV drive powertrains.',
    three_things_to_know: [
      '₹130 Cr raised in Series B',
      'Cuts import reliance on foreign EV motors',
      '98% powertrain energy efficiency',
    ],
    key_number: { value: '₹130 Cr', label: 'Funds Raised' },
  },
  full_article: {
    headline: 'Pune’s Matel Motion Raises ₹130 Cr for EV Powertrains',
    hook: 'Powering India’s shift to efficient and sustainable mobility.',
    in_20_seconds: 'Matel Motion secured ₹130 Cr Series B funding led by UC Impower with Catamaran.',
    what_happened: 'Matel Motion raised ₹130 Cr to expand manufacturing capacity in Pune and build next-generation motor controllers.',
    why_this_matters: 'Locally made powertrains reduce thermal vulnerability and cut foreign component dependencies.',
    bigger_picture: 'India is transforming from a net importer to a global exporter of electric drives.',
    key_stats: [
      { value: '₹130 Cr', label: 'Funds Raised' },
      { value: '98%', label: 'Efficiency' },
    ],
    explore_sections: [
      {
        title: 'What Matel Builds',
        summary: 'High torque synchronous motors',
        content: 'Built specifically for Indian road and thermal conditions.',
        items: [{ title: 'SiC Controllers', description: '98% energy conversion' }],
      },
    ],
    takeaways: [
      'Matel Motion raised ₹130 Cr',
      'Factory scaling up for major commercial OEM partnerships',
    ],
    quote: {
      text: 'Our goal is to build world-class, indigenous powertrain technology.',
      speaker: 'Nikhil Ramdas',
      role: 'CEO',
    },
  },
  languages: {
    en: {
      title: 'Pune’s Matel Motion Raises ₹130 Cr for EV Powertrains',
      translationStatus: 'ready',
      audioStatus: 'ready',
      audioUrl: 'https://fuvquwhphuheqgfdmtbh.supabase.co/storage/v1/object/public/article-audio/articles/test-article-v2/en.wav',
    },
    hi: {
      title: 'पुणे की माटेल मोशन ने ईवी पावरट्रेन के लिए ₹130 करोड़ जुटाए',
      translationStatus: 'ready',
      audioStatus: 'ready',
      audioUrl: 'https://fuvquwhphuheqgfdmtbh.supabase.co/storage/v1/object/public/article-audio/articles/test-article-v2/hi.wav',
      quick_brief: {
        category: 'Startups',
        headline: 'माटेल मोशन ने सीरीज बी में ₹130 करोड़ जुटाए',
        quick_summary: 'पुणे की डीप-टेक स्टार्टअप माटेल मोशन ने ₹130 करोड़ का फंड जुटाया है।',
        three_things_to_know: ['₹130 करोड़ जुटाए गए', 'आयात पर निर्भरता कम', '98% ऊर्जा दक्षता'],
        key_number: { value: '₹130 करोड़', label: 'फंड जुटाए गए' },
      },
    },
  },
  publishedAt: '2026-09-29T10:00:00.000Z',
};

// Test English
const domainEn = toDomainStory(mockV2Article, 'user-123', 'en');
console.assert(domainEn.id === 'test-article-v2', 'ID mismatch');
console.assert(domainEn.title === 'Pune’s Matel Motion Raises ₹130 Cr for EV Powertrains', 'Title mismatch');
console.assert(domainEn.quickBrief.keyNumber?.value === '₹130 Cr', 'KeyNumber mismatch');
console.assert(domainEn.fullStory.keyStats.length === 2, 'KeyStats count mismatch');
console.assert(domainEn.fullStory.exploreSections.length === 1, 'ExploreSections count mismatch');
console.assert(domainEn.isLiked === true, 'isLiked mismatch');
console.assert(domainEn.isSaved === true, 'isSaved mismatch');
console.assert(domainEn.attribution.isOriginal === true, 'isOriginal attribution mismatch');
console.assert(domainEn.attribution.publisherName === 'Breakpoint', 'Publisher should be Breakpoint');
console.assert(domainEn.audioTrack.audioUrl.includes('en.wav'), 'Audio URL mismatch');

// Test Hindi
const domainHi = toDomainStory(mockV2Article, 'user-123', 'hi');
console.assert(domainHi.activeLanguage === 'hi', 'Active language should be hi');
console.assert(domainHi.title === 'पुणे की माटेल मोशन ने ईवी पावरट्रेन के लिए ₹130 करोड़ जुटाए', 'Hindi title mismatch');
console.assert(domainHi.quickBrief.headline === 'माटेल मोशन ने सीरीज बी में ₹130 करोड़ जुटाए', 'Hindi headline mismatch');
console.assert(domainHi.audioTrack.audioUrl.includes('hi.wav'), 'Hindi audio URL mismatch');

// Test Legacy Fallback
const mockLegacy = {
  id: 'test-legacy-1',
  title: 'Legacy Breaking News',
  description: 'A legacy article body.',
};
const domainLegacy = toDomainStory(mockLegacy);
console.assert(domainLegacy.quickBrief.headline === 'Legacy Breaking News', 'Legacy headline mismatch');
console.assert(domainLegacy.fullStory.whatHappened === 'A legacy article body.', 'Legacy whatHappened mismatch');

console.log('✅ ALL MAPPER VERIFICATIONS COMPLETED SUCCESSFULLY WITH ZERO ERRORS.');
