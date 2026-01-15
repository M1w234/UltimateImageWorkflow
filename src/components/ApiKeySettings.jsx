import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Search,
  Video
} from 'lucide-react';

/**
 * API Key settings modal component
 */
export default function ApiKeySettings({
  isOpen,
  onClose,
  // Gemini
  apiKey,
  onSaveGemini,
  selectedModel,
  onModelChange,
  availableModels,
  // OpenAI
  openaiKey,
  onSaveOpenai,
  openaiModel,
  onOpenaiModelChange,
  openaiModels,
  // Kling
  klingKey,
  onSaveKling,
  klingModel,
  onKlingModelChange,
  klingModels
}) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [inputOpenaiKey, setInputOpenaiKey] = useState(openaiKey || '');
  const [inputKlingKey, setInputKlingKey] = useState(klingKey || '');
  const [inputModel, setInputModel] = useState(selectedModel || 'gemini-2.0-flash-exp-image-generation');
  const [inputOpenaiModel, setInputOpenaiModel] = useState(openaiModel || 'gpt-5.2');
  const [inputKlingModel, setInputKlingModel] = useState(klingModel || '2.6');
  const [showKey, setShowKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showKlingKey, setShowKlingKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync with props when they change
  useEffect(() => {
    setInputKey(apiKey || '');
    setInputOpenaiKey(openaiKey || '');
    setInputKlingKey(klingKey || '');
    setInputModel(selectedModel || 'gemini-2.0-flash-exp-image-generation');
    setInputOpenaiModel(openaiModel || 'gpt-5.2');
    setInputKlingModel(klingModel || '2.6');
  }, [apiKey, openaiKey, klingKey, selectedModel, openaiModel, klingModel]);

  const handleSave = () => {
    onSaveGemini(inputKey);
    onModelChange(inputModel);
    if (onSaveOpenai) onSaveOpenai(inputOpenaiKey);
    if (onOpenaiModelChange) onOpenaiModelChange(inputOpenaiModel);
    if (onSaveKling) onSaveKling(inputKlingKey);
    if (onKlingModelChange) onKlingModelChange(inputKlingModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setInputKey('');
    onSaveGemini('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-white">API Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Security Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200 space-y-1">
              <p className="font-semibold">⚠️ Security Notice</p>
              <p className="text-xs">Your API keys are stored locally in your browser. Only use this on trusted devices.</p>
            </div>
          </div>

          {/* Gemini Section */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Google Gemini (Edit & Generate)
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-slate-900 text-white rounded-lg p-3 pr-11 border border-slate-600 focus:border-amber-500 focus:outline-none font-mono text-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <select
                value={inputModel}
                onChange={(e) => setInputModel(e.target.value)}
                className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-amber-500 focus:outline-none cursor-pointer text-sm"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-slate-400 text-xs">
                Get your key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          </div>

          {/* OpenAI Section */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
            <h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> OpenAI Vision (Analyze)
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={inputOpenaiKey}
                  onChange={(e) => setInputOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-900 text-white rounded-lg p-3 pr-11 border border-slate-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
                <button
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {openaiModels && (
                <select
                  value={inputOpenaiModel}
                  onChange={(e) => setInputOpenaiModel(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-purple-500 focus:outline-none cursor-pointer text-sm"
                >
                  {openaiModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-slate-400 text-xs">
                Get your key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>
          </div>

          {/* Kling Section */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-pink-500/30">
            <h3 className="text-pink-400 font-semibold mb-3 flex items-center gap-2">
              <Video className="w-4 h-4" /> Kling AI (Video Generation)
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKlingKey ? 'text' : 'password'}
                  value={inputKlingKey}
                  onChange={(e) => setInputKlingKey(e.target.value)}
                  placeholder="Your PiAPI key..."
                  className="w-full bg-slate-900 text-white rounded-lg p-3 pr-11 border border-slate-600 focus:border-pink-500 focus:outline-none font-mono text-sm"
                />
                <button
                  onClick={() => setShowKlingKey(!showKlingKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKlingKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {klingModels && (
                <select
                  value={inputKlingModel}
                  onChange={(e) => setInputKlingModel(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none cursor-pointer text-sm"
                >
                  {klingModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-slate-400 text-xs">
                Get your key from{' '}
                <a
                  href="https://piapi.ai/workspace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:underline"
                >
                  PiAPI Workspace
                </a>
              </p>
            </div>
          </div>

          {/* Success Message */}
          {saved && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-400 font-semibold text-sm">Saved successfully!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all shadow-lg text-sm"
            >
              Save All Settings
            </button>
            {apiKey && (
              <button
                onClick={handleClear}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Clear Gemini
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
