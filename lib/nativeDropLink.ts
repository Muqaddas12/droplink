import {
  NativeModules,
  Platform,
} from 'react-native';


// =========================================================
// SHARE FILE
// =========================================================

export type ShareFile = {

  uri: string;

  name: string;

  mimeType?: string | null;

  size?: number;
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
// NETWORK INFO
// =========================================================

export type NetworkInfo = {

  connected: boolean;

  ip: string | null;

  type: string;
};


// =========================================================
// RECEIVED FILE
// =========================================================

export type ReceivedFile = {

  name: string;

  mimeType: string;

  size: number;

  path: string;

  category: string;
};


// =========================================================
// NATIVE MODULE
// =========================================================

type DropLinkNativeModule = {

  startServer(
    files: ShareFile[]
  ): Promise<ServerInfo>;


  stopServer(): Promise<boolean>;


  getLocalIp(): Promise<string>;


  getNetworkInfo(): Promise<NetworkInfo>;


  getReceivedFiles(): Promise<ReceivedFile[]>;
};


// =========================================================
// MODULE
// =========================================================

const DropLink =
  NativeModules.DropLink as
    DropLinkNativeModule;


// =========================================================
// ANDROID CHECK
// =========================================================

function checkAndroid() {

  if (
    Platform.OS !== 'android'
  ) {

    throw new Error(
      'DropLink currently supports Android only.'
    );
  }


  if (!DropLink) {

    throw new Error(
      'DropLink native module is not available. ' +
      'Rebuild the Android app.'
    );
  }
}


// =========================================================
// START
// =========================================================

export async function startLocalServer(
  files: ShareFile[]
): Promise<ServerInfo> {

  checkAndroid();


  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {

    throw new Error(
      'No files selected.'
    );
  }


  return DropLink.startServer(
    files
  );
}


// =========================================================
// STOP
// =========================================================

export async function stopLocalServer(): Promise<boolean> {

  checkAndroid();


  return DropLink.stopServer();
}


// =========================================================
// LOCAL IP
// =========================================================

export async function getLocalIp(): Promise<string> {

  checkAndroid();


  return DropLink.getLocalIp();
}


// =========================================================
// NETWORK
// =========================================================

export async function getNetworkInfo(): Promise<NetworkInfo> {

  checkAndroid();


  return DropLink.getNetworkInfo();
}


// =========================================================
// RECEIVED FILES
// =========================================================

export async function getReceivedFiles(): Promise<ReceivedFile[]> {

  checkAndroid();


  return DropLink.getReceivedFiles();
}