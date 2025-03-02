/**
 * Styles for error UI components
 */
export const errorStyles = `
  /* Error boundary styles */
  .cmd-k-error-boundary {
    background: rgba(255, 235, 235, 0.95);
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
    border: 1px solid #ffcdd2;
  }

  @keyframes cmd-k-toast-enter {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes cmd-k-toast-exit {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(20px);
      opacity: 0;
    }
  }

  .cmd-k-toast-exit {
    animation: cmd-k-toast-exit 0.2s ease-in forwards;
  }

media (prefers-color-scheme: dark) {
    .cmd-k-error-boundary {
      background: rgba(50, 30, 30, 0.95);
      border: 1px solid #752a2a;
    }
  }

  .cmd-k-error-message {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .cmd-k-error-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .cmd-k-error-content {
    flex: 1;
  }

  .cmd-k-error-content h4 {
    font-size: 16px;
    margin: 0 0 8px 0;
    color: #d32f2f;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-content h4 {
      color: #ef5350;
    }
  }

  .cmd-k-error-content p {
    font-size: 14px;
    margin: 0 0 12px 0;
    color: #555;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-content p {
      color: #aaa;
    }
  }

  .cmd-k-error-retry {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
    color: #333;
  }

  .cmd-k-error-retry:hover {
    background: #e0e0e0;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-retry {
      background: #333;
      border-color: #555;
      color: #ddd;
    }

    .cmd-k-error-retry:hover {
      background: #444;
    }
  }

  /* Inline error message */
  .cmd-k-inline-error {
    color: #d32f2f;
    font-size: 14px;
    margin: 8px 0;
    padding: 8px 12px;
    background: rgba(255, 235, 235, 0.7);
    border-radius: 4px;
    border-left: 3px solid #d32f2f;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-inline-error {
      color: #ef5350;
      background: rgba(50, 30, 30, 0.7);
      border-left-color: #ef5350;
    }
  }

  /* Error toast notification */
  .cmd-k-error-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px 16px;
    max-width: 400px;
    z-index: 999999;
    animation: cmd-k-toast-enter 0.3s ease-out;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-toast {
      background: #333;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }

  .cmd-k-error-toast-content {
    flex: 1;
  }

  .cmd-k-error-toast-title {
    font-weight: 500;
    font-size: 14px;
    margin: 0 0 4px 0;
    color: #d32f2f;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-toast-title {
      color: #ef5350;
    }
  }

  .cmd-k-error-toast-message {
    font-size: 13px;
    color: #555;
    margin: 0;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-toast-message {
      color: #aaa;
    }
  }

  .cmd-k-error-toast-close {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 16px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .cmd-k-error-toast-close:hover {
    background: #f5f5f5;
    color: #666;
  }

  @media (prefers-color-scheme: dark) {
    .cmd-k-error-toast-close {
      color: #777;
    }

    .cmd-k-error-toast-close:hover {
      background: #444;
      color: #aaa;
    }
  }
}
`;
