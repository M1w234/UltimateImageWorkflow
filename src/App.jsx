import { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Search,
  Camera,
  Zap,
  Upload,
  Sparkles,
  Video,
  Volume2,
  Volume1,
  VolumeX,
  Loader2,
  X
} from 'lucide-react';

// Components
import ApiKeySettings from './components/ApiKeySettings';
import ImageModal from './components/ImageModal';
import HistoryPanel from './components/HistoryPanel';
import CollectionPanel from './components/CollectionPanel';
import AnalyzeMode from './components/AnalyzeMode';
import EditMode from './components/EditMode';
import GenerateMode from './components/GenerateMode';
import MultiEditMode from './components/MultiEditMode';
import CombineMode from './components/CombineMode';
import KlingMode from './components/KlingMode';

// Utils and services
import {
  initDB,
  dbHelpers,
  generateUniqueId,
  resetNanaBananaStorage
} from './utils/storage';
import { playChime, getNextVolume, getVolumeTitle } from './utils/soundUtils';
import {
  GEMINI_MODELS,
  OPENAI_MODELS,
  KLING_MODELS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_KLING_MODEL,
  STORAGE_KEYS,
  HISTORY_STORE,
  COLLECTION_STORE,
  ANALYSIS_STORE,
  MAX_HISTORY_ITEMS,
  MAX_ANALYSIS_ITEMS
} from './utils/constants';

/**
 * Main Application Component
 */
