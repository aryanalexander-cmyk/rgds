import React, { useState, useEffect } from 'react';
import { LucideIcon, Sparkles, ArrowRight, ArrowLeft, Check, X, HelpCircle, Lightbulb, BookOpen } from 'lucide-react';
import { WorkstationTutorial, TutorialStep } from '../../core/tutorial/tutorialData';
import { Button } from './Button';

interface WorkstationTutorialModalProps {
  tutorial: WorkstationTutorial;
  isOpen: boolean;
  onClose: () => void;
  isFirstVisitPrompt?: boolean;
}

export const WorkstationTutorialModal: React.FC<WorkstationTutorialModalProps> = ({
  tutorial,
  isOpen,
  onClose,
  isFirstVisitPrompt = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [mode, setMode] = useState<'prompt' | 'walkthrough'>(isFirstVisitPrompt ? 'prompt' : 'walkthrough');
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Sync mode when reopened
  useEffect(() => {
    if (isOpen) {
      if (isFirstVisitPrompt) {
        setMode('prompt');
      } else {
        setMode('walkthrough');
      }
      setCurrentStepIndex(0);
    }
  }, [isOpen, isFirstVisitPrompt]);

  if (!isOpen) return null;

  const IconComponent = tutorial.icon;
  const currentStep: TutorialStep = tutorial.steps[currentStepIndex] || tutorial.steps[0];
  const totalSteps = tutorial.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleDismissPrompt = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(`rgds_tutorial_${tutorial.toolId}_dismissed`, 'true');
      } catch {}
    }
    onClose();
  };

  const handleStartWalkthrough = () => {
    setMode('walkthrough');
    setCurrentStepIndex(0);
  };

  const handleCompleteWalkthrough = () => {
    try {
      localStorage.setItem(`rgds_tutorial_${tutorial.toolId}_dismissed`, 'true');
    } catch {}
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleCompleteWalkthrough();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#0c101a] border border-[#232d44] shadow-2xl p-6 text-slate-100 space-y-5"
        style={{ boxShadow: `0 20px 40px -15px ${tutorial.color}25` }}
      >
        
        {/* ================================================================== */}
        {/* MODE 1: FIRST VISIT INVITATION PROMPT                              */}
        {/* ================================================================== */}
        {mode === 'prompt' ? (
          <div className="space-y-5">
            {/* Header Icon & Title */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                  style={{ backgroundColor: `${tutorial.color}20`, color: tutorial.color, border: `1px solid ${tutorial.color}40` }}
                >
                  <IconComponent size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Welcome to {tutorial.toolName}
                    </h2>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300">
                      NEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tutorial.tagline}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismissPrompt}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Prompt Body */}
            <div className="rounded-xl bg-[#121726] border border-[#1e273d] p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                Would you like a quick walkthrough of this workstation?
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a 60-second tour to discover core features, workflow tricks, and 1-click Godot/Unity export pipelines.
              </p>
            </div>

            {/* Checkbox: Don't show again */}
            <div className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                id="dont-show-tutorial"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="rounded bg-[#121726] border-[#222c42] text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="dont-show-tutorial" className="cursor-pointer text-[11px]">
                Don't ask automatically on future visits
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1a2336]">
              <button
                onClick={handleDismissPrompt}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Skip / Start Blank
              </button>

              <Button
                variant="primary"
                size="sm"
                icon={<BookOpen size={13} />}
                onClick={handleStartWalkthrough}
                className="font-bold shadow-md"
              >
                Start Walkthrough ({totalSteps} Steps)
              </Button>
            </div>
          </div>
        ) : (
          /* ================================================================== */
          /* MODE 2: INTERACTIVE WALKTHROUGH STEP-BY-STEP                       */
          /* ================================================================== */
          <div className="space-y-5">
            {/* Walkthrough Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2438]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tutorial.color}20`, color: tutorial.color }}
                >
                  <IconComponent size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight">
                    {tutorial.toolName} Walkthrough
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Step {currentStepIndex + 1} of {totalSteps}
                  </div>
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-1.5">
                {tutorial.steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStepIndex
                        ? 'w-6'
                        : 'w-1.5 bg-[#1f283d] hover:bg-slate-600'
                    }`}
                    style={{ backgroundColor: idx === currentStepIndex ? tutorial.color : undefined }}
                    title={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="space-y-3.5 min-h-[160px]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                  {currentStep.title}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {currentStep.subtitle}
                </h4>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {currentStep.description}
              </p>

              {/* Pro Tip Box */}
              {currentStep.tip && (
                <div className="rounded-xl bg-[#111726] border border-amber-500/25 p-3 flex items-start gap-2.5 text-xs">
                  <Lightbulb size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-300 leading-normal">
                    <strong className="text-amber-300">Pro Tip:</strong> {currentStep.tip}
                  </div>
                </div>
              )}

              {/* Shortcut Chip */}
              {currentStep.shortcut && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-1">
                  <span>Quick action:</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#151c2c] text-indigo-300 border border-[#212b40]">
                    {currentStep.shortcut}
                  </span>
                </div>
              )}
            </div>

            {/* Walkthrough Navigation Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1a2336]">
              <button
                onClick={handleCompleteWalkthrough}
                className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
              >
                Close Tour
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowLeft size={12} />}
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  className="!px-2.5 !py-1 text-xs"
                >
                  Back
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={isLastStep ? <Check size={12} /> : <ArrowRight size={12} />}
                  onClick={handleNext}
                  className="font-bold !px-3 !py-1 text-xs shadow-md"
                >
                  {isLastStep ? 'Got it! Start Creating' : 'Next Step'}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
