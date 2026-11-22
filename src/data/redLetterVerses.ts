// Canonical New Testament Red-Letter dataset & quote segmenter.
// Covers Jesus's spoken words across Matthew, Mark, Luke, John, Acts, 1 Corinthians 11,
// 2 Corinthians 12, and Revelation.
//
// Range notation:
//   number            -> single verse (e.g., 16)
//   [start, end]      -> inclusive verse range (e.g., [3, 48])
//
// Each chapter maps to:
//   f?: VerseRange[]  -> "full" verses where the entire verse is uninterrupted speech of Jesus
//   q?: VerseRange[]  -> "quoted" verses containing narrator framing + quoted words of Jesus

type VerseRange = number | readonly [number, number];

interface ChapterRedLetterSpec {
  /** Verses whose entire text is Jesus speaking (no narrator frame in that verse). */
  f?: readonly VerseRange[];
  /** Verses containing Jesus's quoted words alongside narrator text. */
  q?: readonly VerseRange[];
}

export type RedLetterVerseMode = 'none' | 'full' | 'quoted';

export interface RedLetterSegment {
  text: string;
  isRedLetter: boolean;
}

const RED_LETTER_CHAPTERS: Record<string, Record<number, ChapterRedLetterSpec>> = {
  // ============================ MATTHEW ============================
  MAT: {
    3: { q: [15] },
    4: { q: [4, 7, 10, 17, 19] },
    5: { f: [[3, 48]] },
    6: { f: [[1, 34]] },
    7: { f: [[1, 27]] },
    8: { q: [3, 4, 7, 10, 13, 20, 22, 26, 32], f: [[11, 12]] },
    9: { q: [2, 4, 6, 9, 12, 15, 22, 24, 28, 29, 30, 37], f: [5, 13, [16, 17], 38] },
    10: { q: [5], f: [[6, 42]] },
    11: { q: [4, 7, 25], f: [[5, 6], [8, 24], [26, 30]] },
    12: { q: [3, 11, 13, 25, 39, 48, 49], f: [[4, 8], 12, [26, 37], [40, 45], 50] },
    13: { q: [3, 11, 24, 31, 33, 37, 51, 52, 57], f: [[4, 9], [12, 23], [25, 30], 32, [38, 50]] },
    14: { q: [16, 18, 27, 29, 31] },
    15: { q: [3, 10, 13, 16, 24, 26, 28, 32, 34], f: [[4, 9], 11, 14, [17, 20]] },
    16: { q: [2, 6, 8, 13, 15, 17, 23, 24], f: [[3, 4], [9, 11], [18, 19], [25, 28]] },
    17: { q: [7, 9, 11, 17, 20, 22, 25, 26], f: [12, 21, 23, 27] },
    18: { q: [3, 22], f: [[4, 20], [23, 35]] },
    19: { q: [4, 8, 11, 14, 17, 18, 21, 23, 26, 28], f: [[5, 6], 9, 12, 19, 24, [29, 30]] },
    20: { q: [18, 21, 22, 23, 25, 32], f: [[1, 16], 19, [26, 28]] },
    21: { q: [2, 13, 16, 19, 21, 24, 27, 28, 31, 42], f: [3, 22, 25, [29, 30], [32, 40], [43, 44]] },
    22: { q: [1, 18, 20, 21, 29, 37, 42, 43], f: [[2, 14], 19, [30, 32], [38, 40], [44, 45]] },
    23: { q: [2], f: [[3, 39]] },
    24: { q: [2, 4], f: [[5, 51]] },
    25: { f: [[1, 46]] },
    26: { q: [2, 10, 18, 21, 23, 25, 26, 27, 31, 34, 36, 38, 40, 42, 45, 50, 52, 55, 64], f: [[11, 13], 24, [28, 29], 32, 39, 41, 46, [53, 54], 56] },
    27: { q: [11, 46] },
    28: { q: [9, 10, 18], f: [[19, 20]] },
  },

  // ============================ MARK ============================
  MRK: {
    1: { q: [15, 17, 25, 38, 41, 44] },
    2: { q: [5, 8, 10, 14, 17, 19, 25, 27], f: [9, 11, [20, 22], 26, 28] },
    3: { q: [3, 4, 5, 23, 33, 34], f: [[24, 29], 35] },
    4: { q: [3, 9, 11, 13, 21, 24, 26, 30, 35, 39, 40], f: [[4, 8], 12, [14, 20], [22, 23], 25, [27, 29], [31, 32]] },
    5: { q: [8, 9, 19, 30, 34, 36, 39, 41] },
    6: { q: [4, 10, 31, 37, 38, 50], f: [11] },
    7: { q: [6, 9, 14, 18, 20, 27, 29, 34], f: [[7, 8], [10, 13], [15, 16], 19, [21, 23]] },
    8: { q: [2, 5, 12, 15, 17, 19, 20, 21, 27, 29, 33, 34], f: [3, 18, [35, 38]] },
    9: { q: [1, 12, 16, 19, 21, 23, 25, 29, 33, 35, 39], f: [13, 31, 37, [40, 50]] },
    10: { q: [3, 5, 14, 18, 21, 23, 24, 27, 29, 33, 36, 38, 39, 42, 49, 51, 52], f: [[6, 9], [11, 12], 15, 19, 25, [30, 31], 34, 40, [43, 45]] },
    11: { q: [2, 14, 17, 22, 29, 33], f: [3, [23, 26], 30] },
    12: { q: [1, 15, 16, 17, 24, 29, 34, 35, 38, 43], f: [[2, 11], [25, 27], [30, 31], [36, 37], [39, 40], 44] },
    13: { q: [2, 5], f: [[6, 37]] },
    14: { q: [6, 13, 18, 20, 22, 24, 27, 30, 32, 34, 36, 37, 41, 48, 62], f: [[7, 9], [14, 15], 21, 25, 28, 38, 42, 49] },
    15: { q: [2, 34] },
    16: { q: [15], f: [[16, 18]] },
  },

  // ============================ LUKE ============================
  LUK: {
    2: { q: [49] },
    4: { q: [4, 8, 12, 18, 21, 23, 24, 35, 43], f: [19, [25, 27]] },
    5: { q: [4, 10, 13, 14, 20, 22, 24, 27, 31, 34, 36], f: [23, 32, 35, [37, 39]] },
    6: { q: [3, 5, 8, 9, 10, 20, 39], f: [4, [21, 38], [40, 49]] },
    7: { q: [9, 13, 14, 22, 24, 40, 43, 44, 48, 50], f: [23, [25, 28], [31, 35], [41, 42], [45, 47]] },
    8: { q: [5, 10, 21, 22, 25, 30, 39, 45, 46, 48, 50, 52, 54], f: [[6, 8], [11, 18]] },
    9: { q: [3, 13, 14, 18, 20, 22, 23, 41, 44, 48, 50, 55, 58, 59, 60, 62], f: [[4, 5], [24, 27], 56] },
    10: { q: [2, 18, 21, 23, 26, 28, 30, 37, 41], f: [[3, 16], [19, 20], 22, 24, [31, 36], 42] },
    11: { q: [2, 5, 17, 28, 29, 39, 46], f: [[3, 4], [6, 13], [18, 26], [30, 36], [40, 44], [47, 52]] },
    12: { q: [1, 14, 15, 16, 22, 42, 54], f: [[2, 12], [17, 21], [23, 40], [43, 53], [55, 59]] },
    13: { q: [2, 6, 12, 15, 18, 20, 24, 32], f: [[3, 5], [7, 9], 16, 19, 21, [25, 30], [33, 35]] },
    14: { q: [3, 5, 8, 12, 16, 26], f: [[9, 11], [13, 14], [17, 24], [27, 35]] },
    15: { q: [4], f: [[5, 32]] },
    16: { q: [1, 15], f: [[2, 13], [16, 31]] },
    17: { q: [1, 6, 14, 17, 19, 20, 22, 37], f: [[2, 4], [7, 10], 18, 21, [23, 36]] },
    18: { q: [2, 6, 10, 16, 19, 22, 24, 27, 29, 31, 41, 42], f: [[3, 5], [7, 8], [11, 14], 17, 20, 25, 30, [32, 33]] },
    19: { q: [5, 9, 12, 30, 40, 42, 46], f: [10, [13, 27], 31, [43, 44]] },
    20: { q: [3, 8, 9, 17, 23, 25, 34, 41, 46], f: [4, [10, 16], 18, 24, [35, 38], [42, 44], 47] },
    21: { q: [3, 6, 8, 29], f: [4, [9, 28], [30, 36]] },
    22: { q: [8, 10, 15, 17, 19, 20, 25, 31, 34, 35, 36, 38, 40, 42, 46, 48, 51, 52, 67, 70], f: [[11, 12], 16, 18, [21, 22], [26, 30], 32, 37, 53, [68, 69]] },
    23: { q: [3, 28, 34, 43, 46], f: [[29, 31]] },
    24: { q: [17, 19, 25, 36, 38, 41, 44, 46], f: [26, 39, [47, 49]] },
  },

  // ============================ JOHN ============================
  JHN: {
    1: { q: [38, 39, 42, 43, 47, 48, 50, 51] },
    2: { q: [4, 7, 8, 16, 19] },
    3: { q: [3, 5, 10], f: [[6, 8], [11, 21]] },
    4: { q: [7, 10, 13, 16, 17, 21, 26, 32, 34, 48, 50], f: [14, 18, [22, 24], [35, 38]] },
    5: { q: [6, 8, 14, 17, 19], f: [[20, 47]] },
    6: { q: [5, 10, 12, 20, 26, 29, 32, 35, 43, 53, 61, 65, 67, 70], f: [27, 33, [36, 40], [44, 51], [54, 58], [62, 64]] },
    7: { q: [6, 16, 21, 28, 33, 37], f: [[7, 8], [17, 19], [22, 24], 29, 34, 38] },
    8: { q: [7, 10, 11, 12, 14, 21, 23, 25, 28, 31, 34, 39, 42, 49, 54, 58], f: [[15, 18], 19, 24, 26, 29, 32, [35, 38], [40, 41], [43, 47], [50, 51], [55, 56]] },
    9: { q: [3, 7, 35, 37, 39, 41], f: [[4, 5]] },
    10: { q: [7, 25, 32, 34], f: [[1, 5], [8, 18], [26, 30], [35, 38]] },
    11: { q: [4, 7, 9, 11, 14, 23, 25, 34, 39, 40, 41, 43, 44], f: [10, 15, 26, 42] },
    12: { q: [7, 23, 28, 30, 35, 44], f: [8, [24, 27], [31, 32], 36, [45, 50]] },
    13: { q: [7, 8, 10, 12, 21, 26, 27, 31, 36, 38], f: [[13, 20], [32, 35]] },
    14: { q: [6, 9, 23], f: [[1, 4], 7, [10, 21], [24, 31]] },
    15: { f: [[1, 27]] },
    16: { q: [19, 31], f: [[1, 16], [20, 28], [32, 33]] },
    17: { q: [1], f: [[2, 26]] },
    18: { q: [4, 5, 7, 8, 11, 20, 23, 34, 36, 37], f: [21] },
    19: { q: [11, 26, 27, 28, 30] },
    20: { q: [15, 16, 17, 19, 21, 22, 26, 27, 29], f: [23] },
    21: { q: [5, 6, 10, 12, 15, 16, 17, 19, 22], f: [18] },
  },

  // ============================ ACTS ============================
  ACT: {
    1: { q: [4, 7], f: [5, 8] },
    9: { q: [4, 5, 10, 11, 15], f: [6, 12, 16] },
    18: { q: [9], f: [10] },
    20: { q: [35] },
    22: { q: [7, 8, 10, 18, 21] },
    23: { q: [11] },
    26: { q: [14, 15], f: [[16, 18]] },
  },

  // ============================ 1 CORINTHIANS ============================
  '1CO': {
    11: { q: [24, 25] },
  },

  // ============================ 2 CORINTHIANS ============================
  '2CO': {
    12: { q: [9] },
  },

  // ============================ REVELATION ============================
  REV: {
    1: { q: [8, 11, 17], f: [[18, 20]] },
    2: { f: [[1, 29]] },
    3: { f: [[1, 22]] },
    16: { f: [15] },
    21: { q: [5, 6], f: [[7, 8]] },
    22: { f: [7, [12, 16]], q: [20] },
  },
};

