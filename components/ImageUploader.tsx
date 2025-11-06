
import React, { useState, useRef } from 'react';
import { UploadCloudIcon, XIcon } from './Icons';

interface ImageUploaderProps {
  title: string;
  onImageUpload: (base64: string | null) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, onImageUpload }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImagePreview(reader.result as string);
        onImageUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImagePreview(null);
    onImageUpload(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2 text-slate-300">{title}</h3>
      <div 
        className="relative w-full aspect-square bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-center cursor-pointer hover:border-violet-500 hover:bg-slate-700 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-slate-900/70 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
              aria-label="Remove image"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-slate-400">
            <UploadCloudIcon className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm font-medium">Click to upload</p>
            <p className="text-xs">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
