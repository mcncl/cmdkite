import React, { useState, useEffect, useRef, useCallback } from "react";

interface DebouncedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  // The current value of the input
  value: string;

  // Alternative onChange handler that receives just the value string
  onChangeValue?: (value: string) => void;

  // Function called when the value changes (after debounce)
  onChange: (value: string) => void;

  // Debounce delay in milliseconds
  debounceTime?: number;

  // Optional callback for immediate changes (before debounce)
  onChangeImmediate?: (value: string) => void;

  // Input class name
  className?: string;

  // Placeholder text
  placeholder?: string;

  // Ref for the input element
  inputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * An input component with built-in debouncing to improve search performance.
 * This prevents expensive search operations from running on every keystroke.
 */
export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceTime = 250,
  onChangeImmediate,
  className = "",
  placeholder = "",
  inputRef: externalInputRef,
  ...props
}) => {
  // Internal state for immediate updates
  const [inputValue, setInputValue] = useState(value);

  // Internal ref if no external ref is provided
  const internalInputRef = useRef<HTMLInputElement>(null);

  // Use the external ref if provided, otherwise use the internal ref
  const inputRef = externalInputRef || internalInputRef;

  // Reset internal value when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Set up debounced onChange
  useEffect(() => {
    // Don't debounce if the value hasn't changed
    if (inputValue === value) return;

    // Create a timer to call onChange after debounceTime
    const timerId = setTimeout(() => {
      onChange(inputValue);
    }, debounceTime);

    // Cleanup function to cancel the timer if the component unmounts
    // or if inputValue changes before the timer fires
    return () => {
      clearTimeout(timerId);
    };
  }, [inputValue, onChange, debounceTime, value]);

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Call the immediate handler if provided
      if (onChangeImmediate) {
        onChangeImmediate(newValue);
      }
    },
    [onChangeImmediate],
  );

  // Focus the input element
  const focus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  // Expose focus method
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus = focus;
    }
  }, [inputRef, focus]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
};
