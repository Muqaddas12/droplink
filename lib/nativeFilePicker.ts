import { NativeModules, Platform } from 'react-native';

export type NativeFile = {
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

function checkAndroid() {
  if (Platform.OS !== 'android') {
    throw new Error(
      'DropLink native features currently support Android only.'
    );
  }

  if (!NativeFilePicker) {
    throw new Error(
      'NativeFilePicker is not available. Rebuild the Android app.'
    );
  }
}

export async function pickFiles(): Promise<NativeFile[]> {
  checkAndroid();

  return NativeFilePicker.pickFiles();
}