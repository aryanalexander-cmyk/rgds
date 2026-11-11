import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  icon,
  children,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#1e2638]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`}
        />
      </button>
      {isOpen && (
        <div className="p-4 pt-1 space-y-3 bg-[#0a0d14]/40">
          {children}
        </div>
      )}
    </div>
  );
};
