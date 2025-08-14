import React, { useState, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
}

export function CurrencyInput({ label, error, className = '', value, onChange, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number with commas
  const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    return num.toLocaleString();
  };

  // Remove commas and convert to number
  const parseNumber = (str: string): number => {
    const cleaned = str.replace(/[,$]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Only update display value from prop when not focused and value actually changed
  useEffect(() => {
    if (!isFocused) {
      const formattedValue = formatNumber(value);
      if (formattedValue !== displayValue) {
        setDisplayValue(formattedValue);
      }
    }
  }, [value, isFocused]);

  // Initialize display value on mount
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }
    
    // Remove $ and any non-numeric characters except commas and periods
    const cleanValue = inputValue.replace(/[^0-9,.]/g, '');
    
    // Update display immediately for smooth typing
    setDisplayValue(cleanValue);
    
    // Parse and send numeric value to parent
    const numericValue = parseNumber(cleanValue);
    onChange(numericValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw numbers for editing, but keep "0" visible
    if (value === 0) {
      setDisplayValue('0');
    } else {
      setDisplayValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the display value when losing focus
    setDisplayValue(formatNumber(value));
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-muted text-sm">$</span>
        </div>
        <input
          {...props}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`block w-full pl-7 pr-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${className}`}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}