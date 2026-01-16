/**
 * Kling AI API service (via PiAPI)
 * Handles video generation
 */

const PIAPI_BASE_URL = 'https://api.piapi.ai/api/v1';

/**
 * Upload base64 image to imgbb to get a public URL
 * @param {string} base64Data - Clean base64 string (no data URL prefix)
 * @param {string} imgbbKey - ImgBB API key (get free at imgbb.com/api)
 * @returns {Promise<string>} - Public image URL
 */
export const uploadImage = async (base64Data, imgbbKey) => {
  if (!imgbbKey) {
    throw new Error('ImgBB API key required for image uploads. Get one free at imgbb.com/api');
  }

  // Strip any data URL prefix - ImgBB wants just the base64 string via FormData
  const cleanBase64 = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data;

  const formData = new FormData();
  formData.append('image', cleanBase64);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  
  if (data.success && data.data?.url) {
    return data.data.url;
  }

  throw new Error(data.error?.message || 'No URL received from upload');
};

/**
 * Start a video generation task
 * @param {Object} params
 * @param {string} params.apiKey - PiAPI key
 * @param {string} params.prompt - Video prompt
 * @param {string} params.negativePrompt - Negative prompt (optional)
 * @param {number} params.duration - Video duration (5 or 10 seconds)
 * @param {string} params.aspectRatio - Aspect ratio (e.g., '16:9')
 * @param {string} params.mode - 'std' or 'pro'
 * @param {string} params.version - Kling model version
 * @param {string} params.imageBase64 - Optional base64 image for start frame
 * @param {string} params.endImageBase64 - Optional base64 image for end frame (v2.5 only)
 * @param {boolean} params.enableAudio - Enable audio (v2.6+ pro mode only)
 * @returns {Promise<string>} - Task ID
 */
export const startVideoGeneration = async ({
  apiKey,
  prompt,
  negativePrompt = '',
  duration = 5,
  aspectRatio = '16:9',
  mode = 'std',
  version = '2.6',
  imageBase64 = null,
  endImageBase64 = null,
  enableAudio = false,
  imgbbKey = null
}) => {
  const input = {
    prompt: prompt.trim(),
    negative_prompt: negativePrompt.trim(),
    cfg_scale: 0.5,
    duration,
    aspect_ratio: aspectRatio,
    mode,
    version
  };

  // Upload images to get URLs (required by Kling API)
  if (imageBase64) {
    const cleanBase64 = imageBase64.includes('data:') 
      ? imageBase64.split(',')[1] 
      : imageBase64;
    
    console.log('[Kling API] Uploading start image to hosting service...');
    try {
      const imageUrl = await uploadImage(cleanBase64, imgbbKey);
      console.log('[Kling API] Start image URL:', imageUrl);
      input.image_url = imageUrl;
    } catch (uploadErr) {
      throw new Error('Failed to upload start image: ' + uploadErr.message);
    }
  }

  // Upload end image for Kling 2.5
  if (version === '2.5' && endImageBase64) {
    const cleanEndBase64 = endImageBase64.includes('data:') 
      ? endImageBase64.split(',')[1] 
      : endImageBase64;
    
    console.log('[Kling API] Uploading end image to hosting service...');
    try {
      const endImageUrl = await uploadImage(cleanEndBase64, imgbbKey);
      console.log('[Kling API] End image URL:', endImageUrl);
      input.tail_image_url = endImageUrl;
    } catch (uploadErr) {
      throw new Error('Failed to upload end image: ' + uploadErr.message);
    }
  }
  
  console.log('[Kling API] Full request input:', { 
    prompt: input.prompt.substring(0, 50) + '...', 
    hasImage: !!imageBase64, 
    hasEndImage: !!endImageBase64,
    version,
    mode,
    aspectRatio: input.aspect_ratio,
    duration: input.duration
  });

  // Enable audio for v2.6+ in pro mode
  if (version === '2.6' && mode === 'pro' && enableAudio) {
    input.enable_audio = true;
  }

  const response = await fetch(`${PIAPI_BASE_URL}/task`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'kling',
      task_type: 'video_generation',
      input
    })
  });

  console.log('[Kling API] Response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[Kling API] Error response:', errorData);
    throw new Error(errorData.message || errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Kling API] Success response:', data);

  if (data.data?.task_id) {
    console.log('[Kling API] Task ID:', data.data.task_id);
    return data.data.task_id;
  }

  console.error('[Kling API] No task ID in response:', data);
  throw new Error('No task ID received');
};

/**
 * Check the status of a video generation task
 * @param {Object} params
 * @param {string} params.apiKey - PiAPI key
 * @param {string} params.taskId - Task ID
 * @returns {Promise<{status: string, videoUrl?: string, error?: string}>}
 */
export const checkVideoStatus = async ({ apiKey, taskId }) => {
  console.log('[Kling API] Checking status for task:', taskId);
  
  const response = await fetch(`${PIAPI_BASE_URL}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('[Kling API] Status check failed:', response.status);
    throw new Error('Failed to check video status');
  }

  const data = await response.json();
  console.log('[Kling API] Status response:', { 
    status: data.data?.status,
    hasVideo: !!data.data?.output?.video_url,
    error: data.data?.error 
  });
  
  const status = data.data?.status || 'unknown';

  if (status === 'completed') {
    const videoUrl = data.data?.output?.video_url || 
                     data.data?.output?.works?.[0]?.video?.resource?.resource;
    return { status, videoUrl };
  }

  if (status === 'failed') {
    return { 
      status, 
      error: data.data?.error?.message || 'Video generation failed' 
    };
  }

  return { status };
};

/**
 * Poll for video completion
 * @param {Object} params
 * @param {string} params.apiKey - PiAPI key
 * @param {string} params.taskId - Task ID
 * @param {Function} params.onStatusUpdate - Callback for status updates
 * @param {number} params.interval - Polling interval in ms (default 5000)
 * @returns {Promise<string>} - Video URL
 */
export const pollVideoCompletion = ({ apiKey, taskId, onStatusUpdate, interval = 5000 }) => {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const result = await checkVideoStatus({ apiKey, taskId });
        onStatusUpdate?.(result.status);

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          resolve(result.videoUrl);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          reject(new Error(result.error));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    };

    const pollInterval = setInterval(poll, interval);
    poll(); // Initial check
  });
};
