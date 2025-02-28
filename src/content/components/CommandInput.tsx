import React, { RefObject } from "react";

interface CommandInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement>;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Reusable input component for command entry
 */
export const CommandInput: React.FC<CommandInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Search commands and pipelines...",
  inputRef,
  className = "cmd-k-input",
  autoFocus = true,
}) => {
  return (
    <input
      ref={inputRef}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      aria-label={placeholder}
      role="searchbox"
    />
  );
};