function matchesRanges(verse: number, ranges?: readonly VerseRange[]): boolean {
  if (!ranges) return false;
  for (const r of ranges) {
    if (typeof r === 'number') {
      if (verse === r) return true;
    } else if (verse >= r[0] && verse <= r[1]) {
      return true;
    }
  }
  return false;
}

export function getRedLetterVerseMode(
  bookId: string,
  chapter: number,
  verse: number,
): RedLetterVerseMode {
  const bookSpec = RED_LETTER_CHAPTERS[bookId];
  if (!bookSpec) return 'none';
  const chSpec = bookSpec[chapter];
  if (!chSpec) return 'none';
  if (matchesRanges(verse, chSpec.f)) return 'full';
  if (matchesRanges(verse, chSpec.q)) return 'quoted';
  return 'none';
}

export function isRedLetterVerse(bookId: string, chapter: number, verse: number): boolean {
  return getRedLetterVerseMode(bookId, chapter, verse) !== 'none';
}

const NON_JESUS_SPEAKER_NAMES =
  '(?:Peter|Simon|Andrew|James|John|Philip|Thomas|Judas|Martha|Mary|Lazarus|Pilate|Caiaphas|Herod|Nicodemus|Zacchaeus|Saul|Paul|Ananias|Barnabas|Stephen|Satan|devil|demon|demons|Pharisees|Sadducees|scribes|chief priests|elders|disciples|crowd|people|multitude|woman|man|boy|servant|officer|soldiers|centurion|ruler|lawyer|teacher|scribe|she|they)';

