interface PerformanceMetric {
  phase: string
  startTime: number
  endTime: number
  duration: number
  dataCount: number
  queryCount: number
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private currentPhase: string | null = null
  private currentStartTime: number | null = null

  // Start tracking a performance phase
  startPhase(phase: string): void {
    this.currentPhase = phase
    this.currentStartTime = performance.now()
  }

  // End tracking and record metrics
  endPhase(dataCount: number, queryCount: number): PerformanceMetric | null {
    if (!this.currentPhase || !this.currentStartTime) {
      console.warn('No active phase to end')
      return null
    }

    const endTime = performance.now()
    const duration = endTime - this.currentStartTime

    const metric: PerformanceMetric = {
      phase: this.currentPhase,
      startTime: this.currentStartTime,
      endTime,
      duration,
      dataCount,
      queryCount
    }

    this.metrics.set(this.currentPhase, metric)
    

    
    // Reset current phase
    this.currentPhase = null
    this.currentStartTime = null
    
    return metric
  }

  // Get performance comparison between phases
  getComparison(): string {
    if (this.metrics.size === 0) {
      return 'No performance data available'
    }

    const phases = Array.from(this.metrics.values())
    const fastest = phases.reduce((min, current) => 
      current.duration < min.duration ? current : min
    )
    const slowest = phases.reduce((max, current) => 
      current.duration > max.duration ? current : max
    )

    let comparison = '📈 Performance Comparison:\n'
    phases.forEach(phase => {
      const improvement = fastest.duration > 0 
        ? ((fastest.duration / phase.duration) * 100).toFixed(1)
        : '0'
      const speedup = fastest.duration > 0 
        ? (phase.duration / fastest.duration).toFixed(1)
        : '∞'
      
      comparison += `\n${phase.phase}:`
      comparison += `\n  ⏱️  Duration: ${phase.duration.toFixed(2)}ms`
      comparison += `\n  📊 Data: ${phase.dataCount} items`
      comparison += `\n  🔍 Queries: ${phase.queryCount}`
      comparison += `\n  🚀 Speedup: ${speedup}x`
      comparison += `\n  📈 Improvement: ${improvement}%`
    })

    comparison += `\n\n🏆 Fastest: ${fastest.phase} (${fastest.duration.toFixed(2)}ms)`
    comparison += `\n🐌 Slowest: ${slowest.phase} (${slowest.duration.toFixed(2)}ms)`

    return comparison
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear()

  }

  // Get metrics for a specific phase
  getPhaseMetrics(phase: string): PerformanceMetric | undefined {
    return this.metrics.get(phase)
  }

  // Get all metrics
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker()

// Helper function to format duration
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  } else {
    return `${(ms / 60000).toFixed(2)}m`
  }
}

// Helper function to calculate speedup
export const calculateSpeedup = (baseline: number, optimized: number): number => {
  if (optimized === 0) return 0
  return baseline / optimized
}
