export const styles = `
/* Container wrapper - IMPORTANT: completely invisible when not active */
.cmd-k-wrapper {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 999998 !important;
  pointer-events: none !important; /* Default to not capturing clicks */
  background-color: rgba(0, 0, 0, 0) !important; /* Start fully transparent */
  transition: background-color 0.2s ease !important;
  visibility: hidden !important; /* Hide completely when not visible */
}

/* When visible, only then enable pointer events and show backdrop */
.cmd-k-wrapper.visible {
  visibility: visible !important;
  pointer-events: auto !important;
  background-color: rgba(0, 0, 0, 0.2) !important;
}

.cmd-k-box {
  position: fixed !important;
  top: 20% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 500px !important;
  background: white !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  padding: 16px !important;
  z-index: 9999999 !important;
  display: flex !important;
  flex-direction: column !important;
  pointer-events: auto !important; /* Always capture clicks when rendered */
}

.cmd-k-input {
  width: 100% !important;
  padding: 8px 12px !important;
  border: 1px solid #e1e1e1 !important;
  border-radius: 4px !important;
  font-size: 16px !important;
  outline: none !important;
  margin-bottom: 8px !important;
}

.cmd-k-input:focus {
  border-color: #007AFF !important;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2) !important;
}

.cmd-k-results {
  max-height: 300px !important;
  overflow-y: auto !important;
}

.cmd-k-result {
  padding: 8px 12px !important;
  cursor: pointer !important;
  border-radius: 4px !important;
}

.cmd-k-result:hover {
  background: #f5f5f5 !important;
}

.cmd-k-result.selected {
  background: #e6f2ff !important; /* Slightly more visible blue selection */
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

.cmd-k-pipeline {
  padding: 8px 12px !important;
  margin: 4px 0 !important;
  background: #f5f5f5 !important;
  border-radius: 4px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  gap: 8px !important;
}

.cmd-k-pipeline:hover {
  background: #eeeeee !important;
}

.cmd-k-pipeline-info {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  flex: 1 !important;
  min-width: 0 !important;
}

.cmd-k-pipeline-name {
  font-weight: 500 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.cmd-k-pipeline-description {
  font-size: 12px !important;
  color: #666 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.cmd-k-pipeline-org {
  color: #666 !important;
  font-size: 13px !important;
  white-space: nowrap !important;
}

.cmd-k-section-title {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #666 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 8px 12px 4px !important;
}

.cmd-k-command {
  padding: 8px 12px !important;
  cursor: pointer !important;
  border-radius: 4px !important;
  margin-bottom: 4px !important;
}

.cmd-k-command:hover {
  background: #f5f5f5 !important;
}

.cmd-k-command.selected {
  background: #e6f2ff !important;
}

.cmd-k-command-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 4px !important;
}

.cmd-k-command-name {
  font-weight: 500 !important;
}

.cmd-k-command-id {
  font-size: 12px !important;
  color: #666 !important;
  font-family: monospace !important;
}

.cmd-k-command-description {
  font-size: 14px !important;
  color: #666 !important;
}

/* Results section divider */
.cmd-k-results-section {
  margin-bottom: 12px !important;
}

.cmd-k-results-section:not(:last-child)::after {
  content: "" !important;
  display: block !important;
  height: 1px !important;
  background: #eee !important;
  margin: 8px 12px !important;
}
`;
