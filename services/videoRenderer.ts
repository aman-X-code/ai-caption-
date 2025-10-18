import { Subtitle } from '../types';

interface RenderOptions {
  videoElement: HTMLVideoElement;
  subtitles: Subtitle[];
  captionStyle: string;
  captionPosition: number;
  onProgress: (progress: number) => void;
}

const getCaptionStyling = (style: string, canvasHeight: number) => {
    const baseSize = canvasHeight / 28;
    switch (style) {
        case 'modern':
            return {
                font: `bold ${baseSize * 1.2}px sans-serif`,
                fillStyle: '#FBBF24', // yellow-300
                shadowColor: 'black',
                shadowBlur: 7,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
            };
        case 'cinematic':
            return {
                font: `italic ${baseSize}px serif`,
                fillStyle: 'white',
                shadowColor: 'rgba(0,0,0,0.9)',
                shadowBlur: 5,
                shadowOffsetX: 1,
                shadowOffsetY: 1,
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
            };
        case 'karaoke':
             return {
                font: `bold ${baseSize * 1.2}px sans-serif`,
                fillStyle: 'white',
                activeFillStyle: '#FBBF24',
                shadowColor: 'black',
                shadowBlur: 5,
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
            };
        case 'neon':
            return {
                font: `bold ${baseSize * 1.1}px sans-serif`,
                fillStyle: '#67E8F9', // cyan-300
                shadowColor: '#06b6d4',
                shadowBlur: 10,
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
            };
        case 'comic':
            return {
                font: `bold ${baseSize * 1.1}px "Comic Sans MS", cursive`,
                fillStyle: 'white',
                strokeStyle: 'black',
                lineWidth: baseSize / 8,
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
            };
        case 'news':
            return {
                font: `bold ${baseSize}px sans-serif`,
                fillStyle: 'white',
                backgroundColor: 'rgba(30, 64, 175, 0.9)', // blue-800
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
            };
        case 'classic':
        default:
            return {
                font: `bold ${baseSize}px sans-serif`,
                fillStyle: 'white',
                textAlign: 'center' as const,
                textBaseline: 'bottom' as const,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
            };
    }
};

export function renderVideoWithSubtitles(options: RenderOptions): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    const { videoElement, subtitles, captionStyle, captionPosition, onProgress } = options;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return reject(new Error("Could not create canvas context."));
    }
    
    // 1. Set up streams
    const videoStream = canvas.captureStream(30); // 30 FPS
    
    let audioStream: MediaStream | null = null;
    try {
        const audioContext = new AudioContext();
        // @ts-ignore
        const audioSource = audioContext.createMediaElementSource(videoElement);
        const audioDestination = audioContext.createMediaStreamDestination();
        audioSource.connect(audioDestination);
        audioStream = audioDestination.stream;
    } catch (e) {
        console.warn("Could not extract audio track. Video will be silent.", e);
    }
    
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }


    // 2. Set up MediaRecorder
    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm; codecs=vp9', // Use webm as it is widely supported for recording
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = (event) => {
        // @ts-ignore
        reject(new Error(`MediaRecorder error: ${event.error.name}`));
    };
    
    // 3. Rendering loop
    videoElement.pause();
    videoElement.currentTime = 0;
    
    await new Promise(r => setTimeout(r, 100)); // Short delay to ensure video is ready
    
    mediaRecorder.start();

    const duration = videoElement.duration;
    let frameRequestHandle: number;

    const renderFrame = async () => {
        if (videoElement.paused || videoElement.ended) {
            mediaRecorder.stop();
            onProgress(100);
            return;
        }

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const activeSubtitle = subtitles.find(
          (sub) => videoElement.currentTime >= sub.startTime && videoElement.currentTime <= sub.endTime
        );

        if (activeSubtitle) {
            const styles = getCaptionStyling(captionStyle, canvas.height);
            ctx.font = styles.font;
            ctx.textAlign = styles.textAlign;
            ctx.textBaseline = styles.textBaseline;
            ctx.fillStyle = styles.fillStyle;

            if (styles.shadowColor) ctx.shadowColor = styles.shadowColor;
            if (styles.shadowBlur) ctx.shadowBlur = styles.shadowBlur;
            if (styles.shadowOffsetX) ctx.shadowOffsetX = styles.shadowOffsetX;
            if (styles.shadowOffsetY) ctx.shadowOffsetY = styles.shadowOffsetY;
            
            const x = canvas.width / 2;
            const y = canvas.height * (1 - captionPosition / 100);

            if (styles.backgroundColor) {
                const textMetrics = ctx.measureText(activeSubtitle.text);
                const textHeight = parseFloat(styles.font);
                const padding = canvas.height * 0.015;

                ctx.fillStyle = styles.backgroundColor;
                if (captionStyle === 'news') {
                    ctx.fillRect(0, y - textHeight - padding, canvas.width, textHeight + padding * 2);
                } else { // 'classic'
                     ctx.fillRect(
                         x - textMetrics.width / 2 - padding, 
                         y - textHeight - (padding / 2),
                         textMetrics.width + padding * 2,
                         textHeight + padding
                    );
                }
                ctx.fillStyle = styles.fillStyle; // Reset for text
            }

            if (captionStyle === 'comic' && styles.strokeStyle && styles.lineWidth) {
                ctx.strokeStyle = styles.strokeStyle;
                ctx.lineWidth = styles.lineWidth;
                ctx.strokeText(activeSubtitle.text, x, y);
            }
            
            ctx.fillText(activeSubtitle.text, x, y);

            ctx.shadowColor = 'transparent'; // Reset shadows for next frame
        }
        
        onProgress((videoElement.currentTime / duration) * 100);
        frameRequestHandle = requestAnimationFrame(renderFrame);
    };

    videoElement.play();
    renderFrame();

    videoElement.onended = () => {
        cancelAnimationFrame(frameRequestHandle);
        setTimeout(() => mediaRecorder.stop(), 500); // Give it a moment to process the last frame
    };
  });
}