const JESUS_SPEAKER_NAMES = '(?:Jesus|the\\s+Lord|Lord|Master|Christ|He|voice)';

const SPEECH_VERBS =
  '(?:said|says|asked|replied|answered|told|declared|cried|called|shouted|exclaimed|protested|whispered|demanded|begged|pleaded|commanded|spoke|added|continued|warned|rebuked|prayed|saying)';

const NON_JESUS_PREFIX_RE = new RegExp(
  `\\b${NON_JESUS_SPEAKER_NAMES}\\s+${SPEECH_VERBS}[^“”".!?]*$`,
  'i',
);

const JESUS_PREFIX_RE = new RegExp(
  `\\b${JESUS_SPEAKER_NAMES}\\s+${SPEECH_VERBS}[^“”".!?]*$`,
  'i',
);

const NON_JESUS_SUFFIX_RE = new RegExp(
  `^\\s*(?:${NON_JESUS_SPEAKER_NAMES}\\s+${SPEECH_VERBS}|${SPEECH_VERBS}\\s+${NON_JESUS_SPEAKER_NAMES})\\b`,
  'i',
);

const JESUS_SUFFIX_RE = new RegExp(
  `^\\s*(?:${JESUS_SPEAKER_NAMES}\\s+${SPEECH_VERBS}|${SPEECH_VERBS}\\s+${JESUS_SPEAKER_NAMES})\\b`,
  'i',
);

