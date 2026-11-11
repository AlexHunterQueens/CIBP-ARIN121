import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WelcomeSurvey } from './components/WelcomeSurvey';
import { DiagnosticQuiz } from './components/DiagnosticQuiz';
import { ResultsView } from './components/ResultsView';
import { MyPlanView } from './components/MyPlanView';
import { LearnModeView } from './components/LearnModeView';
import { InterviewDrillView } from './components/InterviewDrillView';
import { WeeklyRetestView } from './components/WeeklyRetestView';
import {
  ChatMessage,
  ConceptStatus,
  DiagnosticResult,
  DrillFeedback,
  SurveyState,
} from './lib/types';
import { sendChatRequest } from './lib/api';
import {
  calculateDiagnosticResult,
  cleanQuestionForCard,
  extractCleanQuestionText,
  parseAssessmentTable,
  parseDrillFeedback,
  parseLearnModeContent,
  parseQuestionHeader,
} from './lib/parser';
import { CONCEPT_LIBRARY, CONCEPT_LIST } from './lib/conceptLibrary';
import { FormattedText } from './components/FormattedText';

const STORAGE_KEY = 'cibp_app_state_v1';

export default function App() {
  // App state
  const [survey, setSurvey] = useState<SurveyState | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    'survey' | 'diagnostic' | 'results' | 'plan' | 'learn' | 'drill' | 'retest'
  >('survey');

  // Conversation history for AI context
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentTopicArea, setCurrentTopicArea] = useState('Accounting');

  // Learn mode state
  const [activeLearnConceptId, setActiveLearnConceptId] = useState<string>('A3');

  // Drill state
  const [drillQuestionIndex, setDrillQuestionIndex] = useState(1);
  const [drillQuestionText, setDrillQuestionText] = useState('');
  const [drillDifficulty, setDrillDifficulty] = useState<1 | 2 | 3>(1);
  const [lastDrillFeedback, setLastDrillFeedback] = useState<DrillFeedback | null>(null);
  const [isDrillComplete, setIsDrillComplete] = useState(false);
  const [drillSummary, setDrillSummary] = useState<{ strength: string; priority: string } | null>(null);

  // Retest state
  const [retestIndex, setRetestIndex] = useState(1);
  const [retestQuestionText, setRetestQuestionText] = useState('');
  const [retestTopicArea, setRetestTopicArea] = useState('');
  const [retestAnswers, setRetestAnswers] = useState<string[]>([]);
  const [retestResult, setRetestResult] = useState<DiagnosticResult | null>(null);
  const [isShowingRetestResults, setIsShowingRetestResults] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBusyError, setHasBusyError] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState<string>('Gemini is busy, retrying...');
  const [lastPendingAction, setLastPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.survey) setSurvey(parsed.survey);
        if (parsed.diagnosticResult) {
          setDiagnosticResult(parsed.diagnosticResult);
          setActiveTab('plan');
        }
        if (parsed.history) setHistory(parsed.history);
        if (parsed.askedQuestions) {
          setAskedQuestions(parsed.askedQuestions);
        } else if (parsed.diagnosticResult?.askedQuestions) {
          setAskedQuestions(parsed.diagnosticResult.askedQuestions);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved state from localStorage', e);
    }
  }, []);

  // Save state to localStorage whenever survey, diagnosticResult, history, or askedQuestions changes
  useEffect(() => {
    try {
      const stateToSave = {
        survey,
        diagnosticResult,
        history,
        askedQuestions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }, [survey, diagnosticResult, history, askedQuestions]);

  // Helper to append message and call AI
  const callAiWithHistory = async (newHistory: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStatusText('Gemini is busy, retrying...');
    try {
      const reply = await sendChatRequest(newHistory, (statusMsg) => {
        setLoadingStatusText(statusMsg);
      });
      return reply;
    } catch (error: any) {
      const msg = error.message || 'Error communicating with AI tutor';
      if (msg.includes('Daily free limit reached') || /daily|per\s*day/i.test(msg)) {
        setDailyLimitReached(true);
      }
      setErrorMessage(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setHasBusyError(false);
    setErrorMessage(null);
    setDailyLimitReached(false);
    setLoadingStatusText('Gemini is busy, retrying...');
    if (lastPendingAction) {
      await lastPendingAction();
    }
  };

  // STEP 1: Start Diagnostic after survey
  const handleStartDiagnostic = async (surveyData: SurveyState) => {
    setSurvey(surveyData);
    setStudentAnswers([]);
    setAskedQuestions([]);
    setCurrentQuestionIndex(1);
    setHasBusyError(false);
    setLastPendingAction(() => () => handleStartDiagnostic(surveyData));

    const firstUserMsg = `Year: ${surveyData.year}. Finance exposure: ${surveyData.financeExposure}. First interview: ${surveyData.interviewTimeline}.`;
    const initialHistory: ChatMessage[] = [{ role: 'user', content: firstUserMsg }];

    try {
      const reply = await callAiWithHistory(initialHistory);
      const updatedHistory: ChatMessage[] = [
        ...initialHistory,
        { role: 'model', content: reply },
      ];
      setHistory(updatedHistory);

      // Parse question 1
      const header = parseQuestionHeader(reply);
      const { cleanQuestion, topicTag } = cleanQuestionForCard(reply, 'Accounting');
      const qText = cleanQuestion || CONCEPT_LIBRARY.A1.sampleQuestion;

      setCurrentQuestionIndex(header?.current || 1);
      setCurrentTopicArea(topicTag || 'ACCOUNTING');
      setCurrentQuestionText(qText);
      setAskedQuestions([qText]);
      setHasBusyError(false);
      setLastPendingAction(null);
      setActiveTab('diagnostic');
    } catch (err) {
      console.error('Failed to start diagnostic with AI:', err);
      setHasBusyError(true);
      setIsLoading(false);
    }
  };

  // STEP 2: Submit an answer during the Diagnostic Quiz
  const handleDiagnosticAnswer = async (answerText: string) => {
    setHasBusyError(false);
    setLastPendingAction(() => () => handleDiagnosticAnswer(answerText));

    const isAlreadyAnswered = studentAnswers.length >= currentQuestionIndex;
    const updatedAnswers = isAlreadyAnswered ? studentAnswers : [...studentAnswers, answerText];
    if (!isAlreadyAnswered) {
      setStudentAnswers(updatedAnswers);
    }

    const lastMsg = history[history.length - 1];
    const updatedHistory: ChatMessage[] =
      lastMsg && lastMsg.role === 'user' && lastMsg.content === answerText
        ? history
        : [...history, { role: 'user', content: answerText }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      const nextHistory: ChatMessage[] = [
        ...updatedHistory,
        { role: 'model', content: reply },
      ];
      setHistory(nextHistory);

      // Check if diagnostic quiz is complete (all 20 answered or AI returned assessment table)
      const hasTable = reply.includes('| Assessment |') || reply.includes('| Question |');
      const asksNextQuestion = /Question\s+\d+\s+of\s+20/i.test(reply) && !hasTable;
      const isComplete =
        !asksNextQuestion &&
        (updatedAnswers.length >= 20 || hasTable || reply.includes('Possible Areas for Review'));

      if (isComplete) {
        // Parse results table using stored askedQuestions
        const assessmentRows = parseAssessmentTable(reply, updatedAnswers, askedQuestions);
        const result = calculateDiagnosticResult(
          assessmentRows,
          survey?.interviewTimeline || null,
          reply,
          askedQuestions
        );
        setDiagnosticResult(result);
        setHasBusyError(false);
        setLastPendingAction(null);
        setActiveTab('results');
      } else {
        // Parse next question
        const header = parseQuestionHeader(reply);
        const { cleanQuestion, topicTag } = cleanQuestionForCard(reply, currentTopicArea);
        const qIdx = header?.current || updatedAnswers.length + 1;
        const qText = cleanQuestion || (CONCEPT_LIST[qIdx - 1]?.sampleQuestion) || `Question ${qIdx}`;

        setCurrentQuestionIndex(qIdx);
        setCurrentTopicArea(topicTag);
        setCurrentQuestionText(qText);
        setAskedQuestions((prev) => {
          const next = [...prev];
          next[qIdx - 1] = qText;
          return next;
        });
        setHasBusyError(false);
        setLastPendingAction(null);
      }
    } catch (err) {
      console.error('Failed to submit answer to AI:', err);
      setHasBusyError(true);
      setIsLoading(false);
    }
  };

  // STEP 3: Mode selection from My Plan
  const handleSelectMode = (mode: 'learn' | 'drill' | 'retest', conceptId?: string) => {
    if (conceptId) {
      setActiveLearnConceptId(conceptId);
    } else if (diagnosticResult?.focusConcepts.length) {
      setActiveLearnConceptId(diagnosticResult.focusConcepts[0].conceptId);
    }

    if (mode === 'learn') {
      setActiveTab('learn');
    } else if (mode === 'drill') {
      startInterviewDrill();
      setActiveTab('drill');
    } else if (mode === 'retest') {
      startWeeklyRetest();
      setActiveTab('retest');
    }
  };

  // Status updates on focus concepts
  const handleUpdateConceptStatus = (conceptId: string, status: ConceptStatus) => {
    if (!diagnosticResult) return;
    const updated = {
      ...diagnosticResult,
      focusConcepts: diagnosticResult.focusConcepts.map((c) =>
        c.conceptId === conceptId ? { ...c, status } : c
      ),
    };
    setDiagnosticResult(updated);
  };

  // LEARN MODE: Answer submission
  const handleLearnAnswerSubmit = async (
    conceptId: string,
    answer: string
  ): Promise<{ hint?: string; explanation?: string; isCorrect?: boolean }> => {
    const concept = CONCEPT_LIBRARY[conceptId] || CONCEPT_LIBRARY['A3'];
    const userMsg = `Learn Mode check question for ${concept.id} ${concept.name}. My answer: "${answer}"`;
    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: userMsg }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      setHistory([...updatedHistory, { role: 'model', content: reply }]);

      const parsed = parseLearnModeContent(reply, conceptId);

      const isCorrect =
        reply.toLowerCase().includes('correct') &&
        !reply.toLowerCase().includes('incorrect') &&
        !reply.toLowerCase().includes('partially');

      return {
        hint: parsed.hint,
        explanation: reply,
        isCorrect,
      };
    } catch {
      // Deterministic fallback
      return {
        explanation: `Concept Reference: ${concept.explanation}`,
        isCorrect: true,
      };
    }
  };

  // LEARN MODE: Side question
  const handleAskSideQuestion = async (
    conceptId: string,
    sideQuestionText: string
  ): Promise<string> => {
    const userMsg = `Side question regarding ${conceptId}: ${sideQuestionText}`;
    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: userMsg }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      setHistory([...updatedHistory, { role: 'model', content: reply }]);
      return reply;
    } catch (err: any) {
      return (
        CONCEPT_LIBRARY[conceptId]?.reading ||
        'Under accrual and valuation principles, focus on matching operating metrics with Enterprise Value and after-debt metrics with Equity Value.'
      );
    }
  };

  // INTERVIEW DRILL: Initialize
  const startInterviewDrill = async () => {
    setDrillQuestionIndex(1);
    setDrillDifficulty(1);
    setLastDrillFeedback(null);
    setIsDrillComplete(false);
    setDrillSummary(null);

    const targetConcepts = diagnosticResult?.focusConcepts.map((c) => c.conceptId).join(', ') || 'A3, D2, E4';
    const initMsg = `2. Interview Drill: Focus concepts ${targetConcepts}. Ask question 1 phrased like an interviewer.`;
    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: initMsg }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      setHistory([...updatedHistory, { role: 'model', content: reply }]);
      const cleaned = reply
        .replace(/^(?:the interviewer asks[:\s]*)/i, '')
        .replace(/^(?:question\s+\d+\s+of\s+5[:\s]*)/i, '')
        .trim();
      setDrillQuestionText(cleaned || CONCEPT_LIBRARY.A3.sampleQuestion);
    } catch {
      setDrillQuestionText(CONCEPT_LIBRARY.A3.sampleQuestion);
    }
  };

  // INTERVIEW DRILL: Submit answer
  const handleDrillAnswerSubmit = async (answer: string) => {
    const drillMsg = `Drill answer for Question ${drillQuestionIndex} of 5: "${answer}"`;
    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: drillMsg }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      setHistory([...updatedHistory, { role: 'model', content: reply }]);

      const parsed = parseDrillFeedback(reply);
      setLastDrillFeedback({
        accurate: parsed.accurate,
        order: parsed.order,
        terms: parsed.terms,
      });

      if (drillQuestionIndex >= 5 || parsed.isComplete) {
        setIsDrillComplete(true);
        setDrillSummary({
          strength:
            parsed.strength ||
            'Clear logical progression through the financial statements and valuation concepts.',
          priority:
            parsed.priority ||
            'Continue refining precision when explaining non-cash adjustments and WACC inputs.',
        });
      } else {
        setDrillQuestionIndex((prev) => prev + 1);

        // Adjust difficulty
        const wasPositive =
          !parsed.accurate.toLowerCase().includes('incorrect') &&
          !parsed.terms.toLowerCase().includes('missing');
        if (wasPositive && drillDifficulty < 3) {
          setDrillDifficulty((prev) => (prev + 1) as 2 | 3);
        } else if (!wasPositive && drillDifficulty > 1) {
          setDrillDifficulty((prev) => (prev - 1) as 1 | 2);
        }

        // Set next question
        if (parsed.nextQuestion) {
          setDrillQuestionText(parsed.nextQuestion);
        } else {
          const nextConcept =
            diagnosticResult?.focusConcepts[drillQuestionIndex % diagnosticResult.focusConcepts.length];
          const conceptItem = (nextConcept && CONCEPT_LIBRARY[nextConcept.conceptId]) || CONCEPT_LIBRARY['D2'];
          setDrillQuestionText(conceptItem.sampleQuestion);
        }
      }
    } catch {
      // Fallback feedback
      setLastDrillFeedback({
        accurate: 'Correct financial intuition on core adjustments.',
        order: 'Walks through statements in standard sequence.',
        terms: 'Applied standard investment banking vocabulary.',
      });
      if (drillQuestionIndex >= 5) {
        setIsDrillComplete(true);
        setDrillSummary({
          strength: 'Structured answers out loud with clear direction.',
          priority: 'Double-check signs on working capital changes and capex.',
        });
      } else {
        setDrillQuestionIndex((prev) => prev + 1);
        const conceptItem = CONCEPT_LIST[(drillQuestionIndex + 2) % CONCEPT_LIST.length];
        setDrillQuestionText(conceptItem.sampleQuestion);
      }
    }
  };

  // WEEKLY RETEST: Initialize
  const startWeeklyRetest = async () => {
    setRetestIndex(1);
    setRetestAnswers([]);
    setRetestResult(null);
    setIsShowingRetestResults(false);

    const retestMsg = `3. Weekly Retest. Give 10 questions on my focus concepts. Start with Question 1 of 10.`;
    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: retestMsg }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      setHistory([...updatedHistory, { role: 'model', content: reply }]);
      const header = parseQuestionHeader(reply);
      const { topic, question } = extractCleanQuestionText(reply);
      setRetestIndex(header?.current || 1);
      setRetestTopicArea(topic || 'Focus Concept');
      setRetestQuestionText(question || (diagnosticResult?.focusConcepts[0] && CONCEPT_LIBRARY[diagnosticResult.focusConcepts[0].conceptId]?.sampleQuestion) || 'Walk through a DCF from start to finish.');
    } catch {
      setRetestIndex(1);
      setRetestTopicArea('Focus Concept');
      setRetestQuestionText(
        (diagnosticResult?.focusConcepts[0] &&
          CONCEPT_LIBRARY[diagnosticResult.focusConcepts[0].conceptId]?.sampleQuestion) ||
          'Walk through a DCF from start to finish.'
      );
    }
  };

  // WEEKLY RETEST: Submit answer
  const handleRetestAnswerSubmit = async (answerText: string) => {
    const updatedAnswers = [...retestAnswers, answerText];
    setRetestAnswers(updatedAnswers);

    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: answerText }];
    setHistory(updatedHistory);

    try {
      const reply = await callAiWithHistory(updatedHistory);
      setHistory([...updatedHistory, { role: 'model', content: reply }]);

      if (updatedAnswers.length >= 10 || reply.includes('| Assessment |')) {
        const assessmentRows = parseAssessmentTable(reply, updatedAnswers);
        const res = calculateDiagnosticResult(
          assessmentRows,
          survey?.interviewTimeline || null,
          reply
        );
        setRetestResult(res);
        setIsShowingRetestResults(true);

        // Update learning plan progress
        if (diagnosticResult) {
          const updatedPlan = {
            ...diagnosticResult,
            currentWeek: Math.min(diagnosticResult.planWeeks, diagnosticResult.currentWeek + 1),
            nextRetestDate: res.nextRetestDate,
          };
          setDiagnosticResult(updatedPlan);
        }
      } else {
        const header = parseQuestionHeader(reply);
        const { topic, question } = extractCleanQuestionText(reply);
        setRetestIndex(header?.current || updatedAnswers.length + 1);
        setRetestTopicArea(topic || 'Focus Concept');
        setRetestQuestionText(question);
      }
    } catch {
      if (updatedAnswers.length >= 10) {
        const assessmentRows = parseAssessmentTable('', updatedAnswers);
        const res = calculateDiagnosticResult(
          assessmentRows,
          survey?.interviewTimeline || null,
          'Weekly retest completed.'
        );
        setRetestResult(res);
        setIsShowingRetestResults(true);
      } else {
        const nextConcept =
          diagnosticResult?.focusConcepts[updatedAnswers.length % diagnosticResult.focusConcepts.length];
        const conceptItem = (nextConcept && CONCEPT_LIBRARY[nextConcept.conceptId]) || CONCEPT_LIST[updatedAnswers.length];
        setRetestIndex(updatedAnswers.length + 1);
        setRetestTopicArea(conceptItem.area);
        setRetestQuestionText(conceptItem.sampleQuestion);
      }
    }
  };

  // Reset all state to start fresh
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your diagnostic survey and plan?')) {
      localStorage.removeItem(STORAGE_KEY);
      setSurvey(null);
      setDiagnosticResult(null);
      setHistory([]);
      setStudentAnswers([]);
      setAskedQuestions([]);
      setCurrentQuestionIndex(1);
      setActiveTab('survey');
    }
  };

  const focusConceptIds = diagnosticResult?.focusConcepts.map((c) => c.conceptId) || ['A3', 'D2', 'E4', 'V4', 'A1'];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#071d49]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setIsShowingRetestResults(false);
          setActiveTab(tab);
        }}
        hasPlan={!!diagnosticResult}
        onReset={handleReset}
      />

      {/* Clear error box with message and Retry button */}
      {hasBusyError && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-[#fff8e6] border-2 border-[#ffa500] p-5 rounded-[2px] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-[#c8215d] block">
                {dailyLimitReached ? 'Daily Limit Reached' : 'Temporary Delay'}
              </span>
              <p className="text-sm font-bold text-[#071d49]">
                {dailyLimitReached
                  ? 'Daily free limit reached. Your answers are saved. Try again tomorrow.'
                  : 'The AI is busy right now. Your answers are saved.'}
              </p>
            </div>
            {!dailyLimitReached && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isLoading}
                className="px-6 py-2.5 text-xs uppercase tracking-wider font-bold text-white bg-[#0047bb] hover:bg-[#071d49] rounded-[2px] transition-colors cursor-pointer whitespace-nowrap"
              >
                {isLoading ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'survey' && (
          <WelcomeSurvey
            onStartDiagnostic={handleStartDiagnostic}
            isLoading={isLoading}
            loadingStatusText={loadingStatusText}
          />
        )}

        {activeTab === 'diagnostic' && (
          <DiagnosticQuiz
            questionNumber={currentQuestionIndex}
            totalQuestions={20}
            topicArea={currentTopicArea}
            questionText={currentQuestionText}
            onSubmitAnswer={handleDiagnosticAnswer}
            isLoading={isLoading}
            loadingStatusText={loadingStatusText}
          />
        )}

        {activeTab === 'results' && diagnosticResult && (
          <ResultsView
            diagnosticResult={diagnosticResult}
            onSeeMyPlan={() => setActiveTab('plan')}
            history={history}
          />
        )}

        {activeTab === 'plan' && diagnosticResult && (
          <MyPlanView
            diagnosticResult={diagnosticResult}
            onSelectMode={handleSelectMode}
            onUpdateConceptStatus={handleUpdateConceptStatus}
            onViewResultsTable={() => setActiveTab('results')}
          />
        )}

        {activeTab === 'learn' && (
          <LearnModeView
            initialConceptId={activeLearnConceptId}
            focusConceptIds={focusConceptIds}
            onConceptLearned={handleUpdateConceptStatus}
            onSubmitAnswer={handleLearnAnswerSubmit}
            onAskSideQuestion={handleAskSideQuestion}
            isLoading={isLoading}
            loadingStatusText={loadingStatusText}
          />
        )}

        {activeTab === 'drill' && (
          <InterviewDrillView
            drillQuestionNumber={drillQuestionIndex}
            totalDrillQuestions={5}
            difficultyLevel={drillDifficulty}
            questionText={drillQuestionText}
            lastFeedback={lastDrillFeedback}
            isDrillComplete={isDrillComplete}
            drillSummary={drillSummary}
            onSubmitAnswer={handleDrillAnswerSubmit}
            onReturnToPlan={() => setActiveTab('plan')}
            onRestartDrill={startInterviewDrill}
            isLoading={isLoading}
            loadingStatusText={loadingStatusText}
          />
        )}

        {activeTab === 'retest' && (
          isShowingRetestResults && retestResult ? (
            <ResultsView
              diagnosticResult={retestResult}
              onSeeMyPlan={() => {
                setIsShowingRetestResults(false);
                setActiveTab('plan');
              }}
              isRetest={true}
              history={history}
            />
          ) : (
            <WeeklyRetestView
              questionNumber={retestIndex}
              totalQuestions={10}
              topicArea={retestTopicArea}
              questionText={retestQuestionText}
              onSubmitAnswer={handleRetestAnswerSubmit}
              isLoading={isLoading}
              loadingStatusText={loadingStatusText}
              onCancelRetest={() => setActiveTab('plan')}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-6 px-4 bg-[#f2f4f8] text-[#605e5c] text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-bold text-[#071d49] uppercase tracking-wider block">
              CIBP · Commerce IB Prep
            </span>
            <p>
              Dedicated investment banking technical interview coaching for Queen's Commerce students.
            </p>
          </div>
          <div className="text-right text-[11px] text-[#605e5c]">
            <span>20 Concept Library</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
