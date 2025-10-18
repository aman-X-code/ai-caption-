import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Subtitle } from '../types';
import { FilmIcon } from './icons';

interface VideoPlayerProps {
  videoUrl: string | null;
  subtitles: Subtitle[] | null;
  isLoading: boolean;
  captionStyle: string;
  captionPosition: number;
}

export interface VideoPlayerRef {
  getVideoElement: () => HTMLVideoElement | null;
}

const getCaptionStyling = (style: string) => {
    switch (style) {
      case 'modern':
        return {
          textClass: 'text-yellow-300 font-bold text-lg md:text-2xl lg:text-3xl',
          textStyle: { textShadow: '2px 2px 5px #000' },
          wrapperClass: 'px-2'
        };
      case 'cinematic':
        return {
          textClass: 'text-white font-serif text-base md:text-xl lg:text-2xl tracking-wider',
          textStyle: { textShadow: '1px 1px 3px rgba(0,0,0,0.9)' },
          wrapperClass: 'px-2'
        };
       case 'karaoke':
        return {
            textClass: 'font-bold text-lg md:text-2xl lg:text-3xl text-gray-400',
            textStyle: { textShadow: '1px 1px 2px rgba(0,0,0,0.7)' },
            wrapperClass: ''
        };
      case 'neon':
        return {
          textClass: 'font-bold text-cyan-300 text-lg md:text-2xl lg:text-3xl',
          textStyle: { textShadow: '0 0 4px #06b6d4, 0 0 8px #06b6d4, 0 0 12px #0891b2' },
          wrapperClass: 'px-2'
        };
      case 'comic':
        return {
          textClass: 'font-bold text-white text-lg md:text-2xl lg:text-3xl',
          textStyle: { 
              fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
              textShadow: '2px 0 #000, -2px 0 #000, 0 2px #000, 0 -2px #000, 1px 1px #000, -1px -1px #000, 1px -1px #000, -1px 1px #000'
          },
          wrapperClass: 'px-2'
        };
      case 'news':
        return {
          textClass: 'text-white font-sans font-bold text-base md:text-xl lg:text-2xl',
          textStyle: {},
          wrapperClass: 'bg-blue-800 bg-opacity-90 w-full py-2'
        };
      case 'classic':
      default:
        return {
          textClass: 'text-white font-semibold text-lg md:text-2xl lg:text-3xl px-4 py-2 rounded',
          textStyle: { textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
          wrapperClass: 'bg-black bg-opacity-60 inline-block'
        };
    }
  };

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ videoUrl, subtitles, isLoading, captionStyle, captionPosition }, ref) => {
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [aspectRatioClass, setAspectRatioClass] = useState('aspect-video'); // Default to 16:9
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setForceUpdate] = useState(0); // Used to force re-render for karaoke style

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
  }));

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      if (!subtitles) {
        setCurrentSubtitle(null);
        return;
      }
      const currentTime = videoElement.currentTime;
      const activeSubtitle = subtitles.find(
        (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
      );
      setCurrentSubtitle(activeSubtitle || null);
      
      if (captionStyle === 'karaoke' && activeSubtitle) {
        // Force a re-render to update word highlighting
        setForceUpdate(c => c + 1);
      }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [subtitles, captionStyle]);
  
  // Reset aspect ratio when video is removed
  useEffect(() => {
    if (!videoUrl) {
      setAspectRatioClass('aspect-video');
    }
  }, [videoUrl]);

  const handleMetadataLoad = () => {
    const video = videoRef.current;
    if (video) {
      const ratio = video.videoWidth / video.videoHeight;
      if (ratio < 1) { // Portrait video (e.g., 9:16)
        setAspectRatioClass('aspect-[9/16]');
      } else { // Landscape video (e.g., 16:9)
        setAspectRatioClass('aspect-[16/9]');
      }
    }
  };


  const { textClass, textStyle, wrapperClass } = getCaptionStyling(captionStyle);
  const isFullWidthStyle = captionStyle === 'news';

  const renderSubtitleContent = () => {
    if (!currentSubtitle) return null;
    const currentTime = videoRef.current?.currentTime ?? 0;

    if (captionStyle === 'karaoke' && currentSubtitle.words) {
      return (
        <p style={textStyle} className={textClass}>
          {currentSubtitle.words.map((word, index) => {
            const isActive = currentTime >= word.startTime && currentTime <= word.endTime;
            return (
              <span key={index} className={`transition-all duration-150 inline-block ${isActive ? 'scale-110 text-yellow-300' : ''}`}>
                {word.text}&nbsp;
              </span>
            );
          })}
        </p>
      );
    }
    
    return (
        <p style={textStyle} className={textClass}>
            {currentSubtitle.text}
        </p>
    );
  };


  return (
    <div className={`w-full max-w-full mx-auto ${aspectRatioClass} bg-black rounded-lg shadow-2xl relative overflow-hidden flex items-center justify-center transition-all duration-300`}>
      {!videoUrl && (
        <div className="text-center text-gray-500">
          <FilmIcon className="w-16 h-16 mx-auto mb-4" />
          <p className="text-xl">Your video will appear here</p>
        </div>
      )}
      
      {videoUrl && (
        <video
          ref={videoRef}
          key={videoUrl}
          controls
          crossOrigin="anonymous" // Required for canvas operations
          className="w-full h-full object-contain"
          onLoadedMetadata={handleMetadataLoad}
        >
          <source src={videoUrl} />
          Your browser does not support the video tag.
        </video>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-lg text-white">AI is syncing your subtitles...</p>
        </div>
      )}

      {videoUrl && currentSubtitle && (
        <div 
            className="absolute left-0 w-full text-center z-20 transition-all duration-200"
            style={{ bottom: `${captionPosition}%` }}
        >
          <div className={isFullWidthStyle ? '' : 'max-w-4xl mx-auto px-4'}>
            <div className={wrapperClass}>
                {renderSubtitleContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
