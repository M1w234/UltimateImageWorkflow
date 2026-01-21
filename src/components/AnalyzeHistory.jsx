import { useState } from 'react';
import { History, Trash2, ArrowRight, ChevronDown, ChevronUp, Camera, Video, Image as ImageIcon, Copy, Check, FileText } from 'lucide-react';

/**
 * Format timestamp to relative time string
 */
const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Get profile display name
 */
const getProfileName = (profileKey) => {
  const names = {
    general_photo: 'General Photo',
    nano_banana_pro: 'Nano Banana Pro',
    kling_2_5: 'Kling 2.5',
    kling_2_6: 'Kling 2.6',
    kling_01: 'Kling 01'
  };
  return names[profileKey] || profileKey;
};

/**
 * History item card component
 */
function HistoryCard({ item, onDelete, onPushToEditor, onImageClick }) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState({});
  const [copiedPrompts, setCopiedPrompts] = useState({});
  
  const isPhotoMode = item.mode === 'photo';
  const isStartEnd = item.mode === 'video-start-end';
  const isMultiPrompt = item.mode === 'photo-multi-prompt';
  const accentColor = isPhotoMode ? 'amber' : (isMultiPrompt ? 'teal' : 'purple');
  
  // Truncate prompt for preview (for single prompt items)
  const promptPreview = item.prompt && item.prompt.length > 150 
    ? item.prompt.substring(0, 150) + '...'
    : item.prompt;

  // Copy prompt to clipboard (for single prompt items)
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  // Copy individual multi-prompt output to clipboard
  const handleCopyMultiPrompt = async (promptId, output) => {
    try {
      await navigator.clipboard.writeText(output);
      setCopiedPrompts(prev => ({ ...prev, [promptId]: true }));
      setTimeout(() => {
        setCopiedPrompts(prev => ({ ...prev, [promptId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-all overflow-hidden">
      {/* Header with mode badge */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {isPhotoMode || isMultiPrompt ? (
            <Camera className={`w-4 h-4 ${isMultiPrompt ? 'text-teal-400' : 'text-amber-400'}`} />
          ) : (
            <Video className="w-4 h-4 text-purple-400" />
          )}
          <span className={`text-xs font-semibold ${isMultiPrompt ? 'text-teal-400' : (isPhotoMode ? 'text-amber-400' : 'text-purple-400')}`}>
            {isMultiPrompt ? 'Photo (Multi-Prompt)' : (isPhotoMode ? 'Photo' : isStartEnd ? 'Video (Start/End)' : 'Video')}
          </span>
          {item.modelProfile && (
            <span className="text-xs text-slate-400">
              • {getProfileName(item.modelProfile)}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {formatRelativeTime(item.timestamp)}
        </span>
      </div>

      {/* Image(s) or Text Description */}
      <div className="p-3">
        {item.images && item.images.length > 0 ? (
          <div className={`grid ${item.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-3`}>
            {item.images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img.preview}
                  alt={img.fileName || `Image ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onImageClick(img.preview, img.fileName)}
                />
                {item.images.length > 1 && (
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {idx === 0 ? 'Start' : 'End'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-4 mb-3 border border-slate-600">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-slate-400">Text Description</span>
            </div>
            <p className="text-slate-300 text-sm italic">
              {item.textDescription || 'Text-to-image generation'}
            </p>
          </div>
        )}

        {/* Prompt(s) */}
        {isMultiPrompt && item.prompts ? (
          // Multi-Prompt Display
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-3 h-3 text-teal-400" />
              <span className="text-xs font-medium text-teal-400">
                {item.prompts.length} Prompt{item.prompts.length !== 1 ? 's' : ''} Generated
              </span>
            </div>
            {item.prompts.map((prompt, idx) => {
              const promptId = `${item.id}-${idx}`;
              const isExpanded = expandedPrompts[promptId];
              const isCopied = copiedPrompts[promptId];
              const outputPreview = prompt.output.length > 100 
                ? prompt.output.substring(0, 100) + '...'
                : prompt.output;

              return (
                <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                  {/* Prompt Input */}
                  <div className="mb-2">
                    <span className="text-xs text-slate-500">Prompt #{idx + 1}: </span>
                    <span className="text-xs text-slate-300 italic">{prompt.text}</span>
                  </div>
                  
                  {/* Generated Output */}
                  <div className="bg-slate-800 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Output:</span>
                      <button
                        onClick={() => handleCopyMultiPrompt(promptId, prompt.output)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all ${
                          isCopied
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        }`}
                        title="Copy output"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                      {isExpanded ? prompt.output : outputPreview}
                    </p>
                    {prompt.output.length > 100 && (
                      <button
                        onClick={() => setExpandedPrompts(prev => ({ ...prev, [promptId]: !prev[promptId] }))}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                      >
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Single Prompt Display
          <div className="bg-slate-900 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-medium text-slate-400">Generated Prompt</span>
              </div>
              <button
                onClick={handleCopyPrompt}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title="Copy prompt"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {showFullPrompt ? item.prompt : promptPreview}
            </p>
            {item.prompt && item.prompt.length > 150 && (
              <button
                onClick={() => setShowFullPrompt(!showFullPrompt)}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2"
              >
                {showFullPrompt ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        )}

        {/* User Instruction (if exists) */}
        {item.userInstruction && (
          <div className="bg-slate-900/50 rounded px-3 py-2 mb-3">
            <span className="text-xs text-slate-500">User instruction: </span>
            <span className="text-xs text-slate-300">{item.userInstruction}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onPushToEditor(item)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${
              isMultiPrompt
                ? 'from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
                : (isPhotoMode
                  ? 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600')
            } text-white transition-all`}
          >
            <ArrowRight className="w-4 h-4" />
            Push to {isPhotoMode || isMultiPrompt ? 'Editor' : 'Video'}
            {isMultiPrompt && ` (${item.prompts.length})`}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Analyze History Panel Component
 * Collapsible section showing analysis history with management features
 */
export default function AnalyzeHistory({
  history,
  isOpen,
  onToggle,
  onDeleteItem,
  onClearAll,
  onPushToEditor,
  onImageClick
}) {
  return (
    <div className="mt-6">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-750 rounded-xl transition-all border border-slate-700 hover:border-slate-600"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold">Analysis History</span>
          <span className="text-slate-400 text-sm">
            ({history.length} item{history.length !== 1 ? 's' : ''})
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Header with Clear All */}
          {history.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={onClearAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear All History
              </button>
            </div>
          )}

          {/* History Grid */}
          {history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onDelete={onDeleteItem}
                  onPushToEditor={onPushToEditor}
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-1">No analysis history yet</p>
              <p className="text-slate-500 text-sm">
                Generate prompts from images to see them here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
