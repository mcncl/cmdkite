import React, { useState, useEffect } from 'react';
import { Pipeline } from '../../types';
import { 
  pipelineDetailsService, 
  BuildStatus,
  BuildInfo
} from '../../services/pipelineDetailsService';
import { useErrorHandler } from '../../hooks';

interface BuildStatusIndicatorProps {
  pipeline: Pipeline;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

/**
 * Component to display the current build status of a pipeline
 */
export const BuildStatusIndicator: React.FC<BuildStatusIndicatorProps> = ({
  pipeline,
  size = 'medium',
  showText = false,
  className = '',
}) => {
  const [lastBuild, setLastBuild] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();

  // Fetch the last build for this pipeline
  useEffect(() => {
    const fetchLastBuild = async () => {
      try {
        setLoading(true);
        const build = await pipelineDetailsService.getLastBuild(pipeline);
        setLastBuild(build);
      } catch (error) {
        handleError(error, 'Failed to load build status');
      } finally {
        setLoading(false);
      }
    };

    fetchLastBuild();
  }, [pipeline, handleError]);

  if (loading) {
    return (
      <div 
        className={`cmd-k-build-status cmd-k-build-status-${size} cmd-k-build-status-loading ${className}`}
        title="Loading build status..."
      >
        <div className="cmd-k-build-status-dot-pulse"></div>
      </div>
    );
  }

  if (!lastBuild) {
    return (
      <div 
        className={`cmd-k-build-status cmd-k-build-status-${size} cmd-k-build-status-none ${className}`}
        title="No builds found"
      >
        <div className="cmd-k-build-status-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        {showText && <span className="cmd-k-build-status-text">No builds</span>}
      </div>
    );
  }

  // Get status information
  const status = lastBuild.status;
  const statusColor = pipelineDetailsService.getStatusColor(status);
  const statusIcon = pipelineDetailsService.getStatusIcon(status);
  
  // Determine human-readable status text
  let statusText = status.charAt(0).toUpperCase() + status.slice(1);
  
  // Include timing information if available
  if (lastBuild.duration && status === BuildStatus.PASSED) {
    statusText += ` in ${pipelineDetailsService.formatDuration(lastBuild.duration)}`;
  }
  
  return (
    <div 
      className={`cmd-k-build-status cmd-k-build-status-${size} cmd-k-build-status-${status} ${className}`}
      title={statusText}
      style={{ '--status-color': statusColor } as React.CSSProperties}
    >
      <div className="cmd-k-build-status-icon">
        {status === BuildStatus.RUNNING ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cmd-k-build-status-spinner">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        ) : statusIcon === 'check-circle' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : statusIcon === 'x-circle' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : statusIcon === 'clock' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ) : statusIcon === 'slash' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
      
      {showText && <span className="cmd-k-build-status-text">{statusText}</span>}
      
      {lastBuild.number && (
        <span className="cmd-k-build-number">#{lastBuild.number}</span>
      )}
    </div>
  );
};
