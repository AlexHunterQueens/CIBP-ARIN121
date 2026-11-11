export type YearChoice = 'First year' | 'Second year';
export type FinanceExposureChoice = 'None' | 'One course' | 'Club or work experience';
export type InterviewTimelineChoice = 'None scheduled' | 'Within 4 weeks' | 'Later';

export interface SurveyState {
  year: YearChoice | null;
  financeExposure: FinanceExposureChoice | null;
  interviewTimeline: InterviewTimelineChoice | null;
}

export type AssessmentType = 'Correct' | 'Partially correct' | 'Incorrect' | 'Not attempted';

export interface AssessmentRow {
  index: number;
  question: string;
  studentAnswer: string;
  assessment: AssessmentType;
  points: number;
  explanation: string;
  conceptId?: string;
}

export type ConceptStatus = 'Not started' | 'Learning' | 'Solid';

export interface FocusConcept {
  priority: number;
  conceptId: string;
  conceptName: string;
  area: string;
  flaggedBy: string;
  status: ConceptStatus;
  recommendedMode: 'Learn' | 'Interview Drill';
}

export type LevelType = 'Beginner' | 'Intermediate' | 'Superday';

export interface DiagnosticResult {
  score: number;
  level: LevelType;
  planWeeks: 4 | 8 | 16;
  currentWeek: number;
  nextRetestDate: string;
  focusConcepts: FocusConcept[];
  assessmentRows: AssessmentRow[];
  counts: {
    correct: number;
    partial: number;
    incorrect: number;
    notAttempted: number;
  };
  rawAiFeedback?: string;
  askedQuestions?: string[];
  completedAt: string;
}

export interface DrillFeedback {
  accurate: string;
  order: string;
  terms: string;
  overall?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
