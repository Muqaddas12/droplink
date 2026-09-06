import { NativeModules } from 'react-native';

const { WifiModule } = NativeModules;

export  async function checkNetworkStatus() {
  try {
    return await WifiModule.getNetworkStatus();
  } catch (error) {
    console.error('Failed to get network status:', error);

    return {
      isWifi: false,
      isHotspot: false,
      isDataOn: false,
    };
  }
}
export async function openHotspot() {
  return WifiModule.openHotspotSettings();
}