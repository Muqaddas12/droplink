import { NativeModules, Platform } from 'react-native';

export type ShareFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

export type ServerInfo = {
  ip: string;
  port: number;
  url: string;
};

type DropLinkNativeModule = {
  startServer(
    files: ShareFile[]
  ): Promise<ServerInfo>;

  stopServer(): Promise<boolean>;

  getLocalIp(): Promise<string>;
};

const DropLink =
  NativeModules.DropLink as DropLinkNativeModule;

function checkAndroid() {
  if (Platform.OS !== 'android') {
    throw new Error(
      'DropLink currently supports Android only.'
    );
  }

  if (!DropLink) {
    throw new Error(
      'DropLink native module is not available. Rebuild the Android app.'
    );
  }
}

export async function startLocalServer(
  files: ShareFile[]
): Promise<ServerInfo> {
  checkAndroid();

  return DropLink.startServer(files);
}

export async function stopLocalServer(): Promise<boolean> {
  checkAndroid();

  return DropLink.stopServer();
}

export async function getLocalIp(): Promise<string> {
  checkAndroid();

  return DropLink.getLocalIp();
}