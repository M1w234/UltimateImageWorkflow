/**
 * Model configurations for all AI services
 */

// Google Gemini models for image editing and generation
export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-exp-image-generation', name: 'Gemini 2.0 Flash Image Gen (Recommended)' },
  { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Text/Edit only)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Text/Edit only)' },
];

// OpenAI models for image analysis
export const OPENAI_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2 (Latest)' },
  { id: 'gpt-5.1', name: 'GPT-5.1' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
];

// Kling models for video generation
export const KLING_MODELS = [
  { id: '2.6', name: 'Kling 2.6 (with audio)' },
  { id: '2.5', name: 'Kling 2.5 (start and end frames)' },
  { id: '2.1-master', name: 'Kling 2.1 Master (Pro Only)' },
  { id: '2.1', name: 'Kling 2.1' },
  { id: '1.6', name: 'Kling 1.6' },
  { id: '1.5', name: 'Kling 1.5' },
];

// Default model selections
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash-exp-image-generation';
export const DEFAULT_OPENAI_MODEL = 'gpt-5.2';
export const DEFAULT_KLING_MODEL = '2.6';

// IndexedDB configuration
export const DB_NAME = 'GeminiImageToolsDB';
export const DB_VERSION = 2;
export const HISTORY_STORE = 'history';
export const COLLECTION_STORE = 'collection';
export const ANALYSIS_STORE = 'analysis';

// Storage keys for localStorage
export const STORAGE_KEYS = {
  GEMINI_API_KEY: 'gemini_api_key',
  OPENAI_API_KEY: 'openai_api_key',
  KLING_API_KEY: 'kling_api_key',
  IMGBB_API_KEY: 'imgbb_api_key',
  GEMINI_MODEL: 'gemini_model',
  OPENAI_MODEL: 'openai_model',
  KLING_MODEL: 'kling_model',
  SOUND_VOLUME: 'sound_volume',
};

// Aspect ratio options
export const ASPECT_RATIOS = [
  { value: 'auto', label: 'Auto' },
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '3:4', label: '3:4 Portrait' },
];

// Resolution options
export const RESOLUTIONS = [
  { value: '4K', label: '4K' },
  { value: '2K', label: '2K' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
];

// Video duration options
export const VIDEO_DURATIONS = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
];

// Video mode options
export const VIDEO_MODES = [
  { value: 'std', label: 'Standard' },
  { value: 'pro', label: 'Professional' },
];

// Default prompts
export const DEFAULT_ANALYZE_PROMPT = 'Describe this image in detail. What do you see? Include colors, objects, composition, mood, and any text visible.';

// System Prompts for Image-to-Prompt Generator
export const PHOTO_MODE_SYSTEM_PROMPT = `You are an Image-to-Prompt Generator for still images.

Your job:
- Analyze the user's uploaded image(s).
- Produce a single, high-quality text prompt suitable for still image generation.
- Do not ask questions or start a dialogue.

Behavior rules:
- Focus on visual specifics: subject, environment, composition, perspective, lens feel (wide/normal/telephoto), lighting, color, mood, textures, and important small details.
- Preserve the visible camera angle, framing, and proportions unless the user explicitly tells you to change them.
- Do not invent objects or features that are not clearly visible.
- When the user provides a "MODEL_PROFILE" block, follow its formatting rules. Otherwise, use a neutral, broadly compatible image-generation format.
- Output only the final prompt unless asked otherwise.`;

export const VIDEO_MODE_SYSTEM_PROMPT = `You are an Image-to-Video Prompt Generator.

Your job:
- Analyze the user's uploaded image(s).
- Produce a cinematic, shot-specific video generation prompt.
- Describe camera motion, timing, transitions, lighting changes, subject movement, and scene evolution.
- Do not ask questions or begin a dialogue.

Behavior rules:
- Treat the uploaded image as the start frame reference.
- Maintain the visible camera angle and perspective unless user instructions override it.
- Describe motion over time: pans, tilts, push-ins, rotations, tracking moves, dolly/slider feel.
- Include lighting dynamics when relevant (brightness shifts, direction changes, diffused vs hard light).
- Avoid inventing objects not present in the image.
- When a MODEL_PROFILE block is provided, format the prompt according to its style and rules.
- Output only the final video prompt unless asked otherwise.`;

// Model Profiles for Photo Mode
export const PHOTO_MODEL_PROFILES = {
  nano_banana_pro: {
    name: 'Nano Banana Pro',
    block: `MODEL_PROFILE: NANO_BANANA_PRO_PHOTO
- Use one tight paragraph.
- Start with imperative phrasing ("Create an image of…").
- Emphasize realism, lens feel, lighting, and material detail.
- Keep everything cohesive and descriptive, with no meta commentary.`
  },
  generic: {
    name: 'Generic Photo Model',
    block: `MODEL_PROFILE: GENERIC_PHOTO_MODEL
- Produce a broad, widely compatible still-image prompt.
- Focus on scene, lighting, mood, and style in a single cohesive paragraph.`
  }
};

// Model Profiles for Video Mode
export const VIDEO_MODEL_PROFILES = {
  kling_2_5_turbo: {
    name: 'Kling 2.5 Turbo',
    block: `MODEL_PROFILE: KLING_2_5_TURBO_VIDEO
- Treat the image as the opening frame of a video.
- Describe camera movement deliberately (slow push, arc left, dolly forward).
- Highlight progression over 3–10 seconds depending on user instruction.
- Use a single continuous descriptive paragraph.`
  },
  generic: {
    name: 'Generic Video Model',
    block: `MODEL_PROFILE: GENERIC_VIDEO_MODEL
- Provide a cinematic video-style prompt.
- Describe camera motion, framing, lighting changes, and scene evolution.
- Keep it structured but expressed as one continuous paragraph.`
  }
};

// System prompt for Start/End Frame transition analysis
export const START_END_FRAME_SYSTEM_PROMPT = `You are a Start-to-End Frame Transition Prompt Generator.

Your job:
- Analyze TWO uploaded images: a start frame and an end frame.
- Produce a single, cohesive video generation prompt that describes the transition between them.
- Focus on how the scene evolves from the start to the end state.
- Do not ask questions or begin a dialogue.

Behavior rules:
- Compare both frames to identify key differences: subject position/state, camera movement, lighting changes, environment shifts, color/mood transitions.
- Describe the motion and transformation over time as a smooth cinematic progression.
- Maintain consistency with the visual style and perspective present in both frames.
- Include timing cues if relevant (gradual shift, quick cut, slow pan, etc.).
- Avoid inventing elements not visible in either frame.
- When a MODEL_PROFILE block is provided, format according to its style.
- Output only the final transition prompt unless asked otherwise.`;

// Max limits
export const MAX_HISTORY_ITEMS = 100;
export const MAX_ANALYSIS_ITEMS = 50;
export const MAX_SLOTS = 20;
export const MAX_IMAGES_PER_SLOT = 20;
export const MAX_ANALYZE_IMAGES = 10;
