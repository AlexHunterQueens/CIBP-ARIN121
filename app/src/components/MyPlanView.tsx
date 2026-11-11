import React from 'react';
import { ConceptStatus, DiagnosticResult, FocusConcept } from '../lib/types';
import { FormattedText, cleanAiAsterisks } from './FormattedText';

interface MyPlanViewProps {
  diagnosticResult: DiagnosticResult;
  onSelectMode: (mode: 'learn' | 'drill' | 'retest', conceptId?: string) => void;
  onUpdateConceptStatus: (conceptId: string, status: ConceptStatus) => void;
  onViewResultsTable: () => void;
}

export const MyPlanView: React.FC<MyPlanViewProps> = ({
  diagnosticResult,
  onSelectMode,
  onUpdateConceptStatus,
  onViewResultsTable,
}) => {
  const { score, level, planWeeks, currentWeek, nextRetestDate, focusConcepts } = diagnosticResult;

  const topConceptsSummary = focusConcepts.map(c => cleanAiAsterisks(c.conceptId)).join(', ');

  const getStatusBadge = (status: ConceptStatus) => {
    switch (status) {
      case 'Solid':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-[#578100] text-white rounded-[2px]">Solid</span>;
      case 'Learning':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-[#ffa500] text-[#071d49] rounded-[2px]">Learning</span>;
      case 'Not started':
      default:
        return <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-[#e2e8f0] text-[#071d49] rounded-[2px]">Not started</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Plan Header */}
      <div className="bg-[#f2f4f8] border-l-4 border-[#071d49] p-6 sm:p-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="section-label">Your Tailored Roadmap</span>
          <button
            onClick={onViewResultsTable}
            className="text-xs uppercase font-bold tracking-wider text-[#0047bb] hover:text-[#071d49] underline cursor-pointer"
          >
            View Diagnostic Breakdown
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#071d49] tracking-tight">
          Priority Focus Concepts: {topConceptsSummary}
        </h1>

        <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-2 text-xs sm:text-sm text-[#071d49] font-normal border-t border-[#cbd5e1]">
          <div>
            <span className="text-[#605e5c] uppercase text-[10px] font-bold tracking-wider block">Level & Pace</span>
            <span className="font-bold">{level} · Week {currentWeek} of {planWeeks}</span>
          </div>
          <div>
            <span className="text-[#605e5c] uppercase text-[10px] font-bold tracking-wider block">Diagnostic Score</span>
            <span className="font-bold">{score % 1 === 0 ? score : score.toFixed(1)} / 20</span>
          </div>
          <div>
            <span className="text-[#605e5c] uppercase text-[10px] font-bold tracking-wider block">Next Scheduled Retest</span>
            <span className="font-bold text-[#0047bb]">{nextRetestDate}</span>
          </div>
        </div>
      </div>

      {/* Five Focus Concept Cards in a Row */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="section-label">Top 5 Concepts for Your Sprint</span>
          <span className="text-xs text-[#605e5c]">Ranked by diagnostic gaps</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {focusConcepts.map((item, index) => {
            return (
              <div
                key={item.conceptId}
                className="bg-white border-2 border-[#e2e8f0] hover:border-[#071d49] p-5 flex flex-col justify-between space-y-4 transition-colors rounded-[2px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#0047bb]">
                      PRIORITY {item.priority || index + 1}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#071d49] leading-snug">
                      <FormattedText text={item.conceptName} />
                    </h2>
                    <span className="text-[10px] text-[#605e5c] uppercase tracking-wider block mt-1">
                      {item.area}
                    </span>
                  </div>

                  <div className="text-xs text-[#605e5c] bg-[#f2f4f8] p-2 rounded-[2px] border border-[#e2e8f0]">
                    <span className="block font-bold text-[#071d49]">Flagged by:</span>
                    <span className="text-[11px]">
                      <FormattedText text={item.flaggedBy} />
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#e2e8f0]">
                  {/* Status cycle control */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#605e5c]">Status</span>
                    <select
                      value={item.status}
                      onChange={(e) => onUpdateConceptStatus(item.conceptId, e.target.value as ConceptStatus)}
                      className="text-xs border border-[#cbd5e1] p-1 bg-white rounded-[2px] text-[#071d49] font-bold cursor-pointer"
                    >
                      <option value="Not started">Not started</option>
                      <option value="Learning">Learning</option>
                      <option value="Solid">Solid</option>
                    </select>
                  </div>

                  {/* Mode Button */}
                  <button
                    onClick={() => {
                      if (item.recommendedMode === 'Interview Drill') {
                        onSelectMode('drill', item.conceptId);
                      } else {
                        onSelectMode('learn', item.conceptId);
                      }
                    }}
                    className="w-full py-2.5 px-3 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer text-center"
                  >
                    {item.recommendedMode === 'Interview Drill' ? 'Interview Drill' : 'Start Learn'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Three Large Mode Tiles */}
      <div className="space-y-4 pt-4">
        <span className="section-label">Select Practice Mode</span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tile 1: Learn */}
          <div className="bg-white border-2 border-[#071d49] p-6 flex flex-col justify-between space-y-6 rounded-[2px]">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0047bb]">
                Mode 1
              </span>
              <h2 className="text-xl font-black text-[#071d49]">
                Learn Mode
              </h2>
              <p className="text-sm text-[#605e5c] leading-relaxed">
                Short readings under 150 words with a worked example, single question check, targeted hints, and side questions.
              </p>
            </div>

            <button
              onClick={() => onSelectMode('learn')}
              className="w-full py-3 px-4 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer text-center"
            >
              Enter Learn
            </button>
          </div>

          {/* Tile 2: Interview Drill */}
          <div className="bg-white border-2 border-[#071d49] p-6 flex flex-col justify-between space-y-6 rounded-[2px]">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0047bb]">
                Mode 2
              </span>
              <h2 className="text-xl font-black text-[#071d49]">
                Interview Drill
              </h2>
              <p className="text-sm text-[#605e5c] leading-relaxed">
                Run a 5 question drill on focus concepts phrased like an interviewer with 15-minute timer and feedback on Accurate, Order, and Terms.
              </p>
            </div>

            <button
              onClick={() => onSelectMode('drill')}
              className="w-full py-3 px-4 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer text-center"
            >
              Enter Interview Drill
            </button>
          </div>

          {/* Tile 3: Weekly Retest */}
          <div className="bg-white border-2 border-[#071d49] p-6 flex flex-col justify-between space-y-6 rounded-[2px]">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0047bb]">
                Mode 3
              </span>
              <h2 className="text-xl font-black text-[#071d49]">
                Weekly Retest
              </h2>
              <p className="text-sm text-[#605e5c] leading-relaxed">
                Give 10 questions on focus concepts to evaluate progress against your diagnostic baseline and update your learning plan.
              </p>
            </div>

            <button
              onClick={() => onSelectMode('retest')}
              className="w-full py-3 px-4 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer text-center"
            >
              Start Weekly Retest
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
