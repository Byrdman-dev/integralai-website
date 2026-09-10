// =========================================================================
// Shared transformers.js embedding pipeline
//
// Both demo widgets (RAG assistant, voice receptionist) embed text with
// the same model. This module lazily loads it once and hands out the same
// pipeline instance to whichever widget asks first — opening the second
// widget in the same session does not trigger a second download.
// =========================================================================

const TRANSFORMERS_CDN_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

let embedderPromise = null;

function isEmbedderLoaded(){
  return embedderPromise !== null;
}

function getEmbedder(){
  if (!embedderPromise){
    embedderPromise = import(TRANSFORMERS_CDN_URL)
      .then(({ pipeline, env }) => {
        // No local model files are hosted on this site — skip the local
        // lookup so it goes straight to the CDN/Hugging Face fetch.
        env.allowLocalModels = false;
        return pipeline('feature-extraction', EMBEDDING_MODEL);
      });
  }
  return embedderPromise;
}

async function embedText(text){
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
