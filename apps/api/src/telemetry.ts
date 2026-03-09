/**
 * SandSync Telemetry — OpenTelemetry Foundation
 *
 * Provides distributed tracing for all external API calls:
 *   - Deepgram STT
 *   - fal.ai image + video generation
 *   - Groq LLM inference
 *
 * Exports to console by default (OTEL_EXPORTER_OTLP_ENDPOINT for remote collector).
 * Batch export every 5s to minimize overhead.
 *
 * Usage:
 *   import { tracer } from "../telemetry";
 *   const span = tracer.startSpan("deepgram.transcribe", { attributes: {...} });
 *   try { ... span.setStatus({ code: SpanStatusCode.OK }); }
 *   catch (e) { span.recordException(e); span.setStatus({ code: SpanStatusCode.ERROR }); }
 *   finally { span.end(); }
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { trace, context, SpanStatusCode, SpanKind, type Span } from "@opentelemetry/api";

export { SpanStatusCode, SpanKind, context };

// ── SDK setup ─────────────────────────────────────────────────────────────────

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "sandsync-api";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: "2.0.0",
});

// Console exporter for local dev / default
const consoleExporter = new ConsoleSpanExporter();

// Batch processor — flushes every 5s or when buffer fills
const spanProcessor = new BatchSpanProcessor(consoleExporter, {
  scheduledDelayMillis: 5000,
  maxExportBatchSize: 50,
});

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  if (sdk) return; // idempotent

  sdk = new NodeSDK({
    resource,
    spanProcessor,
  });

  sdk.start();
  console.log(`[Telemetry] ✅ OTEL SDK started (service: ${SERVICE_NAME})`);
}

export function shutdownTelemetry(): Promise<void> {
  return sdk?.shutdown() ?? Promise.resolve();
}

// ── Tracer ────────────────────────────────────────────────────────────────────

// Auto-init on import (can be overridden)
initTelemetry();

export const tracer = trace.getTracer(SERVICE_NAME, "2.0.0");

// ── Instrumented wrappers ─────────────────────────────────────────────────────

/**
 * Wrap an async function with an OTEL span.
 * Automatically records exceptions and sets OK/ERROR status.
 */
export async function withSpan<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(spanName, {
    kind: SpanKind.CLIENT,
    attributes,
  });

  try {
    const result = await fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
    throw err;
  } finally {
    span.end();
  }
}

/**
 * Convenience: wrap a Deepgram call with standard attributes.
 */
export function deepgramSpan<T>(
  audioDurationMs: number,
  storyId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    "deepgram.transcribe",
    {
      "service.name": "deepgram",
      "model": "nova-3",
      "audio.duration_ms": audioDurationMs,
      "story_id": storyId,
    },
    fn
  );
}

/**
 * Convenience: wrap a fal.ai image call with standard attributes.
 */
export function falImageSpan<T>(
  model: string,
  storyId: string,
  chapterNumber: number,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    "fal.image_generate",
    {
      "service.name": "fal",
      "model": model,
      "story_id": storyId,
      "chapter": chapterNumber,
    },
    fn
  );
}

/**
 * Convenience: wrap a fal.ai video call with standard attributes.
 */
export function falVideoSpan<T>(
  model: string,
  storyId: string,
  chapterNumber: number,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    "fal.video_generate",
    {
      "service.name": "fal",
      "model": model,
      "story_id": storyId,
      "chapter": chapterNumber,
    },
    fn
  );
}

/**
 * Convenience: wrap a Groq LLM call with standard attributes.
 */
export function groqSpan<T>(
  model: string,
  storyId: string,
  agentName: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    "groq.generate",
    {
      "service.name": "groq",
      "model": model,
      "story_id": storyId,
      "agent": agentName,
    },
    fn
  );
}
