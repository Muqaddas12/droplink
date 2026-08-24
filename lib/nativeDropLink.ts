import {
  NativeModules,
  Platform,
} from 'react-native';


// =========================================================
// LOCAL SHARE FILE
// =========================================================

export type ShareFile = {

  uri: string;

  name: string;

  mimeType?: string | null;

  size?: number;
};


// =========================================================
// LOCAL SERVER INFO
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
// NATIVE LOCAL SHARE MODULE
// =========================================================

type DropLinkNativeModule = {

  /*
   * Start Local Share server.
   *
   * The selected files remain on Android
   * and are streamed by LocalHttpServer.
   */
  startServer(
    files: ShareFile[]
  ): Promise<ServerInfo>;


  /*
   * Stop Local Share server.
   */
  stopServer(): Promise<boolean>;


  /*
   * Get Local Share IP.
   */
  getLocalIp(): Promise<string>;


  /*
   * Get network information.
   */
  getNetworkInfo(): Promise<NetworkInfo>;
};


// =========================================================
// NATIVE MODULE
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
// START LOCAL SERVER
// =========================================================

export async function startLocalServer(
  files: ShareFile[]
): Promise<ServerInfo> {

  checkAndroid();


  if (
    !Array.isArray(files)
  ) {

    throw new Error(
      'Invalid files list.'
    );
  }


  if (
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
// STOP LOCAL SERVER
// =========================================================

export async function stopLocalServer(): Promise<boolean> {

  checkAndroid();


  return DropLink.stopServer();
}


// =========================================================
// GET LOCAL IP
// =========================================================

export async function getLocalIp(): Promise<string> {

  checkAndroid();


  return DropLink.getLocalIp();
}


// =========================================================
// GET NETWORK INFO
// =========================================================

export async function getNetworkInfo(): Promise<NetworkInfo> {

  checkAndroid();


  return DropLink.getNetworkInfo();
}