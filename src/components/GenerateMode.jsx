import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Download,
  Plus,
  X,
  Trash
} from 'lucide-react';
import { generateUniqueId } from '../utils/storage';
import { generateImage, buildImageConfig } from '../services/geminiApi';
import { downloadImage, createFilename } from '../utils/imageUtils';
import { ASPECT_RATIOS, RESOLUTIONS, MAX_SLOTS } from '../utils/constants';

/**
 * Generate Mode - Text-to-image generation
 */
export default function GenerateMode({
  apiKey,
  selectedModel,
  onOpenSettings,
  onAddToHistory,
  onAddToCollection,
  onImageClick,
  playChime
}) {
  // Generation slots
  const [slots, setSlots] = useState([
    {
      id: generateUniqueId(),
      prompt: '',
      aspectRatio: 'auto',
      resolution: '4K',
      variations: 1,
      loading: false,
      results: [],
      error: null
    }
  ]);
  const [visibleSlots, setVisibleSlots] = useState(1);

  // Update a slot
  const updateSlot = (index, updates) => {
    setSlots((prev) =>
      prev.map((slot, idx) => (idx === index ? { ...slot, ...updates } : slot))
    );
  };

  // Add a new slot
  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) return;
    setSlots((prev) => [
      ...prev,
      {
        id: generateUniqueId(),
        prompt: '',
        aspectRatio: 'auto',
        resolution: '4K',
        variations: 1,
        loading: false,
        results: [],
        error: null
      }
    ]);
    setVisibleSlots((prev) => Math.min(MAX_SLOTS, prev + 1));
  };

  // Remove a slot
  const removeSlot = (index) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
    setVisibleSlots((prev) => Math.max(1, prev - 1));
  };

  // Process a single slot
  const processSlot = async (index) => {
    const slot = slots[index];

    if (!apiKey) {
      onOpenSettings();
      return;
    }

    if (!slot.prompt.trim()) {
      updateSlot(index, { error: 'Please enter a prompt' });
      return;
    }

    updateSlot(index, { loading: true, error: null, results: [] });

    try {
      const imageConfig = buildImageConfig({
        aspectRatio: slot.aspectRatio,
        resolution: slot.resolution
      });

      // Generate variations
      const promises = Array.from({ length: slot.variations }).map(() =>
        generateImage({
          apiKey,
          model: selectedModel,
          prompt: slot.prompt,
          imageConfig
        })
      );

      const results = await Promise.all(promises);

      // Save to history
      const historyEntry = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        mode: 'generate',
        prompt: slot.prompt,
        sourceImage: null,
        results: results,
        aspectRatio: slot.aspectRatio,
        resolution: slot.resolution
      };
      onAddToHistory(historyEntry);

      updateSlot(index, { results, loading: false });
      playChime();
    } catch (err) {
      console.error('Generation error:', err);
      updateSlot(index, { error: err.message || 'Failed to generate', loading: false });
    }
  };

  // Process all slots with prompts
  const processAll = async () => {
    const slotsToProcess = slots
      .slice(0, visibleSlots)
      .map((slot, idx) => ({ ...slot, index: idx }))
      .filter((slot) => slot.prompt.trim());

    if (slotsToProcess.length === 0) {
      alert('Please add at least one prompt');
      return;
    }

    await Promise.all(slotsToProcess.map((slot) => processSlot(slot.index)));
  };

  // Download handlers
  const handleDownload = (slotIndex, resultIndex) => {
    const result = slots[slotIndex]?.results?.[resultIndex];
    if (!result) return;
    downloadImage(result, createFilename(`generated-slot${slotIndex + 1}`, 'jpg', resultIndex));
  };

  const downloadAllFromSlot = (slotIndex) => {
    const slot = slots[slotIndex];
    if (!slot?.results?.length) return;
    slot.results.forEach((result, idx) => {
      setTimeout(() => handleDownload(slotIndex, idx), idx * 200);
    });
  };

  const downloadAll = () => {
    slots.slice(0, visibleSlots).forEach((slot, slotIdx) => {
      if (slot.results?.length > 0) {
        slot.results.forEach((result, resIdx) => {
          setTimeout(
            () => handleDownload(slotIdx, resIdx),
            (slotIdx * 10 + resIdx) * 200
          );
        });
      }
    });
  };

  // Add result to collection
  const addResultToCollection = (result, slotIndex, resultIndex) => {
    onAddToCollection(result, `generated-${slotIndex + 1}-${resultIndex + 1}.jpg`);
  };

  // Stats
  const getActiveCount = () =>
    slots.slice(0, visibleSlots).filter((s) => s.prompt.trim()).length;
  const getCompletedCount = () =>
    slots.slice(0, visibleSlots).filter((s) => s.results?.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Slots */}
      <div className="space-y-4">
        {slots.slice(0, visibleSlots).map((slot, index) => (
          <div
            key={slot.id}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
          >
            <div className="flex gap-4">
              {/* Prompt and Options */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-medium">
                    Generation #{index + 1}
                  </span>
                  {slots.length > 1 && (
                    <button
                      onClick={() => removeSlot(index)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <textarea
                  value={slot.prompt}
                  onChange={(e) => updateSlot(index, { prompt: e.target.value })}
                  placeholder="Describe the image you want to generate..."
                  className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-amber-500 focus:outline-none resize-none h-24 text-sm"
                />

                <div className="flex gap-3 flex-wrap">
                  <select
                    value={slot.aspectRatio}
                    onChange={(e) => updateSlot(index, { aspectRatio: e.target.value })}
                    className="bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                  >
                    {ASPECT_RATIOS.map((ar) => (
                      <option key={ar.value} value={ar.value}>
                        {ar.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={slot.resolution}
                    onChange={(e) => updateSlot(index, { resolution: e.target.value })}
                    className="bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                  >
                    {RESOLUTIONS.map((res) => (
                      <option key={res.value} value={res.value}>
                        {res.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Variations:</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={slot.variations}
                      onChange={(e) =>
                        updateSlot(index, {
                          variations: Math.min(5, Math.max(1, parseInt(e.target.value) || 1))
                        })
                      }
                      className="w-14 bg-slate-900 text-white text-center rounded p-2 border border-slate-600 text-sm"
                    />
                  </div>

                  <button
                    onClick={() => processSlot(index)}
                    disabled={slot.loading || !slot.prompt.trim()}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {slot.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>

                {/* Error */}
                {slot.error && (
                  <p className="text-red-400 text-sm">{slot.error}</p>
                )}
              </div>

              {/* Results */}
              {slot.results && slot.results.length > 0 && (
                <div className="flex-shrink-0">
                  <p className="text-slate-400 text-xs mb-2">Results</p>
                  <div className="flex gap-2 flex-wrap">
                    {slot.results.map((result, resIdx) => (
                      <div key={resIdx} className="relative group">
                        <img
                          src={result}
                          alt={`Generated ${resIdx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-green-500"
                          onClick={() => onImageClick(result, `Generated ${resIdx + 1}`)}
                        />
                        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => addResultToCollection(result, index, resIdx)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded"
                            title="Add to collection"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDownload(index, resIdx)}
                            className="bg-green-500 hover:bg-green-600 text-white p-1 rounded"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {slot.results.length > 1 && (
                    <button
                      onClick={() => downloadAllFromSlot(index)}
                      className="text-green-400 hover:text-green-300 text-xs mt-2"
                    >
                      Download all
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {visibleSlots < MAX_SLOTS && (
          <button
            onClick={addSlot}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Prompt ({visibleSlots}/{MAX_SLOTS})
          </button>
        )}

        <button
          onClick={processAll}
          disabled={getActiveCount() === 0}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
        >
          Generate All ({getActiveCount()} ready)
        </button>

        {getCompletedCount() > 0 && (
          <button
            onClick={downloadAll}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download All
          </button>
        )}
      </div>
    </div>
  );
}
