import { useState, useRef, useEffect } from 'react';
import {
  Video,
  Upload,
  X,
  Loader2,
  Download,
  Play,
  Clock,
  ChevronDown,
  Trash,
  Plus,
  ArrowLeftRight
} from 'lucide-react';
import { fileToBase64, filterImageFiles, isValidImage, compressImage } from '../utils/imageUtils';
import { generateUniqueId } from '../utils/storage';
import { startVideoGeneration, checkVideoStatus } from '../services/klingApi';
import { ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_MODES, KLING_MODELS, MAX_SLOTS } from '../utils/constants';

/**
 * Kling Mode - AI Video Generation
 */
export default function KlingMode({
  klingKey,
  imgbbKey,
  klingModel,
  onKlingModelChange,
  klingModels,
  onOpenSettings,
  onAddToCollection,
  onImageClick,
  playChime,
  pendingImage,
  pendingVideoBatch,
  pendingEndFrame,
  pendingPrompt,
  onClearPendingImage
}) {
  // Generation slots
  const [slots, setSlots] = useState([
    {
      id: generateUniqueId(),
      prompt: '',
      negativePrompt: '',
      image: null,
      imagePreview: null,
      endImage: null,
      endImagePreview: null,
      duration: 5,
      aspectRatio: '16:9',
      mode: 'std',
      enableAudio: false,
      loading: false,
      taskId: null,
      status: null,
      result: null,
      error: null,
      videoHistory: [],
      historyOpen: false,
      dragActive: false,
      endDragActive: false,
      pollInterval: null
    }
  ]);
  const [visibleSlots, setVisibleSlots] = useState(1);
  
  // Refs for file inputs (arrays)
  const fileInputRefs = useRef([]);
  const endFileInputRefs = useRef([]);
  const pollIntervals = useRef({});  // Track polling intervals by slot index

  // Cleanup polling intervals on unmount only
  useEffect(() => {
    return () => {
      Object.values(pollIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);  // Empty dependency array - only runs on unmount

  // Handle pending image transfer
  useEffect(() => {
    if ((pendingImage || pendingEndFrame || pendingPrompt) && slots.length > 0) {
      // Find the next available slot (first slot without an image)
      let targetSlotIndex = slots.findIndex(slot => !slot.imagePreview);
      
      // If all slots have images, use the first slot
      if (targetSlotIndex === -1) {
        targetSlotIndex = 0;
      }
      
      // If target slot doesn't exist (beyond visible slots), add a new slot if possible
      if (targetSlotIndex >= visibleSlots && visibleSlots < MAX_SLOTS) {
        addSlot();
        targetSlotIndex = visibleSlots; // Will be the new slot after adding
        // Wait for the slot to be added before updating
        setTimeout(() => {
          applyPendingImageToSlot(targetSlotIndex);
        }, 0);
        return;
      }
      
      applyPendingImageToSlot(targetSlotIndex);
    }
  }, [pendingImage, pendingEndFrame, pendingPrompt]);
  
  // Helper function to apply pending image to a specific slot
  const applyPendingImageToSlot = (targetSlotIndex) => {
    if (!slots[targetSlotIndex]) return;
    
    const updates = {};
    
    // Load start frame if provided and not already set
    if (pendingImage && !slots[targetSlotIndex].imagePreview) {
      // Extract base64 from data URL if needed
      const base64 = pendingImage.includes(',') ? pendingImage.split(',')[1] : pendingImage;
      updates.image = base64;
      updates.imagePreview = pendingImage;
    }
    
    // Load end frame if provided and not already set
    if (pendingEndFrame && !slots[targetSlotIndex].endImagePreview) {
      // Extract base64 from data URL if needed
      const endBase64 = pendingEndFrame.includes(',') ? pendingEndFrame.split(',')[1] : pendingEndFrame;
      updates.endImage = endBase64;
      updates.endImagePreview = pendingEndFrame;
    }
    
    // Load prompt if provided and not already set
    if (pendingPrompt && !slots[targetSlotIndex].prompt) {
      updates.prompt = pendingPrompt;
    }
    
    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      updateSlot(targetSlotIndex, updates);
      onClearPendingImage?.();
    }
  };

  // Handle pending batch transfer
  useEffect(() => {
    if (pendingVideoBatch && pendingVideoBatch.length > 0) {
      const batchSize = Math.min(pendingVideoBatch.length, MAX_SLOTS);
      
      // Create slots if needed
      const slotsNeeded = batchSize - slots.length;
      if (slotsNeeded > 0) {
        const newSlots = [...slots];
        for (let i = 0; i < slotsNeeded; i++) {
          newSlots.push({
            id: generateUniqueId(),
            prompt: '',
            negativePrompt: '',
            image: null,
            imagePreview: null,
            endImage: null,
            endImagePreview: null,
            duration: 5,
            aspectRatio: '16:9',
            mode: 'std',
            enableAudio: false,
            loading: false,
            taskId: null,
            status: null,
            result: null,
            error: null,
            videoHistory: [],
            historyOpen: false,
            dragActive: false,
            endDragActive: false,
            pollInterval: null
          });
        }
        setSlots(newSlots);
        setVisibleSlots(batchSize);
      }
      
      // Load images into slots
      setSlots((prev) => {
        const updated = [...prev];
        pendingVideoBatch.slice(0, batchSize).forEach((item, index) => {
          if (updated[index]) {
            // Extract base64 from data URL if needed
            const base64 = item.preview.includes(',') ? item.preview.split(',')[1] : item.preview;
            updated[index] = {
              ...updated[index],
              image: base64,
              imagePreview: item.preview,
              prompt: item.prompt || ''
            };
          }
        });
        return updated;
      });
      
      onClearPendingImage?.();
    }
  }, [pendingVideoBatch]);

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
        negativePrompt: '',
        image: null,
        imagePreview: null,
        endImage: null,
        endImagePreview: null,
        duration: 5,
        aspectRatio: '16:9',
        mode: 'std',
        enableAudio: false,
        loading: false,
        taskId: null,
        status: null,
        result: null,
        error: null,
        videoHistory: [],
        historyOpen: false,
        dragActive: false,
        endDragActive: false,
        pollInterval: null
      }
    ]);
    setVisibleSlots((prev) => Math.min(MAX_SLOTS, prev + 1));
  };

  // Remove a slot
  const removeSlot = (index) => {
    if (slots.length <= 1) return;
    
    // Clear polling interval for this slot
    const slot = slots[index];
    if (slot.pollInterval) {
      clearInterval(slot.pollInterval);
    }
    
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
    setVisibleSlots((prev) => Math.max(1, prev - 1));
  };

  // Drag handlers for start frame
  const handleDrag = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      updateSlot(index, { dragActive: true });
    } else if (e.type === 'dragleave') {
      updateSlot(index, { dragActive: false });
    }
  };

  const handleDrop = async (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    updateSlot(index, { dragActive: false });

    const file = e.dataTransfer.files[0];
    if (file && isValidImage(file)) {
      handleImageFile(index, file);
    }
  };

  const handleImageFile = async (index, file) => {
    const { base64, preview } = await fileToBase64(file);
    updateSlot(index, { image: base64, imagePreview: preview });
    onAddToCollection(preview, file.name);
  };

  const handleFileSelect = async (index, e) => {
    const file = e.target.files?.[0];
    if (file && isValidImage(file)) {
      handleImageFile(index, file);
    }
  };

  // Drag handlers for end frame
  const handleEndDrag = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      updateSlot(index, { endDragActive: true });
    } else if (e.type === 'dragleave') {
      updateSlot(index, { endDragActive: false });
    }
  };

  const handleEndDrop = async (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    updateSlot(index, { endDragActive: false });

    const file = e.dataTransfer.files[0];
    if (file && isValidImage(file)) {
      handleEndImageFile(index, file);
    }
  };

  const handleEndImageFile = async (index, file) => {
    const { base64, preview } = await fileToBase64(file);
    updateSlot(index, { endImage: base64, endImagePreview: preview });
    onAddToCollection(preview, file.name);
  };

  const handleEndFileSelect = async (index, e) => {
    const file = e.target.files?.[0];
    if (file && isValidImage(file)) {
      handleEndImageFile(index, file);
    }
  };

  // Clear functions
  const clearEndImage = (index) => {
    updateSlot(index, { endImage: null, endImagePreview: null });
    if (endFileInputRefs.current[index]) {
      endFileInputRefs.current[index].value = '';
    }
  };

  const clearImage = (index) => {
    updateSlot(index, { 
      image: null, 
      imagePreview: null,
      endImage: null,
      endImagePreview: null
    });
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
    if (endFileInputRefs.current[index]) {
      endFileInputRefs.current[index].value = '';
    }
  };

  const swapFrames = (index) => {
    const slot = slots[index];
    updateSlot(index, {
      image: slot.endImage,
      imagePreview: slot.endImagePreview,
      endImage: slot.image,
      endImagePreview: slot.imagePreview
    });
  };

  const clearSlot = (index) => {
    // Stop polling if active
    if (pollIntervals.current[index]) {
      clearInterval(pollIntervals.current[index]);
      delete pollIntervals.current[index];
    }
    
    updateSlot(index, {
      prompt: '',
      negativePrompt: '',
      image: null,
      imagePreview: null,
      endImage: null,
      endImagePreview: null,
      result: null,
      error: null,
      taskId: null,
      status: null,
      loading: false,
      pollInterval: null
    });
    
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
    if (endFileInputRefs.current[index]) {
      endFileInputRefs.current[index].value = '';
    }
  };

  // Poll for video status (per slot)
  const pollVideoStatus = async (index, taskIdToPoll) => {
    console.log('[KlingMode] Polling status for task:', taskIdToPoll);
    try {
      const result = await checkVideoStatus({ apiKey: klingKey, taskId: taskIdToPoll });
      const slot = slots[index];
      
      updateSlot(index, { status: result.status });

      if (result.status === 'completed') {
        // Save to video history
        const historyEntry = {
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          prompt: slot.prompt,
          hasImage: !!slot.image,
          imagePreview: slot.imagePreview,
          hasEndImage: !!slot.endImage,
          endImagePreview: slot.endImagePreview,
          videoUrl: result.videoUrl,
          duration: slot.duration,
          aspectRatio: slot.aspectRatio,
          mode: slot.mode,
          klingModel
        };
        
        updateSlot(index, { 
          result: result.videoUrl,
          loading: false,
          videoHistory: [historyEntry, ...slot.videoHistory.slice(0, 19)]
        });
        
        playChime();
        return true;
      } else if (result.status === 'failed') {
        updateSlot(index, { 
          error: result.error || 'Video generation failed',
          loading: false
        });
        return true;
      }

      return false;
    } catch (err) {
      updateSlot(index, { 
        error: err.message,
        loading: false
      });
      return true;
    }
  };

  // Start polling for a slot
  const startPolling = (index, taskId) => {
    // Clear any existing interval for this slot
    if (pollIntervals.current[index]) {
      clearInterval(pollIntervals.current[index]);
    }
    
    const interval = setInterval(async () => {
      const isDone = await pollVideoStatus(index, taskId);
      if (isDone) {
        clearInterval(pollIntervals.current[index]);
        delete pollIntervals.current[index];
      }
    }, 5000);
    
    pollIntervals.current[index] = interval;
  };

  // Stop polling for a slot
  const stopPolling = (index) => {
    if (pollIntervals.current[index]) {
      clearInterval(pollIntervals.current[index]);
      delete pollIntervals.current[index];
    }
  };

  // Generate video for a single slot
  const generateVideo = async (index) => {
    const slot = slots[index];

    if (!slot.prompt.trim()) {
      updateSlot(index, { error: 'Please enter a prompt' });
      return;
    }

    if (!klingKey) {
      onOpenSettings();
      return;
    }

    updateSlot(index, { 
      loading: true, 
      error: null, 
      result: null,
      status: 'pending',
      taskId: null
    });

    try {
      // Compress images to reduce payload size for API
      let resizedImage = slot.image;
      let resizedEndImage = slot.endImage;
      
      if (slot.image) {
        console.log('[KlingMode] Original image size:', Math.round(slot.image.length / 1024), 'KB');
        try {
          // Compression: 1800px max, 90% quality
          resizedImage = await compressImage(slot.image, 1800, 0.90);
          console.log('[KlingMode] Compressed image size:', Math.round(resizedImage.length / 1024), 'KB');
        } catch (compressionErr) {
          console.error('[KlingMode] Compression failed:', compressionErr);
          updateSlot(index, { 
            error: 'Failed to compress image: ' + compressionErr.message,
            loading: false
          });
          return;
        }
      }
      
      if (klingModel === '2.5' && slot.endImage) {
        console.log('[KlingMode] Original end image size:', Math.round(slot.endImage.length / 1024), 'KB');
        try {
          resizedEndImage = await compressImage(slot.endImage, 1800, 0.90);
          console.log('[KlingMode] Compressed end image size:', Math.round(resizedEndImage.length / 1024), 'KB');
        } catch (compressionErr) {
          console.error('[KlingMode] End image compression failed:', compressionErr);
          updateSlot(index, { 
            error: 'Failed to compress end image: ' + compressionErr.message,
            loading: false
          });
          return;
        }
      }
      
      console.log('[KlingMode] Calling API with images...');
      const newTaskId = await startVideoGeneration({
        apiKey: klingKey,
        prompt: slot.prompt.trim(),
        negativePrompt: slot.negativePrompt.trim(),
        duration: slot.duration,
        aspectRatio: slot.aspectRatio,
        mode: slot.mode,
        version: klingModel,
        imageBase64: resizedImage,
        endImageBase64: klingModel === '2.5' ? resizedEndImage : null,
        enableAudio: slot.enableAudio && klingModel === '2.6' && slot.mode === 'pro',
        imgbbKey: imgbbKey
      });

      updateSlot(index, { 
        taskId: newTaskId,
        status: 'processing'
      });

      // Start polling for this slot
      startPolling(index, newTaskId);
    } catch (err) {
      updateSlot(index, { 
        error: err.message || 'Failed to generate video',
        loading: false
      });
    }
  };

  // Generate all slots with prompts
  const generateAll = async () => {
    const slotsToProcess = slots
      .slice(0, visibleSlots)
      .map((slot, idx) => ({ ...slot, index: idx }))
      .filter((slot) => slot.prompt.trim());

    if (slotsToProcess.length === 0) {
      alert('Please add at least one prompt');
      return;
    }

    await Promise.all(slotsToProcess.map((slot) => generateVideo(slot.index)));
  };

  // Download video from a slot
  const downloadVideo = (index) => {
    const slot = slots[index];
    if (!slot.result) return;
    const link = document.createElement('a');
    link.href = slot.result;
    link.download = `kling-video-slot${index + 1}-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all videos
  const downloadAll = () => {
    slots.slice(0, visibleSlots).forEach((slot, idx) => {
      if (slot.result) {
        setTimeout(() => downloadVideo(idx), idx * 200);
      }
    });
  };

  // Helper functions
  const getStatusText = (status) => {
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

  const getStatusColor = (status) => {
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

  // Stats
  const getActiveCount = () =>
    slots.slice(0, visibleSlots).filter((s) => s.prompt.trim()).length;
  const getCompletedCount = () =>
    slots.slice(0, visibleSlots).filter((s) => s.result).length;

  return (
    <div className="space-y-6">
      {/* Slots */}
      <div className="space-y-4">
        {slots.slice(0, visibleSlots).map((slot, index) => (
          <div
            key={slot.id}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-pink-400 font-medium">
                Video Generation #{index + 1}
              </span>
              {slots.length > 1 && (
                <button
                  onClick={() => removeSlot(index)}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Remove slot"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Inputs */}
              <div className="space-y-4">
                {/* Start Frame */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Start Frame (Optional)
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                      slot.dragActive
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-slate-600 hover:border-pink-500/50'
                    } ${!slot.imagePreview ? 'cursor-pointer' : ''}`}
                    onDragEnter={(e) => handleDrag(index, e)}
                    onDragLeave={(e) => handleDrag(index, e)}
                    onDragOver={(e) => handleDrag(index, e)}
                    onDrop={(e) => handleDrop(index, e)}
                    onClick={(e) => {
                      if (!slot.imagePreview && e.target.tagName !== 'BUTTON') {
                        fileInputRefs.current[index]?.click();
                      }
                    }}
                  >
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[index] = el)}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(index, e)}
                    />

                    {slot.imagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={slot.imagePreview}
                          alt="Start Frame"
                          className="max-h-32 rounded-lg cursor-pointer hover:opacity-80"
                          onClick={() => onImageClick(slot.imagePreview, 'Start Frame')}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearImage(index);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Upload className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                        <div className="text-pink-400 text-sm">
                          Add image for image-to-video
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Swap Button - only show when both frames exist in Kling 2.5 */}
                {slot.imagePreview && slot.endImagePreview && klingModel === '2.5' && (
                  <div className="flex justify-center -my-2">
                    <button
                      onClick={() => swapFrames(index)}
                      className="bg-slate-700 hover:bg-slate-600 text-pink-400 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      title="Swap start and end frames"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Swap Frames
                    </button>
                  </div>
                )}

                {/* End Frame - Kling 2.5 Only */}
                {klingModel === '2.5' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-slate-300 font-medium">
                        End Frame (Optional)
                      </label>
                      <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/30">
                        Kling 2.5 Only
                      </span>
                    </div>
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                        slot.endDragActive
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-slate-600 hover:border-pink-500/50'
                      } ${!slot.endImagePreview ? 'cursor-pointer' : ''}`}
                      onDragEnter={(e) => handleEndDrag(index, e)}
                      onDragLeave={(e) => handleEndDrag(index, e)}
                      onDragOver={(e) => handleEndDrag(index, e)}
                      onDrop={(e) => handleEndDrop(index, e)}
                      onClick={(e) => {
                        if (!slot.endImagePreview && e.target.tagName !== 'BUTTON') {
                          endFileInputRefs.current[index]?.click();
                        }
                      }}
                    >
                      <input
                        type="file"
                        ref={(el) => (endFileInputRefs.current[index] = el)}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleEndFileSelect(index, e)}
                      />

                      {slot.endImagePreview ? (
                        <div className="relative inline-block">
                          <img
                            src={slot.endImagePreview}
                            alt="End Frame"
                            className="max-h-32 rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => onImageClick(slot.endImagePreview, 'End Frame')}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearEndImage(index);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Upload className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                          <div className="text-pink-400 text-sm">
                            Define where your video should end
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prompt */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Video Prompt
                  </label>
                  <textarea
                    value={slot.prompt}
                    onChange={(e) => updateSlot(index, { prompt: e.target.value })}
                    placeholder="Describe the video you want to create..."
                    className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none resize-none h-32 text-sm"
                  />
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Negative Prompt (Optional)
                  </label>
                  <textarea
                    value={slot.negativePrompt}
                    onChange={(e) => updateSlot(index, { negativePrompt: e.target.value })}
                    placeholder="What to avoid in the video..."
                    className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-pink-500 focus:outline-none resize-none h-20 text-sm"
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Duration</label>
                    <select
                      value={slot.duration}
                      onChange={(e) => updateSlot(index, { duration: parseInt(e.target.value) })}
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
                      value={slot.aspectRatio}
                      onChange={(e) => updateSlot(index, { aspectRatio: e.target.value })}
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
                      value={slot.mode}
                      onChange={(e) => updateSlot(index, { mode: e.target.value })}
                      className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                    >
                      {VIDEO_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Model Version</label>
                    <select
                      value={klingModel}
                      onChange={(e) => onKlingModelChange?.(e.target.value)}
                      className="w-full bg-slate-900 text-white rounded-lg p-2 border border-slate-600 text-sm"
                    >
                      {klingModels?.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Audio Checkbox - Only for Kling 2.6 */}
                  {klingModel === '2.6' && (
                    <div className="col-span-2 sm:col-span-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={slot.enableAudio}
                          onChange={(e) => updateSlot(index, { enableAudio: e.target.checked })}
                          disabled={slot.mode !== 'pro'}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-pink-500 focus:ring-pink-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-slate-300 text-sm group-hover:text-white transition-colors">
                          🔊 Enable Audio Generation
                        </span>
                        <span className="text-slate-500 text-xs">(2x cost)</span>
                      </label>
                      <p className="text-slate-500 text-xs mt-1 ml-6">
                        Generates synchronized audio with video. {slot.mode === 'pro' ? 'Available in Kling 2.6 Pro mode.' : 'Requires Pro mode to enable.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  onClick={() => generateVideo(index)}
                  disabled={slot.loading || !slot.prompt.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  {slot.loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{getStatusText(slot.status)}</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Generate
                    </>
                  )}
                </button>

                {/* Status */}
                {slot.status && slot.loading && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      <span className={`text-sm font-medium ${getStatusColor(slot.status)}`}>
                        {getStatusText(slot.status)}
                      </span>
                    </div>
                    {slot.taskId && (
                      <p className="text-slate-500 text-xs mt-1">
                        Task ID: {slot.taskId}
                      </p>
                    )}
                  </div>
                )}

                {/* Error */}
                {slot.error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                    {slot.error}
                  </div>
                )}

                {/* Clear Button */}
                {(slot.prompt || slot.image || slot.endImage || slot.result) && (
                  <button
                    onClick={() => clearSlot(index)}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Clear Slot
                  </button>
                )}
              </div>

              {/* Right Column - Result */}
              <div>
                {slot.result ? (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Play className="w-5 h-5 text-green-400" />
                      Generated Video
                    </h3>
                    <video
                      src={slot.result}
                      controls
                      className="w-full rounded-lg border border-slate-600"
                      autoPlay
                      loop
                    />
                    <button
                      onClick={() => downloadVideo(index)}
                      className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 flex flex-col items-center justify-center h-full min-h-[200px]">
                    <Video className="w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-slate-500 text-center text-sm">
                      Your generated video will appear here
                    </p>
                  </div>
                )}

                {/* Video History */}
                {slot.videoHistory.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => updateSlot(index, { historyOpen: !slot.historyOpen })}
                      className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-4 py-2 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-pink-500" />
                        <span className="text-white text-sm font-medium">Video History</span>
                        <span className="text-slate-400 text-xs">
                          {slot.videoHistory.length} video{slot.videoHistory.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          slot.historyOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {slot.historyOpen && (
                      <div className="mt-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {slot.videoHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="bg-slate-900 rounded-lg p-2 border border-slate-700"
                            >
                              <div className="flex items-start gap-2">
                                {(entry.imagePreview || entry.endImagePreview) && (
                                  <div className="flex-shrink-0 flex items-center gap-1">
                                    {entry.imagePreview && (
                                      <div className="flex items-center justify-center bg-slate-900/50 rounded border border-slate-600" style={{ minHeight: '32px', minWidth: '28px' }}>
                                        <img
                                          src={entry.imagePreview}
                                          alt="Start"
                                          className="h-8 object-contain rounded"
                                          style={{ maxWidth: '50px' }}
                                        />
                                      </div>
                                    )}
                                    {entry.hasEndImage && entry.endImagePreview && (
                                      <>
                                        <span className="text-slate-600 text-xs">→</span>
                                        <div className="flex items-center justify-center bg-slate-900/50 rounded border border-slate-600" style={{ minHeight: '32px', minWidth: '28px' }}>
                                          <img
                                            src={entry.endImagePreview}
                                            alt="End"
                                            className="h-8 object-contain rounded"
                                            style={{ maxWidth: '50px' }}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-slate-300 text-xs line-clamp-2">
                                    {entry.prompt}
                                  </p>
                                  <p className="text-slate-500 text-xs mt-0.5">
                                    {new Date(entry.timestamp).toLocaleString()} •{' '}
                                    {entry.duration}s • {entry.aspectRatio}
                                    {entry.klingModel && ` • v${entry.klingModel}`}
                                  </p>
                                </div>
                                {entry.videoUrl && (
                                  <a
                                    href={entry.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-pink-400 hover:text-pink-300"
                                  >
                                    <Play className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
            Add Slot ({visibleSlots}/{MAX_SLOTS})
          </button>
        )}

        <button
          onClick={generateAll}
          disabled={getActiveCount() === 0}
          className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
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
