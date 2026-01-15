/**
 * Sound utilities for Nana Banana Pro
 * Uses Web Audio API for pleasant chime sounds
 */

/**
 * Play a pleasant two-tone chime sound
 * @param {string} volume - 'off', 'low', or 'normal'
 */
export const playChime = (volume = 'normal') => {
  if (volume === 'off') return;

  const volumeLevel = volume === 'low' ? 0.1 : 0.3;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Helper to play a single tone
    const playTone = (frequency, startTime, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Envelope for pleasant sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volumeLevel, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    playTone(880, now, 0.15);        // A5
    playTone(1108.73, now + 0.1, 0.2); // C#6
    playTone(1318.51, now + 0.2, 0.3); // E6

    // Clean up after sounds finish
    setTimeout(() => audioContext.close(), 1000);
  } catch (e) {
    console.log('Audio not supported:', e);
  }
};

/**
 * Get the next volume level in the cycle
 * @param {string} currentVolume 
 * @returns {string}
 */
export const getNextVolume = (currentVolume) => {
  const levels = ['off', 'low', 'normal'];
  const currentIndex = levels.indexOf(currentVolume);
  const nextIndex = (currentIndex + 1) % levels.length;
  return levels[nextIndex];
};

/**
 * Get display text for volume level
 * @param {string} volume 
 * @returns {string}
 */
export const getVolumeTitle = (volume) => {
  switch (volume) {
    case 'normal':
      return 'Volume: Normal (click for Off)';
    case 'low':
      return 'Volume: Low (click for Normal)';
    default:
      return 'Volume: Off (click for Low)';
  }
};
