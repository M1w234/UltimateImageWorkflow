/**
 * Image utilities for MyAPI Studio
 * Handles image processing, conversion, and downloads
 */

/**
 * Convert a File to base64 string
 * @param {File} file 
 * @returns {Promise<{base64: string, preview: string}>}
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve({ base64, preview: result });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Check if a file is a valid image
 * @param {File} file 
 * @returns {boolean}
 */
export const isValidImage = (file) => {
  return file && file.type && file.type.startsWith('image/');
};

/**
 * Download an image from a data URL
 * @param {string} dataUrl 
 * @param {string} filename 
 */
export const downloadImage = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download multiple images with a delay between each
 * @param {Array<{url: string, filename: string}>} images 
 * @param {number} delay - ms between downloads
 */
export const downloadMultipleImages = (images, delay = 200) => {
  images.forEach((img, idx) => {
    setTimeout(() => downloadImage(img.url, img.filename), idx * delay);
  });
};

/**
 * Create a download filename with timestamp
 * @param {string} prefix 
 * @param {string} extension 
 * @param {number} [index] 
 * @returns {string}
 */
export const createFilename = (prefix, extension = 'jpg', index = null) => {
  const timestamp = Date.now();
  const indexSuffix = index !== null ? `-${index + 1}` : '';
  return `${prefix}${indexSuffix}-${timestamp}.${extension}`;
};

/**
 * Extract base64 from a data URL
 * @param {string} dataUrl 
 * @returns {string}
 */
export const extractBase64 = (dataUrl) => {
  if (!dataUrl) return '';
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
};

/**
 * Create a data URL from base64
 * @param {string} base64 
 * @param {string} mimeType 
 * @returns {string}
 */
export const createDataUrl = (base64, mimeType = 'image/jpeg') => {
  return `data:${mimeType};base64,${base64}`;
};

/**
 * Check if a data URL already exists in an array of images
 * @param {Array} images - Array with 'preview' property
 * @param {string} dataUrl 
 * @returns {boolean}
 */
export const imageExists = (images, dataUrl) => {
  return images.some(img => img.preview === dataUrl);
};

/**
 * Filter files to only include images
 * @param {FileList|Array} files 
 * @returns {File[]}
 */
export const filterImageFiles = (files) => {
  return Array.from(files).filter(file => file.type.startsWith('image/'));
};

/**
 * Copy image to clipboard (if supported)
 * @param {string} dataUrl 
 * @returns {Promise<boolean>}
 */
export const copyImageToClipboard = async (dataUrl) => {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    return true;
  } catch (e) {
    console.error('Failed to copy image:', e);
    return false;
  }
};

/**
 * Compress and resize an image to reduce payload size
 * @param {string} base64OrDataUrl - Base64 string or data URL
 * @param {number} maxDimension - Maximum width or height (default 1024)
 * @param {number} quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<string>} - Compressed base64 (without data URL prefix)
 */
export const compressImage = (base64OrDataUrl, maxDimension = 1024, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    // Ensure we have a data URL
    const dataUrl = base64OrDataUrl.startsWith('data:') 
      ? base64OrDataUrl 
      : `data:image/jpeg;base64,${base64OrDataUrl}`;
    
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG base64
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Extract just the base64 part
      const base64 = compressedDataUrl.split(',')[1];
      resolve(base64);
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
};
