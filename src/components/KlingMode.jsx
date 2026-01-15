import { useState, useRef } from 'react';
import {
  Video,
  Upload,
  X,
  Loader2,
  Download,
  Play,
  Clock,
  ChevronDown,
  Trash
} from 'lucide-react';
import { fileToBase64, filterImageFiles, isValidImage } from '../utils/imageUtils';
import { generateUniqueId } from '../utils/storage';
import { startVideoGeneration, checkVideoStatus } from '../services/klingApi';
import { ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_MODES, KLING_MODELS } from '../utils/constants';

/**
 * Kling Mode - AI Video Generation
 */
export default function KlingMode({
  klingKey,
  klingModel,
  onOpenSettings,
  onAddToCollection,
  onImageClick,
  playChime
}) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [mode, setMode] = useState('std');
  const [enableAudio, setEnableAudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [videoHistory, setVideoHistory] = useState([]);
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

    const file = e.dataTransfer.files[0];
    if (file && isValidImage(file)) {
      handleImageFile(file);
    }
  };

  const handleImageFile = async (file) => {
    const { base64, preview } = await fileToBase64(file);
    setImage(base64);
    setImagePreview(preview);
    onAddToCollection(preview, file.name);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file && isValidImage(file)) {
      handleImageFile(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAll = () => {
    setPrompt('');
    setNegativePrompt('');
    clearImage();
    setResult(null);
    setError(null);
    setTaskId(null);
    setStatus(null);
  };

  // Poll for video status
  const pollVideoStatus = async (taskIdToPoll) => {
    try {
      const result = await checkVideoStatus({ apiKey: klingKey, taskId: taskIdToPoll });
      setStatus(result.status);

      if (result.status === 'completed') {
        setResult(result.videoUrl);
        setLoading(false);
        playChime();

        // Save to video history
        const historyEntry = {
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          prompt,
          hasImage: !!image,
          imagePreview,
          videoUrl: result.videoUrl,
          duration,
          aspectRatio,
          mode
        };
        setVideoHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);

        return true;
      } else if (result.status === 'failed') {
        setError(result.error || 'Video generation failed');
        setLoading(false);
        return true;
      }

      return false;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return true;
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!klingKey) {
      onOpenSettings();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('pending');
    setTaskId(null);

    try {
      const newTaskId = await startVideoGeneration({
        apiKey: klingKey,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        duration,
        aspectRatio,
        mode,
        version: klingModel,
        imageBase64: image,
        enableAudio: enableAudio && klingModel === '2.6' && mode === 'pro'
      });

      setTaskId(newTaskId);
      setStatus('processing');

      // Start polling
      const pollInterval = setInterval(async () => {
        const isDone = await pollVideoStatus(newTaskId);
        if (isDone) {
          clearInterval(pollInterval);
        }
      }, 5000);
    } catch (err) {
      setError(err.message || 'Failed to generate video');
      setLoading(false);
    }
  };

  const downloadVideo = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `kling-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Queued...';
      case 'processing':
        return 'Generating video...';
      case 'completed':
        return 'Complete!';
      case 'failed':
        return 'Failed';
      default:
        return status || 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
        <p className="text-pink-300 text-sm">
          <strong>Video Mode:</strong> Generate AI videos using Kling AI. 
          Optionally add a reference image for image-to-video generation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-4">
          {/* Optional Image */}
          <div>
            <label className="block text-white font-medium mb-2">
              Reference Image (Optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                dragActive
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-slate-600'
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
                onChange={handleFileSelect}
              />

              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Reference"
                    className="max-h-32 rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => onImageClick(imagePreview, 'Reference Image')}
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Upload className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-pink-400 hover:text-pink-300 text-sm"
                  >
                    Add image for image-to-video
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-white font-medium mb-2">
              Video Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none resize-none h-28 text-sm"
            />
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="block text-white font-medium mb-2">
              Negative Prompt (Optional)
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid in the video..."
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none resize-none h-20 text-sm"
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
              >
                {VIDEO_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
              >
                {ASPECT_RATIOS.filter((ar) => ar.value !== 'auto').map((ar) => (
                  <option key={ar.value} value={ar.value}>
                    {ar.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Quality Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
              >
                {VIDEO_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {klingModel === '2.6' && mode === 'pro' && (
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAudio}
                    onChange={(e) => setEnableAudio(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Enable Audio
                </label>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateVideo}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>{getStatusText()}</span>
              </>
            ) : (
              <>
                <Video className="w-6 h-6" />
                Generate Video
              </>
            )}
          </button>

          {/* Status */}
          {status && loading && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                <span className={`font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              {taskId && (
                <p className="text-slate-500 text-xs mt-2">
                  Task ID: {taskId}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}

          {/* Clear Button */}
          {(prompt || image || result) && (
            <button
              onClick={clearAll}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Right Column - Result */}
        <div>
          {result ? (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-green-400" />
                Generated Video
              </h3>
              <video
                src={result}
                controls
                className="w-full rounded-lg border border-slate-600"
                autoPlay
                loop
              />
              <button
                onClick={downloadVideo}
                className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Video
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 flex flex-col items-center justify-center h-full min-h-[300px]">
              <Video className="w-16 h-16 text-slate-600 mb-4" />
              <p className="text-slate-500 text-center">
                Your generated video will appear here
              </p>
            </div>
          )}

          {/* Video History */}
          <div className="mt-6">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-pink-500" />
                <span className="text-white font-medium">Video History</span>
                <span className="text-slate-400 text-sm">
                  {videoHistory.length} video{videoHistory.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  historyOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {historyOpen && (
              <div className="mt-2 bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                {videoHistory.length > 0 ? (
                  <div className="space-y-3">
                    {videoHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-slate-900 rounded-lg p-3 border border-slate-700"
                      >
                        <div className="flex items-start gap-3">
                          {entry.imagePreview && (
                            <img
                              src={entry.imagePreview}
                              alt="Reference"
                              className="w-12 h-12 object-cover rounded border border-slate-600"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 text-sm line-clamp-2">
                              {entry.prompt}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                              {new Date(entry.timestamp).toLocaleString()} •{' '}
                              {entry.duration}s • {entry.aspectRatio}
                            </p>
                          </div>
                          {entry.videoUrl && (
                            <a
                              href={entry.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-400 hover:text-pink-300"
                            >
                              <Play className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">
                    No video history yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
