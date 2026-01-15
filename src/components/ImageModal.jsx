import { useEffect } from 'react';
import { X, Download, Search, Camera, Zap, Upload } from 'lucide-react';
import { downloadImage, createFilename } from '../utils/imageUtils';

/**
 * Full-screen image preview modal
 */
export default function ImageModal({ 
  isOpen, 
  image, 
  title, 
  onClose,
  onSendToAnalyze,
  onSendToEdit,
  onSendToCombine,
  onSendToMultiEdit
}) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadImage(image, createFilename('image'));
  };

  const handleSendToAnalyze = (e) => {
    e.stopPropagation();
    onSendToAnalyze?.(image);
    onClose();
  };

  const handleSendToEdit = (e) => {
    e.stopPropagation();
    onSendToEdit?.(image);
    onClose();
  };

  const handleSendToCombine = (e) => {
    e.stopPropagation();
    onSendToCombine?.(image);
    onClose();
  };

  const handleSendToMultiEdit = (e) => {
    e.stopPropagation();
    onSendToMultiEdit?.(image);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Image */}
        <div className="flex-1 flex items-center justify-center overflow-auto">
          <img
            src={image}
            alt={title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Modal Footer */}
        <div className="mt-4 text-center">
          {/* Send to Mode Buttons */}
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            <button
              onClick={handleSendToAnalyze}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Send to Analyze
            </button>
            <button
              onClick={handleSendToEdit}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Send to Editor
            </button>
            <button
              onClick={handleSendToCombine}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Send to Generator
            </button>
            <button
              onClick={handleSendToMultiEdit}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Send to Multi-Edit
            </button>
          </div>
          
          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <Download className="w-5 h-5" />
            Download Full Size
          </button>
          <p className="text-slate-400 text-sm mt-2">Click anywhere or press ESC to close</p>
        </div>
      </div>
    </div>
  );
}
