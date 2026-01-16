import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Loader2,
  Download,
  Plus,
  Trash,
  ChevronDown,
  Folder,
  RefreshCw,
  Copy,
  CheckCircle,
  Zap
} from 'lucide-react';
import { fileToBase64, filterImageFiles, downloadImage, createFilename } from '../utils/imageUtils';
import { generateUniqueId } from '../utils/storage';
import { editImage, buildImageConfig } from '../services/geminiApi';
import { ASPECT_RATIOS, RESOLUTIONS, MAX_SLOTS } from '../utils/constants';

/**
 * Edit Mode - Image editing with independent slots
 * Clean interface that expands as needed
 */
export default function EditMode({
  apiKey,
  selectedModel,
  onOpenSettings,
  onAddToCollection,
  onAddToHistory,
  onImageClick,
  playChime,
  // Collection integration
  collection = [],
  collectionOpen = false,
  onCollectionToggle,
  onDownloadFromCollection,
  onDownloadAllFromCollection,
  onClearCollection,
  onRemoveFromCollection,
  // Pending image transfer
  pendingImage,
  pendingPrompt,
  pendingTransferId,
  pendingBatch,
  onClearPendingImage
}) {
  // Image slots state
  const [images, setImages] = useState(
    Array(MAX_SLOTS)
      .fill(null)
      .map((_, idx) => ({
        id: idx,
        image: null,
        imagePreview: null,
        prompt: '',
        aspectRatio: 'auto',
        resolution: '4K',
        variations: 1,
        loading: false,
        result: null,
        results: [],
        error: null,
        fromAnalysis: false
      }))
  );
  const [visibleSlots, setVisibleSlots] = useState(1);

  // Ref to track current images state (prevents stale closures)
  const imagesRef = useRef(images);
  
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Duplicate image state
  const [duplicateImage, setDuplicateImage] = useState(null);
  const [duplicatePreview, setDuplicatePreview] = useState(null);
  const [duplicateCount, setDuplicateCount] = useState(3);
  const [duplicateSectionOpen, setDuplicateSectionOpen] = useState(false);
  const [duplicateDragActive, setDuplicateDragActive] = useState(false);
  const duplicateInputRef = useRef(null);

  // Bulk upload state
  const [bulkSectionOpen, setBulkSectionOpen] = useState(false);
  const [bulkDragActive, setBulkDragActive] = useState(false);
  const fileInputRefs = useRef([]);
  const bulkInputRef = useRef(null);

  // Collection panel state
  const [collectionPanelOpen, setCollectionPanelOpen] = useState(false);

  // Drag state for individual slots
  const [slotDragActive, setSlotDragActive] = useState({});

  // Handle pending image transfer
  useEffect(() => {
    if (pendingImage && pendingTransferId) {
      // Strip data URI prefix to get raw base64 for API calls
      const rawBase64 = pendingImage.split(',')[1] || pendingImage;
      
      // Find first empty slot
      const emptyIndex = images.findIndex(img => !img.image);
      if (emptyIndex !== -1) {
        updateImage(emptyIndex, {
          image: rawBase64,
          imagePreview: pendingImage,
          prompt: pendingPrompt || '',
          error: null,
          result: null,
          results: []
        });
      } else {
        // All slots are full, try to expand if possible
        if (visibleSlots < MAX_SLOTS) {
          const newSlotIndex = visibleSlots;
          setVisibleSlots(prev => prev + 1);
          setTimeout(() => {
            updateImage(newSlotIndex, {
              image: rawBase64,
              imagePreview: pendingImage,
              prompt: pendingPrompt || '',
              error: null,
              result: null,
              results: []
            });
          }, 0);
        }
      }
      onClearPendingImage?.();
    }
  }, [pendingTransferId]);

  // Handle batch transfer of multiple images
  useEffect(() => {
    if (pendingBatch && pendingBatch.length > 0) {
      // Find empty slots in currently visible range
      const currentImages = imagesRef.current;
      const visibleImages = currentImages.slice(0, visibleSlots);
      const emptyCount = visibleImages.filter(img => !img.image).length;
      
      // If we need more empty slots than we have, expand visible slots
      const slotsToAdd = Math.max(0, pendingBatch.length - emptyCount);
      if (slotsToAdd > 0) {
        setVisibleSlots(prev => Math.min(prev + slotsToAdd, MAX_SLOTS));
      }
      
      // Fill slots with batch data using functional update to avoid stale closure
      setTimeout(() => {
        setImages(currentImages => {
          // Find empty slot indices ONLY in visible range
          const emptyIndices = [];
          for (let i = 0; i < visibleSlots + slotsToAdd; i++) {
            if (!currentImages[i].image) {
              emptyIndices.push(i);
            }
          }
          
          // Create a copy to update
          const newImages = [...currentImages];
          
          // Fill each empty slot with batch data
          pendingBatch.forEach((item, batchIdx) => {
            const targetIndex = emptyIndices[batchIdx];
            if (targetIndex !== undefined && targetIndex >= 0) {
              // Strip data URI prefix to get raw base64 for API calls
              const rawBase64 = item.preview.split(',')[1] || item.preview;
              
              newImages[targetIndex] = {
                ...newImages[targetIndex],
                image: rawBase64,
                imagePreview: item.preview,
                prompt: item.prompt || '',
                error: null,
                result: null,
                results: []
              };
            }
          });
          
          return newImages;
        });
        
        onClearPendingImage?.();
      }, 150); // Slightly longer delay to ensure slot expansion completes
    }
  }, [pendingBatch, visibleSlots, onClearPendingImage]);

  // Update a single image slot
  const updateImage = (index, updates) => {
    setImages((prev) =>
      prev.map((img, idx) => (idx === index ? { ...img, ...updates } : img))
    );
  };

  // Handle file input for a slot
  const handleFileInput = async (index, file) => {
    if (!file || !file.type.startsWith('image/')) {
      updateImage(index, { error: 'Please upload an image file' });
      return;
    }

    const { base64, preview } = await fileToBase64(file);
    updateImage(index, {
      image: base64,
      imagePreview: preview,
      error: null,
      result: null,
      results: []
    });
    onAddToCollection(preview, file.name);
  };

  // Clear image from slot (keep slot structure)
  const clearImage = (index) => {
    updateImage(index, {
      image: null,
      imagePreview: null,
      prompt: '',
      result: null,
      results: [],
      error: null
    });
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
  };

  // Remove entire slot
  const removeSlot = (index) => {
    if (visibleSlots <= 1) return; // Don't remove last slot
    
    // Remove the slot by filtering out the index
    setImages(prev => {
      const newImages = [...prev];
      // Shift all slots after this one down
      for (let i = index; i < MAX_SLOTS - 1; i++) {
        newImages[i] = newImages[i + 1];
      }
      // Reset the last slot
      newImages[MAX_SLOTS - 1] = {
        id: MAX_SLOTS - 1,
        image: null,
        imagePreview: null,
        prompt: '',
        aspectRatio: 'auto',
        resolution: '4K',
        variations: 1,
        loading: false,
        result: null,
        results: [],
        error: null,
        fromAnalysis: false
      };
      return newImages;
    });
    setVisibleSlots(prev => prev - 1);
  };

  // Handle drag events for individual slots
  const handleSlotDrag = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setSlotDragActive(prev => ({ ...prev, [index]: true }));
    } else if (e.type === 'dragleave') {
      setSlotDragActive(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSlotDrop = async (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSlotDragActive(prev => ({ ...prev, [index]: false }));

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileInput(index, file);
    }
  };

  // Process single image
  const processImage = async (index) => {
    const img = images[index];

    if (!apiKey) {
      onOpenSettings();
      return;
    }

    if (!img.image || !img.prompt.trim()) {
      updateImage(index, { error: 'Please provide both an image and a prompt' });
      return;
    }

    updateImage(index, { loading: true, error: null, results: [] });

    try {
      const imageConfig = buildImageConfig({
        aspectRatio: img.aspectRatio,
        resolution: img.resolution
      });

      // Generate variations
      const promises = Array.from({ length: img.variations }).map(() =>
        editImage({
          apiKey,
          model: selectedModel,
          prompt: img.prompt,
          imageBase64: img.image,
          imageConfig
        })
      );

      const results = await Promise.all(promises);

      // Save to history
      const historyEntry = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        mode: 'edit',
        prompt: img.prompt,
        sourceImage: img.imagePreview,
        results: results,
        aspectRatio: img.aspectRatio,
        resolution: img.resolution
      };
      onAddToHistory(historyEntry);

      updateImage(index, {
        result: results[0],
        results: results,
        loading: false
      });

      playChime();
    } catch (err) {
      updateImage(index, {
        error: err.message || 'Failed to edit image',
        loading: false
      });
    }
  };

  // Process all images with prompts
  const processAll = async () => {
    const imagesToProcess = images
      .slice(0, visibleSlots)
      .map((img, idx) => ({ ...img, index: idx }))
      .filter((img) => img.image && img.prompt.trim());

    if (imagesToProcess.length === 0) {
      alert('Please add at least one image with a prompt');
      return;
    }

    await Promise.all(imagesToProcess.map((img) => processImage(img.index)));
  };

  // Download handlers
  const handleDownloadImage = (index, variationIdx = 0) => {
    const img = images[index];
    const result = img.results?.[variationIdx] || img.result;
    if (!result) return;
    downloadImage(result, createFilename(`edited-image-${index + 1}`, 'jpg', variationIdx));
  };

  const downloadAllVariations = (index) => {
    const img = images[index];
    if (!img.results || img.results.length === 0) return;
    img.results.forEach((result, varIdx) => {
      setTimeout(() => handleDownloadImage(index, varIdx), varIdx * 200);
    });
  };

  const downloadAll = () => {
    images.slice(0, visibleSlots).forEach((img, idx) => {
      if (img.results && img.results.length > 0) {
        img.results.forEach((result, varIdx) => {
          setTimeout(
            () => handleDownloadImage(idx, varIdx),
            (idx * 10 + varIdx) * 200
          );
        });
      }
    });
  };

  // Bulk upload handlers
  const handleBulkDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setBulkDragActive(true);
    } else if (e.type === 'dragleave') {
      setBulkDragActive(false);
    }
  };

  const handleBulkDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragActive(false);

    const files = filterImageFiles(e.dataTransfer.files);
    if (files.length === 0) return;

    let availableSlots = images
      .slice(0, visibleSlots)
      .map((img, idx) => ({ ...img, index: idx }))
      .filter((img) => !img.image);

    // Auto-expand if needed
    if (files.length > availableSlots.length) {
      const slotsNeeded = files.length - availableSlots.length;
      const newVisibleSlots = Math.min(MAX_SLOTS, visibleSlots + slotsNeeded);
      setVisibleSlots(newVisibleSlots);

      availableSlots = images
        .slice(0, newVisibleSlots)
        .map((img, idx) => ({ ...img, index: idx }))
        .filter((img) => !img.image);
    }

    const filesToProcess = files.slice(0, availableSlots.length);
    filesToProcess.forEach((file, fileIdx) => {
      if (availableSlots[fileIdx]) {
        handleFileInput(availableSlots[fileIdx].index, file);
      }
    });

    if (files.length > availableSlots.length) {
      alert(
        `Uploaded ${availableSlots.length} images. ${files.length - availableSlots.length} images skipped (max slots).`
      );
    }
  };

  // Duplicate handlers
  const handleDuplicateFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const { base64, preview } = await fileToBase64(file);
    setDuplicateImage(base64);
    setDuplicatePreview(preview);
  };

  const handleDuplicateDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDuplicateDragActive(true);
    } else if (e.type === 'dragleave') {
      setDuplicateDragActive(false);
    }
  };

  const handleDuplicateDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicateDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleDuplicateFile(file);
    }
  };

  const fillDuplicates = () => {
    if (!duplicateImage) {
      alert('Please upload an image first');
      return;
    }

    const currentAvailable = images
      .slice(0, visibleSlots)
      .filter((img) => !img.image).length;

    if (currentAvailable < duplicateCount) {
      const slotsNeeded = duplicateCount - currentAvailable;
      const newVisibleSlots = Math.min(MAX_SLOTS, visibleSlots + slotsNeeded);
      setVisibleSlots(newVisibleSlots);

      setTimeout(() => {
        const availableSlots = images
          .slice(0, newVisibleSlots)
          .map((img, idx) => ({ ...img, index: idx }))
          .filter((img) => !img.image);

        const slotsToFill = Math.min(duplicateCount, availableSlots.length);
        availableSlots.slice(0, slotsToFill).forEach((slot) => {
          updateImage(slot.index, {
            image: duplicateImage,
            imagePreview: duplicatePreview,
            error: null,
            result: null,
            results: []
          });
        });
      }, 50);
      return;
    }

    const availableSlots = images
      .slice(0, visibleSlots)
      .map((img, idx) => ({ ...img, index: idx }))
      .filter((img) => !img.image);

    const slotsToFill = Math.min(duplicateCount, availableSlots.length);
    availableSlots.slice(0, slotsToFill).forEach((slot) => {
      updateImage(slot.index, {
        image: duplicateImage,
        imagePreview: duplicatePreview,
        error: null,
        result: null,
        results: []
      });
    });
  };

  const clearDuplicate = () => {
    setDuplicateImage(null);
    setDuplicatePreview(null);
    if (duplicateInputRef.current) {
      duplicateInputRef.current.value = '';
    }
  };

  // Stats
  const getActiveCount = () =>
    images.slice(0, visibleSlots).filter((img) => img.image && img.prompt.trim()).length;
  const getCompletedCount = () =>
    images.slice(0, visibleSlots).filter((img) => img.results && img.results.length > 0).length;
  const getAvailableSlots = () =>
    images.slice(0, visibleSlots).filter((img) => !img.image).length;

  // Use image from collection
  const useFromCollection = (collectionImg) => {
    // Find first empty slot
    let targetSlot = images.findIndex((img, idx) => idx < visibleSlots && !img.image);
    
    if (targetSlot === -1) {
      // All slots have images, add new one if possible
      if (visibleSlots < MAX_SLOTS) {
        targetSlot = visibleSlots;
        setVisibleSlots((prev) => prev + 1);
      } else {
        alert('All slots are full. Please clear a slot first.');
        return;
      }
    }

    updateImage(targetSlot, {
      image: collectionImg.base64 || collectionImg.preview,
      imagePreview: collectionImg.preview,
      error: null
    });
  };

  return (
    <div className="space-y-4">
      {/* TOP SECTION - Three Collapsible Panels */}
      <div className="space-y-3">
        {/* Panel 1: Drop Multiple Images */}
        <div className="border border-slate-700 rounded-lg bg-slate-800/50">
          <button
            onClick={() => setBulkSectionOpen(!bulkSectionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-amber-500" />
              <span className="text-white font-medium">Drop Multiple Images</span>
              <span className="text-slate-400 text-sm">Fill slots quickly</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${
                bulkSectionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {bulkSectionOpen && (
            <div className="p-4 border-t border-slate-700">
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                  bulkDragActive
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-600 hover:border-amber-500/50'
                }`}
                onDragEnter={handleBulkDrag}
                onDragLeave={handleBulkDrag}
                onDragOver={handleBulkDrag}
                onDrop={handleBulkDrop}
                onClick={() => bulkInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={bulkInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = filterImageFiles(e.target.files);
                    if (files.length > 0) {
                      // Handle bulk drop logic inline
                      e.dataTransfer = { files: files };
                      handleBulkDrop({ 
                        preventDefault: () => {}, 
                        stopPropagation: () => {}, 
                        dataTransfer: { files: files } 
                      });
                    }
                    if (bulkInputRef.current) bulkInputRef.current.value = '';
                  }}
                />
                <div className="text-center">
                  <Upload className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <div className="text-amber-400 font-medium">
                    Click or drag multiple images here
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    Images will be distributed across slots automatically
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Duplicate One Image */}
        <div className="border border-slate-700 rounded-lg bg-slate-800/50">
          <button
            onClick={() => setDuplicateSectionOpen(!duplicateSectionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Copy className="w-5 h-5 text-blue-500" />
              <span className="text-white font-medium">Duplicate One Image</span>
              <span className="text-slate-400 text-sm">Fill multiple slots with copies</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${
                duplicateSectionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {duplicateSectionOpen && (
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-slate-300 text-sm">Number of copies:</span>
                <input
                  type="number"
                  min="2"
                  max={MAX_SLOTS}
                  value={duplicateCount}
                  onChange={(e) =>
                    setDuplicateCount(Math.min(MAX_SLOTS, Math.max(2, parseInt(e.target.value) || 2)))
                  }
                  className="w-16 bg-slate-900 text-white text-center rounded p-2 border border-slate-600 text-sm"
                />
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  duplicateDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-blue-500/50'
                } ${!duplicatePreview ? 'cursor-pointer' : ''}`}
                onDragEnter={handleDuplicateDrag}
                onDragLeave={handleDuplicateDrag}
                onDragOver={handleDuplicateDrag}
                onDrop={handleDuplicateDrop}
                onClick={(e) => {
                  // Only trigger file input if no image is uploaded yet
                  if (!duplicatePreview && e.target.tagName !== 'BUTTON') {
                    duplicateInputRef.current?.click();
                  }
                }}
              >
                <input
                  type="file"
                  ref={duplicateInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDuplicateFile(file);
                  }}
                />
                <div className="text-center">
                  {duplicatePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={duplicatePreview}
                        alt="Duplicate"
                        className="max-h-24 rounded-lg mx-auto mb-2"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDuplicate();
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fillDuplicates();
                        }}
                        className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Fill {duplicateCount} Slots
                      </button>
                    </div>
                  ) : (
                    <>
                      <Copy className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                      <div className="text-blue-400 font-medium">
                        Click or drag one image here
                      </div>
                      <p className="text-slate-400 text-sm mt-2">
                        Will create {duplicateCount} copies in separate slots
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3: Image Collection */}
        <div className="border border-slate-700 rounded-lg bg-slate-800/50">
          <button
            onClick={() => setCollectionPanelOpen(!collectionPanelOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-blue-500" />
              <span className="text-white font-medium">Image Collection</span>
              <span className="text-slate-400 text-sm">
                {collection.length} saved image{collection.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${
                collectionPanelOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {collectionPanelOpen && (
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm">
                  Click image to preview, hover for actions
                </p>
                {collection.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={onDownloadAllFromCollection}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                      title="Download all images"
                    >
                      <Download className="w-3 h-3" /> All
                    </button>
                    <button
                      onClick={onClearCollection}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                      title="Clear collection"
                    >
                      <Trash className="w-3 h-3" /> Clear
                    </button>
                  </div>
                )}
              </div>
              
              {collection.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                  {collection.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg overflow-hidden border border-slate-600 hover:border-blue-500 transition-colors flex items-center justify-center bg-slate-900/50"
                      style={{ minHeight: '80px' }}
                    >
                      <img
                        src={img.preview}
                        alt={img.fileName}
                        className="w-full h-auto object-contain cursor-pointer"
                        onClick={() => onImageClick(img.preview, img.fileName)}
                        title={img.fileName}
                      />
                      
                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {/* Top right corner buttons */}
                        <div className="absolute top-1 right-1 flex flex-col gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFromCollection(img.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition-all hover:scale-110 pointer-events-auto"
                            title="Remove from collection"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadFromCollection(img);
                            }}
                            className="bg-blue-500/80 hover:bg-blue-500 text-white p-1.5 rounded-full shadow-md transition-all hover:scale-110 pointer-events-auto"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                        
                        {/* Center add button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              useFromCollection(img);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg shadow-md transition-all hover:scale-105 pointer-events-auto"
                            title="Add to slot"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  No images in collection. Upload images to add them here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center justify-center gap-8 py-3 bg-slate-800/30 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300 font-medium">{getActiveCount()} Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-slate-300 font-medium">{getCompletedCount()} Completed</span>
        </div>
      </div>

      {/* IMAGE SLOTS SECTION - Left/Right Layout */}
      <div className="space-y-4">
        {images.slice(0, visibleSlots).map((img, index) => (
          <div
            key={img.id}
            className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/70">
              <span className="text-blue-400 font-medium">Image {index + 1}</span>
              {visibleSlots > 1 && (
                <button
                  onClick={() => removeSlot(index)}
                  className="text-slate-400 hover:text-red-400 text-sm flex items-center gap-1"
                >
                  <Trash className="w-4 h-4" /> Remove Slot
                </button>
              )}
            </div>

            {/* Left-Right Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              {/* LEFT SIDE - Input Area */}
              <div className="space-y-4">
                {/* Image Upload Dropzone */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    slotDragActive[index] 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-slate-600 hover:border-blue-500/50'
                  } ${!img.imagePreview ? 'cursor-pointer' : ''}`}
                  onDragEnter={(e) => handleSlotDrag(index, e)}
                  onDragOver={(e) => handleSlotDrag(index, e)}
                  onDragLeave={(e) => handleSlotDrag(index, e)}
                  onDrop={(e) => handleSlotDrop(index, e)}
                  onClick={(e) => {
                    // Only trigger file input if no image is uploaded yet
                    if (!img.imagePreview && e.target.tagName !== 'BUTTON') {
                      fileInputRefs.current[index]?.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[index] = el)}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileInput(index, file);
                    }}
                  />

                  {img.imagePreview ? (
                    <div className="relative inline-block max-w-full">
                      <div className="bg-slate-900/50 rounded-lg p-2 inline-block">
                        <img
                          src={img.imagePreview}
                          alt="Upload"
                          className="max-w-[300px] max-h-[300px] object-contain rounded-lg border border-slate-600 cursor-pointer hover:border-blue-500"
                          onClick={() => onImageClick(img.imagePreview, `Image ${index + 1}`)}
                        />
                      </div>
                      {/* Clear Image Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImage(index);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                        title="Clear image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <div className="text-blue-400 text-sm font-medium">
                        Click or drag image here
                      </div>
                      <p className="text-slate-500 text-xs mt-1">JPG, PNG, WebP</p>
                    </div>
                  )}
                </div>

                {/* Prompt Textarea */}
                <textarea
                  value={img.prompt}
                  onChange={(e) => updateImage(index, { prompt: e.target.value })}
                  placeholder="Describe your editing instructions..."
                  className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none resize-none h-32 text-sm"
                />

                {/* Three Dropdowns in a Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Aspect Ratio</label>
                    <select
                      value={img.aspectRatio}
                      onChange={(e) => updateImage(index, { aspectRatio: e.target.value })}
                      className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                    >
                      {ASPECT_RATIOS.map((ar) => (
                        <option key={ar.value} value={ar.value}>
                          {ar.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Resolution</label>
                    <select
                      value={img.resolution}
                      onChange={(e) => updateImage(index, { resolution: e.target.value })}
                      className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                    >
                      {RESOLUTIONS.map((res) => (
                        <option key={res.value} value={res.value}>
                          {res.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Variations</label>
                    <select
                      value={img.variations}
                      onChange={(e) =>
                        updateImage(index, { variations: parseInt(e.target.value) })
                      }
                      className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                </div>

                {/* Process This Image Button */}
                <button
                  onClick={() => processImage(index)}
                  disabled={img.loading || !img.image || !img.prompt.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {img.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Process This Image
                    </>
                  )}
                </button>

                {/* Error */}
                {img.error && (
                  <p className="text-red-400 text-sm">{img.error}</p>
                )}
              </div>

              {/* RIGHT SIDE - Result Area */}
              <div className="bg-slate-800/30 rounded-lg p-4 min-h-[400px]">
                {img.results && img.results.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-green-400 text-sm font-medium">
                        Results ({img.results.length})
                      </span>
                      {img.results.length > 1 && (
                        <button
                          onClick={() => downloadAllVariations(index)}
                          className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" /> Download All
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {img.results.map((result, resIdx) => (
                        <div key={resIdx} className="relative group">
                          <div className="bg-slate-900/50 rounded-lg p-2 flex items-center justify-center min-h-[150px]">
                            <img
                              src={result}
                              alt={`Result ${resIdx + 1}`}
                              className="max-w-full max-h-[300px] object-contain rounded-lg border border-slate-600 cursor-pointer hover:border-green-500"
                              onClick={() => onImageClick(result, `Result ${resIdx + 1}`)}
                            />
                          </div>
                          <button
                            onClick={() => handleDownloadImage(index, resIdx)}
                            className="absolute bottom-2 right-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Camera className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm">Result will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD IMAGE SLOT BUTTON */}
      <button
        onClick={() => setVisibleSlots((prev) => Math.min(MAX_SLOTS, prev + 1))}
        disabled={visibleSlots >= MAX_SLOTS}
        className="w-full border-2 border-dashed border-slate-600 hover:border-blue-500 disabled:border-slate-700 disabled:opacity-50 text-slate-400 hover:text-blue-400 disabled:hover:text-slate-400 font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Image Slot {visibleSlots < MAX_SLOTS && `(${visibleSlots}/${MAX_SLOTS})`}
      </button>

      {/* PROCESS ALL BUTTON */}
      <button
        onClick={processAll}
        disabled={getActiveCount() === 0}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <Zap className="w-5 h-5" />
        Process All ({getActiveCount()} ready)
      </button>
    </div>
  );
}
