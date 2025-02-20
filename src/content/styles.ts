export const styles = `
  .cmd-k-input.cmd-k-command-input {
    background: white !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-input.cmd-k-command-input {
      background: #252525 !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
    }
  }/* Container wrapper - completely invisible when not active */
  .cmd-k-wrapper {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 999998 !important;
    pointer-events: none !important; /* Default to not capturing clicks */
    background-color: rgba(0, 0, 0, 0) !important; /* Start fully transparent */
    transition: background-color 0.15s ease-in, visibility 0s 0.15s !important;
    visibility: hidden !important; /* Hide completely when not visible */
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
    backdrop-filter: blur(0px) !important;
  }

  /* When visible, enable pointer events and show backdrop */
  .cmd-k-wrapper.visible {
    visibility: visible !important;
    pointer-events: auto !important;
    background-color: rgba(0, 0, 0, 0.4) !important;
    transition: background-color 0.15s ease-out, visibility 0s 0s !important;
    backdrop-filter: blur(2px) !important;
  }

  .cmd-k-box {
    position: relative !important;
    width: 600px !important;
    max-width: 90vw !important;
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25) !important;
    padding: 16px !important;
    z-index: 9999999 !important;
    display: flex !important;
    flex-direction: column !important;
    pointer-events: auto !important; /* Always capture clicks when rendered */
    transform: translateY(-20px) !important;
    opacity: 0 !important;
    transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.15s ease-in !important;
    margin-top: 10vh !important;
  }

  /* Responsive positioning */
  @media (max-width: 768px) {
    .cmd-k-box {
      width: 90vw !important;
      margin-top: 5vh !important;
      padding: 12px !important;
    }
  }

  @media (max-height: 700px) {
    .cmd-k-box {
      margin-top: 5vh !important;
    }
  }

  /* For mobile devices in landscape */
  @media (max-height: 500px) {
    .cmd-k-box {
      margin-top: 2vh !important;
    }
  }

  .cmd-k-wrapper.visible .cmd-k-box {
    transform: translateY(0) !important;
    opacity: 1 !important;
    transition: transform 0.25s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.2s ease-out !important;
  }

  .cmd-k-input {
    width: 100% !important;
    padding: 12px 16px !important;
    border: 1px solid #e1e1e1 !important;
    border-radius: 8px !important;
    font-size: 16px !important;
    outline: none !important;
    margin-bottom: 12px !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    background: #f9f9f9 !important;
  }

  /* Responsive input styling */
  @media (max-width: 480px) {
    .cmd-k-input {
      padding: 10px 12px !important;
      font-size: 15px !important;
    }
  }

  .cmd-k-input:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
    background: white !important;
  }

  .cmd-k-results {
    max-height: 400px !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    position: relative !important;
    border-radius: 8px !important;
  }

  /* Responsive results height */
  @media (max-height: 700px) {
    .cmd-k-results {
      max-height: 300px !important;
    }
  }

  @media (max-height: 500px) {
    .cmd-k-results {
      max-height: 200px !important;
    }
  }

  /* Styled scrollbar */
  .cmd-k-results::-webkit-scrollbar {
    width: 8px !important;
  }

  .cmd-k-results::-webkit-scrollbar-track {
    background: transparent !important;
  }

  .cmd-k-results::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1) !important;
    border-radius: 4px !important;
  }

  .cmd-k-results::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2) !important;
  }

  .cmd-k-result {
    padding: 10px 14px !important;
    cursor: pointer !important;
    border-radius: 8px !important;
    transition: background 0.15s ease !important;
    margin: 2px 0 !important;
  }

  .cmd-k-result:hover {
    background: #f5f9ff !important;
  }

  .cmd-k-result.selected {
    background: #ebf5ff !important;
    position: relative !important;
  }

  .cmd-k-result.selected::before {
    content: "" !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    height: 100% !important;
    width: 3px !important;
    background: #2563eb !important;
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
  }

  .cmd-k-result-name {
    font-weight: 500 !important;
    margin-bottom: 4px !important;
  }

  .cmd-k-result-description {
    font-size: 14px !important;
    color: #666 !important;
    margin-bottom: 8px !important;
  }

  .cmd-k-section-title {
    font-size: 11px !important;
    font-weight: 600 !important;
    color: #666 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    padding: 8px 14px 4px !important;
    border-bottom: 1px solid #f0f0f0 !important;
  }

  /* Command items */
  .cmd-k-command {
    padding: 10px 14px !important;
    cursor: pointer !important;
    border-radius: 8px !important;
    transition: background 0.15s ease !important;
    margin: 2px 0 !important;
    position: relative !important;
  }

  .cmd-k-command:hover {
    background: #f5f9ff !important;
  }

  .cmd-k-command.selected {
    background: #ebf5ff !important;
  }

  .cmd-k-command.selected::before {
    content: "" !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    height: 100% !important;
    width: 3px !important;
    background: #2563eb !important;
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
  }

  .cmd-k-command-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-bottom: 4px !important;
  }

  .cmd-k-command-name {
    font-weight: 500 !important;
    font-size: 14px !important;
  }

  .cmd-k-command-id {
    font-size: 12px !important;
    color: #666 !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    background: #f0f0f0 !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
  }

  @media (max-width: 480px) {
    .cmd-k-command-id {
      font-size: 10px !important;
      padding: 1px 4px !important;
    }
  }

  .cmd-k-command-description {
    font-size: 13px !important;
    color: #666 !important;
  }

  @media (max-width: 480px) {
    .cmd-k-command-description {
      font-size: 12px !important;
    }
  }

  /* Command mode header bar */
  .cmd-k-command-header-bar {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-bottom: 12px !important;
    padding-bottom: 8px !important;
    border-bottom: 1px solid #eaeaea !important;
  }

  .cmd-k-command-title {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }

  .cmd-k-back-button {
    background: none !important;
    border: none !important;
    color: #2563eb !important;
    cursor: pointer !important;
    font-size: 14px !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
  }

  .cmd-k-back-button:hover {
    background: #f0f7ff !important;
  }

  /* Pipeline items */
  .cmd-k-pipeline {
    padding: 10px 14px !important;
    background: transparent !important;
    border-radius: 8px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: flex-start !important;
    gap: 12px !important;
    transition: background 0.15s ease !important;
  }

  .cmd-k-pipeline:hover {
    background: #f5f9ff !important;
  }

  @media (max-width: 480px) {
    .cmd-k-pipeline {
      padding: 8px 10px !important;
      gap: 8px !important;
    }
  }

  .cmd-k-pipeline-info {
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
    flex: 1 !important;
    min-width: 0 !important;
  }

  .cmd-k-pipeline-name {
    font-weight: 500 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 14px !important;
  }

  @media (max-width: 480px) {
    .cmd-k-pipeline-name {
      font-size: 13px !important;
    }
  }

  .cmd-k-pipeline-description {
    font-size: 12px !important;
    color: #666 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  @media (max-width: 480px) {
    .cmd-k-pipeline-description {
      font-size: 11px !important;
    }
  }

  .cmd-k-pipeline-org {
    color: #2563eb !important;
    font-size: 12px !important;
    white-space: nowrap !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  }

  @media (max-width: 480px) {
    .cmd-k-pipeline-org {
      font-size: 11px !important;
    }
  }

  /* Favorite icon styles */
  .cmd-k-favorite {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    padding: 4px !important;
    border-radius: 4px !important;
    transition: background 0.15s ease !important;
  }

  .cmd-k-favorite:hover {
    background: rgba(0, 0, 0, 0.05) !important;
  }

  .cmd-k-favorite-icon.active {
    fill: #FFD700 !important;
    stroke: #E8B800 !important;
  }

  /* Results section styling */
  .cmd-k-results-section {
    margin-bottom: 12px !important;
  }

  .cmd-k-results-section:not(:last-child) {
    margin-bottom: 16px !important;
  }

  @media (max-width: 480px) {
    .cmd-k-results-section {
      margin-bottom: 8px !important;
    }

    .cmd-k-results-section:not(:last-child) {
      margin-bottom: 12px !important;
    }
  }

  /* Empty state */
  .cmd-k-empty-state {
    padding: 30px 16px !important;
    text-align: center !important;
    color: #888 !important;
    font-size: 14px !important;
    font-style: italic !important;
  }

  @media (max-width: 480px) {
    .cmd-k-empty-state {
      padding: 20px 12px !important;
      font-size: 13px !important;
    }
  }
`;
