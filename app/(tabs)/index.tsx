import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { pickFiles } from '@/lib/nativeFilePicker';

import {
  startLocalServer,
  stopLocalServer,
  getNetworkInfo,
  ServerInfo,
  NetworkInfo,
} from '@/lib/nativeDropLink';

export default function TabOneScreen() {

  const [serverInfo, setServerInfo] =
    useState<ServerInfo | null>(null);

  const [networkInfo, setNetworkInfo] =
    useState<NetworkInfo | null>(null);

  const handleShare = async () => {

    try {

      /*
       * Check network first.
       */
      const network =
        await getNetworkInfo();

      console.log(
        'NETWORK INFO:',
        network
      );

      setNetworkInfo(network);

      if (!network.connected) {

        Alert.alert(
          'No Network',
          'Please connect to Wi-Fi or enable a hotspot before sharing.'
        );

        return;
      }

      /*
       * Select files.
       */
      const files =
        await pickFiles();

      if (files.length === 0) {
        return;
      }

      console.log(
        'SELECTED FILES:',
        files
      );

      /*
       * Start zero-copy server.
       */
      const info =
        await startLocalServer(files);

      console.log(
        'SERVER INFO:',
        info
      );

      setServerInfo(info);

      Alert.alert(
        'Server Started',
        info.url
      );

    } catch (error) {

      console.error(
        'SHARE ERROR:',
        error
      );

      Alert.alert(
        'Share Error',
        String(error)
      );
    }
  };

  const handleStop = async () => {

    try {

      await stopLocalServer();

      setServerInfo(null);

      console.log(
        'SERVER STOPPED'
      );

    } catch (error) {

      console.error(
        'STOP SERVER ERROR:',
        error
      );

      Alert.alert(
        'Error',
        String(error)
      );
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        DropLink
      </Text>

      <Text style={styles.subtitle}>
        Zero-copy file sharing
      </Text>

      <Pressable
        style={styles.button}
        onPress={handleShare}
      >
        <Text style={styles.buttonText}>
          Select & Share
        </Text>
      </Pressable>

      {networkInfo !== null && (
        <View style={styles.networkContainer}>

          <Text style={styles.networkTitle}>
            Network
          </Text>

          <Text style={styles.networkText}>
            Status:{' '}
            {networkInfo.connected
              ? 'Connected'
              : 'Disconnected'}
          </Text>

          <Text style={styles.networkText}>
            Type: {networkInfo.type}
          </Text>

          {networkInfo.ip !== null && (
            <Text style={styles.networkText}>
              IP: {networkInfo.ip}
            </Text>
          )}

        </View>
      )}

      {serverInfo !== null && (
        <View style={styles.serverContainer}>

          <Text style={styles.serverTitle}>
            Server Running
          </Text>

          <Text style={styles.url}>
            {serverInfo.url}
          </Text>

          <Text style={styles.port}>
            Port: {serverInfo.port}
          </Text>

          <Pressable
            style={styles.stopButton}
            onPress={handleStop}
          >
            <Text style={styles.stopText}>
              Stop Server
            </Text>
          </Pressable>

        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 8,
    color: '#6b7280',
  },

  button: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: '#2563eb',
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  networkContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
  },

  networkTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },

  networkText: {
    marginTop: 3,
    color: '#4b5563',
  },

  serverContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },

  serverTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  url: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  port: {
    marginTop: 6,
    color: '#6b7280',
  },

  stopButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },

  stopText: {
    color: '#fff',
    fontWeight: '700',
  },

});