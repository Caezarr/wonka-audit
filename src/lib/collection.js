export async function collectSafely(name, collector, context) {
  try {
    return await collector(context);
  } catch (error) {
    return {
      source: name,
      status: "error",
      sessions: [],
      reason: error instanceof Error ? `${error.name || "Error"}: collector failed` : "Collector failed",
      warnings: ["Collector failed without exporting raw error details; the remaining sources were still processed."],
      capabilities: {}
    };
  }
}

export function commonCapabilities({ contentInspection, validationObservable = false }) {
  return {
    content_classification: Boolean(contentInspection),
    validation_detection: Boolean(validationObservable),
    token_usage: true,
    project_context: true
  };
}
