
import React, { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  id: string;
  label: string;
  onFileUpload?: (file: File) => void;
  onTextUpload?: (text: string) => void;
  accept: string;
  Icon: React.ElementType;
  isText?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ id, label, onFileUpload, onTextUpload, accept, Icon, isText = false }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      if (isText && onTextUpload) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onTextUpload(e.target?.result as string);
        };
        reader.readAsText(file);
      } else if (onFileUpload) {
        onFileUpload(file);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onTextUpload) {
          onTextUpload(e.target.value);
          setFileName(e.target.value ? "Pasted Text" : null);
      }
  };


  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <Icon className="w-6 h-6 text-indigo-400" />
        {label}
      </h2>
      {isText ? (
         <div className="flex flex-col gap-2">
            <textarea
                rows={6}
                placeholder="Paste your video's script or transcript here..."
                onChange={handleTextChange}
                className="w-full p-3 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <p className="text-xs text-gray-500 text-center -mt-1 mb-1">
              Note: The API key is handled automatically. Please do not paste it here.
            </p>
            <div className="text-center text-gray-500 text-sm">or</div>
         </div>
      ) : null}
      <label
        htmlFor={id}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-32 px-4 transition bg-gray-800 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 ${isDragging ? 'border-indigo-500' : ''}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            {fileName ? (
                <>
                    <p className="font-semibold text-indigo-300">{fileName}</p>
                    <p className="text-xs text-gray-400 mt-1">Click or drag to replace</p>
                </>
            ) : (
                <>
                    <svg className="w-8 h-8 mb-3 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">{isText ? 'TXT, SRT, VTT file' : 'Video file'}</p>
                </>
            )}
        </div>
        <input ref={fileInputRef} id={id} type="file" className="hidden" accept={accept} onChange={(e) => handleFileChange(e.target.files)} />
      </label>
    </div>
  );
};

export default FileUpload;
