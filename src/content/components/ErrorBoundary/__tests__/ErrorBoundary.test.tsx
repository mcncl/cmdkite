import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { errorService } from '../../../services/errorService';

// Mock the error service
jest.mock('../../../services/errorService', () => {
  return {
    errorService: {
      captureException: jest.fn(),
    },
  };
});

// Component that will throw an error
const ErrorThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error from component');
  }
  return <div>Component rendered successfully</div>;
};

// Reset console.error to avoid cluttering test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test child')).toBeInTheDocument();
  });

  it('should render default fallback UI when an error occurs', () => {
    // We need to suppress the expected error from React
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    // Verify error boundary fallback is displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('The component could not be rendered properly.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();

    // Clean up
    spy.mockRestore();
  });

  it('should render custom fallback when provided', () => {
    // We need to suppress the expected error from React
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom error state</div>}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error state')).toBeInTheDocument();

    // Clean up
    spy.mockRestore();
  });

  it('should call onError handler when provided', () => {
    // We need to suppress the expected error from React
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    const handleError = jest.fn();

    render(
      <ErrorBoundary onError={handleError}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error from component' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );

    // Clean up
    spy.mockRestore();
  });

  it('should log error to errorService', () => {
    // We need to suppress the expected error from React
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(errorService.captureException).toHaveBeenCalledTimes(1);
    expect(errorService.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error from component' }),
      expect.objectContaining({
        message: expect.stringContaining('React Error'),
        context: expect.objectContaining({
          componentStack: expect.any(String)
        })
      })
    );

    // Clean up
    spy.mockRestore();
  });
});
