import React, { useState, useEffect } from 'react';
import { Pipeline } from '../../types';
import { 
  pipelineDetailsService, 
  BuildStatus,
  BuildInfo,
  PipelineStats
} from '../../services/pipelineDetailsService';
import { useErrorHandler } from '../../hooks';

interface BuildHistoryWidgetProps {
  pipeline: Pipeline;
  maxBuilds?: number;
  showStats?: boolean;
}

/**
 * Widget to display build history visualization for a pipeline
 */
export const BuildHistoryWidget: React.FC<BuildHistoryWidgetProps> = ({
  pipeline,
  maxBuilds = 10,
  showStats = true,
}) => {
  const [builds, setBuilds] = useState<BuildInfo[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();

  // Fetch builds and stats for the pipeline
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch builds and stats in parallel
        const [buildsData, statsData] = await Promise.all([
          pipelineDetailsService.getPipelineBuilds(pipeline),
          pipelineDetailsService.getPipelineStats(pipeline)
        ]);
        
        // Sort builds by number (most recent first) and limit to maxBuilds
        const sortedBuilds = [...buildsData]
          .sort((a, b) => b.number - a.number)
          .slice(0, maxBuilds);
        
        setBuilds(sortedBuilds);
        setStats(statsData);
      } catch (error) {
        handleError(error, 'Failed to load build history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pipeline, maxBuilds, handleError]);

  if (loading) {
    return (
      <div className="cmd-k-build-history-loading">
        <div className="cmd-k-loading-bars">
          <div></div><div></div><div></div><div></div><div></div>
        </div>
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="cmd-k-build-history-empty">
        <span>No build history available</span>
      </div>
    );
  }

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 0.9) return '#10B981'; // Green for >=90%
    if (rate >= 0.75) return '#10B981'; // Still green but lighter for >=75%
    if (rate >= 0.6) return '#F59E0B'; // Amber for >=60%
    return '#EF4444'; // Red for <60%
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        );
      case 'declining':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        );
      case 'stable':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
    }
  };

  return (
    <div className="cmd-k-build-history">
      {/* Mini-graph showing build status history */}
      <div className="cmd-k-build-history-graph">
        {builds.map((build, index) => {
          const statusColor = pipelineDetailsService.getStatusColor(build.status);
          return (
            <div 
              key={build.id || index}
              className={`cmd-k-build-dot cmd-k-build-status-${build.status}`}
              style={{ backgroundColor: statusColor }}
              title={`Build #${build.number}: ${build.status.toUpperCase()}${build.duration ? ` (${pipelineDetailsService.formatDuration(build.duration)})` : ''}`}
            />
          );
        })}
      </div>
      
      {/* Stats display */}
      {showStats && stats && (
        <div className="cmd-k-build-stats">
          <div className="cmd-k-build-stats-item">
            <span className="cmd-k-build-stats-label">Success Rate:</span>
            <span 
              className="cmd-k-build-success-rate"
              style={{ color: getSuccessRateColor(stats.successRate) }}
            >
              {Math.round(stats.successRate * 100)}%
              <span className="cmd-k-build-trend-icon">
                {getTrendIcon(stats.trend)}
              </span>
            </span>
          </div>
          
          {stats.avgDuration > 0 && (
            <div className="cmd-k-build-stats-item">
              <span className="cmd-k-build-stats-label">Avg Duration:</span>
              <span className="cmd-k-build-avg-duration">
                {pipelineDetailsService.formatDuration(stats.avgDuration)}
              </span>
            </div>
          )}
          
          {stats.buildFrequency > 0 && (
            <div className="cmd-k-build-stats-item">
              <span className="cmd-k-build-stats-label">Frequency:</span>
              <span className="cmd-k-build-frequency">
                {stats.buildFrequency >= 1 
                  ? `${Math.round(stats.buildFrequency)} per day` 
                  : `${Math.round(1 / stats.buildFrequency)} days`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
