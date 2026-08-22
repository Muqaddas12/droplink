import {
  NativeModules,
  Platform,
} from 'react-native';

export type InternetFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

export type InternetServerInfo = {
  port: number;
  files: {
    id: string;
    name: string;
    mimeType?: string | null;
    size: number;
  }[];
};

type InternetTransferNative = {

  createServer(
    files: InternetFile[]
  ): Promise<InternetServerInfo>;

  pauseServer(): Promise<boolean>;

  resumeServer(): Promise<boolean>;

  stopServer(): Promise<boolean>;

  connect(
    host: string,
    port: number
  ): Promise<boolean>;

  pauseDownload(): Promise<boolean>;

  resumeDownload(): Promise<boolean>;

  download(
    fileId: string,
    destination: string,
    totalSize: number
  ): Promise<boolean>;

  close(): Promise<boolean>;
};

const InternetTransfer =
  NativeModules.InternetTransfer as
    InternetTransferNative;

function checkAndroid() {

  if (Platform.OS !== 'android') {

    throw new Error(
      'Internet transfer currently supports Android only.'
    );
  }

  if (!InternetTransfer) {

    throw new Error(
      'InternetTransfer native module is not available. Rebuild the Android app.'
    );
  }
}

export async function createInternetServer(
  files: InternetFile[]
) {

  checkAndroid();

  return InternetTransfer.createServer(
    files
  );
}

export async function pauseInternetServer() {

  checkAndroid();

  return InternetTransfer.pauseServer();
}

export async function resumeInternetServer() {

  checkAndroid();

  return InternetTransfer.resumeServer();
}

export async function stopInternetServer() {

  checkAndroid();

  return InternetTransfer.stopServer();
}

export async function connectInternetTransfer(
  host: string,
  port: number
) {

  checkAndroid();

  return InternetTransfer.connect(
    host,
    port
  );
}

export async function pauseInternetDownload() {

  checkAndroid();

  return InternetTransfer.pauseDownload();
}

export async function resumeInternetDownload() {

  checkAndroid();

  return InternetTransfer.resumeDownload();
}

export async function downloadInternetFile(
  fileId: string,
  destination: string,
  totalSize: number
) {

  checkAndroid();

  return InternetTransfer.download(
    fileId,
    destination,
    totalSize
  );
}

export async function closeInternetTransfer() {

  checkAndroid();

  return InternetTransfer.close();
}