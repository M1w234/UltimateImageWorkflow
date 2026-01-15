/**
 * Kling AI API service (via PiAPI)
 * Handles video generation
 */

const PIAPI_BASE_URL = 'https://api.piapi.ai/api/v1';

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
  enableAudio = false
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

  // If we have a start image, it's image-to-video
  if (imageBase64) {
    input.image_url = `data:image/jpeg;base64,${imageBase64}`;
  }

  // If we have an end image for Kling 2.5, add it
  if (version === '2.5' && endImageBase64) {
    input.end_image_url = `data:image/jpeg;base64,${endImageBase64}`;
  }

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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || errorData.error?.message || 'Failed to start video generation');
  }

  const data = await response.json();

  if (data.data?.task_id) {
    return data.data.task_id;
  }

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
  const response = await fetch(`${PIAPI_BASE_URL}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to check video status');
  }

  const data = await response.json();
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
