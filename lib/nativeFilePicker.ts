import { NativeModules, Platform } from 'react-native';

type NativeFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

type NativeFilePickerModule = {
  pickFiles(): Promise<NativeFile[]>;
};

const NativeFilePicker =
  NativeModules.NativeFilePicker as NativeFilePickerModule;

export async function pickFiles(): Promise<NativeFile[]> {
  if (Platform.OS !== 'android') {
    throw new Error(
      'Native DropLink file picker currently supports Android only.'
    );
  }

  if (!NativeFilePicker) {
    throw new Error(
      'NativeFilePicker is not available. Rebuild the Android app.'
    );
  }

  return NativeFilePicker.pickFiles();
}