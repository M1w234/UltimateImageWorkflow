import { useState } from 'react';
import { Clock, ChevronDown, Trash, Download, X, Plus } from 'lucide-react';

/**
 * History panel component - shows past generations
 */
export default function HistoryPanel({
  history,
  isOpen,
  onToggle,
  onClear,
  onRemove,
  onImageClick,
  onAddToCollection
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const downloadImage = (url, prefix, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}-${Date.now()}-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModeLabel = (mode) => {
    const labels = {
      edit: 'Edit',
      generate: 'Generate',
      multi: 'Multi-Edit',
      combine: 'Combine'
    };
    return labels[mode] || mode;
  };

  const getModeColor = (mode) => {
    const colors = {
      edit: 'text-amber-400 bg-amber-500/20',
      generate: 'text-green-400 bg-green-500/20',
      multi: 'text-blue-400 bg-blue-500/20',
      combine: 'text-purple-400 bg-purple-500/20'
    };
    return colors[mode] || 'text-slate-400 bg-slate-500/20';
  };

  return (
    <div className="mt-8">
      <button
        onClick={onToggle}
        className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <span className="text-white font-medium">Generation History</span>
          <span className="text-slate-400 text-sm">
            {history.length} entr{history.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm">Last {history.length} generations</p>
            {history.length > 0 && (
              <button
                onClick={onClear}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
              >
                <Trash className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {history.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-900 rounded-lg p-3 border border-slate-700"
                >
                  {/* Entry Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getModeColor(
                          entry.mode
                        )}`}
                      >
                        {getModeLabel(entry.mode)}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      {entry.sourceCount && (
                        <span className="text-slate-500 text-xs">
                          ({entry.sourceCount} source{entry.sourceCount !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(entry.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Prompt */}
                  <div className="mb-2">
                    <p
                      className={`text-slate-300 text-sm ${
                        expandedIds.has(entry.id) ? '' : 'line-clamp-2'
                      } cursor-pointer hover:text-white`}
                      onClick={() => toggleExpand(entry.id)}
                    >
                      {entry.prompt}
                    </p>
                    {entry.prompt.length > 100 && (
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="text-amber-500 text-xs mt-1 hover:underline"
                      >
                        {expandedIds.has(entry.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>

                  {/* Images */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {entry.sourceImage && (
                      <div className="flex-shrink-0 group relative flex flex-col">
                        <p className="text-slate-500 text-xs mb-1">Source</p>
                        <div className="relative flex items-center justify-center bg-slate-900/50 rounded border border-slate-600 hover:border-blue-500 transition-colors" style={{ minHeight: '64px', minWidth: '50px' }}>
                          <img
                            src={entry.sourceImage}
                            alt="Source"
                            className="h-16 object-contain rounded cursor-pointer"
                            style={{ maxWidth: '100px' }}
                            onClick={() => onImageClick(entry.sourceImage, 'Source Image')}
                          />
                          
                          {/* Overlay with actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded">
                            {/* Top right corner buttons */}
                            <div className="absolute top-1 right-1 flex flex-col gap-1">
                              <button
                                onClick={() =>
                                  downloadImage(entry.sourceImage, 'source', 0)
                                }
                                className="bg-blue-500/80 hover:bg-blue-500 text-white p-1.5 rounded-full shadow-md transition-all hover:scale-110 pointer-events-auto"
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              {onAddToCollection && (
                                <button
                                  onClick={() => onAddToCollection(entry.sourceImage, `history-source-${entry.id}.jpg`)}
                                  className="bg-green-500/80 hover:bg-green-500 text-white p-1 rounded-full shadow-md transition-all hover:scale-110 pointer-events-auto"
                                  title="Add to Collection"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {entry.results &&
                      entry.results.map((result, idx) => (
                        <div key={idx} className="flex-shrink-0 group relative flex flex-col">
                          <p className="text-slate-500 text-xs mb-1">
                            Result {idx + 1}
                          </p>
                          <div className="relative flex items-center justify-center bg-slate-900/50 rounded border border-slate-600 hover:border-green-500 transition-colors" style={{ minHeight: '64px', minWidth: '50px' }}>
                            <img
                              src={result}
                              alt={`Result ${idx + 1}`}
                              className="h-16 object-contain rounded cursor-pointer"
                              style={{ maxWidth: '100px' }}
                              onClick={() =>
                                onImageClick(result, `Result ${idx + 1}`)
                              }
                            />
                            
                            {/* Overlay with actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded">
                              {/* Top right corner buttons */}
                              <div className="absolute top-1 right-1 flex flex-col gap-1">
                                <button
                                  onClick={() =>
                                    downloadImage(result, `history-${entry.id}`, idx)
                                  }
                                  className="bg-blue-500/80 hover:bg-blue-500 text-white p-1.5 rounded-full shadow-md transition-all hover:scale-110 pointer-events-auto"
                                  title="Download"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                {onAddToCollection && (
                                  <button
                                    onClick={() => onAddToCollection(result, `history-${entry.id}-result-${idx + 1}.jpg`)}
                                    className="bg-green-500/80 hover:bg-green-500 text-white p-1 rounded-full shadow-md transition-all hover:scale-110 pointer-events-auto"
                                    title="Add to Collection"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">
              No history yet. Generated images will appear here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
