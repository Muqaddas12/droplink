import {
  NativeModules,
  Platform,
} from 'react-native';

type OpenFileNativeModule = {
  openFile(
    filePathOrUri: string,
    mimeType?: string | null,
  ): Promise<boolean>;
};

const OpenFile =
  NativeModules.OpenFile as
    | OpenFileNativeModule
    | undefined;

/**
 * Opens a local received-file path or an Android document URI.
 * Both Local Share and Internet Share use this same native bridge.
 */
export async function openFile(
  filePathOrUri: string,
  mimeType?: string | null,
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    throw new Error(
      'Opening files currently supports Android only.',
    );
  }

  if (!OpenFile?.openFile) {
    throw new Error(
      'OpenFile is not available. Rebuild the Android app.',
    );
  }

  return OpenFile.openFile(
    filePathOrUri,
    mimeType,
  );
}
