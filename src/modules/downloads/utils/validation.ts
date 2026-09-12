export class DownloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownloadValidationError";
  }
}

export function validateDownloadUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DownloadValidationError("Enter a download URL.");
  }

  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new DownloadValidationError("Enter a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new DownloadValidationError("Only HTTP and HTTPS URLs are supported.");
  }

  if (url.username || url.password) {
    throw new DownloadValidationError("Credentials in URLs are not supported.");
  }

  return url.toString();
}

const MAX_DESTINATION_BYTES = 1_024;

export function validateDestinationPath(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw new DownloadValidationError("Destination path must be a string.");
  }

  if (value.startsWith("/") || value.includes("\\")) {
    throw new DownloadValidationError("Destination path must be relative to the downloads directory.");
  }

  if (Buffer.byteLength(value, "utf8") > MAX_DESTINATION_BYTES) {
    throw new DownloadValidationError("Destination path is too long.");
  }

  const segments = value.split("/");
  if (
    segments.some((segment) =>
      !segment || segment === "." || segment === ".." || /[\u0000-\u001f\u007f]/.test(segment),
    )
  ) {
    throw new DownloadValidationError("Destination path contains unsupported segments.");
  }

  return segments.join("/");
}
