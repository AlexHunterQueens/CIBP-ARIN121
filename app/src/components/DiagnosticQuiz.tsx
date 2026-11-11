import React, { useState } from 'react';
import { FormattedText } from './FormattedText';
import { cleanQuestionForCard } from '../lib/parser';

interface DiagnosticQuizProps {
  questionNumber: number; // 1 to 20
  totalQuestions: number; // 20
  topicArea: string;
  questionText: string;
  onSubmitAnswer: (answer: string) => void;
  isLoading: boolean;
  loadingStatusText?: string;
}

export const DiagnosticQuiz: React.FC<DiagnosticQuizProps> = ({
  questionNumber,
  totalQuestions = 20,
  topicArea,
  questionText,
  onSubmitAnswer,
  isLoading,
  loadingStatusText,
}) => {
  const [answer, setAnswer] = useState('');

  // Clean at display time: strips headers, preamble, extracts bracketed area into clean uppercase topic tag
  const { cleanQuestion, topicTag } = cleanQuestionForCard(questionText, topicArea);

  const progressPercent = Math.min(100, Math.round((questionNumber / totalQuestions) * 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isLoading) return;
    const textToSend = answer.trim();
    setAnswer('');
    onSubmitAnswer(textToSend);
  };

  const handleIDontKnow = () => {
    if (isLoading) return;
    setAnswer('');
    onSubmitAnswer("I don't know");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Quiz Container */}
      <div className="space-y-6">
        
        {/* Progress Bar & Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#605e5c]">
            <span>Question {questionNumber} of {totalQuestions}</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="w-full bg-[#f2f4f8] h-2 rounded-[2px] overflow-hidden border border-[#e2e8f0]">
            <div
              className="bg-[#0047bb] h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white border-2 border-[#071d49] p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3">
            <span className="text-xs uppercase font-bold tracking-widest text-[#0047bb]">
              QUESTION {questionNumber} OF {totalQuestions}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider bg-[#f2f4f8] text-[#071d49] px-2.5 py-1">
              {topicTag}
            </span>
          </div>

          <div className="py-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#071d49] leading-relaxed">
              <FormattedText text={cleanQuestion} />
            </h2>
          </div>
        </div>

        {/* Answer Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="answer-box" className="block text-xs uppercase tracking-wider font-bold text-[#071d49] mb-2">
              Your Answer
            </label>
            <textarea
              id="answer-box"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Explain the concept clearly and walk through your logic step-by-step as you would out loud in an interview..."
              rows={6}
              disabled={isLoading}
              className="w-full p-4 border border-[#cbd5e1] rounded-[2px] text-base text-[#071d49] focus:outline-none focus:border-[#0047bb] focus:ring-1 focus:ring-[#0047bb] bg-white resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleIDontKnow}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-3 text-xs uppercase tracking-wider font-bold text-[#605e5c] bg-[#f2f4f8] border border-[#cbd5e1] hover:bg-[#e2e8f0] hover:text-[#071d49] rounded-[2px] transition-colors cursor-pointer"
            >
              I Don't Know
            </button>

              <button
                type="submit"
                disabled={!answer.trim() || isLoading}
                className={`w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm uppercase tracking-wider font-bold text-white rounded-[2px] transition-colors cursor-pointer ${
                  answer.trim() && !isLoading
                    ? 'bg-[#0047bb] hover:bg-[#071d49]'
                    : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating and loading next...</span>
                  </span>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>

            {isLoading && (
              <p className="text-center sm:text-right text-xs text-[#0047bb] font-bold">
                {loadingStatusText || 'Gemini is busy, retrying...'}
              </p>
            )}

            <p className="text-center text-xs text-[#605e5c] pt-2">
              No feedback until all 20 are answered.
            </p>
        </form>

      </div>
    </div>
  );
};
