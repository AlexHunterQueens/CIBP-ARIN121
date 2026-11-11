import { AssessmentRow, AssessmentType, DiagnosticResult, FocusConcept, LevelType } from './types';
import { CONCEPT_LIST, CONCEPT_LIBRARY } from './conceptLibrary';

/**
 * Extracts question number and total from text like "Question 4 of 20" or "QUESTION 2 OF 5"
 */
export function parseQuestionHeader(text: string): { current: number; total: number } | null {
  const match = text.match(/question\s+(\d+)\s+of\s+(\d+)/i);
  if (match) {
    return {
      current: parseInt(match[1], 10),
      total: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Strips question header (e.g. "**Question 13 of 20 (Area: Valuation)**") and any greeting/preamble before it.
 * Extracts topic tag from the area inside the brackets (e.g. "VALUATION" with no brackets or asterisks).
 */
export function cleanQuestionForCard(
  rawText: string,
  defaultTopic?: string
): { cleanQuestion: string; topicTag: string } {
  if (!rawText) {
    const fallback = (defaultTopic || 'Core Concept')
      .replace(/^(?:area|topic)[:\s]*/i, '')
      .replace(/[*()\[\]]/g, '')
      .trim()
      .toUpperCase();
    return {
      cleanQuestion: '',
      topicTag: fallback || 'CORE CONCEPT',
    };
  }

  let text = rawText.trim();
  let extractedTopic = '';

  // Match header like "**Question 13 of 20 (Area: Valuation)**" or "Question 1 of 20"
  // Group 3 is parentheses content (e.g. "Area: Valuation"), Group 4 is square brackets [Valuation]
  const headerRegex = /(?:\*\*|#+)?\s*Question\s+(\d+)\s+of\s+(\d+)(?:[^\n\r(]*?\(([^)]+)\)|[^\n\r[]*?\[([^\]]+)\])?[:\s\-\.]*(?:\*\*)?[:\s\-]*/i;
  const match = text.match(headerRegex);

  if (match && match.index !== undefined) {
    const bracketContent = match[3] || match[4];
    if (bracketContent) {
      extractedTopic = bracketContent;
    }
    // Strip everything before the header (greeting or preamble) AND the header itself!
    text = text.slice(match.index + match[0].length).trim();
  }

  // Also check if immediately following there is an Area/Topic line or bracket
  const secondaryTopicRegex = /^(?:\*\*|#+)?\s*(?:\(([^)]+)\)|\[([^\]]+)\]|(?:area|topic):\s*([^\n\r*]+))(?:\*\*)?[:\s-]*[\r\n]*/i;
  const secMatch = text.match(secondaryTopicRegex);
  if (secMatch) {
    if (!extractedTopic) {
      extractedTopic = secMatch[1] || secMatch[2] || secMatch[3] || '';
    }
    text = text.slice(secMatch[0].length).trim();
  }

  // Strip any leftover leading "Question:" or markdown hashes or asterisks
  text = text.replace(/^(?:#+\s*|\*\*\s*)*(?:question\s*[:\s\-]*|\*\*|\*)/i, '').trim();

  // If topic was extracted, clean it: remove "Area:", "Topic:", asterisks, brackets, and uppercase
  let topicTag = '';
  if (extractedTopic) {
    topicTag = extractedTopic
      .replace(/^(?:area|topic)[:\s]*/i, '')
      .replace(/[*()\[\]]/g, '')
      .trim()
      .toUpperCase();
  }

  if (!topicTag) {
    const rawDefault = defaultTopic || 'Core Concept';
    topicTag = rawDefault
      .replace(/^(?:area|topic)[:\s]*/i, '')
      .replace(/[*()\[\]]/g, '')
      .trim()
      .toUpperCase();
  }

  if (!topicTag) {
    topicTag = 'CORE CONCEPT';
  }

  return {
    cleanQuestion: text,
    topicTag,
  };
}

/**
 * Extracts clean question text and topic from AI response
 */
export function extractCleanQuestionText(text: string, defaultTopic?: string): { topic: string; question: string } {
  const { cleanQuestion, topicTag } = cleanQuestionForCard(text, defaultTopic);
  return { topic: topicTag, question: cleanQuestion };
}

/**
 * Resolves the question text to display in the Results Table.
 * Replaces labels like "**Q1 (A1)**" with the actual question text the student was asked.
 * Works at display time on already-saved localStorage results.
 */
export function getDisplayQuestionText(
  row: AssessmentRow,
  askedQuestions?: string[],
  history?: { role: string; content: string }[]
): string {
  const rowIdx = row.index - 1;

  // 1. If stored in askedQuestions array
  if (askedQuestions && askedQuestions[rowIdx] && askedQuestions[rowIdx].trim().length > 10) {
    const { cleanQuestion } = cleanQuestionForCard(askedQuestions[rowIdx]);
    if (cleanQuestion) return cleanQuestion;
  }

  // 2. Check if row.question has real question text (and isn't just a label like "**Q1 (A1)**" or "Q1 (A1)")
  const rawQ = (row.question || '').trim();
  const isJustLabel =
    /^(\*\*)?Q\d+(\s*\([A-Za-z0-9\s]+\))?(\*\*)?$/i.test(rawQ) ||
    /^(\*\*)?Question\s+\d+(\s*\([A-Za-z0-9\s]+\))?(\*\*)?$/i.test(rawQ) ||
    rawQ.length < 15;

  if (!isJustLabel && rawQ.length >= 15) {
    const { cleanQuestion } = cleanQuestionForCard(rawQ);
    if (cleanQuestion) return cleanQuestion;
  }

  // 3. Look in history for the actual question text asked by the model
  if (history && history.length > 0) {
    for (const msg of history) {
      if (msg.role === 'model') {
        const header = parseQuestionHeader(msg.content);
        if (header && header.current === row.index) {
          const { cleanQuestion } = cleanQuestionForCard(msg.content);
          if (cleanQuestion) return cleanQuestion;
        }
      }
    }
  }

  // 4. Fallback to Concept Library sample question
  if (row.conceptId && CONCEPT_LIBRARY[row.conceptId]?.sampleQuestion) {
    return CONCEPT_LIBRARY[row.conceptId].sampleQuestion;
  }

  // 5. Default by index (A1..D5)
  const defaultConcepts = ['A1','A2','A3','A4','A5','E1','E2','E3','E4','E5','V1','V2','V3','V4','V5','D1','D2','D3','D4','D5'];
  const cid = defaultConcepts[rowIdx] || 'A1';
  if (CONCEPT_LIBRARY[cid]?.sampleQuestion) {
    return CONCEPT_LIBRARY[cid].sampleQuestion;
  }

  return rawQ.replace(/[*()\[\]]/g, '').trim();
}

/**
 * Parses markdown assessment table into structured AssessmentRow array
 */
export function parseAssessmentTable(
  rawText: string,
  studentAnswersList?: string[],
  askedQuestions?: string[]
): AssessmentRow[] {
  const rows: AssessmentRow[] = [];
  const lines = rawText.split('\n');

  let tableStarted = false;
  let headers: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) {
      if (tableStarted && line === '') {
        // Table ended or blank line
      }
      continue;
    }

    // Split line by '|'
    const cols = line
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cols.length < 3) continue;

    // Check if header row
    if (cols.some(c => /question/i.test(c)) && cols.some(c => /assessment/i.test(c))) {
      tableStarted = true;
      headers = cols.map(c => c.toLowerCase());
      continue;
    }

    // Skip separator row like |---|---|---|
    if (cols.every(c => /^[-:\s]+$/.test(c))) {
      continue;
    }

    if (tableStarted && cols.length >= 3) {
      // Find indexes
      let qIdx = headers.findIndex(h => h.includes('question'));
      let aIdx = headers.findIndex(h => h.includes('student') || h.includes('answer') || h.includes('your'));
      let assessIdx = headers.findIndex(h => h.includes('assessment'));
      let expIdx = headers.findIndex(h => h.includes('explanation'));

      if (qIdx === -1) qIdx = 0;
      if (aIdx === -1) aIdx = 1;
      if (assessIdx === -1) assessIdx = 2;
      if (expIdx === -1) expIdx = 3;

      const rawQ = cols[qIdx] || `Question ${rows.length + 1}`;
      const storedQ = askedQuestions && askedQuestions[rows.length];
      const qText = storedQ ? cleanQuestionForCard(storedQ).cleanQuestion : rawQ;
      const studentAns = cols[aIdx] || (studentAnswersList && studentAnswersList[rows.length]) || '';
      const rawAssessment = cols[assessIdx] || '';
      const explanation = cols[expIdx] || (cols.length > assessIdx + 1 ? cols.slice(assessIdx + 1).join(' ') : '');

      let assessment: AssessmentType = 'Incorrect';
      let points = 0;

      const lowerAssess = rawAssessment.toLowerCase();
      if (lowerAssess.includes('not attempted') || lowerAssess.includes('skipped')) {
        assessment = 'Not attempted';
        points = 0;
      } else if (lowerAssess.includes('partially correct') || lowerAssess.includes('partial') || lowerAssess.includes('0.5')) {
        assessment = 'Partially correct';
        points = 0.5;
      } else if (lowerAssess.includes('correct') && !lowerAssess.includes('incorrect')) {
        assessment = 'Correct';
        points = 1.0;
      } else {
        assessment = 'Incorrect';
        points = 0;
      }

      // Try to determine conceptId
      let matchedConceptId: string | undefined;
      for (const concept of CONCEPT_LIST) {
        if (qText.toLowerCase().includes(concept.id.toLowerCase()) || qText.toLowerCase().includes(concept.name.toLowerCase())) {
          matchedConceptId = concept.id;
          break;
        }
      }
      if (!matchedConceptId) {
        // Map sequentially by default if rows correspond to A1..D5
        const defaultConcepts = ['A1','A2','A3','A4','A5','E1','E2','E3','E4','E5','V1','V2','V3','V4','V5','D1','D2','D3','D4','D5'];
        if (rows.length < defaultConcepts.length) {
          matchedConceptId = defaultConcepts[rows.length];
        }
      }

      rows.push({
        index: rows.length + 1,
        question: qText,
        studentAnswer: studentAns,
        assessment,
        points,
        explanation,
        conceptId: matchedConceptId,
      });
    }
  }

  // If table wasn't parsed or had fewer rows, fallback to extracting any marked assessments
  if (rows.length === 0) {
    // Generate fallback rows from default concept list and student answers if available
    const defaultConcepts = ['A1','A2','A3','A4','A5','E1','E2','E3','E4','E5','V1','V2','V3','V4','V5','D1','D2','D3','D4','D5'];
    for (let i = 0; i < (studentAnswersList?.length || 20); i++) {
      const cId = defaultConcepts[i] || 'A1';
      const cItem = CONCEPT_LIBRARY[cId];
      const ans = studentAnswersList?.[i] || 'No answer recorded';
      const isSkipped = ans.toLowerCase().includes("don't know") || ans.toLowerCase().includes('idk');
      const storedQ = askedQuestions?.[i];

      rows.push({
        index: i + 1,
        question: (storedQ ? cleanQuestionForCard(storedQ).cleanQuestion : null) || cItem?.sampleQuestion || `Question ${i + 1}`,
        studentAnswer: ans,
        assessment: isSkipped ? 'Not attempted' : 'Incorrect',
        points: 0,
        explanation: isSkipped ? 'Not attempted' : 'Concept review recommended.',
        conceptId: cId,
      });
    }
  }

  return rows;
}

/**
 * Builds the complete DiagnosticResult from assessment rows, adhering to score count and plan lengths
 */
export function calculateDiagnosticResult(
  assessmentRows: AssessmentRow[],
  interviewTimeline: string | null,
  rawAiFeedback: string,
  askedQuestions?: string[]
): DiagnosticResult {
  let score = 0;
  let correct = 0;
  let partial = 0;
  let incorrect = 0;
  let notAttempted = 0;

  for (const row of assessmentRows) {
    score += row.points;
    if (row.assessment === 'Correct') correct++;
    else if (row.assessment === 'Partially correct') partial++;
    else if (row.assessment === 'Not attempted') notAttempted++;
    else incorrect++;
  }

  // Determine Level: 0 to 8 Beginner, 9 to 15 Intermediate, 16 to 20 Superday
  let level: LevelType = 'Beginner';
  let defaultWeeks: 4 | 8 | 16 = 16;

  if (score >= 16) {
    level = 'Superday';
    defaultWeeks = 4;
  } else if (score >= 9) {
    level = 'Intermediate';
    defaultWeeks = 8;
  } else {
    level = 'Beginner';
    defaultWeeks = 16;
  }

  // If the interview is within 4 weeks, use the 4 week plan and put the weakest concepts first
  const isWithin4Weeks = interviewTimeline === 'Within 4 weeks';
  const planWeeks: 4 | 8 | 16 = isWithin4Weeks ? 4 : defaultWeeks;

  // Build ranked focus concepts: 3 to 5 concepts
  // Priority: Incorrect & Not attempted first, then Partially correct, then any unmastered
  const rankedRows = [...assessmentRows].sort((a, b) => {
    const priorityWeight = (assess: AssessmentType) => {
      if (assess === 'Incorrect') return 1;
      if (assess === 'Not attempted') return 2;
      if (assess === 'Partially correct') return 3;
      return 4;
    };
    return priorityWeight(a.assessment) - priorityWeight(b.assessment);
  });

  const selectedRows = rankedRows.filter(r => r.assessment !== 'Correct').slice(0, 5);
  // Ensure at least 3
  if (selectedRows.length < 3) {
    for (const r of rankedRows) {
      if (!selectedRows.includes(r) && selectedRows.length < 3) {
        selectedRows.push(r);
      }
    }
  }

  const focusConcepts: FocusConcept[] = selectedRows.map((row, idx) => {
    const conceptItem = (row.conceptId && CONCEPT_LIBRARY[row.conceptId]) || CONCEPT_LIST[idx % CONCEPT_LIST.length];
    const isMajorGap = row.assessment === 'Incorrect' || row.assessment === 'Not attempted';

    return {
      priority: idx + 1,
      conceptId: conceptItem.id,
      conceptName: `${conceptItem.id}: ${conceptItem.name}`,
      area: conceptItem.area,
      flaggedBy: `Question ${row.index} · ${row.assessment} (${row.points})`,
      status: 'Not started',
      recommendedMode: isMajorGap ? 'Learn' : 'Interview Drill',
    };
  });

  // Next retest date: 7 days from now
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  const nextRetestDate = nextDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    score,
    level,
    planWeeks,
    currentWeek: 1,
    nextRetestDate,
    focusConcepts,
    assessmentRows,
    counts: {
      correct,
      partial,
      incorrect,
      notAttempted,
    },
    rawAiFeedback,
    askedQuestions,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Parses Learn mode response from AI
 */
export function parseLearnModeContent(text: string, currentConceptId?: string): {
  reading: string;
  workedExample: string;
  question: string;
  hint?: string;
  explanation?: string;
} {
  const concept = currentConceptId ? CONCEPT_LIBRARY[currentConceptId] : null;

  let reading = concept?.reading || '';
  let workedExample = concept?.workedExample || '';
  let question = concept?.sampleQuestion || '';
  let hint: string | undefined;
  let explanation: string | undefined;

  // Check for hint
  const hintMatch = text.match(/hint(?:\s*1\s*of\s*1)?[:\s\-]+([^\n\r]+(?:[\r\n]+[^\n\r#]+)*)/i);
  if (hintMatch) {
    hint = hintMatch[1].trim();
  }

  // Check for worked example in markdown e.g. "Worked example:" or "### Worked example"
  const workedExampleMatch = text.match(/(?:worked\s+example|example)[:\s\-*#]+([\s\S]*?)(?=(?:question|q:|hint|\n\n###|$))/i);
  if (workedExampleMatch && workedExampleMatch[1].trim().length > 20) {
    workedExample = workedExampleMatch[1].trim();
  }

  // Check for reading (before worked example or question)
  const readingMatch = text.match(/(?:reading|concept|overview)[:\s\-*#]+([\s\S]*?)(?=(?:worked\s+example|example|question|q:|$))/i);
  if (readingMatch && readingMatch[1].trim().length > 20) {
    reading = readingMatch[1].trim();
  }

  // Check for question
  const questionMatch = text.match(/(?:question|q:)[:\s\-*#]+([\s\S]*?)(?=(?:hint|explanation|$))/i);
  if (questionMatch && questionMatch[1].trim().length > 10) {
    question = questionMatch[1].trim();
  } else if (!hintMatch && !workedExampleMatch && text.trim().length > 0) {
    // If the response is primarily text
    const clean = text.trim();
    if (clean.includes('?')) {
      question = clean;
    } else {
      reading = clean;
    }
  }

  return { reading, workedExample, question, hint, explanation };
}

/**
 * Parses Interview Drill feedback on Accurate, Order, Terms
 */
export function parseDrillFeedback(text: string): {
  accurate: string;
  order: string;
  terms: string;
  nextQuestion?: string;
  isComplete: boolean;
  strength?: string;
  priority?: string;
} {
  let accurate = 'Checked for financial logic and calculation consistency.';
  let order = 'Checked for logical sequence across financial statements and bridges.';
  let terms = 'Checked for correct technical terminology and investment banking phrasing.';
  let nextQuestion: string | undefined;
  let isComplete = false;
  let strength: string | undefined;
  let priority: string | undefined;

  const accurateMatch = text.match(/accurate[:\s\-]+([^\n\r]+)/i);
  if (accurateMatch) accurate = accurateMatch[1].trim();

  const orderMatch = text.match(/order[:\s\-]+([^\n\r]+)/i);
  if (orderMatch) order = orderMatch[1].trim();

  const termsMatch = text.match(/terms?[:\s\-]+([^\n\r]+)/i);
  if (termsMatch) terms = termsMatch[1].trim();

  const strengthMatch = text.match(/(?:strength|strong)[:\s\-]+([^\n\r]+)/i);
  if (strengthMatch) strength = strengthMatch[1].trim();

  const priorityMatch = text.match(/(?:priority|work\s+on|focus)[:\s\-]+([^\n\r]+)/i);
  if (priorityMatch) priority = priorityMatch[1].trim();

  if (/summary|drill\s+complete|5\s+questions/i.test(text) && (strength || priority)) {
    isComplete = true;
  }

  // Find next question if present
  const qMatch = text.match(/(?:the\s+interviewer\s+asks|next\s+question|question\s+\d+\s+of\s+5)[:\s\-]+([\s\S]+)/i);
  if (qMatch) {
    nextQuestion = qMatch[1].trim();
  }

  return { accurate, order, terms, nextQuestion, isComplete, strength, priority };
}
