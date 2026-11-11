import React from 'react';

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  tooltip?: string;
  highlight?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  label,
  tooltip,
  highlight = false
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label
          className={`block text-[11px] font-medium ${
            highlight ? 'text-indigo-300 font-semibold' : 'text-slate-400'
          }`}
          title={tooltip}
        >
          {label}
        </label>
      )}
      <div
        className={`flex items-center bg-[#121622] border rounded-md px-2 h-7 transition-colors ${
          highlight ? 'border-indigo-500/50 focus-within:border-indigo-400' : 'border-[#1e2638] focus-within:border-indigo-500'
        }`}
      >
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-xs font-mono text-slate-100 outline-none"
        />
        {unit && <span className={`text-[10px] font-mono select-none ${highlight ? 'text-indigo-300' : 'text-slate-500'}`}>{unit}</span>}
      </div>
    </div>
  );
};
