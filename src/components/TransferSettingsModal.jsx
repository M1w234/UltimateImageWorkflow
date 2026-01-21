import { useState, useEffect } from 'react';
import { X, Zap, Settings, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ASPECT_RATIOS, RESOLUTIONS } from '../utils/constants';

/**
 * Transfer Settings Modal
 * Compact modal that appears near the trigger button
 * Allows users to choose between quick import or import with custom settings
 */
export default function TransferSettingsModal({
  isOpen,
  onClose,
  onQuickImport,
  onImportWithSettings,
  transferType = 'single', // 'single' or 'batch'
  itemCount = 1
}) {
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [resolution, setResolution] = useState('4K');
  const [variations, setVariations] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('transfer_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setAspectRatio(settings.aspectRatio || 'auto');
        setResolution(settings.resolution || '4K');
        setVariations(settings.variations || 1);
      } catch (e) {
        console.error('Failed to load transfer settings:', e);
      }
    }
  }, [isOpen]);

  // Reset showSettings when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSettings(false);
    }
  }, [isOpen]);

  const handleImportWithSettings = () => {
    const settings = {
      aspectRatio,
      resolution,
      variations
    };
    
    // Save settings to localStorage
    localStorage.setItem('transfer_settings', JSON.stringify(settings));
    
    onImportWithSettings(settings);
    onClose();
  };

  const handleQuickImport = () => {
    onQuickImport();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        className="fixed bottom-4 right-4 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-80 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Transfer to Editor</h3>
            <p className="text-slate-400 text-xs">
              {transferType === 'batch' 
                ? `${itemCount} item${itemCount !== 1 ? 's' : ''}`
                : '1 item'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Quick Import Button */}
          <button
            onClick={handleQuickImport}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Zap className="w-4 h-4" />
            Quick Import
          </button>

          {/* Settings Dropdown Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full bg-slate-700 hover:bg-slate-650 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-teal-400" />
              <span>Import with Settings</span>
            </div>
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Collapsible Settings */}
          {showSettings && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-teal-500/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
              {/* Aspect Ratio */}
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-slate-900 text-white text-sm rounded p-2 border border-slate-600 focus:border-teal-500 focus:outline-none cursor-pointer"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-slate-900 text-white text-sm rounded p-2 border border-slate-600 focus:border-teal-500 focus:outline-none cursor-pointer"
                >
                  {RESOLUTIONS.map((res) => (
                    <option key={res.value} value={res.value}>
                      {res.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variations */}
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1">
                  Variations
                </label>
                <select
                  value={variations}
                  onChange={(e) => setVariations(parseInt(e.target.value))}
                  className="w-full bg-slate-900 text-white text-sm rounded p-2 border border-slate-600 focus:border-teal-500 focus:outline-none cursor-pointer"
                >
                  <option value="1">1 Variation</option>
                  <option value="2">2 Variations</option>
                  <option value="3">3 Variations</option>
                  <option value="4">4 Variations</option>
                  <option value="5">5 Variations</option>
                </select>
              </div>

              {/* Import Button */}
              <button
                onClick={handleImportWithSettings}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                Import
              </button>
            </div>
          )}

          {/* Info Text */}
          <p className="text-slate-500 text-xs text-center">
            Settings are remembered
          </p>
        </div>
      </div>
    </div>
  );
}
