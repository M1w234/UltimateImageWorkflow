/**
 * Image utilities for Nana Banana Pro
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
