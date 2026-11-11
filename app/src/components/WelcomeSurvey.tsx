import React, { useState } from 'react';
import { FinanceExposureChoice, InterviewTimelineChoice, SurveyState, YearChoice } from '../lib/types';

interface WelcomeSurveyProps {
  onStartDiagnostic: (survey: SurveyState) => void;
  isLoading: boolean;
  loadingStatusText?: string;
}

export const WelcomeSurvey: React.FC<WelcomeSurveyProps> = ({
  onStartDiagnostic,
  isLoading,
  loadingStatusText,
}) => {
  const [year, setYear] = useState<YearChoice | null>(null);
  const [financeExposure, setFinanceExposure] = useState<FinanceExposureChoice | null>(null);
  const [interviewTimeline, setInterviewTimeline] = useState<InterviewTimelineChoice | null>(null);

  // Counter
  let answeredCount = 0;
  if (year !== null) answeredCount++;
  if (financeExposure !== null) answeredCount++;
  if (interviewTimeline !== null) answeredCount++;

  const isComplete = answeredCount === 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isLoading) return;
    onStartDiagnostic({
      year,
      financeExposure,
      interviewTimeline,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Context & What You Leave With */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <span className="section-label">Technical Diagnostic</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#071d49] tracking-tight leading-tight">
              Find Your Gaps Before the Interviewer Does
            </h1>
            <p className="text-base sm:text-lg text-[#605e5c] leading-relaxed font-normal">
              Answer 20 interview-style technical questions across Accounting, Enterprise Value, Valuation, and DCF to receive an individual diagnostic plan built directly from the concepts you missed.
            </p>
          </div>

          <div className="bg-[#f2f4f8] p-6 border-l-4 border-[#071d49] space-y-4">
            <h2 className="text-sm uppercase tracking-wider font-bold text-[#071d49]">
              What you leave with
            </h2>
            <ul className="space-y-3 text-sm text-[#071d49] font-normal">
              <li className="flex items-start space-x-2">
                <span className="inline-block w-1.5 h-1.5 bg-[#0047bb] mt-2 flex-shrink-0" />
                <span>
                  <strong>Your level (Beginner, Intermediate or Superday)</strong> with the answers that decided it
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="inline-block w-1.5 h-1.5 bg-[#0047bb] mt-2 flex-shrink-0" />
                <span>
                  <strong>3 to 5 ranked focus concepts</strong>, each linked to the question you missed
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="inline-block w-1.5 h-1.5 bg-[#0047bb] mt-2 flex-shrink-0" />
                <span>
                  <strong>A 4, 8 or 16 week plan</strong> of 5 to 15 minute sessions and a weekly retest
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Three Required Toggle Questions */}
        <div className="lg:col-span-6 bg-white border border-[#e2e8f0] p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-6">
            <span className="section-label">Starting Survey</span>
            <span className={`text-xs font-bold tracking-wide uppercase px-2 py-1 ${isComplete ? 'bg-[#578100] text-white' : 'bg-[#f2f4f8] text-[#071d49]'}`}>
              {answeredCount} of 3 required answered
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Question 1: Year */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-[#071d49]">
                1. Year
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['First year', 'Second year'] as YearChoice[]).map((option) => {
                  const isSelected = year === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setYear(option)}
                      className={`py-3.5 px-4 text-sm font-bold text-center border rounded-[2px] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0047bb] text-white border-[#0047bb]'
                          : 'bg-white text-[#071d49] border-[#cbd5e1] hover:border-[#071d49] hover:bg-[#f2f4f8]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question 2: Finance exposure */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-[#071d49]">
                2. Finance exposure
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['None', 'One course', 'Club or work experience'] as FinanceExposureChoice[]).map((option) => {
                  const isSelected = financeExposure === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFinanceExposure(option)}
                      className={`py-3 px-3 text-xs sm:text-sm font-bold text-center border rounded-[2px] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0047bb] text-white border-[#0047bb]'
                          : 'bg-white text-[#071d49] border-[#cbd5e1] hover:border-[#071d49] hover:bg-[#f2f4f8]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question 3: First interview */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-[#071d49]">
                3. First interview
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['None scheduled', 'Within 4 weeks', 'Later'] as InterviewTimelineChoice[]).map((option) => {
                  const isSelected = interviewTimeline === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setInterviewTimeline(option)}
                      className={`py-3 px-3 text-xs sm:text-sm font-bold text-center border rounded-[2px] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0047bb] text-white border-[#0047bb]'
                          : 'bg-white text-[#071d49] border-[#cbd5e1] hover:border-[#071d49] hover:bg-[#f2f4f8]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#605e5c] pt-1">
                Within 4 weeks switches you to a 4 week sprint on your weakest concepts first.
              </p>
            </div>

            {/* Submit / Start Diagnostic Button */}
            <div className="pt-4 border-t border-[#e2e8f0]">
              <button
                type="submit"
                disabled={!isComplete || isLoading}
                className={`w-full py-3.5 px-6 text-sm uppercase tracking-wider font-bold text-white rounded-[2px] transition-colors cursor-pointer ${
                  isComplete && !isLoading
                    ? 'bg-[#0047bb] hover:bg-[#071d49]'
                    : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Diagnostic...</span>
                  </span>
                ) : (
                  'Start Diagnostic'
                )}
              </button>
              {isLoading && (
                <p className="text-center text-xs text-[#0047bb] font-bold mt-2">
                  {loadingStatusText || 'Gemini is busy, retrying...'}
                </p>
              )}
              <p className="text-center text-xs text-[#605e5c] mt-2">
                20 questions · One per concept · No feedback until all 20 are submitted
              </p>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};
