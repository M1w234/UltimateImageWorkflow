import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Loader2,
  Copy,
  Check,
  Camera,
  Video,
  Sparkles
} from 'lucide-react';
import { fileToBase64, filterImageFiles } from '../utils/imageUtils';
import { generateUniqueId } from '../utils/storage';
import { generateImagePrompt } from '../services/geminiApi';
import {
  PHOTO_MODE_SYSTEM_PROMPT,
  VIDEO_MODE_SYSTEM_PROMPT,
  PHOTO_MODEL_PROFILES,
  VIDEO_MODEL_PROFILES,
  MAX_ANALYZE_IMAGES
} from '../utils/constants';

/**
 * Image-to-Prompt Generator Mode
 * Generates photo or video prompts from uploaded images using Gemini
 */
export default function AnalyzeMode({
  apiKey,
  onOpenSettings,
  onAddToCollection,
  onImageClick,
  pendingImage,
  onClearPendingImage
}) {
  // Mode state: 'photo' or 'video'
  const [mode, setMode] = useState('photo');
  
  // Image upload state
  const [images, setImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Generation state
  const [selectedModel, setSelectedModel] = useState(null);
  const [userInstruction, setUserInstruction] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Copy state
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef(null);

  // Get current model profiles based on mode
  const modelProfiles = mode === 'photo' ? PHOTO_MODEL_PROFILES : VIDEO_MODEL_PROFILES;
  const systemPrompt = mode === 'photo' ? PHOTO_MODE_SYSTEM_PROMPT : VIDEO_MODE_SYSTEM_PROMPT;

  // Handle pending image transfer
  useEffect(() => {
    if (pendingImage && images.length < MAX_ANALYZE_IMAGES) {
      setImages(prev => [...prev, {
        id: generateUniqueId(),
        base64: pendingImage,
        preview: pendingImage,
        fileName: 'from-preview.jpg'
      }]);
      onClearPendingImage?.();
    }
  }, [pendingImage]);

  // Reset selected model when mode changes
  useEffect(() => {
    setSelectedModel(null);
    setGeneratedPrompt('');
    setError(null);
  }, [mode]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

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
      setImages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          base64,
          preview,
          fileName: file.name
        }
      ]);
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
      setImages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          base64,
          preview,
          fileName: file.name
        }
      ]);
    }
    e.target.value = '';
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const clearAll = () => {
    setImages([]);
    setGeneratedPrompt('');
    setError(null);
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (!selectedModel) {
      setError('Please select a model profile');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPrompt('');

    try {
      // Get the model profile block
      const modelProfile = modelProfiles[selectedModel]?.block || null;
      
      // Use the first image for generation
      const imageBase64 = images[0].base64;

      const result = await generateImagePrompt(
        apiKey,
        imageBase64,
        userInstruction,
        systemPrompt,
        modelProfile
      );

      setGeneratedPrompt(result);
    } catch (err) {
      setError(err.message || 'Failed to generate prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
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
          Supports up to {MAX_ANALYZE_IMAGES} images
        </p>
        <div className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors inline-block">
          Select Images
        </div>
      </div>

      {/* Uploaded Images Preview */}
      {images.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">
              {images.length} image{images.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearAll}
              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Clear All
            </button>
          </div>
          <div className="flex gap-3 flex-wrap">
            {images.map((img) => (
              <div key={img.id} className="relative group flex flex-col items-center">
                <div className="relative">
                  <img
                    src={img.preview}
                    alt={img.fileName}
                    className="h-20 object-contain rounded-lg border border-slate-600 cursor-pointer hover:border-amber-500"
                    style={{ maxWidth: '120px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick(img.preview, img.fileName);
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-slate-400 text-xs mt-1 truncate max-w-[120px]">
                  {img.fileName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Instructions */}
      <div>
        <label className="block text-white font-medium mb-2">
          Optional Instructions
        </label>
        <input
          type="text"
          value={userInstruction}
          onChange={(e) => setUserInstruction(e.target.value)}
          placeholder="Add custom instructions (e.g., 'focus on the lighting' or 'make it more dramatic')"
          className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-white font-medium mb-3">
          Select Model Profile
        </label>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(modelProfiles).map(([key, profile]) => (
            <button
              key={key}
              onClick={() => setSelectedModel(key)}
              className={`px-5 py-3 rounded-lg font-medium transition-all ${
                selectedModel === key
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {profile.name}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || images.length === 0 || !selectedModel}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating Prompt...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate {mode === 'photo' ? 'Photo' : 'Video'} Prompt
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Generated Prompt Output */}
      {generatedPrompt && !isGenerating && (
        <div className="pt-6 border-t border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Generated Prompt
            </h3>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-900 rounded-lg p-5 border border-slate-600">
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
              {generatedPrompt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
