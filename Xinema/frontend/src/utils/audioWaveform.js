// Audio Waveform Generator
// Generates a waveform visualization from an audio file's first few seconds

/**
 * Generate a waveform visualization from an audio file
 * @param {File} audioFile - The audio file to analyze
 * @param {number} duration - Duration in seconds to analyze (default: 3 seconds)
 * @param {number} width - Canvas width (default: 1080)
 * @param {number} height - Canvas height (default: 720)
 * @returns {Promise<string>} - Data URL of the waveform image
 */
export async function generateAudioWaveform(
  audioFile,
  duration = 3,
  width = 1080,
  height = 720
) {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async e => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(
            e.target.result
          );

          // Create canvas for waveform
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Get audio data
          const sampleRate = audioBuffer.sampleRate;
          const channels = audioBuffer.numberOfChannels;
          const channelData = audioBuffer.getChannelData(0); // Use first channel

          // Calculate samples to analyze (first 'duration' seconds)
          const samplesToAnalyze = Math.min(
            Math.floor(duration * sampleRate),
            channelData.length
          );
          const samples = channelData.slice(0, samplesToAnalyze);

          // Number of bars to draw
          const numBars = 200; // Good balance between detail and performance
          const barWidth = width / numBars;
          const samplesPerBar = Math.floor(samples.length / numBars);

          // Background gradient (dark blue/purple)
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, '#0a0e27');
          gradient.addColorStop(1, '#1a1a2e');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          // Draw waveform bars
          ctx.fillStyle = '#4a9eff'; // Bright blue
          const centerY = height / 2;

          for (let i = 0; i < numBars; i++) {
            const start = i * samplesPerBar;
            const end = Math.min(start + samplesPerBar, samples.length);

            // Calculate RMS (Root Mean Square) for this segment
            let sum = 0;
            for (let j = start; j < end; j++) {
              sum += samples[j] * samples[j];
            }
            const rms = Math.sqrt(sum / (end - start));

            // Convert to bar height (normalize and scale)
            const barHeight = Math.max(2, rms * height * 0.8); // Min 2px, max 80% of height

            // Draw bar (centered)
            const x = i * barWidth;
            const y = centerY - barHeight / 2;
            ctx.fillRect(x, y, barWidth - 2, barHeight);

            // Add mirror effect (reflection)
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x, centerY + barHeight / 2, barWidth - 2, barHeight);
            ctx.globalAlpha = 1.0;
          }

          // Add subtle grid lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
          ctx.stroke();

          // Convert to data URL
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);

          // Cleanup
          audioContext.close();
        } catch (error) {
          audioContext.close();
          reject(error);
        }
      };

      fileReader.onerror = () => {
        reject(new Error('Failed to read audio file'));
      };

      fileReader.readAsArrayBuffer(audioFile);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a full waveform visualization for the entire audio file
 * @param {File} audioFile - The audio file to analyze
 * @param {number} width - Canvas width (will scale to fit timeline clip width)
 * @param {number} height - Canvas height (default: 48px for timeline track height)
 * @returns {Promise<string>} - Data URL of the waveform image
 */
export async function generateFullAudioWaveform(
  audioFile,
  width = 1000,
  height = 48
) {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async e => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(
            e.target.result
          );

          // Use a high resolution for better quality (minimum 2000px width for long audio)
          // This ensures the waveform looks good even when scaled
          const renderWidth = Math.max(width, 2000);

          // Create canvas for waveform
          const canvas = document.createElement('canvas');
          canvas.width = renderWidth;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Get audio data
          const sampleRate = audioBuffer.sampleRate;
          const channelData = audioBuffer.getChannelData(0); // Use first channel
          const totalSamples = channelData.length;

          // Number of bars to draw (one per pixel for detailed waveform)
          const numBars = renderWidth;
          const samplesPerBar = Math.floor(totalSamples / numBars);

          // First pass: calculate RMS values for all segments to find max for normalization
          const rmsValues = [];
          let maxRms = 0;
          for (let i = 0; i < numBars; i++) {
            const start = i * samplesPerBar;
            const end = Math.min(start + samplesPerBar, totalSamples);

            // Calculate RMS (Root Mean Square) for this segment
            let sum = 0;
            let count = 0;
            for (let j = start; j < end; j++) {
              sum += channelData[j] * channelData[j];
              count++;
            }
            const rms = count > 0 ? Math.sqrt(sum / count) : 0;
            rmsValues.push(rms);
            maxRms = Math.max(maxRms, rms);
          }

          // Background (transparent or subtle)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fillRect(0, 0, renderWidth, height);

          // Draw waveform bars
          ctx.fillStyle = '#4a90e2'; // Blue color matching audio clips
          const centerY = height / 2;

          for (let i = 0; i < numBars; i++) {
            // Normalize RMS to 0-1 range based on max RMS found
            const normalizedRms = maxRms > 0 ? rmsValues[i] / maxRms : 0;

            // Convert to bar height - stretch to fill full height based on normalized amplitude
            // Use a minimum height of 2px for visibility, and scale to full height
            const barHeight = Math.max(2, normalizedRms * height);

            // Draw bar (centered vertically, stretching from center to edges)
            const x = i;
            const y = centerY - barHeight / 2;
            ctx.fillRect(x, y, 1, barHeight);
          }

          // Convert to data URL
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);

          // Cleanup
          audioContext.close();
        } catch (error) {
          audioContext.close();
          reject(error);
        }
      };

      fileReader.onerror = () => {
        reject(new Error('Failed to read audio file'));
      };

      fileReader.readAsArrayBuffer(audioFile);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a waveform thumbnail component
 * @param {string} waveformDataUrl - Data URL of the waveform image
 * @param {number} width - Display width
 * @param {number} height - Display height
 * @returns {JSX.Element} - Waveform image element
 */
export function WaveformThumbnail({
  waveformDataUrl,
  width,
  height,
  style = {},
}) {
  return (
    <img
      src={waveformDataUrl}
      alt="Audio waveform"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style,
      }}
    />
  );
}
