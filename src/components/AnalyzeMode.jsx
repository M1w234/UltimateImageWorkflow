import { useState, useRef } from 'react';
import {
  Search,
  Upload,
  X,
  Loader2,
  CheckCircle,
  ArrowRight,
  Clock,
  ChevronDown,
  Trash
} from 'lucide-react';
import { fileToBase64, filterImageFiles } from '../utils/imageUtils';
import { generateUniqueId } from '../utils/storage';
import { analyzeMultipleImages } from '../services/openaiApi';
import { DEFAULT_ANALYZE_PROMPT, MAX_ANALYZE_IMAGES } from '../utils/constants';

/**
 * Analyze Mode - GPT Vision image analysis
 */
export default function AnalyzeMode({
  openaiKey,
  openaiModel,
  onOpenSettings,
  onAddToCollection,
  analysisHistory,
  onAddToAnalysisHistory,
  onRemoveFromAnalysisHistory,
  onClearAnalysisHistory,
  onTransferToEditor,
  onImageClick
}) {
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState(DEFAULT_ANALYZE_PROMPT);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef(null);

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
    setResults([]);
    setError(null);
  };

  const processAnalysis = async () => {
    if (!openaiKey) {
      onOpenSettings();
      return;
    }

    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const analysisResults = await analyzeMultipleImages({
        apiKey: openaiKey,
        model: openaiModel,
        prompt,
        images
      });

      setResults(analysisResults);

      // Save to history
      const entry = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        prompt,
        images: images.map((img) => ({
          preview: img.preview,
          fileName: img.fileName
        })),
        results: analysisResults
      };
      onAddToAnalysisHistory(entry);
    } catch (err) {
      setError(err.message || 'Failed to analyze images');
    } finally {
      setLoading(false);
    }
  };

  const transferToEditor = (result) => {
    onTransferToEditor({
      preview: result.preview,
      analysis: result.analysis
    });
  };

  const transferAllToEditor = () => {
    results.forEach((result, idx) => {
      setTimeout(() => transferToEditor(result), idx * 100);
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-slate-600 hover:border-slate-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
        
        <Upload className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <p className="text-white font-medium mb-2">
          Drop images here or click to upload
        </p>
        <p className="text-slate-400 text-sm mb-4">
          Supports up to {MAX_ANALYZE_IMAGES} images • JPG, PNG, WebP
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Select Images
        </button>
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
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt={img.fileName}
                  className="w-20 h-20 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-purple-500"
                  onClick={() => onImageClick(img.preview, img.fileName)}
                />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-slate-400 text-xs mt-1 truncate w-20">
                  {img.fileName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <div>
        <label className="block text-white font-medium mb-2">
          Analysis Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to know about the images..."
          className="w-full bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-purple-500 focus:outline-none resize-none h-24"
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={processAnalysis}
        disabled={loading || images.length === 0}
        className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Search className="w-6 h-6" />
            Analyze {images.length > 0 ? images.length : ''} Image
            {images.length !== 1 ? 's' : ''}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="pt-8 border-t border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              Analysis Complete
            </h3>
            <button
              onClick={transferAllToEditor}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Transfer All to Editor
            </button>
          </div>

          <div className="space-y-6">
            {results.map((result, idx) => (
              <div
                key={result.id}
                className="bg-slate-900 rounded-lg p-4 border border-slate-700"
              >
                <div className="flex gap-4">
                  <img
                    src={result.preview}
                    alt={result.fileName}
                    className="w-32 h-32 object-cover rounded-lg border border-slate-600 flex-shrink-0 cursor-pointer hover:border-purple-500"
                    onClick={() => onImageClick(result.preview, result.fileName)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400 font-medium">
                        Image {idx + 1}: {result.fileName}
                      </span>
                      <button
                        onClick={() => transferToEditor(result)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-sm py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <ArrowRight className="w-3 h-3" />
                        To Editor
                      </button>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {result.analysis}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis History */}
      <div className="mt-8">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-500" />
            <span className="text-white font-medium">Analysis History</span>
            <span className="text-slate-400 text-sm">
              {analysisHistory.length} entr{analysisHistory.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${
              historyOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {historyOpen && (
          <div className="mt-2 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400 text-sm">
                Last {analysisHistory.length} analyses
              </p>
              {analysisHistory.length > 0 && (
                <button
                  onClick={onClearAnalysisHistory}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Trash className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            {analysisHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analysisHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-900 rounded-lg p-3 border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-purple-400 text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">
                          Analyze
                        </span>
                        <span className="text-slate-500 text-xs ml-2">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveFromAnalysisHistory(entry.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-slate-300 text-sm line-clamp-2 mb-2">
                      {entry.prompt}
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {entry.images?.slice(0, 5).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.preview}
                          alt=""
                          className="w-12 h-12 object-cover rounded border border-slate-600 flex-shrink-0"
                        />
                      ))}
                      {entry.images?.length > 5 && (
                        <div className="w-12 h-12 rounded border border-slate-600 bg-slate-700 flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
                          +{entry.images.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">
                No analysis history yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
