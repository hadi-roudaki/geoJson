import React, { useRef, useState } from 'react';
import { FileUploadProps, GeoJSONFeatureCollection } from '../../types';
import { parseGeoJSONFile, cn } from '../../utils';

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.geojson')) {
      onError('Please select a .geojson file');
      return;
    }

    setIsLoading(true);
    setUploadedFile(file);

    try {
      const geoJsonData = await parseGeoJSONFile(file);
      onFileUpload(geoJsonData);
    } catch (error) {
      onError(error as string);
      setUploadedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {!uploadedFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
            isDragOver
              ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md',
            isLoading && 'pointer-events-none opacity-50'
          )}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 text-gray-400">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            
            {isLoading ? (
              <div className="text-blue-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Processing GeoJSON file...</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop your GeoJSON file here
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Accepts .geojson files only
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 text-green-600">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">{uploadedFile.name}</p>
                <p className="text-sm text-green-700">
                  {(uploadedFile.size / 1024).toFixed(1)} KB • GeoJSON file uploaded successfully
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Remove file"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
