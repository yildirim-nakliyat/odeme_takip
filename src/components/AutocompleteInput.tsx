import { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  required = false,
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    setHighlightedIndex(-1);
    if (val.length > 0) {
      const matches = suggestions.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      );
      setFiltered(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setFiltered(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }
  };

  const handleFocus = () => {
    if (value.length > 0) {
      const matches = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFiltered(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setFiltered(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }
  };

  const handleSelect = (item: string) => {
    onChange(item);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition ${className}`}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className={`autocomplete-item ${idx === highlightedIndex ? 'bg-orange-50 text-orange-700' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
