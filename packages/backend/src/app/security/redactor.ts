import { Detection } from "./patterns.js";

// Note: The masking functions from the old patterns.js are not exported.
// I will recreate them here for now. This can be cleaned up later.
function maskEmail(str: string): string {
  const [user, domain] = str.split("@");
  if (!user || !domain) return "***";
  return `${user[0]}***@${domain[0]}***${domain.includes(".") ? domain.slice(domain.indexOf(".")) : ""}`;
}

function maskPhone(str: string): string {
  const digits = str.replace(/\D+/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return (
    digits.slice(0, 2) +
    "*".repeat(Math.max(0, digits.length - 4)) +
    digits.slice(-2)
  );
}

function maskGeneric(str: string, partial: boolean): string {
  if (!partial) return "*".repeat(str.length);
  if (str.length <= 4) return "*".repeat(str.length);
  return str[0] + "*".repeat(str.length - 2) + str[str.length - 1];
}

function applyMask(value: string, key: string, partial: boolean): string {
  if (key === "email") return maskEmail(value);
  if (key === "phone") return maskPhone(value);
  return maskGeneric(value, partial);
}

interface RedactOptions {
  style?: "tag" | "mask";
  partialMask?: boolean;
}

export function redact(
  text: string,
  detections: Detection[],
  opts: RedactOptions = {},
): string {
  const { style = "tag", partialMask = true } = opts;
  if (!detections || !detections.length) return text;

  // Sort detections by start index to handle them in order
  const sortedDetections = [...detections].sort(
    (a, b) => a.span[0] - b.span[0],
  );

  let result = text;
  let offset = 0;

  for (const det of sortedDetections) {
    const start = det.span[0] + offset;
    const end = det.span[1] + offset;
    const original = result.slice(start, end);

    let replacement: string;
    if (style === "mask") {
      replacement = applyMask(original, det.key, partialMask);
    } else {
      replacement = `[${det.type.toUpperCase()}:${det.key.toUpperCase()}]`;
    }

    result = result.slice(0, start) + replacement + result.slice(end);
    offset += replacement.length - (end - start);
  }

  return result;
}
