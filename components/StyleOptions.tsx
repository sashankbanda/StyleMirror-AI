
import React, { useCallback } from 'react';
import { StyleOption } from '../types';
import { STYLE_OPTIONS } from '../constants';

interface StyleOptionsProps {
  selectedOptions: StyleOption[];
  onChange: (options: StyleOption[]) => void;
}

const StyleOptionsComponent: React.FC<StyleOptionsProps> = ({ selectedOptions, onChange }) => {
  const handleCheckboxChange = useCallback((option: StyleOption) => {
    let newOptions: StyleOption[];
    const isChecked = selectedOptions.includes(option);

    if (option === StyleOption.COMPLETE_RECREATION) {
      newOptions = isChecked ? [] : [StyleOption.COMPLETE_RECREATION];
    } else {
      if (isChecked) {
        newOptions = selectedOptions.filter(o => o !== option);
      } else {
        newOptions = [...selectedOptions.filter(o => o !== StyleOption.COMPLETE_RECREATION), option];
      }
    }
    onChange(newOptions);
  }, [selectedOptions, onChange]);

  const isCompleteRecreationSelected = selectedOptions.includes(StyleOption.COMPLETE_RECREATION);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-slate-300">Styling Options</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = selectedOptions.includes(option);
          const isDisabled = isCompleteRecreationSelected && option !== StyleOption.COMPLETE_RECREATION;
          return (
            <label
              key={option}
              className={`flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300'
              } ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-violet-500'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => handleCheckboxChange(option)}
                className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-violet-500 focus:ring-violet-500"
              />
              <span className="text-sm font-medium">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default StyleOptionsComponent;
