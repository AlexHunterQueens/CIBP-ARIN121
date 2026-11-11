import React, { useState } from 'react';
import { CONCEPT_LIBRARY, CONCEPT_LIST } from '../lib/conceptLibrary';
import { ConceptStatus } from '../lib/types';
import { FormattedText } from './FormattedText';

interface LearnModeViewProps {
  initialConceptId?: string;
  focusConceptIds: string[];
  onConceptLearned?: (conceptId: string, status: ConceptStatus) => void;
  onSubmitAnswer: (conceptId: string, answer: string) => Promise<{ hint?: string; explanation?: string; isCorrect?: boolean }>;
  onAskSideQuestion: (conceptId: string, question: string) => Promise<string>;
  isLoading: boolean;
  loadingStatusText?: string;
}

export const LearnModeView: React.FC<LearnModeViewProps> = ({
  initialConceptId,
  focusConceptIds,
  onConceptLearned,
  onSubmitAnswer,
  onAskSideQuestion,
  isLoading,
  loadingStatusText,
}) => {
  const defaultId = initialConceptId || focusConceptIds[0] || 'A3';
  const [selectedConceptId, setSelectedConceptId] = useState<string>(defaultId);

  const concept = CONCEPT_LIBRARY[selectedConceptId] || CONCEPT_LIBRARY['A3'];

  const [studentAnswer, setStudentAnswer] = useState('');
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [feedbackExplanation, setFeedbackExplanation] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Side question state
  const [sideQuestion, setSideQuestion] = useState('');
  const [sideAnswer, setSideAnswer] = useState<string | null>(null);
  const [isSideLoading, setIsSideLoading] = useState(false);

  const handleSelectConcept = (id: string) => {
    setSelectedConceptId(id);
    setStudentAnswer('');
    setActiveHint(null);
    setFeedbackExplanation(null);
    setIsAnswerCorrect(null);
    setAttemptCount(0);
    setSideQuestion('');
    setSideAnswer(null);
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAnswer.trim() || isLoading) return;

    setAttemptCount(prev => prev + 1);
    const res = await onSubmitAnswer(selectedConceptId, studentAnswer.trim());

    if (res.hint) {
      setActiveHint(res.hint);
    }
    if (res.explanation) {
      setFeedbackExplanation(res.explanation);
    }
    if (res.isCorrect !== undefined) {
      setIsAnswerCorrect(res.isCorrect);
      if (res.isCorrect && onConceptLearned) {
        onConceptLearned(selectedConceptId, 'Solid');
      }
    }
  };

  const handleTryAgain = () => {
    setActiveHint(null);
    setStudentAnswer('');
  };

  const handleSideQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sideQuestion.trim() || isSideLoading) return;

    const q = sideQuestion.trim();
    setIsSideLoading(true);
    try {
      const ans = await onAskSideQuestion(selectedConceptId, q);
      setSideAnswer(ans);
    } finally {
      setIsSideLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header and Concept Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <span className="section-label">Learn Mode</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#071d49] tracking-tight">
            {concept.id}: {concept.name}
          </h1>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0047bb]">
            {concept.area}
          </span>
        </div>

        {/* Concept Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="concept-select" className="text-xs uppercase font-bold text-[#605e5c]">
            Concept:
          </label>
          <select
            id="concept-select"
            value={selectedConceptId}
            onChange={(e) => handleSelectConcept(e.target.value)}
            className="p-2 text-xs sm:text-sm font-bold border border-[#cbd5e1] rounded-[2px] bg-white text-[#071d49] cursor-pointer"
          >
            <optgroup label="Priority Focus Concepts">
              {focusConceptIds.map(id => {
                const c = CONCEPT_LIBRARY[id];
                return (
                  <option key={id} value={id}>
                    Focus · {id}: {c?.name}
                  </option>
                );
              })}
            </optgroup>
            <optgroup label="All Concepts (A1 - D5)">
              {CONCEPT_LIST.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id}: {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Reading and Shaded Worked Example Box */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Technical Reading */}
          <div className="bg-white border border-[#e2e8f0] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#071d49]">
                Core Reading (Under 150 Words)
              </span>
              <span className="text-[10px] text-[#605e5c] uppercase">Technical Concept</span>
            </div>
            <div className="text-sm sm:text-base text-[#071d49] leading-relaxed font-normal">
              <FormattedText text={concept.reading} />
            </div>
          </div>

          {/* Shaded Worked Example Box */}
          <div className="bg-[#f2f4f8] border-l-4 border-[#071d49] p-6 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-[#071d49] block">
              Worked Example
            </span>
            <div className="text-sm sm:text-base text-[#071d49] leading-relaxed font-normal">
              <FormattedText text={concept.workedExample} />
            </div>
          </div>

        </div>

        {/* Right Column: Question Card, Answer Box, Hint Box */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Question Card */}
          <div className="bg-white border-2 border-[#071d49] p-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <span className="text-xs uppercase font-bold tracking-widest text-[#0047bb]">
                Check Your Understanding
              </span>
              <span className="text-xs text-[#605e5c]">
                Step 1 of 1
              </span>
            </div>

            <div className="text-base sm:text-lg font-bold text-[#071d49] leading-relaxed">
              <FormattedText text={concept.sampleQuestion} />
            </div>
          </div>

          {/* Hint in Light Amber Box */}
          {activeHint && (
            <div className="bg-[#fff8e6] border-2 border-[#ffa500] p-4 space-y-2 rounded-[2px]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-[#071d49]">
                  HINT 1 OF 1
                </span>
                <span className="text-[10px] text-[#605e5c] uppercase">Focused Coach Hint</span>
              </div>
              <div className="text-sm text-[#071d49] font-normal leading-relaxed">
                <FormattedText text={activeHint} />
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="px-4 py-2 text-xs uppercase font-bold tracking-wider text-[#071d49] bg-white border border-[#ffa500] hover:bg-[#fff0c2] rounded-[2px] transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Feedback Explanation */}
          {feedbackExplanation && (
            <div className={`p-4 space-y-2 rounded-[2px] border ${isAnswerCorrect ? 'bg-[#f4f9eb] border-[#578100]' : 'bg-[#fdf2f4] border-[#c8215d]'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs uppercase font-bold tracking-wider ${isAnswerCorrect ? 'text-[#578100]' : 'text-[#c8215d]'}`}>
                  {isAnswerCorrect ? 'Solid! Correct Reasoning' : 'Concept Explanation'}
                </span>
              </div>
              <div className="text-sm text-[#071d49] leading-relaxed">
                <FormattedText text={feedbackExplanation} />
              </div>
            </div>
          )}

          {/* Answer Form */}
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <div>
              <label htmlFor="learn-answer" className="block text-xs uppercase tracking-wider font-bold text-[#071d49] mb-1">
                Your Explanation
              </label>
              <textarea
                id="learn-answer"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Walk through your answer with precise accounting and finance terminology..."
                rows={5}
                disabled={isLoading}
                className="w-full p-3.5 border border-[#cbd5e1] rounded-[2px] text-sm text-[#071d49] focus:outline-none focus:border-[#0047bb] focus:ring-1 focus:ring-[#0047bb] bg-white"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              {activeHint ? (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="px-5 py-3 text-xs uppercase tracking-wider font-bold text-[#071d49] bg-[#f2f4f8] border border-[#cbd5e1] hover:bg-[#e2e8f0] rounded-[2px] transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={!studentAnswer.trim() || isLoading}
                className={`py-3 px-6 text-xs uppercase tracking-wider font-bold text-white rounded-[2px] transition-colors cursor-pointer ${
                  studentAnswer.trim() && !isLoading
                    ? 'bg-[#0047bb] hover:bg-[#071d49]'
                    : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Checking answer...</span>
                  </span>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>

            {isLoading && (
              <p className="text-right text-xs text-[#0047bb] font-bold">
                {loadingStatusText || 'Gemini is busy, retrying...'}
              </p>
            )}
          </form>

        </div>

      </div>

      {/* Side Question Bar at the Bottom */}
      <div className="bg-[#f2f4f8] border border-[#cbd5e1] p-4 sm:p-5 rounded-[2px] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-[#071d49]">
            Side Question Bar
          </span>
          <span className="text-[10px] text-[#605e5c] uppercase">
            Ask something without losing your place
          </span>
        </div>

        {sideAnswer && (
          <div className="bg-white border-l-4 border-[#0047bb] p-4 space-y-1 relative">
            <button
              onClick={() => setSideAnswer(null)}
              className="absolute top-2 right-2 text-xs text-[#605e5c] hover:text-[#071d49] font-bold"
            >
              Close [x]
            </button>
            <span className="text-[10px] uppercase font-bold text-[#0047bb] block">Coach Response:</span>
            <div className="text-sm text-[#071d49] leading-relaxed">
              <FormattedText text={sideAnswer} />
            </div>
          </div>
        )}

        <form onSubmit={handleSideQuestionSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sideQuestion}
            onChange={(e) => setSideQuestion(e.target.value)}
            placeholder="e.g. Why is depreciation added back on the cash flow statement?"
            disabled={isSideLoading}
            className="flex-1 p-2.5 text-xs sm:text-sm border border-[#cbd5e1] bg-white rounded-[2px] text-[#071d49] focus:outline-none focus:border-[#0047bb]"
          />
          <button
            type="submit"
            disabled={!sideQuestion.trim() || isSideLoading}
            className={`px-5 py-2.5 text-xs uppercase tracking-wider font-bold text-white rounded-[2px] transition-colors cursor-pointer whitespace-nowrap ${
              sideQuestion.trim() && !isSideLoading
                ? 'bg-[#0047bb] hover:bg-[#071d49]'
                : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            {isSideLoading ? 'Asking...' : 'Ask Coach'}
          </button>
        </form>
      </div>

    </div>
  );
};
