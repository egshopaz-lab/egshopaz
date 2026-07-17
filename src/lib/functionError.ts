type FunctionErrorWithContext = Error & { context?: Response };

/** Extracts the API's useful error without exposing request credentials. */
export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof Error)) return fallback;

  const response = (error as FunctionErrorWithContext).context;
  if (response instanceof Response) {
    try {
      const body = await response.clone().json() as Record<string, unknown>;
      for (const value of [body.message, body.error, body.details]) {
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    } catch {
      // The function may return an empty or non-JSON error response.
    }
  }

  return error.message || fallback;
}
