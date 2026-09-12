import type { DownloadStatus } from "@/src/modules/downloads/types";

export type Aria2Status = DownloadStatus;

export type Aria2Uri = {
  uri: string;
  status: "used" | "waiting";
};

export type Aria2File = {
  index: string;
  path: string;
  length: string;
  completedLength: string;
  selected: "true" | "false";
  uris: Aria2Uri[];
};

export type Aria2Download = {
  gid: string;
  status: Aria2Status;
  totalLength: string;
  completedLength: string;
  downloadSpeed: string;
  dir?: string;
  errorCode?: string;
  errorMessage?: string;
  files: Aria2File[];
};

export type Aria2GlobalStat = {
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  numStoppedTotal: string;
};

export type Aria2Snapshot = {
  downloads: Aria2Download[];
  stats: Aria2GlobalStat;
};
