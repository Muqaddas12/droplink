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

  /**
   * Number of times other users successfully
   * downloaded this file.
   */
  downloadCount: number;
};

export type ReceivedFile = {
  name: string;
  mimeType: string;
  size: number;
  path: string;

  /**
   * Images
   * Videos
   * Audio
   * Documents
   * Archives
   * Others
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

  // -------------------------------------------------------
  // SERVER
  // -------------------------------------------------------

  startServer(
    files: ShareFile[],
  ): Promise<ServerInfo>;

  stopServer(): Promise<boolean>;

  // -------------------------------------------------------
  // ADD FILES WITHOUT STOPPING SERVER
  // -------------------------------------------------------

  addFiles(
    files: ShareFile[],
  ): Promise<SharedFile[]>;

  // -------------------------------------------------------
  // FILE LISTS
  // -------------------------------------------------------

  getSharedFiles(): Promise<SharedFile[]>;

  getReceivedFiles(): Promise<ReceivedFile[]>;

  // -------------------------------------------------------
  // SCAN / REFRESH RECEIVED FILES
  // -------------------------------------------------------

  /**
   * Scans Download/DropLink recursively
   * and returns all received files.
   *
   * Files are returned newest first.
   */
  scanReceivedFiles(): Promise<ReceivedFile[]>;

  // -------------------------------------------------------
  // SERVER STATUS
  // -------------------------------------------------------

  getServerStatus(): Promise<ServerStatus>;

  // -------------------------------------------------------
  // NETWORK
  // -------------------------------------------------------

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

  if (
    Platform.OS !== 'android'
  ) {

    throw new Error(
      'DropLink currently supports Android only.',
    );
  }

  if (!DropLink) {

    throw new Error(
      'DropLink native module is not available. Rebuild the Android app.',
    );
  }
}

// =========================================================
// START SERVER
// =========================================================

export async function startLocalServer(
  files: ShareFile[],
): Promise<ServerInfo> {

  checkAndroid();

  if (
    !files ||
    files.length === 0
  ) {

    throw new Error(
      'Please select at least one file.',
    );
  }

  return DropLink!.startServer(
    files,
  );
}

// =========================================================
// ADD FILES
// =========================================================

/**
 * Adds files to the already-running Local Share
 * server.
 *
 * IMPORTANT:
 *
 * This does NOT restart the server.
 *
 * The existing server keeps the same:
 *
 * IP
 * PORT
 * URL
 * connections
 */
export async function addLocalShareFiles(
  files: ShareFile[],
): Promise<SharedFile[]> {

  checkAndroid();

  if (
    !files ||
    files.length === 0
  ) {

    return [];
  }

  return DropLink!.addFiles(
    files,
  );
}

// =========================================================
// GET SHARED FILES
// =========================================================

export async function getLocalSharedFiles(): Promise<
  SharedFile[]
> {

  checkAndroid();

  return DropLink!.getSharedFiles();
}

// =========================================================
// GET RECEIVED FILES
// =========================================================

/**
 * Gets the currently loaded received-file list.
 *
 * The native server loads files from
 * Download/DropLink when the server starts.
 */
export async function getLocalReceivedFiles(): Promise<
  ReceivedFile[]
> {

  checkAndroid();

  return DropLink!.getReceivedFiles();
}

// =========================================================
// SCAN / REFRESH RECEIVED FILES
// =========================================================

/**
 * Scans Download/DropLink recursively.
 *
 * This finds previously received files even if
 * they were received during an earlier server session.
 *
 * Files are returned newest first.
 */
export async function scanLocalReceivedFiles(): Promise<
  ReceivedFile[]
> {

  checkAndroid();

  return DropLink!.scanReceivedFiles();
}

// =========================================================
// GET SERVER STATUS
// =========================================================

export async function getLocalServerStatus(): Promise<
  ServerStatus
> {

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

export async function getNetworkInfo(): Promise<
  NetworkInfo
> {

  checkAndroid();

  return DropLink!.getNetworkInfo();
}