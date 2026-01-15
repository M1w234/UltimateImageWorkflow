/**
 * OpenAI API service
 * Handles image analysis using GPT Vision
 */

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * Analyze an image using OpenAI Vision
 * @param {Object} params
 * @param {string} params.apiKey - OpenAI API key
 * @param {string} params.model - Model ID (e.g., 'gpt-4o')
 * @param {string} params.prompt - Analysis prompt
 * @param {string} params.imageBase64 - Base64 encoded image
 * @returns {Promise<string>} - Analysis text
 */
export const analyzeImage = async ({ apiKey, model, prompt, imageBase64 }) => {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_completion_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to analyze image');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No analysis available';
};

/**
 * Analyze multiple images in sequence
 * @param {Object} params
 * @param {string} params.apiKey - OpenAI API key
 * @param {string} params.model - Model ID
 * @param {string} params.prompt - Analysis prompt
 * @param {Array<{id: string, base64: string, preview: string, fileName: string}>} params.images
 * @returns {Promise<Array<{id: string, preview: string, fileName: string, analysis: string}>>}
 */
export const analyzeMultipleImages = async ({ apiKey, model, prompt, images }) => {
  const results = [];
  
  for (const img of images) {
    const analysis = await analyzeImage({
      apiKey,
      model,
      prompt,
      imageBase64: img.base64
    });
    
    results.push({
      id: img.id,
      preview: img.preview,
      fileName: img.fileName,
      analysis
    });
  }
  
  return results;
};
