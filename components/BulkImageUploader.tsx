import React, { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { UploadCloudIcon, XIcon, ImagesIcon } from './Icons';

interface BulkImageUploaderProps {
  onImagesUpload: (base64: string[]) => void;
}

const BulkImageUploader: React.FC<BulkImageUploaderProps> = ({ onImagesUpload }) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setProcessingMessage('Processing files...');
    const newPreviews: string[] = [];
    
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await fileToDataUrl(file);
        newPreviews.push(dataUrl);
      } else if (file.type === 'application/zip') {
        try {
          setProcessingMessage(`Extracting images from ${file.name}...`);
          const zip = await JSZip.loadAsync(file);
          const imagePromises: Promise<string>[] = [];
          zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir && /\.(jpe?g|png|webp)$/i.test(zipEntry.name)) {
                imagePromises.push(
                    zipEntry.async('base64').then(content => `data:image/png;base64,${content}`)
                );
            }
          });
          const imagesFromZip = await Promise.all(imagePromises);
          newPreviews.push(...imagesFromZip);
        } catch (e) {
            console.error("Error processing zip file", e);
            setProcessingMessage(`Error reading zip file: ${file.name}`);
        }
      }
    }

    setImagePreviews(newPreviews);
    const base64Images = newPreviews.map(dataUrl => dataUrl.split(',')[1]);
    onImagesUpload(base64Images);
    setProcessingMessage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, [onImagesUpload]);

  const handleRemoveAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImagePreviews([]);
    onImagesUpload([]);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-300">Upload Your Images</h3>
        {imagePreviews.length > 0 && (
            <button onClick={handleRemoveAll} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors">
                <XIcon className="w-4 h-4" />
                Clear All
            </button>
        )}
      </div>
      {imagePreviews.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto bg-slate-700/50 p-2 rounded-lg border border-slate-600">
            {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt={`preview ${index}`} className="w-full h-full object-cover rounded aspect-square" />
            ))}
        </div>
      ) : (
        <div 
          className="relative w-full min-h-[150px] bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-center cursor-pointer hover:border-violet-500 hover:bg-slate-700 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, application/zip"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            multiple
          />
          <div className="text-slate-400">
            {processingMessage ? (
                <>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-400 mx-auto mb-2"></div>
                    <p className="text-sm font-medium">{processingMessage}</p>
                </>
            ) : (
                <>
                    <UploadCloudIcon className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs">Images (PNG, JPG) or a ZIP file</p>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImageUploader;