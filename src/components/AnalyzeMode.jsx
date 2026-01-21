import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Loader2,
  Copy,
  Check,
  Camera,
  Video,
  Sparkles,
  Play,
  ArrowRight,
  FileText,
  Plus
} from 'lucide-react';
import { fileToBase64, filterImageFiles } from '../utils/imageUtils';
import { 
  generateUniqueId,
  saveAnalysisHistory,
  getAnalysisHistory,
  deleteAnalysisHistoryItem,
  clearAnalysisHistory
} from '../utils/storage';
import { generateImagePrompt, generateMultiImagePrompt } from '../services/geminiApi';
import {
  PHOTO_MODE_SYSTEM_PROMPT,
  VIDEO_MODE_SYSTEM_PROMPT,
  START_END_FRAME_SYSTEM_PROMPT,
  PHOTO_MODEL_PROFILES,
  VIDEO_MODEL_PROFILES,
  MAX_ANALYZE_IMAGES,
  MAX_ANALYSIS_ITEMS,
  STORAGE_KEYS
} from '../utils/constants';
import PromptSettingsModal from './PromptSettingsModal';
import AnalyzeHistory from './AnalyzeHistory';

/**
 * Image-to-Prompt Generator Mode
 * Generates photo or video prompts from uploaded images using Gemini
 * Each image can have its own model profile, instructions, and output
 */
