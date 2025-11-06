
import React, { useState } from 'react';

interface ImageComparatorProps {
  beforeImage: string;
  afterImage: string;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg shadow-2xl group">
      <img
        src={beforeImage}
        alt="Before"
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <div
        className="absolute top-0 left-0 w-full h-full object-cover overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={afterImage}
          alt="After"
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      </div>
      <div
        className="absolute top-0 bottom-0 bg-white w-1 cursor-ew-resize opacity-50 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -left-4 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) => setSliderPosition(Number(e.target.value))}
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize"
        aria-label="Image comparison slider"
      />
    </div>
  );
};

export default ImageComparator;
