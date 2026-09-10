const {
  SIMILARITY_THRESHOLD,
  OUT_OF_SCOPE_ANSWER,
  cosineSimilarity,
  findBestMatch,
  matchQuestion
} = require('./rag-match');

describe('cosineSimilarity', () => {
  test('returns 1 for identical unit vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  test('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  test('returns -1 for opposite unit vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  test('is the plain dot product for normalized vectors', () => {
    const a = [0.6, 0.8];
    const b = [0.8, 0.6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.6 * 0.8 + 0.8 * 0.6);
  });
});

describe('findBestMatch', () => {
  const knowledgeBase = [
    { question: 'pricing', answer: 'Pricing answer', topic: 'Pricing', embedding: [1, 0, 0] },
    { question: 'services', answer: 'Services answer', topic: 'Services', embedding: [0, 1, 0] },
    { question: 'process', answer: 'Process answer', topic: 'Process', embedding: [0, 0, 1] }
  ];

  test('picks the entry with the highest cosine similarity', () => {
    const query = [0, 1, 0]; // exact match to "services"
    const { best, bestScore } = findBestMatch(query, knowledgeBase);
    expect(best.topic).toBe('Services');
    expect(bestScore).toBeCloseTo(1);
  });

  test('picks the closest entry for a partial/paraphrased match', () => {
    const query = [0.1, 0.95, 0]; // closest to "services", not exact
    const { best } = findBestMatch(query, knowledgeBase);
    expect(best.topic).toBe('Services');
  });

  test('returns null best and -Infinity score for an empty knowledge base', () => {
    const { best, bestScore } = findBestMatch([1, 0, 0], []);
    expect(best).toBeNull();
    expect(bestScore).toBe(-Infinity);
  });
});

describe('matchQuestion', () => {
  const knowledgeBase = [
    { question: 'pricing', answer: 'Pricing answer', topic: 'Pricing', embedding: [1, 0, 0] },
    { question: 'services', answer: 'Services answer', topic: 'Services', embedding: [0, 1, 0] }
  ];

  test('returns the matched answer and source when similarity is at or above the threshold', () => {
    const query = [1, 0, 0]; // similarity 1.0, well above SIMILARITY_THRESHOLD
    const result = matchQuestion(query, knowledgeBase);
    expect(result.answer).toBe('Pricing answer');
    expect(result.source).toBe('Pricing');
  });

  test('matches exactly at the threshold boundary (>=, not >)', () => {
    // Similarity to "Pricing" [1,0,0] is exactly SIMILARITY_THRESHOLD, and 0
    // (orthogonal) to "Services" [0,1,0], so Pricing is both the closest and
    // right at the boundary.
    const query = [SIMILARITY_THRESHOLD, 0, Math.sqrt(1 - SIMILARITY_THRESHOLD ** 2)];
    const result = matchQuestion(query, knowledgeBase);
    expect(result.answer).toBe('Pricing answer');
  });

  test('returns the out-of-scope response when the best score is below the threshold', () => {
    // Orthogonal to every knowledge-base entry, so similarity is 0 for all of them.
    const query = [0, 0, 1];
    const result = matchQuestion(query, knowledgeBase);
    expect(result.answer).toBe(OUT_OF_SCOPE_ANSWER);
    expect(result.source).toBeNull();
  });

  test('returns the out-of-scope response for an empty knowledge base', () => {
    const result = matchQuestion([1, 0, 0], []);
    expect(result.answer).toBe(OUT_OF_SCOPE_ANSWER);
    expect(result.source).toBeNull();
  });
});
