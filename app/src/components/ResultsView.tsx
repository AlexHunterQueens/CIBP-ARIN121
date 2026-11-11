import React from 'react';
import { AssessmentRow, AssessmentType, DiagnosticResult, ChatMessage } from '../lib/types';
import { FormattedText } from './FormattedText';
import { getDisplayQuestionText } from '../lib/parser';

interface ResultsViewProps {
  diagnosticResult: DiagnosticResult;
  onSeeMyPlan: () => void;
  isRetest?: boolean;
  history?: ChatMessage[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  diagnosticResult,
  onSeeMyPlan,
  isRetest = false,
  history,
}) => {
  const { score, level, planWeeks, counts, assessmentRows } = diagnosticResult;
  const totalQuestions = assessmentRows.length || (isRetest ? 10 : 20);

  // Helper for rendering assessment pill with dot and exact colors specified
  const renderAssessmentPill = (assessment: AssessmentType) => {
    switch (assessment) {
      case 'Correct':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-[2px] bg-[#578100] text-white space-x-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
            <span>Correct</span>
          </span>
        );
      case 'Partially correct':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-[2px] bg-[#ffa500] text-[#071d49] space-x-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#071d49] flex-shrink-0" />
            <span>Partially correct</span>
          </span>
        );
      case 'Incorrect':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-[2px] bg-[#c8215d] text-white space-x-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
            <span>Incorrect</span>
          </span>
        );
      case 'Not attempted':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-[2px] bg-[#e2e8f0] text-[#071d49] space-x-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#071d49] flex-shrink-0" />
            <span>Not attempted</span>
          </span>
        );
    }
  };

  // Percentage for traffic light stacked bar
  const totalCount = Math.max(1, counts.correct + counts.partial + counts.incorrect + counts.notAttempted);
  const correctPct = (counts.correct / totalCount) * 100;
  const partialPct = (counts.partial / totalCount) * 100;
  const incorrectPct = (counts.incorrect / totalCount) * 100;
  const notAttemptedPct = (counts.notAttempted / totalCount) * 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-8">
        <span className="section-label">Diagnostic Assessment</span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#071d49] tracking-tight">
          {isRetest ? 'Weekly Retest Assessment' : 'Diagnostic Results & Gap Analysis'}
        </h1>
        <p className="text-sm sm:text-base text-[#605e5c] mt-1">
          Review concept evaluations across all {totalQuestions} questions and your personalized prep trajectory.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel: Dark Score Card & Traffic Light Bar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Dark Score Card */}
          <div className="bg-[#071d49] text-white p-6 sm:p-8 rounded-[2px] space-y-6 border border-[#071d49]">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#a6b8db]">
                Total Diagnostic Score
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl sm:text-5xl font-black text-white">
                  {score % 1 === 0 ? score : score.toFixed(1)}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#a6b8db]">
                  / {totalQuestions}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1a356d] grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#a6b8db] block">
                  Assigned Level
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  {level}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#a6b8db] block">
                  Learning Plan
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  {planWeeks} Week Plan
                </span>
              </div>
            </div>

            <p className="text-xs text-[#a6b8db] leading-relaxed border-t border-[#1a356d] pt-4">
              Placement criteria: 0-8 Beginner (16 weeks), 9-15 Intermediate (8 weeks), 16-20 Superday (4 weeks).
            </p>
          </div>

          {/* Traffic Light Bar Across All Answers */}
          <div className="bg-white border border-[#e2e8f0] p-6 space-y-4">
            <span className="text-xs uppercase font-bold tracking-wider text-[#071d49] block">
              Answer Distribution ({totalQuestions} Questions)
            </span>

            {/* Stacked Traffic Light Bar */}
            <div className="w-full h-3 flex overflow-hidden rounded-[2px] border border-[#cbd5e1]">
              <div style={{ width: `${correctPct}%` }} className="bg-[#578100] h-full" title={`Correct: ${counts.correct}`} />
              <div style={{ width: `${partialPct}%` }} className="bg-[#ffa500] h-full" title={`Partial: ${counts.partial}`} />
              <div style={{ width: `${incorrectPct}%` }} className="bg-[#c8215d] h-full" title={`Incorrect: ${counts.incorrect}`} />
              <div style={{ width: `${notAttemptedPct}%` }} className="bg-[#e2e8f0] h-full" title={`Not attempted: ${counts.notAttempted}`} />
            </div>

            {/* Breakdown Counts */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2 p-2 bg-[#f2f4f8] rounded-[2px]">
                <span className="w-2.5 h-2.5 bg-[#578100] flex-shrink-0" />
                <span className="font-bold text-[#071d49]">{counts.correct} Correct</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-[#f2f4f8] rounded-[2px]">
                <span className="w-2.5 h-2.5 bg-[#ffa500] flex-shrink-0" />
                <span className="font-bold text-[#071d49]">{counts.partial} Partial</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-[#f2f4f8] rounded-[2px]">
                <span className="w-2.5 h-2.5 bg-[#c8215d] flex-shrink-0" />
                <span className="font-bold text-[#071d49]">{counts.incorrect} Incorrect</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-[#f2f4f8] rounded-[2px]">
                <span className="w-2.5 h-2.5 bg-[#cbd5e1] flex-shrink-0" />
                <span className="font-bold text-[#071d49]">{counts.notAttempted} Not attempted</span>
              </div>
            </div>

            {/* See My Plan Button */}
            <button
              onClick={onSeeMyPlan}
              className="w-full mt-4 py-3.5 px-6 text-sm uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer text-center"
            >
              See My Plan
            </button>
          </div>

        </div>

        {/* Right Panel: AI Assessment Table */}
        <div className="lg:col-span-8 bg-white border border-[#e2e8f0] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#e2e8f0] bg-[#f2f4f8] flex items-center justify-between">
            <div>
              <span className="section-label">Detailed Breakdown</span>
              <h2 className="text-base sm:text-lg font-bold text-[#071d49]">
                Assessment Table
              </h2>
            </div>
            <span className="text-xs text-[#605e5c]">
              Scored on technical meaning & reasoning
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#071d49] text-white">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] w-1/4">Question</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] w-1/4">Your Answer</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] w-1/6">Assessment</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] w-1/3">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {assessmentRows.map((row) => {
                  const displayQuestion = getDisplayQuestionText(
                    row,
                    diagnosticResult.askedQuestions,
                    history
                  );

                  return (
                    <tr key={row.index} className="hover:bg-[#f2f4f8] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#071d49] align-top">
                        <div className="space-y-1">
                          <div className="text-xs sm:text-sm text-[#071d49] leading-snug">
                            <span className="font-bold text-[#0047bb] mr-1.5">Q{row.index}:</span>
                            <FormattedText text={displayQuestion} />
                          </div>
                          {row.conceptId && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#605e5c] block">
                              Concept {row.conceptId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#605e5c] font-normal align-top italic">
                        {row.studentAnswer ? (
                          <span>
                            &ldquo;<FormattedText text={row.studentAnswer} />&rdquo;
                          </span>
                        ) : (
                          <span className="text-[#94a3b8]">No answer</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        {renderAssessmentPill(row.assessment)}
                      </td>
                      <td className="py-3.5 px-4 text-[#071d49] font-normal align-top leading-relaxed">
                        <FormattedText text={row.explanation} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#f2f4f8] border-t border-[#e2e8f0] text-right">
            <button
              onClick={onSeeMyPlan}
              className="py-2.5 px-6 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer"
            >
              Proceed to My Plan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