const SPEECH_LEAD_IN_RE =
  /^(.*?\b(?:said|answered|replied|asked|told\s+(?:him|her|them|us|me)|declared|cried(?:\s+out)?|called(?:\s+out)?|spoke|saying|proclaimed|exclaimed|added|commanded)[^:.,;!?]*[,:]\s+)(.+)$/is;

function isQuoteAttributionNonJesus(prefix: string, suffix = ''): boolean {
  // 1. Check immediate trailing attribution tag (e.g., `"Who are You?" Saul asked.` or `"I am Jesus," He replied.`)
  const trailingClause = suffix.split(/[“”"]/)[0].slice(0, 60);
  if (JESUS_SUFFIX_RE.test(trailingClause)) return false;
  if (NON_JESUS_SUFFIX_RE.test(trailingClause)) return true;

  // 2. Check immediate preceding clause (bounded by previous quote or sentence-ending punctuation)
  const trimmedPrefix = prefix.slice(-110);
  const lastBoundary = Math.max(
    trimmedPrefix.lastIndexOf('.'),
    trimmedPrefix.lastIndexOf('!'),
    trimmedPrefix.lastIndexOf('?'),
    trimmedPrefix.lastIndexOf('”'),
    trimmedPrefix.lastIndexOf('"'),
  );
  const immediatePrefix = lastBoundary >= 0 ? trimmedPrefix.slice(lastBoundary + 1) : trimmedPrefix;
  if (JESUS_PREFIX_RE.test(immediatePrefix)) return false;
  return NON_JESUS_PREFIX_RE.test(immediatePrefix);
}

/**
 * Splits a verse's text into normal vs. red-letter segments.
 * Works across BSB, WEB, NLT, NASB 2020, and CEV (curly or straight double quotes).
 */
export function segmentRedLetterVerse(params: {
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  prevVerseWasRedLetter?: boolean;
}): RedLetterSegment[] {
  const { bookId, chapter, verse, text, prevVerseWasRedLetter = false } = params;
  if (!text) return [];

  const mode = getRedLetterVerseMode(bookId, chapter, verse);
  if (mode === 'none') {
    return [{ text, isRedLetter: false }];
  }

  if (mode === 'full') {
    return [{ text, isRedLetter: true }];
  }

  // mode === 'quoted': parse quoted speech spans within a mixed narrative+speech verse.
  const quoteIndices: Array<{ index: number; char: string }> = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '“' || ch === '”' || ch === '"') {
      quoteIndices.push({ index: i, char: ch });
    }
  }

  // Fallback if a translation renders this verse without double quotation marks
  if (quoteIndices.length === 0) {
    const leadMatch = SPEECH_LEAD_IN_RE.exec(text);
    if (leadMatch && leadMatch[1] && leadMatch[2]) {
      return [
        { text: leadMatch[1], isRedLetter: false },
        { text: leadMatch[2], isRedLetter: true },
      ];
    }
    return [{ text, isRedLetter: true }];
  }

  const rawSegments: RedLetterSegment[] = [];
  let cursor = 0;
  let insideQuote = false;

  // Detect continuation of a quote opened in the previous red-letter verse:
  // e.g. `...and I will give you rest.” Then Jesus...`
  const firstQuote = quoteIndices[0];
  const startsAsContinuation =
    prevVerseWasRedLetter &&
    (firstQuote.char === '”' ||
      (firstQuote.char === '"' &&
        firstQuote.index > 0 &&
        !/[\s(\[—–-]$/.test(text[firstQuote.index - 1])));

  if (startsAsContinuation) {
    rawSegments.push({
      text: text.slice(0, firstQuote.index + 1),
      isRedLetter: true,
    });
    cursor = firstQuote.index + 1;
    quoteIndices.shift();
  }

  let quoteStart = -1;
  for (let i = 0; i < quoteIndices.length; i += 1) {
    const q = quoteIndices[i];
    if (!insideQuote) {
      if (q.char === '”') {
        // Unexpected stray closing quote: treat up to it as red-letter if continuing
        if (q.index + 1 > cursor) {
          rawSegments.push({
            text: text.slice(cursor, q.index + 1),
            isRedLetter: prevVerseWasRedLetter,
          });
          cursor = q.index + 1;
        }
        continue;
      }
      if (q.index > cursor) {
        rawSegments.push({
          text: text.slice(cursor, q.index),
          isRedLetter: false,
        });
      }
      quoteStart = q.index;
      insideQuote = true;
    } else {
      // Closing quote found
      const prefixBeforeQuote = text.slice(0, quoteStart);
      const suffixAfterQuote = text.slice(q.index + 1);
      const quoteText = text.slice(quoteStart, q.index + 1);
      const hasMultipleQuotes = quoteIndices.length >= 4;
      const attributedToOther =
        hasMultipleQuotes && isQuoteAttributionNonJesus(prefixBeforeQuote, suffixAfterQuote);

      rawSegments.push({
        text: quoteText,
        isRedLetter: !attributedToOther,
      });
      cursor = q.index + 1;
      insideQuote = false;
      quoteStart = -1;
    }
  }

  if (insideQuote && quoteStart >= 0) {
    // Unclosed opening quote that continues into the next verse
    const prefixBeforeQuote = text.slice(0, quoteStart);
    const hasMultipleQuotes = quoteIndices.length >= 3;
    const attributedToOther =
      hasMultipleQuotes && isQuoteAttributionNonJesus(prefixBeforeQuote, '');
    rawSegments.push({
      text: text.slice(quoteStart),
      isRedLetter: !attributedToOther,
    });
  } else if (cursor < text.length) {
    rawSegments.push({
      text: text.slice(cursor),
      isRedLetter: false,
    });
  }

  // Merge adjacent segments with identical isRedLetter state
  const merged: RedLetterSegment[] = [];
  for (const seg of rawSegments) {
    if (!seg.text) continue;
    const last = merged[merged.length - 1];
    if (last && last.isRedLetter === seg.isRedLetter) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  // Safety: if a known quoted verse somehow ended up with zero red segments (e.g., all attributed away),
  // highlight the last quoted segment so Jesus's reply is never silently dropped.
  if (!merged.some((s) => s.isRedLetter) && quoteIndices.length > 0) {
    return [{ text, isRedLetter: true }];
  }

  return merged;
}
