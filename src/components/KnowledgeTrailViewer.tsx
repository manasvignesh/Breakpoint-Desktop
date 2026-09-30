import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import type { KnowledgeTrail } from '../types/knowledge';
import { userKnowledgeService } from '../services/userKnowledgeService';

interface KnowledgeTrailViewerProps {
  trail: KnowledgeTrail;
  userId?: string;
  onSelectConcept?: (conceptId: string) => void;
  onClose?: () => void;
}

export const KnowledgeTrailViewer: React.FC<KnowledgeTrailViewerProps> = ({
  trail,
  userId,
  onSelectConcept,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!userId || !trail?.id) return;

    const unsubscribe = userKnowledgeService.subscribeToTrailProgress(
      userId,
      trail.id,
      (progress) => {
        if (progress) {
          setCompletedStepIds(progress.completedStepIds || []);
          if (progress.completedAt) {
            setIsCompleted(true);
          }
          if (typeof progress.currentStep === 'number' && progress.currentStep >= 1) {
            const stepIdx = Math.min(progress.currentStep - 1, trail.steps.length - 1);
            setCurrentStepIndex(stepIdx);
          }
        }
      },
      console.warn
    );

    return () => unsubscribe();
  }, [userId, trail]);

  if (!trail || !trail.steps || trail.steps.length === 0) {
    return null;
  }

  const currentStep = trail.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === trail.steps.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      if (userId) {
        await userKnowledgeService.updateTrailProgress(
          userId,
          trail.id,
          trail.steps.length,
          currentStep.conceptId,
          true
        );
        setIsCompleted(true);
      }
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      if (userId) {
        await userKnowledgeService.updateTrailProgress(
          userId,
          trail.id,
          nextIndex + 1,
          currentStep.conceptId,
          false
        );
      }
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="bg-[#12141A] border border-[#232734] rounded-2xl p-5 shadow-xl animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#232734]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#FF5A1F] flex items-center gap-1.5">
              Knowledge Trail
              {isCompleted && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white leading-tight">
              {trail.title}
            </h4>
          </div>
        </div>

        <div className="text-xs text-[#8B949E] font-medium">
          Step <span className="text-white font-bold">{currentStepIndex + 1}</span> of {trail.steps.length}
        </div>
      </div>

      {/* Sequential Stepper Pills */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {trail.steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isPassed = idx < currentStepIndex || completedStepIds.includes(step.conceptId);

          return (
            <button
              key={step.conceptId + '_' + idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`flex-1 min-w-[32px] h-2 rounded-full transition-all duration-300 ${
                isActive
                  ? 'bg-[#FF5A1F] h-2.5 shadow-sm shadow-[#FF5A1F]/50'
                  : isPassed
                  ? 'bg-emerald-500/60'
                  : 'bg-[#232734] hover:bg-[#32384a]'
              }`}
              title={`Step ${idx + 1}: ${step.title}`}
            />
          );
        })}
      </div>

      {/* Active Step Content */}
      <div className="bg-[#191D26] border border-[#2B3142] rounded-xl p-4 mb-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FF5A1F]/15 text-[#FF5A1F] mb-1">
              Step {currentStep.position}
            </span>
            <h5 className="text-base font-semibold text-white">
              {currentStep.title}
            </h5>
          </div>

          {onSelectConcept && (
            <button
              onClick={() => onSelectConcept(currentStep.conceptId)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#232734] hover:bg-[#2B3142] text-[#C9D1D9] hover:text-white transition flex items-center gap-1 shrink-0"
              title="View concept details"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Deep Dive
            </button>
          )}
        </div>

        {/* Concept Definition / Explanation */}
        {currentStep.explanation ? (
          <p className="text-xs text-[#C9D1D9] leading-relaxed">
            {currentStep.explanation}
          </p>
        ) : currentStep.concept?.shortDefinition ? (
          <p className="text-xs text-[#C9D1D9] leading-relaxed">
            {currentStep.concept.shortDefinition}
          </p>
        ) : null}

        {/* Pedagogical Reason for Next Step */}
        {currentStep.reason && (
          <div className="p-3 rounded-lg bg-[#12141A] border border-[#232734] text-[11px] text-[#8B949E]">
            <span className="font-semibold text-[#C9D1D9]">Why this comes next: </span>
            {currentStep.reason}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePrev}
          disabled={isFirstStep}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
            isFirstStep
              ? 'opacity-40 cursor-not-allowed text-[#6E7681] bg-[#191D26]'
              : 'text-[#C9D1D9] hover:text-white bg-[#191D26] hover:bg-[#232734]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#8B949E] hover:text-white bg-transparent hover:bg-[#191D26] transition"
            >
              Exit
            </button>
          )}

          <button
            onClick={handleNext}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#FF5A1F] hover:bg-[#FF7A45] shadow-sm shadow-[#FF5A1F]/30 transition flex items-center gap-1.5"
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Complete Trail
              </>
            ) : (
              <>
                Next Step
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
