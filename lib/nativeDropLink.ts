import {
  NativeModules,
  Platform,
} from 'react-native';

// =========================================================
// FILE TYPES
// =========================================================

export type ShareFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

export type SharedFile = {
  index: number;
  uri: string;
  name: string;
  mimeType?: string | null;
  size: number;
  downloadCount: number;
};

export type ReceivedFile = {
  name: string;
  mimeType: string;
  size: number;
  path: string;
  /**
   * Images | Videos | Audio | Documents | Archives | Others
   */
  category: string;
};

// =========================================================
// SERVER INFO
// =========================================================

export type ServerInfo = {
  ip: string;
  port: number;
  url: string;
  /** Friendly mDNS hostname — resolves natively in iOS/macOS Safari on the same LAN */
  mdnsName?: string;
};

// =========================================================
// SERVER STATUS
// =========================================================

export type ServerStatus = {
  running: boolean;
  ip?: string | null;
  port: number;
  url?: string | null;
  sharedFileCount: number;
  receivedFileCount: number;
};

// =========================================================
// NETWORK INFO
// =========================================================

export type NetworkInfo = {
  connected: boolean;
  ip: string | null;
  type: string;
};

// =========================================================
// NATIVE MODULE
// =========================================================

type DropLinkNativeModule = {
  startServer(files: ShareFile[]): Promise<ServerInfo>;
  stopServer(): Promise<boolean>;
  addFiles(files: ShareFile[]): Promise<SharedFile[]>;
  getSharedFiles(): Promise<SharedFile[]>;
  getReceivedFiles(): Promise<ReceivedFile[]>;
  scanReceivedFiles(): Promise<ReceivedFile[]>;
  getServerStatus(): Promise<ServerStatus>;
  getLocalIp(): Promise<string>;
  getNetworkInfo(): Promise<NetworkInfo>;
};

// =========================================================
// NATIVE MODULE INSTANCE
// =========================================================

const DropLink =
  NativeModules.DropLink as
    | DropLinkNativeModule
    | undefined;

// =========================================================
// ANDROID CHECK
// =========================================================

function checkAndroid() {
  if (Platform.OS !== 'android') {
    throw new Error('DropLink currently supports Android only.');
  }
  if (!DropLink) {
    throw new Error('DropLink native module is not available. Rebuild the Android app.');
  }
}

// =========================================================
// START SERVER
// =========================================================

export async function startLocalServer(
  files: ShareFile[],
): Promise<ServerInfo> {
  checkAndroid();
  return DropLink!.startServer(files);
}

// =========================================================
// ADD FILES
// =========================================================

export async function addLocalShareFiles(
  files: ShareFile[],
): Promise<SharedFile[]> {
  checkAndroid();
  if (!files || files.length === 0) return [];
  return DropLink!.addFiles(files);
}

// =========================================================
// GET SHARED FILES
// =========================================================

export async function getLocalSharedFiles(): Promise<SharedFile[]> {
  checkAndroid();
  return DropLink!.getSharedFiles();
}

// =========================================================
// GET RECEIVED FILES
// =========================================================

export async function getLocalReceivedFiles(): Promise<ReceivedFile[]> {
  checkAndroid();
  return DropLink!.getReceivedFiles();
}

// =========================================================
// SCAN / REFRESH RECEIVED FILES
// =========================================================

export async function scanLocalReceivedFiles(): Promise<ReceivedFile[]> {
  checkAndroid();
  return DropLink!.scanReceivedFiles();
}

// =========================================================
// GET SERVER STATUS
// =========================================================

export async function getLocalServerStatus(): Promise<ServerStatus> {
  checkAndroid();
  return DropLink!.getServerStatus();
}

// =========================================================
// STOP SERVER
// =========================================================

export async function stopLocalServer(): Promise<boolean> {
  checkAndroid();
  return DropLink!.stopServer();
}

// =========================================================
// GET LOCAL IP
// =========================================================

export async function getLocalIp(): Promise<string> {
  checkAndroid();
  return DropLink!.getLocalIp();
}

// =========================================================
// GET NETWORK INFO
// =========================================================

export async function getNetworkInfo(): Promise<NetworkInfo> {
  checkAndroid();
  return DropLink!.getNetworkInfo();
}
