import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  sublabel?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  sublabel
}) => {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between cursor-pointer select-none group"
    >
      {label && (
        <div className="pr-2">
          <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</div>
          {sublabel && <div className="text-[10px] text-slate-400">{sublabel}</div>}
        </div>
      )}
      <div
        className={`relative w-8 h-[18px] rounded-full border transition-colors shrink-0 ${
          checked
            ? 'bg-indigo-600 border-indigo-400/50 shadow-sm shadow-indigo-600/30'
            : 'bg-[#1a2030] border-[#252e42]'
        }`}
      >
        <div
          className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-transform ${
            checked ? 'translate-x-3.5 bg-white' : 'translate-x-0 bg-slate-400'
          }`}
        />
      </div>
    </div>
  );
};
