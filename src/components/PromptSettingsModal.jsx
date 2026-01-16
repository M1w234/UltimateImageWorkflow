import { useState, useEffect } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import {
  PHOTO_MODEL_PROFILES,
  VIDEO_MODEL_PROFILES,
  START_END_FRAME_SYSTEM_PROMPT,
  STORAGE_KEYS
} from '../utils/constants';

/**
 * Modal for editing analyze mode system prompts and model profiles
 * Each profile now has its own complete system prompt
 */
export default function PromptSettingsModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('photo');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Photo mode prompts (one per profile)
  const [generalPhotoPrompt, setGeneralPhotoPrompt] = useState(PHOTO_MODEL_PROFILES.general_photo.systemPrompt);
  const [nanoBananaProPrompt, setNanoBananaProPrompt] = useState(PHOTO_MODEL_PROFILES.nano_banana_pro.systemPrompt);
  
  // Video mode prompts (one per profile)
  const [kling25Prompt, setKling25Prompt] = useState(VIDEO_MODEL_PROFILES.kling_2_5.systemPrompt);
  const [kling26Prompt, setKling26Prompt] = useState(VIDEO_MODEL_PROFILES.kling_2_6.systemPrompt);
  const [kling01Prompt, setKling01Prompt] = useState(VIDEO_MODEL_PROFILES.kling_01.systemPrompt);
  const [startEndSystemPrompt, setStartEndSystemPrompt] = useState(START_END_FRAME_SYSTEM_PROMPT);

  // Load custom prompts from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      loadCustomPrompts();
    }
  }, [isOpen]);

  const loadCustomPrompts = () => {
    // Load photo profiles
    const customPhotoProfiles = localStorage.getItem(STORAGE_KEYS.CUSTOM_PHOTO_PROFILES);
    if (customPhotoProfiles) {
      try {
        const profiles = JSON.parse(customPhotoProfiles);
        if (profiles.general_photo) setGeneralPhotoPrompt(profiles.general_photo);
        if (profiles.nano_banana_pro) setNanoBananaProPrompt(profiles.nano_banana_pro);
      } catch (e) {
        console.error('Failed to parse custom photo profiles:', e);
      }
    }
    
    // Load video profiles
    const customVideoProfiles = localStorage.getItem(STORAGE_KEYS.CUSTOM_VIDEO_PROFILES);
    if (customVideoProfiles) {
      try {
        const profiles = JSON.parse(customVideoProfiles);
        if (profiles.kling_2_5) setKling25Prompt(profiles.kling_2_5);
        if (profiles.kling_2_6) setKling26Prompt(profiles.kling_2_6);
        if (profiles.kling_01) setKling01Prompt(profiles.kling_01);
      } catch (e) {
        console.error('Failed to parse custom video profiles:', e);
      }
    }
    
    // Load start/end frame prompt
    const customStartEndSystem = localStorage.getItem(STORAGE_KEYS.CUSTOM_START_END_SYSTEM_PROMPT);
    if (customStartEndSystem) setStartEndSystemPrompt(customStartEndSystem);
  };

  const handleSave = () => {
    // Validate all prompts are not empty
    if (!generalPhotoPrompt.trim() || !nanoBananaProPrompt.trim() ||
        !kling25Prompt.trim() || !kling26Prompt.trim() || !kling01Prompt.trim() ||
        !startEndSystemPrompt.trim()) {
      alert('All prompts must have content. Please fill in all fields.');
      return;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PHOTO_PROFILES, JSON.stringify({
      general_photo: generalPhotoPrompt,
      nano_banana_pro: nanoBananaProPrompt
    }));
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_VIDEO_PROFILES, JSON.stringify({
      kling_2_5: kling25Prompt,
      kling_2_6: kling26Prompt,
      kling_01: kling01Prompt
    }));
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_START_END_SYSTEM_PROMPT, startEndSystemPrompt);

    // Notify parent component
    onSave?.();
    onClose();
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    // Reset all prompts to defaults
    setGeneralPhotoPrompt(PHOTO_MODEL_PROFILES.general_photo.systemPrompt);
    setNanoBananaProPrompt(PHOTO_MODEL_PROFILES.nano_banana_pro.systemPrompt);
    setKling25Prompt(VIDEO_MODEL_PROFILES.kling_2_5.systemPrompt);
    setKling26Prompt(VIDEO_MODEL_PROFILES.kling_2_6.systemPrompt);
    setKling01Prompt(VIDEO_MODEL_PROFILES.kling_01.systemPrompt);
    setStartEndSystemPrompt(START_END_FRAME_SYSTEM_PROMPT);
    
    // Clear from localStorage
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_PHOTO_PROFILES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_VIDEO_PROFILES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_START_END_SYSTEM_PROMPT);
    
    setShowResetConfirm(false);
    
    // Notify parent
    onSave?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Prompt Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === 'photo'
                ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Photo Settings
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === 'video'
                ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Video Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'photo' && (
            <>
              {/* General Photo System Prompt */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  General Photo System Prompt
                </label>
                <p className="text-slate-400 text-sm mb-3">
                  The default system prompt for general photo generation. Used when "General Photo" profile is selected.
                </p>
                <textarea
                  value={generalPhotoPrompt}
                  onChange={(e) => setGeneralPhotoPrompt(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-amber-500 focus:outline-none resize-none font-mono text-sm"
                  rows={12}
                  placeholder="Enter general photo system prompt..."
                />
                <div className="text-slate-500 text-xs mt-1">
                  {generalPhotoPrompt.length} characters
                </div>
              </div>

              {/* Nano Banana Pro System Prompt */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Nano Banana Pro System Prompt
                </label>
                <p className="text-slate-400 text-sm mb-3">
                  Complete system prompt for Nano Banana Pro model. This replaces the general photo prompt when selected.
                </p>
                <textarea
                  value={nanoBananaProPrompt}
                  onChange={(e) => setNanoBananaProPrompt(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-amber-500 focus:outline-none resize-none font-mono text-sm"
                  rows={14}
                  placeholder="Enter Nano Banana Pro system prompt..."
                />
                <div className="text-slate-500 text-xs mt-1">
                  {nanoBananaProPrompt.length} characters
                </div>
              </div>
            </>
          )}

          {activeTab === 'video' && (
            <>
              {/* Kling 2.5 System Prompt */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Kling 2.5 System Prompt
                </label>
                <p className="text-slate-400 text-sm mb-3">
                  Complete system prompt for Kling 2.5 (supports start/end frames).
                </p>
                <textarea
                  value={kling25Prompt}
                  onChange={(e) => setKling25Prompt(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
                  rows={14}
                  placeholder="Enter Kling 2.5 system prompt..."
                />
                <div className="text-slate-500 text-xs mt-1">
                  {kling25Prompt.length} characters
                </div>
              </div>

              {/* Kling 2.6 System Prompt */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Kling 2.6 System Prompt
                </label>
                <p className="text-slate-400 text-sm mb-3">
                  Complete system prompt for Kling 2.6 (latest with audio support).
                </p>
                <textarea
                  value={kling26Prompt}
                  onChange={(e) => setKling26Prompt(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
                  rows={14}
                  placeholder="Enter Kling 2.6 system prompt..."
                />
                <div className="text-slate-500 text-xs mt-1">
                  {kling26Prompt.length} characters
                </div>
              </div>

              {/* Kling 01 System Prompt */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Kling 01 System Prompt
                </label>
                <p className="text-slate-400 text-sm mb-3">
                  Complete system prompt for Kling 01 (legacy/stable motion).
                </p>
                <textarea
                  value={kling01Prompt}
                  onChange={(e) => setKling01Prompt(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
                  rows={14}
                  placeholder="Enter Kling 01 system prompt..."
                />
                <div className="text-slate-500 text-xs mt-1">
                  {kling01Prompt.length} characters
                </div>
              </div>

              {/* Start/End Frame System Prompt */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Start/End Frame System Prompt
                </label>
                <p className="text-slate-400 text-sm mb-3">
                  System prompt for generating transition prompts between two frames (used in Start/End Frame mode).
                </p>
                <textarea
                  value={startEndSystemPrompt}
                  onChange={(e) => setStartEndSystemPrompt(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-pink-500 focus:outline-none resize-none font-mono text-sm"
                  rows={12}
                  placeholder="Enter start/end frame system prompt..."
                />
                <div className="text-slate-500 text-xs mt-1">
                  {startEndSystemPrompt.length} characters
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold transition-all"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-xl p-6 max-w-md border border-slate-700">
            <h3 className="text-white font-bold text-lg mb-3">Reset to Defaults?</h3>
            <p className="text-slate-300 mb-6">
              This will restore all prompts to their default values and remove your custom settings. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
