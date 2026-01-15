import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Loader2,
  Download,
  Plus,
  Trash
} from 'lucide-react';
import { fileToBase64, filterImageFiles, downloadImage, createFilename } from '../utils/imageUtils';
import { generateUniqueId } from '../utils/storage';
import { editImage, buildImageConfig } from '../services/geminiApi';
import { ASPECT_RATIOS, RESOLUTIONS, MAX_SLOTS, MAX_IMAGES_PER_SLOT } from '../utils/constants';

/**
 * Multi-Edit Mode - Batch process multiple images with same prompt
 */
export default function MultiEditMode({
  apiKey,
  selectedModel,
  onOpenSettings,
  onAddToCollection,
  onAddToHistory,
  onImageClick,
  playChime,
  // Pending image transfer
  pendingImage,
  onClearPendingImage
}) {
  // Slots array for multi-image editing
  const [slots, setSlots] = useState([
    {
      id: generateUniqueId(),
      images: [],
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
  const [dragActive, setDragActive] = useState({});
  const fileInputRefs = useRef({});

  // Handle pending image transfer
  useEffect(() => {
    if (pendingImage && slots[0].images.length < MAX_IMAGES_PER_SLOT) {
      addImageToSlot(0, {
        id: generateUniqueId(),
        base64: pendingImage,
        preview: pendingImage,
        fileName: 'from-preview.jpg'
      });
      onClearPendingImage?.();
    }
  }, [pendingImage]);

  // Update a slot
  const updateSlot = (index, updates) => {
    setSlots((prev) =>
      prev.map((slot, idx) => (idx === index ? { ...slot, ...updates } : slot))
    );
  };

  // Add image to a slot
  const addImageToSlot = (slotIndex, imageData) => {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === slotIndex
          ? { ...slot, images: [...slot.images, imageData] }
          : slot
      )
    );
  };

  // Remove image from a slot
  const removeImageFromSlot = (slotIndex, imageIndex) => {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === slotIndex
          ? { ...slot, images: slot.images.filter((_, i) => i !== imageIndex) }
          : slot
      )
    );
  };

  // Clear a slot
  const clearSlot = (index) => {
    updateSlot(index, { images: [], results: [], error: null });
  };

  // Add new slot
  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) return;
    setSlots((prev) => [
      ...prev,
      {
        id: generateUniqueId(),
        images: [],
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

  // Remove slot
  const removeSlot = (index) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
    setVisibleSlots((prev) => Math.max(1, prev - 1));
  };

  // Handle drag events
  const handleDrag = (slotIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive((prev) => ({ ...prev, [slotIndex]: true }));
    } else if (e.type === 'dragleave') {
      setDragActive((prev) => ({ ...prev, [slotIndex]: false }));
    }
  };

  // Handle drop
  const handleDrop = async (slotIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [slotIndex]: false }));

    const files = filterImageFiles(e.dataTransfer.files);
    if (files.length === 0) return;

    const currentSlot = slots[slotIndex];
    const remainingSlots = MAX_IMAGES_PER_SLOT - currentSlot.images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const { base64, preview } = await fileToBase64(file);
      onAddToCollection(preview, file.name);
      addImageToSlot(slotIndex, {
        id: generateUniqueId(),
        base64,
        preview,
        fileName: file.name
      });
    }
  };

  // Handle file select
  const handleFileSelect = async (slotIndex, e) => {
    const files = filterImageFiles(e.target.files || []);
    if (files.length === 0) return;

    const currentSlot = slots[slotIndex];
    const remainingSlots = MAX_IMAGES_PER_SLOT - currentSlot.images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const { base64, preview } = await fileToBase64(file);
      onAddToCollection(preview, file.name);
      addImageToSlot(slotIndex, {
        id: generateUniqueId(),
        base64,
        preview,
        fileName: file.name
      });
    }
    e.target.value = '';
  };

  // Process a single slot
  const processSlot = async (index) => {
    const slot = slots[index];

    if (!apiKey) {
      onOpenSettings();
      return;
    }

    if (slot.images.length === 0) {
      updateSlot(index, { error: 'Please add at least one image' });
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

      // Process each image with the same prompt, generating variations
      const allResults = [];
      for (const img of slot.images) {
        const promises = Array.from({ length: slot.variations }).map(() =>
          editImage({
            apiKey,
            model: selectedModel,
            prompt: slot.prompt,
            imageBase64: img.base64,
            imageConfig
          })
        );
        const results = await Promise.all(promises);
        allResults.push(...results);
      }

      // Save to history
      const historyEntry = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        mode: 'multi',
        prompt: slot.prompt,
        sourceImage: slot.images[0]?.preview || null,
        sourceCount: slot.images.length,
        results: allResults,
        aspectRatio: slot.aspectRatio,
        resolution: slot.resolution
      };
      onAddToHistory(historyEntry);

      updateSlot(index, { results: allResults, loading: false });
      playChime();
    } catch (err) {
      updateSlot(index, { error: err.message || 'Failed to process images', loading: false });
    }
  };

  // Process all slots
  const processAll = async () => {
    const activeSlots = slots
      .slice(0, visibleSlots)
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.images.length > 0 && slot.prompt.trim());

    if (activeSlots.length === 0) {
      alert('Please add images and prompts to at least one slot');
      return;
    }

    for (const { index } of activeSlots) {
      await processSlot(index);
    }
  };

  // Download handlers
  const handleDownload = (slotIndex, resultIndex) => {
    const result = slots[slotIndex]?.results?.[resultIndex];
    if (!result) return;
    downloadImage(result, createFilename(`multi-edit-${slotIndex + 1}`, 'jpg', resultIndex));
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

  // Stats
  const getActiveCount = () =>
    slots.slice(0, visibleSlots).filter((s) => s.images.length > 0 && s.prompt.trim()).length;
  const getCompletedCount = () =>
    slots.slice(0, visibleSlots).filter((s) => s.results?.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Slots */}
      <div className="space-y-6">
        {slots.slice(0, visibleSlots).map((slot, index) => (
          <div
            key={slot.id}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-400 font-medium">Batch #{index + 1}</span>
              <div className="flex gap-2">
                {slot.images.length > 0 && (
                  <button
                    onClick={() => clearSlot(index)}
                    className="text-slate-500 hover:text-red-400 text-sm flex items-center gap-1"
                  >
                    <Trash className="w-4 h-4" /> Clear
                  </button>
                )}
                {slots.length > 1 && (
                  <button
                    onClick={() => removeSlot(index)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Image Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${
                dragActive[index]
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 hover:border-blue-500/50'
              } ${slot.images.length === 0 ? 'cursor-pointer' : ''}`}
              onDragEnter={(e) => handleDrag(index, e)}
              onDragLeave={(e) => handleDrag(index, e)}
              onDragOver={(e) => handleDrag(index, e)}
              onDrop={(e) => handleDrop(index, e)}
              onClick={(e) => {
                // Only trigger file input if empty and not clicking on a button/image
                if (slot.images.length === 0 && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'IMG') {
                  fileInputRefs.current[index]?.click();
                }
              }}
            >
              <input
                type="file"
                ref={(el) => (fileInputRefs.current[index] = el)}
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(index, e)}
              />

              {slot.images.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {slot.images.map((img, imgIdx) => (
                    <div key={img.id} className="relative group">
                      <div className="relative flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-600" style={{ minHeight: '64px', minWidth: '50px' }}>
                        <img
                          src={img.preview}
                          alt={img.fileName}
                          className="h-16 object-contain rounded-lg cursor-pointer hover:border-blue-500"
                          style={{ maxWidth: '100px' }}
                          onClick={() => onImageClick(img.preview, img.fileName)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImageFromSlot(index, imgIdx);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {slot.images.length < MAX_IMAGES_PER_SLOT && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[index]?.click();
                      }}
                      className="w-16 h-16 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors"
                    >
                      <Plus className="w-6 h-6 text-slate-500" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-blue-400 text-sm">
                    Click or drop images here
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Up to {MAX_IMAGES_PER_SLOT} images
                  </p>
                </div>
              )}
            </div>

            {/* Prompt and Options */}
            <div className="space-y-3">
              <textarea
                value={slot.prompt}
                onChange={(e) => updateSlot(index, { prompt: e.target.value })}
                placeholder="Enter the edit prompt to apply to all images..."
                className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none resize-none h-32 text-sm"
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
                  <span className="text-slate-400 text-sm">Variations per image:</span>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={slot.variations}
                    onChange={(e) =>
                      updateSlot(index, {
                        variations: Math.min(3, Math.max(1, parseInt(e.target.value) || 1))
                      })
                    }
                    className="w-14 bg-slate-900 text-white text-center rounded p-2 border border-slate-600 text-sm"
                  />
                </div>

                <button
                  onClick={() => processSlot(index)}
                  disabled={slot.loading || slot.images.length === 0 || !slot.prompt.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  {slot.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Process {slot.images.length} Image{slot.images.length !== 1 ? 's' : ''}
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
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 text-sm font-medium">
                    Results ({slot.results.length})
                  </span>
                  <button
                    onClick={() => downloadAllFromSlot(index)}
                    className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Download All
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {slot.results.map((result, resIdx) => (
                    <div key={resIdx} className="relative group">
                      <div className="relative flex items-center justify-center bg-slate-900/50 rounded-lg" style={{ minHeight: '80px' }}>
                        <img
                          src={result}
                          alt={`Result ${resIdx + 1}`}
                          className="h-20 object-contain rounded-lg border border-slate-600 cursor-pointer hover:border-green-500"
                          style={{ maxWidth: '120px' }}
                          onClick={() => onImageClick(result, `Result ${resIdx + 1}`)}
                        />
                        <button
                          onClick={() => handleDownload(index, resIdx)}
                          className="absolute bottom-1 right-1 bg-green-500 hover:bg-green-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            Add Batch ({visibleSlots}/{MAX_SLOTS})
          </button>
        )}

        <button
          onClick={processAll}
          disabled={getActiveCount() === 0}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
        >
          Process All ({getActiveCount()} ready)
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
