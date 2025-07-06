import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricRecord {
    name: string;
    value: number;
    tags?: Record<string, string>;
    timestamp?: number;
}

@Injectable()
export class MetricsService {
    private readonly logger = new Logger(MetricsService.name);
    private readonly metrics: Map<string, MetricRecord[]> = new Map();
    private readonly enablePrometheus: boolean;

    constructor(private readonly configService: ConfigService) {
        this.enablePrometheus = this.configService.get<boolean>('ENABLE_PROMETHEUS', true);
        this.logger.log(`Metrics service initialized. Prometheus enabled: ${this.enablePrometheus}`);
    }

    /**
     * Record a timing metric
     */
    recordTiming(name: string, durationMs: number, tags: Record<string, string> = {}): void {
        this.record({
            name: `${name}_duration_ms`,
            value: durationMs,
            tags,
            timestamp: Date.now(),
        });
    }

    /**
     * Record a count metric
     */
    incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
        this.record({
            name: `${name}_count`,
            value,
            tags,
            timestamp: Date.now(),
        });
    }

    /**
     * Record a gauge metric
     */
    setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
        this.record({
            name: `${name}_gauge`,
            value,
            tags,
            timestamp: Date.now(),
        });
    }

    /**
     * Record a metric
     */
    private record(metric: MetricRecord): void {
        // Store metric in memory
        const key = this.getMetricKey(metric.name, metric.tags);
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        this.metrics.get(key).push(metric);

        // Trim metrics if needed (keep last 1000 per key)
        const metrics = this.metrics.get(key);
        if (metrics.length > 1000) {
            this.metrics.set(key, metrics.slice(-1000));
        }

        // Log metric for debugging
        this.logger.debug(
            `Recorded metric: ${metric.name} = ${metric.value}`,
            { metric }
        );
    }

    /**
     * Get a unique key for a metric based on name and tags
     */
    private getMetricKey(name: string, tags: Record<string, string> = {}): string {
        const tagString = Object.entries(tags)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => `${key}=${value}`)
            .join(',');

        return tagString ? `${name}{${tagString}}` : name;
    }

    /**
     * Get all metrics for Prometheus scraping
     */
    getPrometheusMetrics(): string {
        if (!this.enablePrometheus) {
            return '# Prometheus metrics disabled';
        }

        const lines: string[] = [];

        // Group metrics by name
        const metricsByName = new Map<string, MetricRecord[]>();
        for (const metrics of this.metrics.values()) {
            for (const metric of metrics) {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name).push(metric);
            }
        }

        // Generate Prometheus format
        for (const [name, metrics] of metricsByName.entries()) {
            // Add metric type comment
            if (name.endsWith('_duration_ms')) {
                lines.push(`# TYPE ${name} histogram`);
            } else if (name.endsWith('_count')) {
                lines.push(`# TYPE ${name} counter`);
            } else if (name.endsWith('_gauge')) {
                lines.push(`# TYPE ${name} gauge`);
            } else {
                lines.push(`# TYPE ${name} untyped`);
            }

            // Add metric values
            for (const metric of metrics) {
                const tagString = Object.entries(metric.tags || {})
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(',');

                const metricLine = tagString
                    ? `${metric.name}{${tagString}} ${metric.value}`
                    : `${metric.name} ${metric.value}`;

                lines.push(metricLine);
            }
        }

        return lines.join('\n');
    }
} 