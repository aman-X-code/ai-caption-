import React, { useState, useCallback, useRef } from 'react';
import { Subtitle } from './types';
import { generateSubtitles } from './services/geminiService';
import { renderVideoWithSubtitles } from './services/videoRenderer';
import FileUpload from './components/FileUpload';
import VideoPlayer, { VideoPlayerRef } from './components/VideoPlayer';
import { FilmIcon, DocumentTextIcon, SparklesIcon, ExclamationTriangleIcon, PaintBrushIcon, ChevronUpDownIcon, ArrowDownTrayIcon, PencilSquareIcon, VideoCameraIcon, ChevronRightIcon } from './components/icons';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captionText, setCaptionText] = useState<string>('');
  const [subtitles, setSubtitles] = useState<Subtitle[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // States for editing
  const [captionStyle, setCaptionStyle] = useState<string>('classic');
  const [captionPosition, setCaptionPosition] = useState<number>(10); // % from bottom
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);


  // States for rendering video
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);

  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  const handleVideoUpload = (file: File) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setSubtitles(null);
    setError(null);
    setIsEditing(false);
  };

  const handleCaptionUpload = (text: string) => {
    setCaptionText(text);
    setError(null);
  };

  const handleSync = useCallback(async () => {
    if (!captionText) {
      setError('Please provide caption text.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSubtitles(null);
    setIsEditing(false);

    try {
      const generatedSubs = await generateSubtitles(captionText);
      setSubtitles(generatedSubs);
    } catch (err) {
      console.error(err);
      setError('Failed to generate subtitles. The AI model might be unavailable or the request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [captionText]);

  const handleSubtitleChange = (index: number, field: 'startTime' | 'endTime', value: number) => {
    if (!subtitles) return;
    const newSubtitles = [...subtitles];
    if (field === 'startTime' && value >= newSubtitles[index].endTime) {
        value = newSubtitles[index].endTime - 0.1;
    }
    if (field === 'endTime' && value <= newSubtitles[index].startTime) {
        value = newSubtitles[index].startTime + 0.1;
    }
    newSubtitles[index] = { ...newSubtitles[index], [field]: Math.max(0, value) };
    setSubtitles(newSubtitles);
  };

  const handleWordSubtitleChange = (lineIndex: number, wordIndex: number, field: 'startTime' | 'endTime', value: number) => {
    if (!subtitles) return;
    const newSubtitles = JSON.parse(JSON.stringify(subtitles)); // Deep copy
    const line = newSubtitles[lineIndex];
    if (!line.words) return;
    
    const word = line.words[wordIndex];
    let sanitizedValue = parseFloat(value.toFixed(3));

    if (field === 'startTime' && sanitizedValue >= word.endTime) sanitizedValue = word.endTime - 0.01;
    if (field === 'endTime' && sanitizedValue <= word.startTime) sanitizedValue = word.startTime + 0.01;
    
    sanitizedValue = Math.max(line.startTime, sanitizedValue);
    sanitizedValue = Math.min(line.endTime, sanitizedValue);
    
    word[field] = sanitizedValue;

    setSubtitles(newSubtitles);
  };


  const canSync = videoFile && captionText && !isLoading;
  const captionStyles = ['classic', 'modern', 'cinematic', 'karaoke', 'neon', 'comic', 'news'];
  
  const formatSrtTime = (seconds: number): string => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const time = date.toISOString().substr(11, 12);
    return time.replace('.', ',');
  };

  const handleDownloadSrt = () => {
    if (!subtitles) return;
    const srtContent = subtitles
      .map((sub, index) => {
        const start = formatSrtTime(sub.startTime);
        const end = formatSrtTime(sub.endTime);
        return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
      })
      .join('\n');
    
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = async () => {
    const videoElement = videoPlayerRef.current?.getVideoElement();
    if (!videoElement || !subtitles || !videoFile) {
        setError("Cannot render video. Missing video element or subtitles.");
        return;
    }
    
    setIsRendering(true);
    setRenderProgress(0);
    setError(null);

    try {
        const blob = await renderVideoWithSubtitles({
            videoElement,
            subtitles,
            captionStyle,
            captionPosition,
            onProgress: setRenderProgress
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `captioned-${videoFile.name}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error("Video rendering failed:", err);
        setError(`Video rendering failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsRendering(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      {isRendering && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
              <div className="w-4/5 max-w-md text-center">
                <h2 className="text-3xl font-bold text-indigo-400 mb-4">Rendering Your Video...</h2>
                <p className="text-gray-300 mb-6">This process happens in your browser and may take a while. Please keep this tab open.</p>
                <div className="w-full bg-gray-700 rounded-full h-4">
                    <div 
                        className="bg-indigo-600 h-4 rounded-full transition-all duration-500" 
                        style={{ width: `${renderProgress}%` }}
                    ></div>
                </div>
                <p className="mt-4 text-xl font-semibold text-white">{Math.round(renderProgress)}% Complete</p>
              </div>
          </div>
      )}
      <header className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          AI Video Caption Syncer
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Upload a video and its script to automatically generate and customize subtitles.
        </p>
      </header>

      <main className="w-full max-w-5xl flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            id="video-upload"
            label="1. Upload Video"
            onFileUpload={handleVideoUpload}
            accept="video/mp4,video/webm"
            Icon={FilmIcon}
          />
          <FileUpload
            id="caption-upload"
            label="2. Upload or Paste Captions"
            onTextUpload={handleCaptionUpload}
            accept=".txt,.vtt,.srt"
            Icon={DocumentTextIcon}
            isText
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSync}
            disabled={!canSync}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
          >
            <SparklesIcon className="w-6 h-6" />
            {isLoading ? 'Syncing...' : 'Generate Subtitles'}
          </button>
        </div>

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5"/>
              <span className="block sm:inline">{error}</span>
            </div>
        )}

        {subtitles && !isLoading && (
          <>
            <div className="w-full max-w-5xl p-6 bg-gray-800/70 rounded-lg shadow-lg">
                <div className='flex items-center justify-between text-lg font-semibold text-indigo-300 mb-6'>
                    <div className="flex items-center gap-3">
                        <PaintBrushIcon className="w-6 h-6"/>
                        <h2>Customize Subtitles</h2>
                    </div>
                     <div className='flex items-center gap-3'>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-all duration-300 ${isEditing ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-300 hover:bg-gray-600'}`}
                        >
                            <PencilSquareIcon className="w-5 h-5" />
                            {isEditing ? 'Close Editor' : 'Edit Timings'}
                        </button>
                         <button
                            onClick={handleDownloadSrt}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-indigo-300 text-sm font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-all duration-300"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Download .srt
                        </button>
                     </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Position Control */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="position-control" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                        <ChevronUpDownIcon className="w-5 h-5"/> Vertical Position
                    </label>
                    <span className="font-bold text-white text-center">{captionPosition}% <span className="text-gray-400 font-normal">from bottom</span></span>
                    <input
                        id="position-control"
                        type="range"
                        min="5"
                        max="95"
                        step="1"
                        value={captionPosition}
                        onChange={(e) => setCaptionPosition(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Style Control */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <PaintBrushIcon className="w-5 h-5"/> Caption Style
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        {captionStyles.map(style => (
                            <button
                                key={style}
                                onClick={() => setCaptionStyle(style)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex-1 ${captionStyle === style ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                            >
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                </div>
            </div>
            
            {isEditing && (
                 <div className="w-full max-w-5xl p-6 bg-gray-800/70 rounded-lg shadow-lg">
                     <h2 className="text-lg font-semibold text-indigo-300 mb-4 flex items-center gap-3">
                        <PencilSquareIcon className="w-6 h-6"/> Timing Editor
                     </h2>
                     <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-2">
                        <div className="grid grid-cols-[1fr_100px_100px] gap-x-2 items-center text-sm sticky top-0 bg-gray-800/70 py-2 z-10">
                            <div className="font-bold text-gray-400 pl-8">Text (Click to expand words)</div>
                            <div className="font-bold text-gray-400 text-center">Start (s)</div>
                            <div className="font-bold text-gray-400 text-center">End (s)</div>
                        </div>
                        {subtitles.map((sub, index) => (
                            <React.Fragment key={index}>
                                <div className="grid grid-cols-[1fr_100px_100px] gap-x-2 items-center text-sm">
                                    <div 
                                        className="text-gray-200 bg-gray-900 p-2 rounded-l-md flex items-center gap-2 cursor-pointer"
                                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                    >
                                        <ChevronRightIcon className={`w-4 h-4 transition-transform duration-200 ${expandedIndex === index ? 'rotate-90' : ''}`} />
                                        <span>{sub.text}</span>
                                    </div>
                                    <input
                                        type="number" step="0.1" value={sub.startTime.toFixed(2)}
                                        onChange={(e) => handleSubtitleChange(index, 'startTime', parseFloat(e.target.value))}
                                        className="w-full bg-gray-700 text-white text-center p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <input
                                        type="number" step="0.1" value={sub.endTime.toFixed(2)}
                                        onChange={(e) => handleSubtitleChange(index, 'endTime', parseFloat(e.target.value))}
                                        className="w-full bg-gray-700 text-white text-center p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                {expandedIndex === index && sub.words && (
                                    <div className="bg-gray-900/70 p-3 my-1 rounded-b-lg border-t border-gray-700">
                                        <div className="grid grid-cols-[1fr_100px_100px] gap-x-2 gap-y-2 items-center text-xs">
                                            <div className="font-bold text-gray-500 pl-4">Word</div>
                                            <div className="font-bold text-gray-500 text-center">Start (s)</div>
                                            <div className="font-bold text-gray-500 text-center">End (s)</div>
                                            {sub.words.map((word, wordIndex) => (
                                                <React.Fragment key={wordIndex}>
                                                    <div className="text-gray-300 pl-4">{word.text}</div>
                                                    <input
                                                        type="number" step="0.01" value={word.startTime.toFixed(2)}
                                                        onChange={(e) => handleWordSubtitleChange(index, wordIndex, 'startTime', parseFloat(e.target.value))}
                                                        className="w-full bg-gray-600 text-white text-center rounded p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                    <input
                                                        type="number" step="0.01" value={word.endTime.toFixed(2)}
                                                        onChange={(e) => handleWordSubtitleChange(index, wordIndex, 'endTime', parseFloat(e.target.value))}
                                                        className="w-full bg-gray-600 text-white text-center rounded p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                     </div>
                 </div>
            )}
            
            <div className="w-full max-w-5xl p-6 bg-gray-800/70 rounded-lg shadow-lg flex justify-center">
                 <button
                    onClick={handleDownloadVideo}
                    disabled={isRendering}
                    className="flex items-center gap-3 px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                >
                    <VideoCameraIcon className="w-6 h-6" />
                    {isRendering ? 'Rendering...' : 'Download Video with Subtitles'}
                </button>
            </div>
          </>
        )}

        <div className="w-full max-w-4xl mx-auto">
            <VideoPlayer ref={videoPlayerRef} videoUrl={videoUrl} subtitles={subtitles} captionStyle={captionStyle} captionPosition={captionPosition} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
};

export default App;
