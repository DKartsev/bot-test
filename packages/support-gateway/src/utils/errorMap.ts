export function classifyError(err: any) {
  if (err?.validation) {
    return {
      status: 400,
      body: { error: "Bad Request", details: err.validation },
    } as const;
  }
  if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"].includes(err?.code)) {
    return { status: 502, body: { error: "Bad Gateway" } } as const;
  }
  const status = err?.response?.status;
  if (status === 429) {
    return { status: 503, body: { error: "Service Unavailable" } } as const;
  }
  if (typeof status === "number") {
    if (status >= 500) {
      return { status: 502, body: { error: "Bad Gateway" } } as const;
    }
    if (status >= 400) {
      return { status, body: { error: "Request Failed" } } as const;
    }
  }
  return { status: 500, body: { error: "Internal Server Error" } } as const;
}
