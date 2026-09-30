import React, { useEffect, useState } from 'react';
import { Sparkles, HelpCircle, Compass, MessageSquare } from 'lucide-react';

interface TextSelectionToolbarProps {
  onAction: (actionType: 'explain' | 'why_it_matters' | 'background' | 'ask', text: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  onAction,
  containerRef,
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setPosition(null);
        setSelectedText('');
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 3) {
        setPosition(null);
        return;
      }

      // Ensure selection is inside our container
      if (containerRef.current && !containerRef.current.contains(selection.anchorNode)) {
        setPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      setPosition({
        top: rect.top + window.scrollY - 48,
        left: Math.max(16, rect.left + window.scrollX + rect.width / 2 - 160),
      });
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [containerRef]);

  if (!position || !selectedText) return null;

  return (
    <div
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-50 flex items-center gap-1 p-1 bg-[#12141A]/95 backdrop-blur-md border border-[#FF5A1F]/50 rounded-xl shadow-2xl shadow-black animate-fadeIn select-none"
    >
      <button
        onClick={() => onAction('explain', selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#F0F3F6] hover:bg-[#181B22] hover:text-[#FF5A1F] transition"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#FF5A1F]" />
        <span>Explain</span>
      </button>

      <div className="w-[1px] h-3.5 bg-[#232734]" />

      <button
        onClick={() => onAction('why_it_matters', selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#F0F3F6] hover:bg-[#181B22] hover:text-[#FF5A1F] transition"
      >
        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
        <span>Why it matters</span>
      </button>

      <div className="w-[1px] h-3.5 bg-[#232734]" />

      <button
        onClick={() => onAction('background', selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#F0F3F6] hover:bg-[#181B22] hover:text-[#FF5A1F] transition"
      >
        <Compass className="w-3.5 h-3.5 text-emerald-400" />
        <span>Background</span>
      </button>

      <div className="w-[1px] h-3.5 bg-[#232734]" />

      <button
        onClick={() => onAction('ask', selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#F0F3F6] hover:bg-[#181B22] hover:text-[#FF5A1F] transition"
      >
        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
        <span>Ask</span>
      </button>
    </div>
  );
};
