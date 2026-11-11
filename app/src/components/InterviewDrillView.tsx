import React, { useState, useEffect } from 'react';
import { DrillFeedback } from '../lib/types';
import { FormattedText } from './FormattedText';

interface InterviewDrillViewProps {
  drillQuestionNumber: number; // 1 to 5
  totalDrillQuestions: number; // 5
  difficultyLevel: 1 | 2 | 3; // 1=Foundational, 2=Applied, 3=Advanced
  questionText: string;
  lastFeedback: DrillFeedback | null;
  isDrillComplete: boolean;
  drillSummary?: { strength: string; priority: string } | null;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onReturnToPlan: () => void;
  onRestartDrill: () => void;
  isLoading: boolean;
  loadingStatusText?: string;
}

export const InterviewDrillView: React.FC<InterviewDrillViewProps> = ({
  drillQuestionNumber,
  totalDrillQuestions = 5,
  difficultyLevel,
  questionText,
  lastFeedback,
  isDrillComplete,
  drillSummary,
  onSubmitAnswer,
  onReturnToPlan,
  onRestartDrill,
  isLoading,
  loadingStatusText,
}) => {
  const [answer, setAnswer] = useState('');
  
  // 15-minute countdown timer (15 * 60 = 900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    if (!isTimerRunning || secondsRemaining <= 0 || isDrillComplete) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining, isDrillComplete]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isLoading) return;
    const textToSend = answer.trim();
    setAnswer('');
    await onSubmitAnswer(textToSend);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Bar: Question N of 5, Difficulty Indicator, 15-minute countdown timer */}
      <div className="bg-[#071d49] text-white p-4 sm:p-5 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Question Counter */}
        <div className="flex items-center space-x-3">
          <span className="text-xs uppercase font-bold tracking-widest text-[#a6b8db]">
            INTERVIEW DRILL
          </span>
          <span className="text-sm sm:text-base font-black text-white">
            QUESTION {isDrillComplete ? 5 : drillQuestionNumber} OF {totalDrillQuestions}
          </span>
        </div>

        {/* 3-Step Difficulty Indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider text-[#a6b8db] font-bold">
            Difficulty:
          </span>
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3].map((step) => {
              const isActive = difficultyLevel >= step;
              return (
                <div
                  key={step}
                  className={`h-2.5 w-7 rounded-[2px] transition-colors ${
                    isActive ? 'bg-[#0047bb]' : 'bg-[#1a356d]'
                  }`}
                  title={
                    step === 1 ? 'Step 1: Foundational' : step === 2 ? 'Step 2: Applied' : 'Step 3: Advanced'
                  }
                />
              );
            })}
          </div>
          <span className="text-xs text-white font-bold ml-1">
            {difficultyLevel === 1 ? 'Foundational' : difficultyLevel === 2 ? 'Applied' : 'Advanced'}
          </span>
        </div>

        {/* 15 Minute Countdown Timer */}
        <div className="flex items-center space-x-3 bg-[#051332] px-3.5 py-1.5 rounded-[2px] border border-[#1a356d]">
          <span className="text-xs uppercase tracking-wider text-[#a6b8db] font-bold">
            Timer:
          </span>
          <span className={`text-base font-mono font-black ${secondsRemaining < 120 ? 'text-[#c8215d]' : 'text-white'}`}>
            {formatTimer(secondsRemaining)}
          </span>
          <button
            type="button"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="text-[10px] uppercase tracking-wider text-[#a6b8db] hover:text-white underline cursor-pointer"
          >
            {isTimerRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      {isDrillComplete ? (
        /* Drill Summary Screen */
        <div className="bg-white border-2 border-[#071d49] p-8 sm:p-10 space-y-6">
          <div className="space-y-2">
            <span className="section-label">Drill Complete</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#071d49]">
              5-Question Mock Session Finished
            </h2>
            <p className="text-sm text-[#605e5c]">
              Here is your interviewer assessment summary:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="bg-[#f4f9eb] border-l-4 border-[#578100] p-6 space-y-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#578100] block">
                Demonstrated Strength
              </span>
              <p className="text-sm text-[#071d49] font-normal leading-relaxed">
                <FormattedText text={drillSummary?.strength || 'Consistently applied core valuation terminology with sound logical ordering.'} />
              </p>
            </div>

            <div className="bg-[#fff8e6] border-l-4 border-[#ffa500] p-6 space-y-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#071d49] block">
                Priority to Work On
              </span>
              <p className="text-sm text-[#071d49] font-normal leading-relaxed">
                <FormattedText text={drillSummary?.priority || 'Strengthen precision when walking changes across working capital and the balance sheet.'} />
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-[#e2e8f0]">
            <button
              onClick={onReturnToPlan}
              className="py-3 px-6 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer"
            >
              Return to My Plan
            </button>
            <button
              onClick={onRestartDrill}
              className="py-3 px-6 text-xs uppercase tracking-wider font-bold text-[#071d49] bg-[#f2f4f8] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded-[2px] transition-colors cursor-pointer"
            >
              Start Another Drill
            </button>
          </div>
        </div>
      ) : (
        /* Active Drill Screen: Question & Answer on Left, Feedback Panel on Right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: The Interviewer Asks + Answer Box */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white border-2 border-[#071d49] p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                <span className="text-xs uppercase font-bold tracking-widest text-[#c8215d]">
                  THE INTERVIEWER ASKS
                </span>
                <span className="text-[10px] uppercase font-bold text-[#605e5c]">
                  Respond under interview conditions
                </span>
              </div>

              <div className="py-2">
                <div className="text-lg sm:text-xl font-bold text-[#071d49] leading-relaxed">
                  &ldquo;<FormattedText text={questionText} />&rdquo;
                </div>
              </div>
            </div>

            {/* Answer Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="drill-answer" className="block text-xs uppercase tracking-wider font-bold text-[#071d49] mb-1">
                  Your Spoken Answer (Type as you would speak)
                </label>
                <textarea
                  id="drill-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="State your conclusion first, then walk through each statement or concept in logical sequence using proper terms..."
                  rows={6}
                  disabled={isLoading}
                  className="w-full p-4 border border-[#cbd5e1] rounded-[2px] text-base text-[#071d49] focus:outline-none focus:border-[#0047bb] focus:ring-1 focus:ring-[#0047bb] bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#605e5c] italic">
                  No hints in drill mode. Focus on structure & speed.
                </span>

                <button
                  type="submit"
                  disabled={!answer.trim() || isLoading}
                  className={`py-3.5 px-8 text-xs sm:text-sm uppercase tracking-wider font-bold text-white rounded-[2px] transition-colors cursor-pointer ${
                    answer.trim() && !isLoading
                      ? 'bg-[#0047bb] hover:bg-[#071d49]'
                      : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Assessing...</span>
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

          {/* Right: Feedback on the Last Answer with 3 Small Boxes */}
          <div className="lg:col-span-5 bg-white border border-[#e2e8f0] p-6 space-y-6">
            <div className="border-b border-[#e2e8f0] pb-3">
              <span className="section-label">Interviewer Assessment</span>
              <h3 className="text-base font-bold text-[#071d49]">
                Feedback on Last Answer
              </h3>
            </div>

            {lastFeedback ? (
              <div className="space-y-4">
                {/* Box 1: Accurate */}
                <div className="bg-[#f2f4f8] border-l-4 border-[#0047bb] p-4 space-y-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#0047bb] block">
                    1. Accurate
                  </span>
                  <p className="text-xs sm:text-sm text-[#071d49] leading-relaxed">
                    <FormattedText text={lastFeedback.accurate} />
                  </p>
                </div>

                {/* Box 2: Order */}
                <div className="bg-[#f2f4f8] border-l-4 border-[#071d49] p-4 space-y-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#071d49] block">
                    2. Logical Order
                  </span>
                  <p className="text-xs sm:text-sm text-[#071d49] leading-relaxed">
                    <FormattedText text={lastFeedback.order} />
                  </p>
                </div>

                {/* Box 3: Terms */}
                <div className="bg-[#f2f4f8] border-l-4 border-[#578100] p-4 space-y-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#578100] block">
                    3. Technical Terms
                  </span>
                  <p className="text-xs sm:text-sm text-[#071d49] leading-relaxed">
                    <FormattedText text={lastFeedback.terms} />
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#f2f4f8] p-6 text-center text-xs text-[#605e5c] space-y-2">
                <p className="font-bold text-[#071d49]">No answers submitted yet.</p>
                <p>Submit your response to Question 1 to see real-time evaluations across Accuracy, Logical Order, and Financial Terminology.</p>
              </div>
            )}

            <div className="text-[11px] text-[#605e5c] pt-2 border-t border-[#e2e8f0] space-y-1">
              <p className="font-bold uppercase tracking-wider text-[#071d49]">Adaptive Difficulty</p>
              <p>Correct answers trigger harder questions; incorrect answers trigger immediate corrections and easier reinforcement questions.</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
