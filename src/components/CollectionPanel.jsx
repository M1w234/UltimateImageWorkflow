import { Folder, ChevronDown, Trash, Download, X, Plus } from 'lucide-react';

/**
 * Collection panel component - shows saved images
 */
export default function CollectionPanel({
  collection,
  isOpen,
  onToggle,
  onClear,
  onRemove,
  onDownload,
  onDownloadAll,
  onImageClick,
  // Mode-specific handlers
  onUseForBatch,
  onUseForMulti,
  onUseForCombine,
  onUseForAnalyze,
  onSendToVideo,
  currentMode
}) {
  const getUseHandler = () => {
    switch (currentMode) {
      case 'edit':
        return onUseForBatch;
      case 'multi':
        return onUseForMulti;
      case 'combine':
        return onUseForCombine;
      case 'analyze':
        return onUseForAnalyze;
      case 'video':
        return onSendToVideo;
      default:
        return null;
    }
  };

  const getUseLabel = () => {
    switch (currentMode) {
      case 'edit':
        return 'Use in Editor';
      case 'multi':
        return 'Add to Multi-Edit';
      case 'combine':
        return 'Add to Combine';
      case 'analyze':
        return 'Add to Analyze';
      case 'video':
        return 'Use for Video';
      default:
        return 'Use';
    }
  };

  const useHandler = getUseHandler();

  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-3">
          <Folder className="w-5 h-5 text-blue-500" />
          <span className="text-white font-medium">My Collection</span>
          <span className="text-slate-400 text-sm">
            {collection.length} image{collection.length !== 1 ? 's' : ''}
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
            <p className="text-slate-400 text-sm">
              Uploaded images are automatically saved here
            </p>
            <div className="flex gap-2">
              {collection.length > 0 && (
                <>
                  <button
                    onClick={onDownloadAll}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <Download className="w-3 h-3" /> All
                  </button>
                  <button
                    onClick={onClear}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <Trash className="w-3 h-3" /> Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {collection.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
              {collection.map((img) => (
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-slate-600 hover:border-blue-500 transition-colors"
                >
                  <img
                    src={img.preview}
                    alt={img.fileName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onImageClick(img.preview, img.fileName)}
                    title={img.fileName}
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                    {useHandler && (
                      <button
                        onClick={() => useHandler(img)}
                        className="bg-green-500 hover:bg-green-600 text-white p-1 rounded text-xs w-full flex items-center justify-center gap-1"
                        title={getUseLabel()}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => onDownload(img)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs w-full flex items-center justify-center gap-1"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemove(img.id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs w-full flex items-center justify-center gap-1"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
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
  );
}
