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
  createInternetServer,
  pauseInternetServer,
  resumeInternetServer,
  stopInternetServer,
  InternetServerInfo,
} from '@/lib/nativeInternetTransfer';

export default function TabTwoScreen() {

  const [selectedFiles, setSelectedFiles] =
    useState<
      Awaited<ReturnType<typeof pickFiles>>
    >([]);

  const [serverInfo, setServerInfo] =
    useState<InternetServerInfo | null>(null);

  const [starting, setStarting] =
    useState(false);

  const [paused, setPaused] =
    useState(false);

  const handleInternetShare = async () => {

    try {

      const files =
        await pickFiles();

      if (files.length === 0) {
        return;
      }

      console.log(
        'INTERNET SELECTED FILES:',
        files
      );

      setSelectedFiles(files);

      /*
       * If an old server exists,
       * stop it before creating a new one.
       */
      if (serverInfo !== null) {

        try {
          await stopInternetServer();
        } catch (_) {
          // Ignore old server cleanup error.
        }

        setServerInfo(null);
        setPaused(false);
      }

    } catch (error) {

      console.error(
        'INTERNET SHARE ERROR:',
        error
      );

      Alert.alert(
        'Internet Share Error',
        String(error)
      );
    }
  };

  const handleCreateServer = async () => {

    if (selectedFiles.length === 0) {

      Alert.alert(
        'No Files',
        'Please select at least one file.'
      );

      return;
    }

    try {

      setStarting(true);

      console.log(
        'STARTING INTERNET SERVER...'
      );

      const info =
        await createInternetServer(
          selectedFiles
        );

      console.log(
        'INTERNET SERVER INFO:',
        info
      );

      setServerInfo(info);
      setPaused(false);

      Alert.alert(
        'Internet Server Started',
        `Port: ${info.port}\n\n${info.files.length} file(s) ready.`
      );

    } catch (error) {

      console.error(
        'CREATE INTERNET SERVER ERROR:',
        error
      );

      Alert.alert(
        'Server Error',
        String(error)
      );

    } finally {

      setStarting(false);
    }
  };

  const handlePause = async () => {

    try {

      await pauseInternetServer();

      setPaused(true);

      console.log(
        'INTERNET SERVER PAUSED'
      );

    } catch (error) {

      console.error(
        'PAUSE ERROR:',
        error
      );

      Alert.alert(
        'Pause Error',
        String(error)
      );
    }
  };

  const handleResume = async () => {

    try {

      await resumeInternetServer();

      setPaused(false);

      console.log(
        'INTERNET SERVER RESUMED'
      );

    } catch (error) {

      console.error(
        'RESUME ERROR:',
        error
      );

      Alert.alert(
        'Resume Error',
        String(error)
      );
    }
  };

  const handleStop = async () => {

    try {

      await stopInternetServer();

      setServerInfo(null);
      setPaused(false);

      console.log(
        'INTERNET SERVER STOPPED'
      );

    } catch (error) {

      console.error(
        'STOP SERVER ERROR:',
        error
      );

      Alert.alert(
        'Stop Error',
        String(error)
      );
    }
  };

  const totalSize =
    selectedFiles.reduce(
      (total, file) =>
        total + (file.size ?? 0),
      0
    );

  const formatSize = (
    bytes: number
  ) => {

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    if (
      bytes <
      1024 * 1024 * 1024
    ) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>

        <Text style={styles.title}>
          Internet Share
        </Text>

        <Text style={styles.subtitle}>
          Share files anywhere over the Internet
        </Text>

      </View>

      <View style={styles.hero}>

        <Text style={styles.heroIcon}>
          🌐
        </Text>

        <Text style={styles.heroTitle}>
          Share Anywhere
        </Text>

        <Text style={styles.heroText}>
          Select files and create a direct
          transfer session.
        </Text>

      </View>

      <Pressable
        style={styles.shareButton}
        onPress={handleInternetShare}
        disabled={starting}
      >

        <Text style={styles.shareIcon}>
          ↑
        </Text>

        <View>

          <Text style={styles.shareTitle}>
            Select Files
          </Text>

          <Text style={styles.shareSubtitle}>
            Choose files to share
          </Text>

        </View>

      </Pressable>

      {selectedFiles.length > 0 && (

        <View style={styles.filesContainer}>

          <View style={styles.filesHeader}>

            <Text style={styles.filesTitle}>
              Selected Files
            </Text>

            <Text style={styles.filesCount}>
              {selectedFiles.length} file
              {selectedFiles.length !== 1
                ? 's'
                : ''}
            </Text>

          </View>

          {selectedFiles.map(
            (file, index) => (

              <View
                key={`${file.uri}-${index}`}
                style={styles.fileRow}
              >

                <View style={styles.fileIcon}>

                  <Text>
                    📄
                  </Text>

                </View>

                <View style={styles.fileInfo}>

                  <Text
                    style={styles.fileName}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>

                  <Text style={styles.fileSize}>
                    {formatSize(
                      file.size ?? 0
                    )}
                  </Text>

                </View>

              </View>

            )
          )}

          <View style={styles.totalRow}>

            <Text style={styles.totalText}>
              Total
            </Text>

            <Text style={styles.totalSize}>
              {formatSize(totalSize)}
            </Text>

          </View>

          {serverInfo === null ? (

            <Pressable
              style={styles.createButton}
              onPress={handleCreateServer}
              disabled={starting}
            >

              <Text
                style={styles.createButtonText}
              >
                {starting
                  ? 'Starting Server...'
                  : 'Create Internet Link'}
              </Text>

            </Pressable>

          ) : (

            <View style={styles.serverBox}>

              <Text style={styles.serverTitle}>
                Internet Server Running
              </Text>

              <Text style={styles.portText}>
                Port: {serverInfo.port}
              </Text>

              <Text style={styles.statusText}>
                {paused
                  ? '⏸ Paused'
                  : '🟢 Ready for transfer'}
              </Text>

              <View style={styles.actionsRow}>

                {!paused ? (

                  <Pressable
                    style={styles.pauseButton}
                    onPress={handlePause}
                  >

                    <Text
                      style={styles.actionText}
                    >
                      Pause
                    </Text>

                  </Pressable>

                ) : (

                  <Pressable
                    style={styles.resumeButton}
                    onPress={handleResume}
                  >

                    <Text
                      style={styles.actionText}
                    >
                      Resume
                    </Text>

                  </Pressable>

                )}

                <Pressable
                  style={styles.stopButton}
                  onPress={handleStop}
                >

                  <Text
                    style={styles.actionText}
                  >
                    Stop
                  </Text>

                </Pressable>

              </View>

            </View>

          )}

        </View>

      )}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 24,
  },

  header: {
    marginTop: 30,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6b7280',
  },

  hero: {
    marginTop: 35,
    padding: 28,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
  },

  heroIcon: {
    fontSize: 42,
  },

  heroTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
  },

  heroText: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
    color: '#6b7280',
  },

  shareButton: {
    marginTop: 22,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
  },

  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor:
      'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 30,
    textAlign: 'center',
    lineHeight: 45,
    marginRight: 14,
  },

  shareTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  shareSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.8)',
  },

  filesContainer: {
    marginTop: 22,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },

  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  filesTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  filesCount: {
    color: '#6b7280',
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  fileName: {
    fontSize: 15,
    fontWeight: '600',
  },

  fileSize: {
    marginTop: 3,
    color: '#6b7280',
    fontSize: 13,
  },

  totalRow: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalText: {
    fontWeight: '700',
  },

  totalSize: {
    fontWeight: '700',
  },

  createButton: {
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
  },

  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  serverBox: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },

  serverTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  portText: {
    marginTop: 8,
    fontSize: 15,
  },

  statusText: {
    marginTop: 6,
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },

  pauseButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    marginRight: 8,
  },

  resumeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    marginRight: 8,
  },

  stopButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },

  actionText: {
    color: '#fff',
    fontWeight: '700',
  },

});