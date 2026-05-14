import { GoogleGenAI } from "@google/generative-ai";

const genAI = new GoogleGenAI("AIzaSyBYYdsWdoer56BYQS07rh9GQolk1BCJFM0");

async function listEmbeddingModels() {
  // Use the listModels method (requires the '@google/generative-ai' library)
  // Note: Standard fetch to the API endpoint is often easier for listing
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBYYdsWdoer56BYQS07rh9GQolk1BCJFM0`);
  const data = await response.json();

  const embeddingModels = data.models.filter(model => 
    model.supportedGenerationMethods.includes("embedContent")
  );

  console.log(embeddingModels.map(m => m.name));
}