const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Process text with Gemini API
 * @param {string} text - The text to process
 * @param {string} action - Either 'rewrite' or 'proofread'
 * @returns {Promise<string>} - The processed text
 */
export const processWithGemini = async (text, action) => {
  try {
    // Create a comprehensive prompt with clear instructions
    const prompt = action === 'rewrite' 
      ? `You are a writing assistant. Rewrite the following text to be more engaging and clearer. Provide ONLY the rewritten text without any explanations, introductions, or additional commentary. Do not use quotation marks around the text.\n\nText to rewrite: ${text}`
      : `You are a proofreading assistant. Proofread and correct the following text, fixing any grammar, spelling, and punctuation errors. Provide ONLY the corrected text without any explanations, introductions, or additional commentary. Do not use quotation marks around the text.\n\nText to proofread: ${text}`;

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: action === 'rewrite' ? 0.7 : 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error processing text with Gemini');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error with Gemini API:', error);
    throw error;
  }
};
