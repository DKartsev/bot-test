import { register, Counter, Gauge, Histogram } from "prom-client";

// This is a more robust implementation using prom-client, as requested.
// It replaces the old in-memory metrics system.

export const requestsTotal = new Counter({
  name: "bot_requests_total",
  help: "Total number of requests to the bot",
  labelNames: ["source", "lang", "tenant_id"],
});

export const requestsDuration = new Histogram({
  name: "bot_request_duration_seconds",
  help: "Duration of requests to the bot in seconds",
  labelNames: ["source"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const ragQueriesTotal = new Counter({
  name: "bot_rag_queries_total",
  help: "Total number of RAG queries",
});

export const feedbackTotal = new Counter({
  name: "bot_feedback_total",
  help: "Total number of feedback events",
  labelNames: ["type", "lang"],
});

export const errorsTotal = new Counter({
  name: "bot_errors_total",
  help: "Total number of errors",
  labelNames: ["stage"],
});

// Function to expose metrics for scraping
export async function getMetrics() {
  return register.metrics();
}

// You can add more metrics here as needed, for example:
// - Gauge for active connections
// - Counter for cache hits/misses
// - Histogram for LLM response times
