import React from 'react';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: string;
  onChange: (lang: string) => void;
  availableLanguages?: string[];
}

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onChange,
  availableLanguages = ['en', 'hi', 'te'],
}) => {
  return (
    <div className="flex items-center gap-1 bg-[#12141A] border border-[#232734] rounded-xl p-1">
      <Globe className="w-3.5 h-3.5 text-[#8B949E] ml-1.5 mr-0.5" />
      {LANGUAGES.map((lang) => {
        const isSelected = currentLanguage === lang.code;
        const isSupported = availableLanguages.includes(lang.code);

        return (
          <button
            key={lang.code}
            onClick={() => onChange(lang.code)}
            disabled={!isSupported}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              isSelected
                ? 'bg-[#FF5A1F] text-white shadow-sm'
                : isSupported
                  ? 'text-[#8B949E] hover:text-[#F0F3F6] hover:bg-[#181B22]'
                  : 'text-[#8B949E]/40 cursor-not-allowed'
            }`}
            title={`${lang.name} (${lang.native})`}
          >
            {lang.native}
          </button>
        );
      })}
    </div>
  );
};