export default function App() {
  // ========================================
  // STATE
  // ========================================

  // API Keys and Models
  const [apiKey, setApiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [klingKey, setKlingKey] = useState('');
  const [imgbbKey, setImgbbKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_GEMINI_MODEL);
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_OPENAI_MODEL);
  const [klingModel, setKlingModel] = useState(DEFAULT_KLING_MODEL);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sound
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_VOLUME);
    return saved || 'normal';
  });

  // Mode
  const [mode, setMode] = useState('edit');

  // Database state
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  // History and Collection
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploadedCollection, setUploadedCollection] = useState([]);
  const [collectionOpen, setCollectionOpen] = useState(false);

  // Analysis history
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // Image Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [modalTitle, setModalTitle] = useState('');

  // Pending image transfer
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [pendingTransferId, setPendingTransferId] = useState(null);
  const [pendingBatch, setPendingBatch] = useState(null);
  const [pendingVideoBatch, setPendingVideoBatch] = useState(null);
  const [pendingEndFrame, setPendingEndFrame] = useState(null);

  // ========================================
  // INITIALIZATION
  // ========================================

  // Load API keys and models from localStorage on mount
  useEffect(() => {
    // Load Gemini key
    const savedKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
    if (savedKey) setApiKey(savedKey);

    // Also check for environment variable
    if (!savedKey && import.meta.env.VITE_GEMINI_KEY) {
      setApiKey(import.meta.env.VITE_GEMINI_KEY);
    }

    // Load OpenAI key
    const savedOpenaiKey = localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY);
    if (savedOpenaiKey) {
      setOpenaiKey(savedOpenaiKey);
    } else if (import.meta.env.VITE_OPENAI_KEY) {
      setOpenaiKey(import.meta.env.VITE_OPENAI_KEY);
    }

    // Load Kling key
    const savedKlingKey = localStorage.getItem(STORAGE_KEYS.KLING_API_KEY);
    if (savedKlingKey) {
      setKlingKey(savedKlingKey);
    } else if (import.meta.env.VITE_KLING_KEY) {
      setKlingKey(import.meta.env.VITE_KLING_KEY);
    }

    // Load ImgBB key (required for image-to-video uploads)
    const savedImgbbKey = localStorage.getItem(STORAGE_KEYS.IMGBB_API_KEY);
    if (savedImgbbKey) {
      setImgbbKey(savedImgbbKey);
    }

    // Load models
    const savedModel = localStorage.getItem(STORAGE_KEYS.GEMINI_MODEL);
    if (savedModel && GEMINI_MODELS.find((m) => m.id === savedModel)) {
      setSelectedModel(savedModel);
    } else {
      setSelectedModel(DEFAULT_GEMINI_MODEL);
      localStorage.setItem(STORAGE_KEYS.GEMINI_MODEL, DEFAULT_GEMINI_MODEL);
    }

    const savedOpenaiModel = localStorage.getItem(STORAGE_KEYS.OPENAI_MODEL);
    if (savedOpenaiModel) setOpenaiModel(savedOpenaiModel);

    const savedKlingModel = localStorage.getItem(STORAGE_KEYS.KLING_MODEL);
    if (savedKlingModel) setKlingModel(savedKlingModel);
  }, []);

  // Initialize IndexedDB and load data
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('🔄 Initializing IndexedDB...');
        await initDB();
        setDbReady(true);

        // Load history
        const historyData = await dbHelpers.getAll(HISTORY_STORE);
        console.log('✅ Loaded history:', historyData.length, 'entries');
        setHistory(historyData.slice(0, MAX_HISTORY_ITEMS));

        // Load collection
        const collectionData = await dbHelpers.getAll(COLLECTION_STORE);
        console.log('✅ Loaded collection:', collectionData.length, 'images');
        setUploadedCollection(collectionData);

        // Load analysis history
        const analysisData = await dbHelpers.getAll(ANALYSIS_STORE);
        console.log('✅ Loaded analysis:', analysisData.length, 'entries');
        setAnalysisHistory(analysisData.slice(0, MAX_ANALYSIS_ITEMS));
      } catch (error) {
        console.error('❌ Failed to initialize IndexedDB:', error);
        setDbError(error.message);
        alert('Failed to initialize storage. The app may not save your work.');
      }
    };

    initializeDatabase();
  }, []);

  // ========================================
  // API KEY HANDLERS
  // ========================================

  const handleSaveApiKey = (key) => {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
      setApiKey(key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
      setApiKey('');
    }
  };

  const handleSaveOpenaiKey = (key) => {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, key);
      setOpenaiKey(key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
      setOpenaiKey('');
    }
  };

  const handleSaveKlingKey = (key) => {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.KLING_API_KEY, key);
      setKlingKey(key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.KLING_API_KEY);
      setKlingKey('');
    }
  };

  const handleSaveImgbbKey = (key) => {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.IMGBB_API_KEY, key);
      setImgbbKey(key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.IMGBB_API_KEY);
      setImgbbKey('');
    }
  };

  const handleSaveModel = (model) => {
    localStorage.setItem(STORAGE_KEYS.GEMINI_MODEL, model);
    setSelectedModel(model);
  };

  const handleSaveOpenaiModel = (model) => {
    localStorage.setItem(STORAGE_KEYS.OPENAI_MODEL, model);
    setOpenaiModel(model);
  };

  const handleSaveKlingModel = (model) => {
    localStorage.setItem(STORAGE_KEYS.KLING_MODEL, model);
    setKlingModel(model);
  };

  // ========================================
  // SOUND HANDLERS
  // ========================================

  const handlePlayChime = () => {
    playChime(soundVolume);
  };

  const cycleVolume = () => {
    const newValue = getNextVolume(soundVolume);
    setSoundVolume(newValue);
    localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, newValue);
    if (newValue !== 'off') {
      setTimeout(() => playChime(newValue), 50);
    }
  };

  // ========================================
  // MODAL HANDLERS
  // ========================================

  const openImageModal = (imageSrc, title = 'Image Preview') => {
    setModalImage(imageSrc);
    setModalTitle(title);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImage(null);
    setModalTitle('');
  };

  // ========================================
  // HISTORY HANDLERS
  // ========================================

  const addToHistory = async (entry) => {
    try {
      await dbHelpers.put(HISTORY_STORE, entry);
      setHistory((prev) => {
        const newHistory = [entry, ...prev].slice(0, MAX_HISTORY_ITEMS);
        return newHistory;
      });
      console.log('💾 Saved history entry');
      handlePlayChime();
    } catch (error) {
      console.error('❌ Failed to save history:', error);
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
      handlePlayChime();
    }
  };

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear all history?')) {
      try {
        await dbHelpers.clear(HISTORY_STORE);
        setHistory([]);
        console.log('🗑️ Cleared history');
      } catch (error) {
        console.error('❌ Failed to clear history:', error);
        alert('Failed to clear history');
      }
    }
  };

  const removeFromHistory = async (id) => {
    try {
      await dbHelpers.delete(HISTORY_STORE, id);
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
      console.log('🗑️ Removed history entry');
    } catch (error) {
      console.error('❌ Failed to remove history:', error);
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
    }
  };

  // ========================================
  // COLLECTION HANDLERS
  // ========================================

  const addToCollection = async (imagePreview, fileName) => {
    const exists = uploadedCollection.some((img) => img.preview === imagePreview);
    if (!exists) {
      const newItem = {
        id: generateUniqueId(),
        preview: imagePreview,
        fileName: fileName || `image-${Date.now()}.jpg`,
        timestamp: new Date().toISOString()
      };

      try {
        await dbHelpers.put(COLLECTION_STORE, newItem);
        setUploadedCollection((prev) => [...prev, newItem]);
        console.log('💾 Saved to collection');
      } catch (error) {
        console.error('❌ Failed to save to collection:', error);
        alert('Failed to save image to collection. Storage may be full.');
      }
    }
  };

  const removeFromCollection = async (id) => {
    try {
      await dbHelpers.delete(COLLECTION_STORE, id);
      setUploadedCollection((prev) => prev.filter((img) => img.id !== id));
      console.log('🗑️ Removed from collection');
    } catch (error) {
      console.error('❌ Failed to remove from collection:', error);
      setUploadedCollection((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const clearCollection = async () => {
    if (confirm('Are you sure you want to clear the collection?')) {
      try {
        await dbHelpers.clear(COLLECTION_STORE);
        setUploadedCollection([]);
        console.log('🗑️ Cleared collection');
      } catch (error) {
        console.error('❌ Failed to clear collection:', error);
        alert('Failed to clear collection');
      }
    }
  };

  const downloadFromCollection = (img) => {
    const link = document.createElement('a');
    link.href = img.preview;
    link.download = img.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllFromCollection = () => {
    uploadedCollection.forEach((img, idx) => {
      setTimeout(() => downloadFromCollection(img), idx * 200);
    });
  };

  // Collection usage handlers for different modes
  const useFromCollectionForBatch = (img) => {
    // This will be handled by EditMode via context/props
    console.log('Use for batch:', img.fileName);
  };

  const useFromCollectionForMulti = (img) => {
    console.log('Use for multi:', img.fileName);
  };

  const useFromCollectionForCombine = (img) => {
    console.log('Use for combine:', img.fileName);
  };

  const useFromCollectionForAnalyze = (img) => {
    setPendingImage(img.preview);
    setPendingMode('analyze');
  };

  const sendImageToVideo = (img) => {
    setPendingImage(img.preview);
    setPendingMode('video');
    setMode('video');
  };

  const sendImageToVideoStart = (img) => {
    setPendingImage(img.preview);
    setPendingMode('video');
    setMode('video');
  };

  const sendImageToVideoEnd = (img) => {
    setPendingEndFrame(img.preview);
    setPendingMode('video');
    setMode('video');
  };

  // Send image to different modes from modal
  const sendToAnalyze = (imageUrl) => {
    setPendingImage(imageUrl);
    setPendingMode('analyze');
    setMode('analyze');
  };

  const sendToEdit = (imageUrl) => {
    setPendingImage(imageUrl);
    setPendingMode('edit');
    setMode('edit');
  };

  const sendToCombine = (imageUrl) => {
    setPendingImage(imageUrl);
    setPendingMode('combine');
    setMode('combine');
  };

  const sendToMultiEdit = (imageUrl) => {
    setPendingImage(imageUrl);
    setPendingMode('multi');
    setMode('multi');
  };

  const clearPendingImage = () => {
    setPendingImage(null);
    setPendingMode(null);
    setPendingPrompt('');
    setPendingTransferId(null);
    setPendingBatch(null);
    setPendingVideoBatch(null);
    setPendingEndFrame(null);
  };

  // ========================================
  // ANALYSIS HISTORY HANDLERS
  // ========================================

  const addToAnalysisHistory = async (entry) => {
    try {
      await dbHelpers.put(ANALYSIS_STORE, entry);
      setAnalysisHistory((prev) => [entry, ...prev].slice(0, MAX_ANALYSIS_ITEMS));
      console.log('💾 Saved analysis');
      handlePlayChime();
    } catch (error) {
      console.error('❌ Failed to save analysis:', error);
      setAnalysisHistory((prev) => [entry, ...prev].slice(0, MAX_ANALYSIS_ITEMS));
      handlePlayChime();
    }
  };

  const removeFromAnalysisHistory = async (id) => {
    try {
      await dbHelpers.delete(ANALYSIS_STORE, id);
      setAnalysisHistory((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('❌ Failed to remove analysis:', error);
      setAnalysisHistory((prev) => prev.filter((entry) => entry.id !== id));
    }
  };

  const clearAnalysisHistory = async () => {
    if (confirm('Are you sure you want to clear all analysis history?')) {
      try {
        await dbHelpers.clear(ANALYSIS_STORE);
        setAnalysisHistory([]);
      } catch (error) {
        console.error('❌ Failed to clear analysis history:', error);
      }
    }
  };

  // Transfer analysis result to editor
  const transferToEditor = ({ preview, prompt }) => {
    // Set pending image and prompt, then switch to edit mode
    setPendingImage(preview);
    setPendingPrompt(prompt || '');
    setPendingTransferId(Date.now()); // Unique ID for each transfer
    setPendingMode('edit');
    setMode('edit');
  };

  // Transfer batch of images to editor
  const transferBatchToEditor = (batch) => {
    setPendingBatch(batch);
    setPendingMode('edit');
    setMode('edit');
  };

  // Transfer analysis result to video
  const transferToVideo = ({ preview, prompt, startFrame, endFrame, isStartEndMode }) => {
    if (isStartEndMode) {
      // Transfer both frames and switch to Kling 2.5 (only model that supports start/end frames)
      setPendingImage(startFrame);
      setPendingEndFrame(endFrame);
      setPendingPrompt(prompt || '');
      handleSaveKlingModel('2.5'); // Automatically switch to Kling 2.5
    } else {
      setPendingImage(preview);
    }
    setPendingMode('video');
    setMode('video');
  };

  // Transfer batch of images to video
  const transferBatchToVideo = (batch) => {
    if (batch && batch.length > 0) {
      setPendingVideoBatch(batch);
      setPendingMode('video');
      setMode('video');
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Database Initialization Status */}
        {!dbReady && !dbError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Initializing storage...</span>
            <button
              onClick={() => resetNanaBananaStorage?.()}
              className="ml-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
            >
              Taking too long? Reset
            </button>
          </div>
        )}

        {dbError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">Storage Error</span>
            </div>
            <p className="text-sm mb-3 opacity-90">{dbError}</p>
            <button
              onClick={() => resetNanaBananaStorage?.()}
              className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold text-sm"
            >
              🗑️ Reset Storage & Refresh
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <span className="text-5xl">🍌</span>
            <h1 className="text-4xl font-bold text-white">Nana Banana Pro Unleashed</h1>
            <div className="absolute right-0 flex gap-2">
              {/* Volume Button */}
              <button
                onClick={cycleVolume}
                className={`p-3 rounded-lg transition-all ${
                  soundVolume === 'normal'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : soundVolume === 'low'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                }`}
                title={getVolumeTitle(soundVolume)}
              >
                {soundVolume === 'normal' ? (
                  <Volume2 className="w-5 h-5" />
                ) : soundVolume === 'low' ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className={`p-3 rounded-lg transition-all ${
                  apiKey
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                }`}
                title={apiKey ? 'API Settings' : 'Configure your API key'}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-2">
            Created by:{' '}
            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-amber-400 hover:underline"
            >
              MW
            </a>
          </p>

          {/* API Key Warning Banner */}
          {!apiKey && (
            <div
              onClick={() => setSettingsOpen(true)}
              className="mb-4 bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 cursor-pointer hover:bg-amber-500/30 transition-colors"
            >
              <div className="flex items-center justify-center gap-2 text-amber-300">
                <Key className="w-5 h-5" />
                <span className="font-medium">
                  Click here to configure your Gemini API key to get started
                </span>
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex gap-3 justify-center mb-6 flex-wrap">
            <button
              onClick={() => setMode('analyze')}
              className={`mode-tab px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 ${
                mode === 'analyze' ? 'active analyze-tab' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Search className="w-5 h-5" />
              Analyze
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`mode-tab px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 ${
                mode === 'edit' ? 'active' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Camera className="w-5 h-5" />
              Image Editor
            </button>
            <button
              onClick={() => setMode('combine')}
              className={`mode-tab px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 ${
                mode === 'combine' ? 'active' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Zap className="w-5 h-5" />
              Multi-Image Generator
            </button>
            <button
              onClick={() => setMode('multi')}
              className={`mode-tab px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 ${
                mode === 'multi' ? 'active' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Upload className="w-5 h-5" />
              Multi-Image Edit
            </button>
            <button
              onClick={() => setMode('generate')}
              className={`mode-tab px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 ${
                mode === 'generate' ? 'active' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              Generate
            </button>
            <button
              onClick={() => setMode('video')}
              className={`mode-tab px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 ${
                mode === 'video' ? 'active video-tab' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Video className="w-5 h-5" />
              Video
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-700">
          {/* Analyze Mode */}
          <div style={{ display: mode === 'analyze' ? 'block' : 'none' }}>
            <AnalyzeMode
              apiKey={apiKey}
              openaiKey={openaiKey}
              openaiModel={openaiModel}
              onOpenSettings={() => setSettingsOpen(true)}
              onAddToCollection={addToCollection}
              analysisHistory={analysisHistory}
              onAddToAnalysisHistory={addToAnalysisHistory}
              onRemoveFromAnalysisHistory={removeFromAnalysisHistory}
              onClearAnalysisHistory={clearAnalysisHistory}
              onTransferToEditor={transferToEditor}
              onTransferBatchToEditor={transferBatchToEditor}
              onTransferToVideo={transferToVideo}
              onTransferBatchToVideo={transferBatchToVideo}
              onImageClick={openImageModal}
              pendingImage={pendingMode === 'analyze' ? pendingImage : null}
              onClearPendingImage={clearPendingImage}
            />
          </div>

          {/* Edit Mode */}
          <div style={{ display: mode === 'edit' ? 'block' : 'none' }}>
            <EditMode
              apiKey={apiKey}
              selectedModel={selectedModel}
              onOpenSettings={() => setSettingsOpen(true)}
              onAddToCollection={addToCollection}
              onAddToHistory={addToHistory}
              onImageClick={openImageModal}
              playChime={handlePlayChime}
              collection={uploadedCollection}
              collectionOpen={collectionOpen}
              onCollectionToggle={() => setCollectionOpen(!collectionOpen)}
              onDownloadFromCollection={downloadFromCollection}
              onDownloadAllFromCollection={downloadAllFromCollection}
              onClearCollection={clearCollection}
              onRemoveFromCollection={removeFromCollection}
              pendingImage={pendingMode === 'edit' ? pendingImage : null}
              pendingPrompt={pendingMode === 'edit' ? pendingPrompt : ''}
              pendingTransferId={pendingMode === 'edit' ? pendingTransferId : null}
              pendingBatch={pendingMode === 'edit' ? pendingBatch : null}
              onClearPendingImage={clearPendingImage}
            />
          </div>

          {/* Generate Mode */}
          <div style={{ display: mode === 'generate' ? 'block' : 'none' }}>
            <GenerateMode
              apiKey={apiKey}
              selectedModel={selectedModel}
              onOpenSettings={() => setSettingsOpen(true)}
              onAddToHistory={addToHistory}
              onAddToCollection={addToCollection}
              onImageClick={openImageModal}
              playChime={handlePlayChime}
            />
          </div>

          {/* Multi-Edit Mode */}
          <div style={{ display: mode === 'multi' ? 'block' : 'none' }}>
            <MultiEditMode
              apiKey={apiKey}
              selectedModel={selectedModel}
              onOpenSettings={() => setSettingsOpen(true)}
              onAddToCollection={addToCollection}
              onAddToHistory={addToHistory}
              onImageClick={openImageModal}
              playChime={handlePlayChime}
              pendingImage={pendingMode === 'multi' ? pendingImage : null}
              onClearPendingImage={clearPendingImage}
            />
          </div>

          {/* Combine Mode */}
          <div style={{ display: mode === 'combine' ? 'block' : 'none' }}>
            <CombineMode
              apiKey={apiKey}
              selectedModel={selectedModel}
              onOpenSettings={() => setSettingsOpen(true)}
              onAddToCollection={addToCollection}
              onAddToHistory={addToHistory}
              onImageClick={openImageModal}
              playChime={handlePlayChime}
              pendingImage={pendingMode === 'combine' ? pendingImage : null}
              onClearPendingImage={clearPendingImage}
            />
          </div>

          {/* Video Mode */}
          <div style={{ display: mode === 'video' ? 'block' : 'none' }}>
            <KlingMode
              klingKey={klingKey}
              imgbbKey={imgbbKey}
              klingModel={klingModel}
              onKlingModelChange={handleSaveKlingModel}
              klingModels={KLING_MODELS}
              onOpenSettings={() => setSettingsOpen(true)}
              onAddToCollection={addToCollection}
              onImageClick={openImageModal}
              playChime={handlePlayChime}
              pendingImage={pendingMode === 'video' ? pendingImage : null}
              pendingVideoBatch={pendingMode === 'video' ? pendingVideoBatch : null}
              pendingEndFrame={pendingMode === 'video' ? pendingEndFrame : null}
              pendingPrompt={pendingMode === 'video' ? pendingPrompt : ''}
              onClearPendingImage={clearPendingImage}
            />
          </div>

          {/* Collection Panel - Hide in edit mode since it has its own */}
          {mode !== 'edit' && (
            <CollectionPanel
              collection={uploadedCollection}
              isOpen={collectionOpen}
              onToggle={() => setCollectionOpen(!collectionOpen)}
              onClear={clearCollection}
              onRemove={removeFromCollection}
              onDownload={downloadFromCollection}
              onDownloadAll={downloadAllFromCollection}
              onImageClick={openImageModal}
              onUseForBatch={useFromCollectionForBatch}
              onUseForMulti={useFromCollectionForMulti}
              onUseForCombine={useFromCollectionForCombine}
              onUseForAnalyze={useFromCollectionForAnalyze}
              onSendToVideo={sendImageToVideo}
              onSendToVideoStart={sendImageToVideoStart}
              onSendToVideoEnd={sendImageToVideoEnd}
              currentMode={mode}
            />
          )}

          {/* History Panel */}
          <HistoryPanel
            history={history}
            isOpen={historyOpen}
            onToggle={() => setHistoryOpen(!historyOpen)}
            onClear={clearHistory}
            onRemove={removeFromHistory}
            onImageClick={openImageModal}
            onAddToCollection={addToCollection}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>
            ⚡ Powered by Gemini, OpenAI & Kling
          </p>
        </div>
      </div>

      {/* Image Preview Modal */}
      <ImageModal
        isOpen={modalOpen}
        image={modalImage}
        title={modalTitle}
        onClose={closeModal}
        onSendToAnalyze={sendToAnalyze}
        onSendToEdit={sendToEdit}
        onSendToCombine={sendToCombine}
        onSendToMultiEdit={sendToMultiEdit}
      />

      {/* API Key Settings Modal */}
      <ApiKeySettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSaveGemini={handleSaveApiKey}
        selectedModel={selectedModel}
        onModelChange={handleSaveModel}
        availableModels={GEMINI_MODELS}
        openaiKey={openaiKey}
        onSaveOpenai={handleSaveOpenaiKey}
        openaiModel={openaiModel}
        onOpenaiModelChange={handleSaveOpenaiModel}
        openaiModels={OPENAI_MODELS}
        klingKey={klingKey}
        onSaveKling={handleSaveKlingKey}
        klingModel={klingModel}
        onKlingModelChange={handleSaveKlingModel}
        klingModels={KLING_MODELS}
        imgbbKey={imgbbKey}
        onSaveImgbb={handleSaveImgbbKey}
      />
    </div>
  );
}
