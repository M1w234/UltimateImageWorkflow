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
  
  // Extract base64 data (remove data URL prefix if present)
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
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

/**
 * Generate an image-to-prompt using Gemini
 * Analyzes an image and generates a prompt for image/video generation
 * @param {string} apiKey - Gemini API key
 * @param {string} imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param {string} userInstruction - Optional user instruction for customization
 * @param {string} systemPrompt - Complete system prompt for the selected profile
 * @returns {Promise<string>} - Generated prompt text
 */
export const generateImagePrompt = async (apiKey, imageBase64, userInstruction, systemPrompt) => {
  // Build the user message with just the task instruction
  const userMessage = 'TASK:\n' + (userInstruction || 'Generate a detailed prompt based on this image.');
  
  // Extract base64 data (remove data URL prefix if present)
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  
  const response = await fetch(
    `${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userMessage },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract text from response
  const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);
  if (textPart?.text) {
    return textPart.text;
  }
  
  throw new Error('No text response from API');
};

/**
 * Generate a prompt from multiple images using Gemini
 * Analyzes multiple images and generates a combined prompt (e.g., for transitions)
 * @param {Object} params
 * @param {string} params.apiKey - Gemini API key
 * @param {Array<string>} params.images - Array of base64 encoded images
 * @param {string} params.userMessage - User message/instruction
 * @param {string} params.systemPrompt - System prompt
 * @returns {Promise<string>} - Generated prompt text
 */
export const generateMultiImagePrompt = async ({ apiKey, images, userMessage, systemPrompt }) => {
  if (!images || images.length === 0) {
    throw new Error('At least one image is required');
  }
  
  // Build image parts array
  const imageParts = images.map(imageBase64 => {
    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64 && imageBase64.includes ? 
      (imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64) : 
      imageBase64;
    
    return {
      inline_data: {
        mime_type: 'image/jpeg',
        data: base64Data
      }
    };
  });
  
  const response = await fetch(
    `${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...imageParts,
              { text: userMessage }
            ]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract text from response
  const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);
  if (textPart?.text) {
    return textPart.text;
  }
  
  throw new Error('No text response from API');
};
