import { NativeModules, Platform } from 'react-native';

type DropLinkNativeModule = {
  startServer(directory: string): Promise<number>;
  stopServer(): Promise<boolean>;
};

const DropLink =
  NativeModules.DropLink as DropLinkNativeModule;

export async function startLocalServer(
  directory: string
): Promise<number> {
  if (Platform.OS !== 'android') {
    throw new Error(
      'DropLink local server currently supports Android only.'
    );
  }

  if (!DropLink) {
    throw new Error(
      'DropLink native module is not available. Rebuild the Android app.'
    );
  }

  return DropLink.startServer(directory);
}

export async function stopLocalServer(): Promise<boolean> {
  if (!DropLink) {
    return false;
  }

  return DropLink.stopServer();
}