export default function AnalyzeMode({
  apiKey,
  onOpenSettings,
  onAddToCollection,
  onImageClick,
  onTransferToEditor,
  onTransferBatchToEditor,
  onTransferToVideo,
  onTransferBatchToVideo,
  pendingImage,
  onClearPendingImage
}) {
  // Mode state: 'photo' or 'video'
  const [mode, setMode] = useState('photo');
  
  // Prompt settings modal
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  
  // Analysis history
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Text-only mode state
  const [textDescription, setTextDescription] = useState('');
  const [textOnlyModel, setTextOnlyModel] = useState(null);
  const [isGeneratingTextOnly, setIsGeneratingTextOnly] = useState(false);
  const [textOnlyGeneratedPrompt, setTextOnlyGeneratedPrompt] = useState('');
  const [textOnlyError, setTextOnlyError] = useState(null);
  const [textOnlyCopied, setTextOnlyCopied] = useState(false);
  
  // Custom prompts state (loaded from localStorage, fallback to constants)
  const [customPrompts, setCustomPrompts] = useState({
    photoSystem: PHOTO_MODE_SYSTEM_PROMPT,
    videoSystem: VIDEO_MODE_SYSTEM_PROMPT,
    startEndSystem: START_END_FRAME_SYSTEM_PROMPT,
    photoProfiles: { ...PHOTO_MODEL_PROFILES },
    videoProfiles: { ...VIDEO_MODEL_PROFILES }
  });
  
  // Separate state for each mode
  const [photoState, setPhotoState] = useState({
    images: [],
    userInstruction: '',
    globalError: null
  });

  const [videoState, setVideoState] = useState({
    images: [],
    userInstruction: '',
    globalError: null
  });

  // Video section sub-mode: 'standard' or 'startEnd'
  const [videoSubMode, setVideoSubMode] = useState('standard');

  // Photo section sub-mode: 'standard' or 'multiPrompt'
  const [photoSubMode, setPhotoSubMode] = useState('standard');

  // Start/End frame state (only for video mode)
  const [startEndState, setStartEndState] = useState({
    startFrame: null, // {id, base64, preview, fileName}
    endFrame: null,   // {id, base64, preview, fileName}
    userInstruction: '',
    selectedModel: null,
    generatedPrompt: '',
    isGenerating: false,
    error: null,
    copied: false
  });

  // Multi-Prompt state (only for photo mode)
  const [multiPromptState, setMultiPromptState] = useState({
    image: null, // {id, base64, preview, fileName}
    prompts: [{ id: generateUniqueId(), text: '', generatedOutput: '', isGenerating: false, error: null, copied: false }],
    selectedModel: null,
    globalError: null,
    isGeneratingAll: false,
    currentProcessingIndex: -1
  });

  // Shared states (not mode-specific)
  const [dragActive, setDragActive] = useState(false);
  const [dragActiveMultiPrompt, setDragActiveMultiPrompt] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Get current state based on mode
  const currentState = mode === 'photo' ? photoState : videoState;
  const setCurrentState = mode === 'photo' ? setPhotoState : setVideoState;

  // Destructure for easier access
  const { images, userInstruction, globalError } = currentState;
  
  const fileInputRef = useRef(null);
  
  // Ref to always access latest images state (fixes stale closure in async functions)
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Load custom prompts and history from localStorage on mount
  useEffect(() => {
    loadCustomPrompts();
    loadHistory();
  }, []);

  const loadCustomPrompts = () => {
    const photoSystem = localStorage.getItem(STORAGE_KEYS.CUSTOM_PHOTO_SYSTEM_PROMPT);
    const videoSystem = localStorage.getItem(STORAGE_KEYS.CUSTOM_VIDEO_SYSTEM_PROMPT);
    const startEndSystem = localStorage.getItem(STORAGE_KEYS.CUSTOM_START_END_SYSTEM_PROMPT);
    
    const customPhotoProfiles = localStorage.getItem(STORAGE_KEYS.CUSTOM_PHOTO_PROFILES);
    const customVideoProfiles = localStorage.getItem(STORAGE_KEYS.CUSTOM_VIDEO_PROFILES);
    
    const updatedPrompts = {
      photoSystem: photoSystem || PHOTO_MODE_SYSTEM_PROMPT,
      videoSystem: videoSystem || VIDEO_MODE_SYSTEM_PROMPT,
      startEndSystem: startEndSystem || START_END_FRAME_SYSTEM_PROMPT,
      photoProfiles: { ...PHOTO_MODEL_PROFILES },
      videoProfiles: { ...VIDEO_MODEL_PROFILES }
    };
    
    // Merge custom profiles with defaults
    if (customPhotoProfiles) {
      try {
        const parsed = JSON.parse(customPhotoProfiles);
        Object.keys(parsed).forEach(key => {
          if (updatedPrompts.photoProfiles[key]) {
            updatedPrompts.photoProfiles[key] = {
              ...updatedPrompts.photoProfiles[key],
              systemPrompt: parsed[key]
            };
          }
        });
      } catch (e) {
        console.error('Failed to parse custom photo profiles:', e);
      }
    }
    
    if (customVideoProfiles) {
      try {
        const parsed = JSON.parse(customVideoProfiles);
        Object.keys(parsed).forEach(key => {
          if (updatedPrompts.videoProfiles[key]) {
            updatedPrompts.videoProfiles[key] = {
              ...updatedPrompts.videoProfiles[key],
              systemPrompt: parsed[key]
            };
          }
        });
      } catch (e) {
        console.error('Failed to parse custom video profiles:', e);
      }
    }
    
    setCustomPrompts(updatedPrompts);
  };

  // Load analysis history from IndexedDB
  const loadHistory = async () => {
    try {
      const history = await getAnalysisHistory();
      // Enforce max limit
      setAnalysisHistory(history.slice(0, MAX_ANALYSIS_ITEMS));
    } catch (error) {
      console.error('Failed to load analysis history:', error);
    }
  };

  // Save to history after successful generation
  const saveToHistory = async (image, prompt, modelProfile) => {
    try {
      await saveAnalysisHistory({
        mode,
        images: [{ preview: image.preview, fileName: image.fileName }],
        prompt,
        modelProfile,
        userInstruction
      });
      await loadHistory();
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  // Save start/end frames to history
  const saveStartEndToHistory = async (prompt) => {
    try {
      await saveAnalysisHistory({
        mode: 'video-start-end',
        images: [
          { preview: startEndState.startFrame.preview, fileName: 'Start Frame' },
          { preview: startEndState.endFrame.preview, fileName: 'End Frame' }
        ],
        prompt: prompt || startEndState.generatedPrompt,
        modelProfile: startEndState.selectedModel,
        userInstruction: startEndState.userInstruction
      });
      await loadHistory();
    } catch (error) {
      console.error('Failed to save start/end to history:', error);
    }
  };

  // Get current model profiles and system prompt based on mode (use custom if available)
  const modelProfiles = mode === 'photo' ? customPrompts.photoProfiles : customPrompts.videoProfiles;
  
  let systemPrompt;
  if (mode === 'photo') {
    systemPrompt = customPrompts.photoSystem;
  } else if (mode === 'video' && videoSubMode === 'startEnd') {
    systemPrompt = customPrompts.startEndSystem;
  } else {
    systemPrompt = customPrompts.videoSystem;
  }

  // Handle pending image transfer
  useEffect(() => {
    if (pendingImage && images.length < MAX_ANALYZE_IMAGES) {
      setCurrentState(prev => ({
        ...prev,
        images: [...prev.images, {
          id: generateUniqueId(),
          base64: pendingImage,
          preview: pendingImage,
          fileName: 'from-preview.jpg',
          selectedModel: null,
          generatedPrompt: '',
          isGenerating: false,
          error: null,
          copied: false
        }]
      }));
      onClearPendingImage?.();
    }
  }, [pendingImage]);

  // Get appropriate transfer handlers based on current mode
  const getTransferHandler = () => {
    return mode === 'video' ? onTransferToVideo : onTransferToEditor;
  };

  const getBatchTransferHandler = () => {
    return mode === 'video' ? onTransferBatchToVideo : onTransferBatchToEditor;
  };

  const getTransferLabel = () => {
    return mode === 'video' ? 'To Video' : 'To Editor';
  };

  const getBatchTransferLabel = () => {
    return mode === 'video' ? 'Transfer All to Video' : 'Transfer All to Editor';
  };

  // Update a specific image's properties
  const updateImage = (id, updates) => {
    setCurrentState(prev => ({
      ...prev,
      images: prev.images.map(img => 
        img.id === id ? { ...img, ...updates } : img
      )
    }));
  };

  // Reset copied state after 2 seconds for a specific image
  const handleCopySuccess = (id) => {
    updateImage(id, { copied: true });
    setTimeout(() => updateImage(id, { copied: false }), 2000);
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = filterImageFiles(e.dataTransfer.files);
    if (files.length === 0) return;

    const remainingSlots = MAX_ANALYZE_IMAGES - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const { base64, preview } = await fileToBase64(file);
      onAddToCollection(preview, file.name);
      setCurrentState((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            id: generateUniqueId(),
            base64,
            preview,
            fileName: file.name,
            selectedModel: null,
            generatedPrompt: '',
            isGenerating: false,
            error: null,
            copied: false
          }
        ]
      }));
    }
  };

  const handleFileSelect = async (e) => {
    const files = filterImageFiles(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_ANALYZE_IMAGES - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const { base64, preview } = await fileToBase64(file);
      onAddToCollection(preview, file.name);
      setCurrentState((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            id: generateUniqueId(),
            base64,
            preview,
            fileName: file.name,
            selectedModel: null,
            generatedPrompt: '',
            isGenerating: false,
            error: null,
            copied: false
          }
        ]
      }));
    }
    e.target.value = '';
  };

  const removeImage = (id) => {
    setCurrentState((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id)
    }));
  };

  const clearAll = () => {
    setCurrentState(prev => ({
      ...prev,
      images: [],
      globalError: null
    }));
  };

  // Generate prompt for a single image
  const generateForImage = async (imageId) => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    // Use ref to get latest images state (avoids stale closure in async loops)
    const currentImages = imagesRef.current;
    const image = currentImages.find(img => img.id === imageId);
    if (!image) return;

    if (!image.selectedModel) {
      updateImage(imageId, { error: 'Please select a model profile' });
      return;
    }

    updateImage(imageId, { isGenerating: true, error: null, generatedPrompt: '' });

    try {
      // Get the system prompt from the selected profile
      const selectedProfile = modelProfiles[image.selectedModel];
      const effectiveSystemPrompt = selectedProfile?.systemPrompt || systemPrompt;
      
      const result = await generateImagePrompt(
        apiKey,
        image.base64,
        userInstruction,
        effectiveSystemPrompt
      );

      updateImage(imageId, { generatedPrompt: result, isGenerating: false });
      
      // Save to history after successful generation
      await saveToHistory(image, result, image.selectedModel);
    } catch (err) {
      updateImage(imageId, { error: err.message || 'Failed to generate prompt', isGenerating: false });
    }
  };

  // Generate prompts for all images that have a model selected
  const generateAll = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    // Use ref to get latest images state
    const currentImages = imagesRef.current;
    const imagesToProcess = currentImages.filter(img => img.selectedModel && !img.generatedPrompt);
    
    if (imagesToProcess.length === 0) {
      setCurrentState(prev => ({ ...prev, globalError: 'No images ready to process. Select a model profile for each image.' }));
      return;
    }

    setIsGeneratingAll(true);
    setCurrentState(prev => ({ ...prev, globalError: null }));

    for (const img of imagesToProcess) {
      await generateForImage(img.id);
    }

    setIsGeneratingAll(false);
  };

  // Copy prompt for a specific image
  const copyPrompt = async (imageId) => {
    const currentImages = imagesRef.current;
    const image = currentImages.find(img => img.id === imageId);
    if (!image?.generatedPrompt) return;
    
    try {
      await navigator.clipboard.writeText(image.generatedPrompt);
      handleCopySuccess(imageId);
    } catch (err) {
      updateImage(imageId, { error: 'Failed to copy to clipboard' });
    }
  };

  // Transfer all images with prompts to appropriate destination
  const transferAllToDestination = () => {
    const handler = getBatchTransferHandler();
    if (!handler) return;
    
    const imagesWithPrompts = imagesRef.current.filter(img => img.generatedPrompt && img.generatedPrompt.trim());
    
    if (imagesWithPrompts.length === 0) {
      setCurrentState(prev => ({ ...prev, globalError: 'No generated prompts to transfer. Generate prompts first.' }));
      return;
    }
    
    // Send all at once as a batch
    const batch = imagesWithPrompts.map(img => ({
      preview: img.preview,
      prompt: img.generatedPrompt
    }));
    
    handler(batch);
  };

  // Generate transition prompt for start/end frames
  const generateStartEndPrompt = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    if (!startEndState.startFrame || !startEndState.endFrame) {
      setStartEndState(prev => ({ ...prev, error: 'Please upload both start and end frames' }));
      return;
    }

    setStartEndState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // For start/end frames, use the profile's system prompt if selected, otherwise use start/end system prompt
      const selectedProfile = startEndState.selectedModel
        ? customPrompts.videoProfiles[startEndState.selectedModel]
        : null;
      
      const effectiveSystemPrompt = selectedProfile?.systemPrompt || customPrompts.startEndSystem;

      const userMessage = `${startEndState.userInstruction ? startEndState.userInstruction + '\n\n' : ''}START FRAME: [First image uploaded]
END FRAME: [Second image uploaded]

Generate a video transition prompt that describes how to animate from the start frame to the end frame.`;

      const prompt = await generateMultiImagePrompt({
        apiKey,
        systemPrompt: effectiveSystemPrompt,
        userMessage,
        images: [startEndState.startFrame.base64, startEndState.endFrame.base64]
      });

      setStartEndState(prev => ({
        ...prev,
        generatedPrompt: prompt,
        isGenerating: false
      }));
      
      // Save to history after successful generation (pass prompt directly to avoid stale state)
      await saveStartEndToHistory(prompt);
    } catch (error) {
      setStartEndState(prev => ({
        ...prev,
        error: error.message || 'Failed to generate prompt',
        isGenerating: false
      }));
    }
  };

  // Copy start/end prompt to clipboard
  const copyStartEndPrompt = async () => {
    if (!startEndState.generatedPrompt) return;
    
    try {
      await navigator.clipboard.writeText(startEndState.generatedPrompt);
      setStartEndState(prev => ({ ...prev, copied: true }));
      setTimeout(() => {
        setStartEndState(prev => ({ ...prev, copied: false }));
      }, 2000);
    } catch (err) {
      setStartEndState(prev => ({ ...prev, error: 'Failed to copy to clipboard' }));
    }
  };

  // Transfer start/end frames to video tab
  const transferStartEndToVideo = () => {
    if (!onTransferToVideo) return;

    // Create a special transfer object with both frames
    onTransferToVideo({
      startFrame: startEndState.startFrame.preview,
      endFrame: startEndState.endFrame.preview,
      prompt: startEndState.generatedPrompt,
      isStartEndMode: true // Flag to indicate this is a start/end transfer
    });
  };

  // Check if any images can be processed
  const hasImagesReadyToProcess = images.some(img => img.selectedModel && !img.generatedPrompt && !img.isGenerating);
  const hasAnyGenerating = images.some(img => img.isGenerating);
  const hasGeneratedPrompts = images.some(img => img.generatedPrompt);

  return (
    <div className="space-y-6 relative">
      {/* Settings Button */}
      <button
        onClick={() => setShowPromptSettings(true)}
        className="absolute top-0 right-0 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all z-10"
        title="Edit Prompts"
      >
        <FileText className="w-5 h-5" />
      </button>

      {/* Prompt Settings Modal */}
      <PromptSettingsModal
        isOpen={showPromptSettings}
        onClose={() => setShowPromptSettings(false)}
        onSave={loadCustomPrompts}
      />

      {/* Photo/Video Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-700 rounded-xl p-1">
          <button
            onClick={() => setMode('photo')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'photo'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            <Camera className="w-5 h-5" />
            Photo
          </button>
          <button
            onClick={() => setMode('video')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'video'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            <Video className="w-5 h-5" />
            Video
          </button>
        </div>
      </div>

      {/* Photo Sub-mode Toggle (Standard vs Multi-Prompt) */}
      {mode === 'photo' && (
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => {
                setPhotoSubMode('standard');
                // Clear multi-prompt state when switching to standard
                if (photoSubMode === 'multiPrompt') {
                  setMultiPromptState({
                    image: null,
                    prompts: [{ id: generateUniqueId(), text: '', generatedOutput: '', isGenerating: false, error: null, copied: false }],
                    selectedModel: null,
                    globalError: null,
                    isGeneratingAll: false,
                    currentProcessingIndex: -1
                  });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                photoSubMode === 'standard'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Multi-Image
            </button>
            <button
              onClick={() => {
                setPhotoSubMode('multiPrompt');
                // Clear standard photo images when switching to multi-prompt
                if (photoSubMode === 'standard') {
                  setPhotoState({
                    images: [],
                    userInstruction: '',
                    globalError: null
                  });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                photoSubMode === 'multiPrompt'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Multi-Prompt
            </button>
          </div>
        </div>
      )}

      {/* Video Sub-mode Toggle (Standard vs Start/End Frames) */}
      {mode === 'video' && (
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => {
                setVideoSubMode('standard');
                // Clear start/end state when switching to standard
                if (videoSubMode === 'startEnd') {
                  setStartEndState({
                    startFrame: null,
                    endFrame: null,
                    userInstruction: '',
                    selectedModel: null,
                    generatedPrompt: '',
                    isGenerating: false,
                    error: null,
                    copied: false
                  });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                videoSubMode === 'standard'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => {
                setVideoSubMode('startEnd');
                // Clear standard video images when switching to start/end
                if (videoSubMode === 'standard') {
                  setVideoState({
                    images: [],
                    userInstruction: '',
                    globalError: null
                  });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                videoSubMode === 'startEnd'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Start/End Frames
            </button>
          </div>
        </div>
      )}

      {/* Standard Mode UI (Single Image Analysis) */}
      {((mode === 'photo' && photoSubMode === 'standard') || (mode === 'video' && videoSubMode === 'standard')) && (
        <>
          {/* Upload Area */}
          <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-slate-600 hover:border-amber-500/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
        
        <Upload className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-white font-medium mb-2">
          Drop images here or click to upload
        </p>
        <p className="text-slate-400 text-sm mb-4">
          Supports up to {MAX_ANALYZE_IMAGES} images - each gets its own prompt
        </p>
        <div className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors inline-block">
          Select Images
        </div>
      </div>

      {/* Text Description Field - Only visible when no images */}
      {images.length === 0 && (
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">
            Description (Required without images)
          </label>
          <textarea
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
            placeholder="Describe what you want to generate (e.g., 'A serene mountain landscape at sunset with a calm lake reflection')"
            className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-amber-500 focus:outline-none resize-none"
            rows={4}
          />
          <p className="text-slate-400 text-xs mt-1">
            Enter a description to generate a prompt without uploading images
          </p>
        </div>
      )}

      {/* Text-Only Generation Section */}
      {images.length === 0 && textDescription.trim() && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h3 className="text-white font-semibold text-lg">Text-to-Image Prompt Generation</h3>
          </div>
          
          {/* Additional Instructions */}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Additional Instructions (Optional)
            </label>
            <input
              type="text"
              value={userInstruction}
              onChange={(e) => setCurrentState(prev => ({
                ...prev,
                userInstruction: e.target.value
              }))}
              placeholder="e.g., 'focus on lighting' or 'make it dramatic'"
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Model Profile Selection for Text-Only */}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Model Profile
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(modelProfiles).map(([key, profile]) => (
                <button
                  key={key}
                  onClick={() => setTextOnlyModel(key)}
                  disabled={isGeneratingTextOnly}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    textOnlyModel === key
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                  } ${isGeneratingTextOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {profile.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Generate Button */}
          <button
            onClick={async () => {
              if (!apiKey) {
                onOpenSettings();
                return;
              }
              if (!textOnlyModel) {
                setTextOnlyError('Please select a model profile');
                return;
              }
              
              setIsGeneratingTextOnly(true);
              setTextOnlyError(null);
              
              try {
                const selectedProfile = modelProfiles[textOnlyModel];
                const effectiveSystemPrompt = selectedProfile?.systemPrompt || systemPrompt;
                
                const { generateTextOnlyPrompt } = await import('../services/geminiApi');
                const result = await generateTextOnlyPrompt(
                  apiKey,
                  textDescription,
                  userInstruction,
                  effectiveSystemPrompt
                );
                
                setTextOnlyGeneratedPrompt(result);
                setIsGeneratingTextOnly(false);
                
                // Save to history
                await saveAnalysisHistory({
                  mode,
                  images: [],
                  textDescription,
                  prompt: result,
                  modelProfile: textOnlyModel,
                  userInstruction
                });
                await loadHistory();
              } catch (err) {
                setTextOnlyError(err.message || 'Failed to generate prompt');
                setIsGeneratingTextOnly(false);
              }
            }}
            disabled={isGeneratingTextOnly || !textOnlyModel}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isGeneratingTextOnly ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Prompt
              </>
            )}
          </button>
          
          {/* Error Display */}
          {textOnlyError && (
            <div className="mt-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
              {textOnlyError}
            </div>
          )}
          
          {/* Generated Output */}
          {textOnlyGeneratedPrompt && !isGeneratingTextOnly && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generated Prompt
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(textOnlyGeneratedPrompt);
                        setTextOnlyCopied(true);
                        setTimeout(() => setTextOnlyCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      textOnlyCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {textOnlyCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  {getTransferHandler() && (
                    <button
                      onClick={() => getTransferHandler()({ preview: null, prompt: textOnlyGeneratedPrompt })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />
                      {getTransferLabel()}
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {textOnlyGeneratedPrompt}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared Instructions for All Images */}
      {images.length > 0 && (
        <div>
          <label className="block text-white font-medium mb-2">
            Instructions (applies to all images)
          </label>
          <input
            type="text"
            value={userInstruction}
            onChange={(e) => setCurrentState(prev => ({
              ...prev,
              userInstruction: e.target.value
            }))}
            placeholder="e.g., 'focus on lighting' or 'make it dramatic' (optional)"
            className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}

      {/* Bulk Model Selector - Apply to All Images */}
      {images.length > 1 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <label className="block text-white font-medium mb-3">
            Set Model for All Images
          </label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(modelProfiles).map(([key, profile]) => (
              <button
                key={key}
                onClick={() => {
                  // Apply this model to all images
                  setCurrentState(prev => ({
                    ...prev,
                    images: prev.images.map(img => ({ ...img, selectedModel: key }))
                  }));
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-amber-500 hover:text-white transition-all"
              >
                {profile.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global Error */}
      {globalError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {globalError}
        </div>
      )}

      {/* Image Cards */}
      {images.length > 0 && (
        <div className="space-y-4">
          {/* Header with Clear All */}
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">
              {images.length} image{images.length !== 1 ? 's' : ''} uploaded
            </span>
            <button
              onClick={clearAll}
              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Clear All
            </button>
          </div>

          {/* Individual Image Cards */}
          {images.map((img, index) => (
            <div 
              key={img.id} 
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
            >
              {/* Card Header: Image Preview + Filename + Remove */}
              <div className="flex items-start gap-4 mb-4">
                <div className="relative flex-shrink-0">
                  <img
                    src={img.preview}
                    alt={img.fileName}
                    className="h-24 w-24 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-amber-500"
                    onClick={() => onImageClick(img.preview, img.fileName)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition-all hover:scale-110"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    Image {index + 1}: {img.fileName}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {mode === 'photo' ? 'Photo prompt' : 'Video prompt'} generation
                  </p>
                </div>
              </div>

              {/* Model Profile Selection */}
              <div className="mb-3">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Model Profile
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(modelProfiles).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={() => updateImage(img.id, { selectedModel: key })}
                      disabled={img.isGenerating}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        img.selectedModel === key
                          ? 'bg-amber-500 text-white shadow-lg'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                      } ${img.isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {profile.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button for this image */}
              <button
                onClick={() => generateForImage(img.id)}
                disabled={img.isGenerating || !img.selectedModel}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {img.isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Prompt
                  </>
                )}
              </button>

              {/* Per-image Error */}
              {img.error && (
                <div className="mt-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                  {img.error}
                </div>
              )}

              {/* Generated Prompt Output */}
              {img.generatedPrompt && !img.isGenerating && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-400 font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generated Prompt
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyPrompt(img.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          img.copied
                            ? 'bg-green-500 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {img.copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                      {getTransferHandler() && (
                        <button
                          onClick={() => getTransferHandler()({ preview: img.preview, prompt: img.generatedPrompt })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                          {getTransferLabel()}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {img.generatedPrompt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Generate All Button */}
          {images.length > 1 && (
            <button
              onClick={generateAll}
              disabled={isGeneratingAll || hasAnyGenerating || !hasImagesReadyToProcess}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
            >
              {isGeneratingAll || hasAnyGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating All...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Generate All Prompts
                </>
              )}
            </button>
          )}

          {/* Transfer All Button */}
          {getBatchTransferHandler() && hasGeneratedPrompts && (
            <button
              onClick={transferAllToDestination}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <ArrowRight className="w-6 h-6" />
              {getBatchTransferLabel()}
            </button>
          )}
        </div>
      )}
        </>
      )}

      {/* Multi-Prompt Mode UI */}
      {mode === 'photo' && photoSubMode === 'multiPrompt' && (
        <div className="space-y-4">
          {/* Header with info */}
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
            <h3 className="text-teal-400 font-semibold mb-2">Multi-Prompt Analysis</h3>
            <p className="text-slate-300 text-sm">
              Upload a single image and run multiple different prompts against it to generate multiple outputs.
            </p>
          </div>

          {/* Image Upload Section */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <label className="block text-white font-medium mb-3">Upload Image</label>
            {multiPromptState.image ? (
              <div className="relative inline-block">
                <img
                  src={multiPromptState.image.preview}
                  alt="Multi-Prompt Image"
                  className="max-h-48 rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => onImageClick(multiPromptState.image.preview, multiPromptState.image.fileName)}
                />
                <button
                  onClick={() => setMultiPromptState(prev => ({ ...prev, image: null }))}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActiveMultiPrompt
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-slate-600 hover:border-teal-500/50'
                }`}
                onClick={() => document.getElementById('multiPromptImageInput')?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActiveMultiPrompt(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActiveMultiPrompt(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActiveMultiPrompt(false);

                  const files = filterImageFiles(e.dataTransfer.files);
                  if (files.length === 0) return;

                  const file = files[0]; // Only take the first file
                  const { base64, preview } = await fileToBase64(file);
                  setMultiPromptState(prev => ({
                    ...prev,
                    image: {
                      id: generateUniqueId(),
                      base64,
                      preview,
                      fileName: file.name
                    }
                  }));
                  onAddToCollection(preview, file.name);
                }}
              >
                <input
                  id="multiPromptImageInput"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const { base64, preview } = await fileToBase64(file);
                      setMultiPromptState(prev => ({
                        ...prev,
                        image: {
                          id: generateUniqueId(),
                          base64,
                          preview,
                          fileName: file.name
                        }
                      }));
                      onAddToCollection(preview, file.name);
                    }
                    e.target.value = '';
                  }}
                />
                <Upload className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                <p className="text-teal-400 font-medium">Upload Image</p>
                <p className="text-slate-400 text-sm mt-1">Drop image here or click to select</p>
              </div>
            )}
          </div>

          {/* Model Profile Selection */}
          {multiPromptState.image && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <label className="block text-white font-medium mb-3">Model Profile (applies to all prompts)</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(modelProfiles).map(([key, profile]) => (
                  <button
                    key={key}
                    onClick={() => setMultiPromptState(prev => ({ ...prev, selectedModel: key }))}
                    disabled={multiPromptState.isGeneratingAll}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      multiPromptState.selectedModel === key
                        ? 'bg-teal-500 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                    } ${multiPromptState.isGeneratingAll ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompts Section */}
          {multiPromptState.image && multiPromptState.selectedModel && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-white font-medium">Prompts</label>
                <button
                  onClick={() => {
                    setMultiPromptState(prev => ({
                      ...prev,
                      prompts: [
                        ...prev.prompts,
                        { id: generateUniqueId(), text: '', generatedOutput: '', isGenerating: false, error: null, copied: false }
                      ]
                    }));
                  }}
                  disabled={multiPromptState.isGeneratingAll}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Prompt
                </button>
              </div>

              <div className="space-y-3">
                {multiPromptState.prompts.map((prompt, index) => (
                  <div key={prompt.id} className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-slate-400 text-sm font-medium mt-2">#{index + 1}</span>
                      <textarea
                        value={prompt.text}
                        onChange={(e) => {
                          setMultiPromptState(prev => ({
                            ...prev,
                            prompts: prev.prompts.map(p =>
                              p.id === prompt.id ? { ...p, text: e.target.value } : p
                            )
                          }));
                        }}
                        placeholder="Enter your prompt/instruction (e.g., 'focus on lighting and composition')"
                        className="flex-1 bg-slate-800 text-white rounded-lg p-2 border border-slate-600 focus:border-teal-500 focus:outline-none resize-none"
                        rows={2}
                        disabled={multiPromptState.isGeneratingAll}
                      />
                      {multiPromptState.prompts.length > 1 && (
                        <button
                          onClick={() => {
                            setMultiPromptState(prev => ({
                              ...prev,
                              prompts: prev.prompts.filter(p => p.id !== prompt.id)
                            }));
                          }}
                          disabled={multiPromptState.isGeneratingAll}
                          className="text-red-400 hover:text-red-300 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove prompt"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Show loading state for this prompt */}
                    {prompt.isGenerating && (
                      <div className="flex items-center gap-2 text-teal-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </div>
                    )}

                    {/* Show error for this prompt */}
                    {prompt.error && (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-red-300 text-sm">
                        {prompt.error}
                      </div>
                    )}

                    {/* Show generated output for this prompt */}
                    {prompt.generatedOutput && !prompt.isGenerating && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-teal-400 font-medium flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4" />
                            Generated Output
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(prompt.generatedOutput);
                                  setMultiPromptState(prev => ({
                                    ...prev,
                                    prompts: prev.prompts.map(p =>
                                      p.id === prompt.id ? { ...p, copied: true } : p
                                    )
                                  }));
                                  setTimeout(() => {
                                    setMultiPromptState(prev => ({
                                      ...prev,
                                      prompts: prev.prompts.map(p =>
                                        p.id === prompt.id ? { ...p, copied: false } : p
                                      )
                                    }));
                                  }, 2000);
                                } catch (err) {
                                  console.error('Failed to copy:', err);
                                }
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                                prompt.copied
                                  ? 'bg-green-500 text-white'
                                  : 'bg-teal-500 hover:bg-teal-600 text-white'
                              }`}
                            >
                              {prompt.copied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                            {getTransferHandler() && (
                              <button
                                onClick={() => getTransferHandler()({ preview: multiPromptState.image.preview, prompt: prompt.generatedOutput })}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-purple-500 hover:bg-purple-600 text-white transition-all"
                              >
                                <ArrowRight className="w-3 h-3" />
                                To Editor
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                            {prompt.generatedOutput}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate All Button */}
          {multiPromptState.image && multiPromptState.selectedModel && multiPromptState.prompts.some(p => p.text.trim()) && (
            <button
              onClick={async () => {
                if (!apiKey) {
                  onOpenSettings();
                  return;
                }

                const promptsToProcess = multiPromptState.prompts.filter(p => p.text.trim() && !p.generatedOutput);
                if (promptsToProcess.length === 0) {
                  setMultiPromptState(prev => ({ ...prev, globalError: 'All prompts have already been generated or are empty.' }));
                  return;
                }

                setMultiPromptState(prev => ({ ...prev, isGeneratingAll: true, globalError: null }));

                // Process prompts sequentially
                for (let i = 0; i < promptsToProcess.length; i++) {
                  const prompt = promptsToProcess[i];
                  
                  // Set this prompt as generating
                  setMultiPromptState(prev => ({
                    ...prev,
                    currentProcessingIndex: i,
                    prompts: prev.prompts.map(p =>
                      p.id === prompt.id ? { ...p, isGenerating: true, error: null } : p
                    )
                  }));

                  try {
                    const selectedProfile = modelProfiles[multiPromptState.selectedModel];
                    const effectiveSystemPrompt = selectedProfile?.systemPrompt || systemPrompt;
                    
                    const result = await generateImagePrompt(
                      apiKey,
                      multiPromptState.image.base64,
                      prompt.text,
                      effectiveSystemPrompt
                    );

                    setMultiPromptState(prev => ({
                      ...prev,
                      prompts: prev.prompts.map(p =>
                        p.id === prompt.id ? { ...p, generatedOutput: result, isGenerating: false } : p
                      )
                    }));
                  } catch (err) {
                    setMultiPromptState(prev => ({
                      ...prev,
                      prompts: prev.prompts.map(p =>
                        p.id === prompt.id ? { ...p, error: err.message || 'Failed to generate', isGenerating: false } : p
                      )
                    }));
                  }
                }

                setMultiPromptState(prev => ({ ...prev, isGeneratingAll: false, currentProcessingIndex: -1 }));

                // Save to history
                const promptsWithOutputs = multiPromptState.prompts.filter(p => p.generatedOutput);
                if (promptsWithOutputs.length > 0) {
                  try {
                    await saveAnalysisHistory({
                      mode: 'photo-multi-prompt',
                      images: [{ preview: multiPromptState.image.preview, fileName: multiPromptState.image.fileName }],
                      prompts: promptsWithOutputs.map(p => ({ text: p.text, output: p.generatedOutput })),
                      modelProfile: multiPromptState.selectedModel
                    });
                    await loadHistory();
                  } catch (error) {
                    console.error('Failed to save to history:', error);
                  }
                }
              }}
              disabled={multiPromptState.isGeneratingAll}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
            >
              {multiPromptState.isGeneratingAll ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating {multiPromptState.currentProcessingIndex >= 0 ? `(${multiPromptState.currentProcessingIndex + 1} of ${multiPromptState.prompts.filter(p => p.text.trim() && !p.generatedOutput).length})` : '...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Generate All Prompts
                </>
              )}
            </button>
          )}

          {/* Global Error */}
          {multiPromptState.globalError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
              {multiPromptState.globalError}
            </div>
          )}

          {/* Transfer All Button */}
          {getBatchTransferHandler() && multiPromptState.prompts.filter(p => p.generatedOutput).length > 1 && (
            <button
              onClick={() => {
                const handler = getBatchTransferHandler();
                const promptsWithOutputs = multiPromptState.prompts.filter(p => p.generatedOutput);
                
                const batch = promptsWithOutputs.map(p => ({
                  preview: multiPromptState.image.preview,
                  prompt: p.generatedOutput
                }));
                
                handler(batch);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <ArrowRight className="w-6 h-6" />
              Transfer All to Editor ({multiPromptState.prompts.filter(p => p.generatedOutput).length} outputs)
            </button>
          )}

          {/* Clear All Button */}
          {(multiPromptState.image || multiPromptState.prompts.some(p => p.text || p.generatedOutput)) && (
            <button
              onClick={() => {
                if (confirm('Clear all data in Multi-Prompt mode? This will remove the image and all prompts.')) {
                  setMultiPromptState({
                    image: null,
                    prompts: [{ id: generateUniqueId(), text: '', generatedOutput: '', isGenerating: false, error: null, copied: false }],
                    selectedModel: null,
                    globalError: null,
                    isGeneratingAll: false,
                    currentProcessingIndex: -1
                  });
                }
              }}
              disabled={multiPromptState.isGeneratingAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-medium border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Start/End Frame Workflow UI */}
      {mode === 'video' && videoSubMode === 'startEnd' && (
        <div className="space-y-4">
          {/* Header with info */}
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
            <h3 className="text-pink-400 font-semibold mb-2">Start/End Frame Workflow</h3>
            <p className="text-slate-300 text-sm mb-2">
              Upload two images and generate a transition prompt for Kling 2.5 video generation.
            </p>
            <div className="bg-blue-500/20 border border-blue-400/40 rounded px-3 py-2 text-xs text-blue-300">
              <strong>Auto-Switch:</strong> Kling 2.5 will be automatically selected when you transfer (only model with start/end frame support)
            </div>
          </div>

          {/* Start Frame Upload */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <label className="block text-white font-medium mb-3">Start Frame</label>
            {startEndState.startFrame ? (
              <div className="relative inline-block">
                <img
                  src={startEndState.startFrame.preview}
                  alt="Start Frame"
                  className="max-h-48 rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => onImageClick(startEndState.startFrame.preview, 'Start Frame')}
                />
                <button
                  onClick={() => setStartEndState(prev => ({ ...prev, startFrame: null }))}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slate-600 hover:border-pink-500/50 rounded-lg p-8 text-center cursor-pointer transition-colors"
                onClick={() => document.getElementById('startFrameInput')?.click()}
              >
                <input
                  id="startFrameInput"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const { base64, preview } = await fileToBase64(file);
                      setStartEndState(prev => ({
                        ...prev,
                        startFrame: {
                          id: generateUniqueId(),
                          base64,
                          preview,
                          fileName: file.name
                        }
                      }));
                      onAddToCollection(preview, file.name);
                    }
                  }}
                />
                <Upload className="w-10 h-10 text-pink-500 mx-auto mb-3" />
                <p className="text-pink-400 font-medium">Upload Start Frame</p>
                <p className="text-slate-400 text-sm mt-1">Click to select image</p>
              </div>
            )}
          </div>

          {/* End Frame Upload */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <label className="block text-white font-medium mb-3">End Frame</label>
            {startEndState.endFrame ? (
              <div className="relative inline-block">
                <img
                  src={startEndState.endFrame.preview}
                  alt="End Frame"
                  className="max-h-48 rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => onImageClick(startEndState.endFrame.preview, 'End Frame')}
                />
                <button
                  onClick={() => setStartEndState(prev => ({ ...prev, endFrame: null }))}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slate-600 hover:border-pink-500/50 rounded-lg p-8 text-center cursor-pointer transition-colors"
                onClick={() => document.getElementById('endFrameInput')?.click()}
              >
                <input
                  id="endFrameInput"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const { base64, preview } = await fileToBase64(file);
                      setStartEndState(prev => ({
                        ...prev,
                        endFrame: {
                          id: generateUniqueId(),
                          base64,
                          preview,
                          fileName: file.name
                        }
                      }));
                      onAddToCollection(preview, file.name);
                    }
                  }}
                />
                <Upload className="w-10 h-10 text-pink-500 mx-auto mb-3" />
                <p className="text-pink-400 font-medium">Upload End Frame</p>
                <p className="text-slate-400 text-sm mt-1">Click to select image</p>
              </div>
            )}
          </div>

          {/* User Instructions */}
          <div>
            <label className="block text-white font-medium mb-2">
              Instructions (Optional)
            </label>
            <textarea
              value={startEndState.userInstruction}
              onChange={(e) => setStartEndState(prev => ({ ...prev, userInstruction: e.target.value }))}
              placeholder="Add specific instructions for the transition (e.g., 'smooth camera pan' or 'quick fade')..."
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none resize-none h-24"
            />
          </div>

          {/* Model Profile Selection */}
          <div>
            <label className="block text-white font-medium mb-2">Model Profile</label>
            <select
              value={startEndState.selectedModel || ''}
              onChange={(e) => setStartEndState(prev => ({ ...prev, selectedModel: e.target.value || null }))}
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none"
            >
              <option value="">Default (No specific profile)</option>
              {Object.entries(customPrompts.videoProfiles).map(([key, profile]) => (
                <option key={key} value={key}>{profile.name}</option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateStartEndPrompt}
            disabled={!startEndState.startFrame || !startEndState.endFrame || startEndState.isGenerating}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
          >
            {startEndState.isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating Transition Prompt...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Generate Transition Prompt
              </>
            )}
          </button>

          {/* Generated Prompt Display */}
          {startEndState.generatedPrompt && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-white font-semibold">Generated Transition Prompt</h4>
                <div className="flex gap-2">
                  <button
                    onClick={copyStartEndPrompt}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      startEndState.copied
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {startEndState.copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={transferStartEndToVideo}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Transfer to Video
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {startEndState.generatedPrompt}
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {startEndState.error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
              {startEndState.error}
            </div>
          )}
        </div>
      )}

      {/* Analysis History */}
      <AnalyzeHistory
        history={analysisHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
        onDeleteItem={async (id) => {
          try {
            await deleteAnalysisHistoryItem(id);
            await loadHistory();
          } catch (error) {
            console.error('Failed to delete history item:', error);
          }
        }}
        onClearAll={async () => {
          if (confirm('Clear all analysis history? This action cannot be undone.')) {
            try {
              await clearAnalysisHistory();
              await loadHistory();
            } catch (error) {
              console.error('Failed to clear history:', error);
            }
          }
        }}
        onPushToEditor={(item) => {
          // Push to appropriate destination based on mode
          if (item.mode === 'photo-multi-prompt') {
            // Multi-prompt: transfer all as batch to editor
            const batch = item.prompts.map(p => ({
              preview: item.images[0].preview,
              prompt: p.output
            }));
            onTransferBatchToEditor(batch);
          } else if (item.mode === 'video' || item.mode === 'video-start-end') {
            // Video modes
            if (item.images.length === 1) {
              onTransferToVideo({ preview: item.images[0].preview, prompt: item.prompt });
            } else {
              // For start/end frames
              onTransferToVideo({
                startFrame: item.images[0].preview,
                endFrame: item.images[1].preview,
                prompt: item.prompt,
                isStartEndMode: true
              });
            }
          } else {
            // Photo mode (single prompt)
            if (item.images.length === 1) {
              onTransferToEditor({ preview: item.images[0].preview, prompt: item.prompt });
            }
          }
        }}
        onImageClick={onImageClick}
      />
    </div>
  );
}
