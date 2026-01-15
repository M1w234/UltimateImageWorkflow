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
  { id: '2.6', name: 'Kling 2.6 (Latest, Audio Support)' },
  { id: '2.5', name: 'Kling 2.5' },
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

// Max limits
export const MAX_HISTORY_ITEMS = 100;
export const MAX_ANALYSIS_ITEMS = 50;
export const MAX_SLOTS = 20;
export const MAX_IMAGES_PER_SLOT = 20;
export const MAX_ANALYZE_IMAGES = 10;
