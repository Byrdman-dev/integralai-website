// =========================================================================
// RAG demo matching logic (cosine similarity + threshold decision)
//
// Pure, dependency-free functions with no DOM or model dependencies, so
// they can run unmodified as a plain browser <script> and as a CommonJS
// module under Jest.
// =========================================================================

// Similarity is a cosine score in [-1, 1] between the visitor's question
// embedding and a knowledge-base entry's precomputed embedding. Below this,
// the question is treated as out of scope. Tune here if matches feel too
// loose or too strict.
const SIMILARITY_THRESHOLD = 0.5;

const OUT_OF_SCOPE_ANSWER = 'That inquiry is outside my scope.';

// Embeddings on both sides are expected to be unit-normalized (see
// scripts/embed_qa.py and the { normalize: true } pipeline option in
// demos.js), so cosine similarity is just the dot product — no magnitude
// division needed.
function cosineSimilarity(a, b){
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function findBestMatch(queryEmbedding, knowledgeBase){
  let best = null;
  let bestScore = -Infinity;
  knowledgeBase.forEach(entry => {
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    if (score > bestScore){ bestScore = score; best = entry; }
  });
  return { best, bestScore };
}

function matchQuestion(queryEmbedding, knowledgeBase){
  const { best, bestScore } = findBestMatch(queryEmbedding, knowledgeBase);
  if (best && bestScore >= SIMILARITY_THRESHOLD){
    return { answer: best.answer, source: best.topic, score: bestScore };
  }
  return { answer: OUT_OF_SCOPE_ANSWER, source: null, score: bestScore };
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = {
    SIMILARITY_THRESHOLD,
    OUT_OF_SCOPE_ANSWER,
    cosineSimilarity,
    findBestMatch,
    matchQuestion
  };
}
