import { toDomainStory } from '../articleMapper';
import type { PlatformArticleRecord } from '../../../types/platform';

export function runMapperTests() {
  console.log('--- Running Article Mapper Tests ---');

  // Test 1: Full Schema v2 Article with Localization and Audio
  const mockV2Article: PlatformArticleRecord = {
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

  // Assert English mapping
  const domainEn = toDomainStory(mockV2Article, 'user-123', 'en');
  if (domainEn.id !== 'test-article-v2') throw new Error('ID mismatch');
  if (domainEn.title !== 'Pune’s Matel Motion Raises ₹130 Cr for EV Powertrains') throw new Error('Title mismatch');
  if (domainEn.quickBrief.keyNumber?.value !== '₹130 Cr') throw new Error('KeyNumber mismatch');
  if (domainEn.fullStory.keyStats.length !== 2) throw new Error('KeyStats count mismatch');
  if (domainEn.fullStory.exploreSections.length !== 1) throw new Error('ExploreSections count mismatch');
  if (domainEn.isLiked !== true) throw new Error('isLiked mismatch');
  if (domainEn.isSaved !== true) throw new Error('isSaved mismatch');
  if (domainEn.attribution.isOriginal !== true) throw new Error('isOriginal attribution mismatch');
  if (domainEn.attribution.publisherName !== 'Breakpoint') throw new Error('Original publisher should be Breakpoint');
  if (!domainEn.audioTrack.audioUrl?.includes('en.wav')) throw new Error('Audio URL mismatch');

  // Assert Hindi localization mapping
  const domainHi = toDomainStory(mockV2Article, 'user-123', 'hi');
  if (domainHi.activeLanguage !== 'hi') throw new Error('Active language should be hi');
  if (domainHi.title !== 'पुणे की माटेल मोशन ने ईवी पावरट्रेन के लिए ₹130 करोड़ जुटाए') throw new Error('Hindi title mismatch');
  if (domainHi.quickBrief.headline !== 'माटेल मोशन ने सीरीज बी में ₹130 करोड़ जुटाए') throw new Error('Hindi headline mismatch');
  if (!domainHi.audioTrack.audioUrl?.includes('hi.wav')) throw new Error('Hindi audio URL mismatch');

  // Test 2: External Article Attribution
  const mockExternalArticle: PlatformArticleRecord = {
    id: 'test-external-article',
    title: 'OpenAI Unveils New Autonomous Agent System',
    sourceType: 'external',
    originalPublisher: 'TechCrunch',
    originalSourceUrl: 'https://techcrunch.com/openai-agents',
    authorName: 'Sarah Perez',
  };
  const domainExt = toDomainStory(mockExternalArticle);
  if (domainExt.attribution.isOriginal !== false) throw new Error('External article marked as original');
  if (domainExt.attribution.publisherName !== 'TechCrunch') throw new Error('Publisher name mismatch');
  if (domainExt.attribution.sourceUrl !== 'https://techcrunch.com/openai-agents') throw new Error('Source URL mismatch');

  // Test 3: Graceful Legacy Fallback (Missing Schema v2 fields)
  const mockLegacyArticle: PlatformArticleRecord = {
    id: 'test-legacy-article',
    title: 'Legacy Tech Story',
    description: 'A legacy article summary from version 1.',
  };
  const domainLegacy = toDomainStory(mockLegacyArticle);
  if (domainLegacy.quickBrief.headline !== 'Legacy Tech Story') throw new Error('Legacy headline fallback failed');
  if (domainLegacy.quickBrief.quickSummary !== 'A legacy article summary from version 1.') throw new Error('Legacy summary fallback failed');
  if (domainLegacy.fullStory.whatHappened !== 'A legacy article summary from version 1.') throw new Error('Legacy whatHappened fallback failed');

  console.log('✅ ALL ARTICLE MAPPER TESTS PASSED SUCCESSFULLY!');
  return true;
}
