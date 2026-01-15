/**
 * Google Gemini API service
 * Handles image editing and generation
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Edit an image using Gemini
 * @param {Object} params
 * @param {string} params.apiKey - Gemini API key
 * @param {string} params.model - Model ID
 * @param {string} params.prompt - Edit prompt
 * @param {string} params.imageBase64 - Base64 encoded image
 * @param {Object} params.imageConfig - Optional image configuration
 * @returns {Promise<string>} - Base64 data URL of the result
 */
export const editImage = async ({ apiKey, model, prompt, imageBase64, imageConfig = {} }) => {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: imageConfig
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to edit image');
  }

  const data = await response.json();
  
  if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
    return `data:image/jpeg;base64,${data.candidates[0].content.parts[0].inlineData.data}`;
  }
  
  throw new Error('Invalid response format from API');
};

/**
 * Generate an image from text using Gemini
 * @param {Object} params
 * @param {string} params.apiKey - Gemini API key
 * @param {string} params.model - Model ID
 * @param {string} params.prompt - Generation prompt
 * @param {Object} params.imageConfig - Optional image configuration
 * @returns {Promise<string>} - Base64 data URL of the result
 */
export const generateImage = async ({ apiKey, model, prompt, imageConfig = {} }) => {
  let apiUrl;
  let requestBody;
  
  // Check if using Imagen models (different API)
  if (model.startsWith('imagen')) {
    apiUrl = `${GEMINI_BASE_URL}/${model}:predict?key=${apiKey}`;
    requestBody = {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: imageConfig.aspectRatio || '1:1'
      }
    };
  } else {
    // Gemini models use generateContent
    apiUrl = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    requestBody = {
      contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT']
      }
    };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('API Error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to generate image');
  }

  const data = await response.json();
  console.log('Generate API response:', JSON.stringify(data, null, 2));
  
  // Handle Imagen response format
  if (model.startsWith('imagen')) {
    if (data.predictions?.[0]?.bytesBase64Encoded) {
      return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
    }
  }
  
  // Handle Gemini response format
  const parts = data.candidates?.[0]?.content?.parts || [];
  
  // Look for image data in parts
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  // Check for text response (might indicate why image wasn't generated)
  const textPart = parts.find(p => p.text);
  if (textPart) {
    console.log('API returned text instead of image:', textPart.text);
    throw new Error(`Model response: ${textPart.text.substring(0, 150)}`);
  }
  
  throw new Error('No image data in API response. This model may not support image generation. Try gemini-2.0-flash-exp-image-generation.');
};

/**
 * Combine multiple images into one using Gemini
 * @param {Object} params
 * @param {string} params.apiKey - Gemini API key
 * @param {string} params.model - Model ID
 * @param {string} params.prompt - Combination prompt
 * @param {Array<string>} params.imagesBase64 - Array of base64 encoded images
 * @returns {Promise<string>} - Base64 data URL of the result
 */
export const combineImages = async ({ apiKey, model, prompt, imagesBase64 }) => {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  
  const imageParts = imagesBase64.map(base64 => ({
    inlineData: { mimeType: 'image/jpeg', data: base64 }
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [...imageParts, { text: prompt }]
      }],
      generationConfig: { responseModalities: ['image', 'text'] }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to combine images');
  }

  const data = await response.json();
  
  if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
    return `data:image/jpeg;base64,${data.candidates[0].content.parts[0].inlineData.data}`;
  }
  
  throw new Error('Invalid response format from API');
};

/**
 * Build image configuration object
 * @param {Object} params
 * @param {string} params.aspectRatio
 * @param {string} params.resolution
 * @returns {Object}
 */
export const buildImageConfig = ({ aspectRatio, resolution }) => {
  const config = { imageSize: resolution };
  if (aspectRatio !== 'auto') {
    config.aspectRatio = aspectRatio;
  }
  return config;
};
