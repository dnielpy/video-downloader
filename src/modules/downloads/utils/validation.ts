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
