const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const maximumFractionDigits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;

  return `${value.toLocaleString("en-US", { maximumFractionDigits })} ${BYTE_UNITS[unitIndex]}`;
}

export function formatSpeed(bytesPerSecond: number) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatPercentage(progress: number) {
  if (!Number.isFinite(progress)) {
    return "0%";
  }

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const fractionDigits = clampedProgress > 0 && clampedProgress < 1 ? 1 : 0;

  return `${clampedProgress.toFixed(fractionDigits)}%`;
}

export function formatEta(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "Calculating…";
  }

  if (seconds < 60) {
    return `${Math.max(1, Math.ceil(seconds))}s remaining`;
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m remaining`;
  }

  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""} remaining`;
}
