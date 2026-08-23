import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
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
  const [selectedFiles, setSelectedFiles] = useState<
    Awaited<ReturnType<typeof pickFiles>>
  >([]);

  const [serverInfo, setServerInfo] =
    useState<InternetServerInfo | null>(null);

  const [paused, setPaused] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSelectFiles = async () => {
    try {
      const files = await pickFiles();

      if (files.length === 0) {
        return;
      }

      console.log(
        'INTERNET SELECTED FILES:',
        files
      );

      setSelectedFiles(files);
      setServerInfo(null);
      setPaused(false);

    } catch (error) {
      console.error(
        'FILE PICKER ERROR:',
        error
      );

      Alert.alert(
        'Error',
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
      setLoading(true);

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

    } catch (error) {
      console.error(
        'CREATE SERVER ERROR:',
        error
      );

      Alert.alert(
        'Server Error',
        String(error)
      );

    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (paused) {
        await resumeInternetServer();
        setPaused(false);
      } else {
        await pauseInternetServer();
        setPaused(true);
      }
    } catch (error) {
      console.error(
        'PAUSE/RESUME ERROR:',
        error
      );

      Alert.alert(
        'Error',
        String(error)
      );
    }
  };

  const handleStopServer = async () => {
    try {
      await stopInternetServer();

      setServerInfo(null);
      setPaused(false);

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

  const handleShareUrl = async () => {
    if (!serverInfo?.url) {
      return;
    }

    try {
      await Share.share({
        message: serverInfo.url,
      });
    } catch (error) {
      console.error(
        'SHARE URL ERROR:',
        error
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

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    if (
      bytes <
      1024 *
        1024 *
        1024
    ) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 *
        1024 *
        1024)
    ).toFixed(2)} GB`;
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={false}
    >

      {/* Header */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Internet Share
          </Text>

          <Text style={styles.subtitle}>
            Share files directly over the Internet
          </Text>
        </View>

        <View style={styles.globe}>
          <Text style={styles.globeText}>
            🌐
          </Text>
        </View>
      </View>


      {/* Status Card */}

      {serverInfo ? (
        <View style={styles.statusCard}>

          <View style={styles.statusHeader}>

            <View style={styles.statusLeft}>

              <View
                style={[
                  styles.statusDot,
                  paused &&
                    styles.statusDotPaused,
                ]}
              />

              <View>
                <Text
                  style={styles.statusTitle}
                >
                  {paused
                    ? 'Server Paused'
                    : 'Server Running'}
                </Text>

                <Text
                  style={styles.statusSubtitle}
                >
                  {paused
                    ? 'Transfers are paused'
                    : 'Ready for download'}
                </Text>
              </View>

            </View>

            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>
                {paused
                  ? 'PAUSED'
                  : 'LIVE'}
              </Text>
            </View>

          </View>


          {/* Network */}

          <View style={styles.infoGrid}>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                NETWORK
              </Text>

              <Text style={styles.infoValue}>
                {serverInfo.networkType}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                PORT
              </Text>

              <Text style={styles.infoValue}>
                {serverInfo.port}
              </Text>
            </View>

          </View>


          {/* URL */}

          <Text style={styles.urlLabel}>
            SHARE URL
          </Text>

          <View style={styles.urlBox}>

            <Text
              style={styles.urlText}
              selectable
            >
              {serverInfo.url}
            </Text>

          </View>


          {/* URL Buttons */}

          <View style={styles.urlActions}>

            <Pressable
              style={[
                styles.urlButton,
                styles.shareUrlButton,
              ]}
              onPress={handleShareUrl}
            >
              <Text
                style={
                  styles.shareUrlButtonText
                }
              >
                ↗  Share URL
              </Text>
            </Pressable>

          </View>


          {/* Server Controls */}

          <View style={styles.controls}>

            <Pressable
              style={[
                styles.controlButton,
                styles.pauseButton,
              ]}
              onPress={
                handlePauseResume
              }
            >
              <Text
                style={
                  styles.pauseButtonText
                }
              >
                {paused
                  ? '▶  Resume'
                  : 'Ⅱ  Pause'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.controlButton,
                styles.stopButton,
              ]}
              onPress={
                handleStopServer
              }
            >
              <Text
                style={
                  styles.stopButtonText
                }
              >
                ■  Stop
              </Text>
            </Pressable>

          </View>

        </View>
      ) : (

        /* Empty Server Card */

        <View style={styles.heroCard}>

          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>
              ↗
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Direct File Sharing
          </Text>

          <Text style={styles.heroText}>
            Your phone becomes the file
            server. Other devices can
            download directly from your
            phone using a browser.
          </Text>

          <View style={styles.featureRow}>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>
                ⚡
              </Text>

              <Text style={styles.featureText}>
                Direct
              </Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>
                🔒
              </Text>

              <Text style={styles.featureText}>
                Private
              </Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>
                📱
              </Text>

              <Text style={styles.featureText}>
                Any Browser
              </Text>
            </View>

          </View>

        </View>
      )}


      {/* Select Files */}

      <Pressable
        style={[
          styles.selectButton,
          loading &&
            styles.disabledButton,
        ]}
        onPress={
          handleSelectFiles
        }
        disabled={loading}
      >

        <View style={styles.selectIcon}>
          <Text style={styles.selectIconText}>
            +
          </Text>
        </View>

        <View style={styles.selectContent}>

          <Text style={styles.selectTitle}>
            Select Files
          </Text>

          <Text style={styles.selectSubtitle}>
            Choose photos, videos or documents
          </Text>

        </View>

        <Text style={styles.arrow}>
          ›
        </Text>

      </Pressable>


      {/* Selected Files */}

      {selectedFiles.length > 0 && (

        <View style={styles.filesCard}>

          <View style={styles.filesHeader}>

            <View>
              <Text style={styles.filesTitle}>
                Selected Files
              </Text>

              <Text style={styles.filesSubtitle}>
                {selectedFiles.length}{' '}
                {selectedFiles.length === 1
                  ? 'file'
                  : 'files'}
              </Text>
            </View>

            <View style={styles.sizeBadge}>
              <Text style={styles.sizeBadgeText}>
                {formatSize(totalSize)}
              </Text>
            </View>

          </View>


          {selectedFiles.map(
            (file, index) => (

              <View
                key={`${file.uri}-${index}`}
                style={styles.fileRow}
              >

                <View style={styles.fileIcon}>
                  <Text style={styles.fileIconText}>
                    {file.mimeType?.startsWith(
                      'image/'
                    )
                      ? '🖼️'
                      : file.mimeType?.startsWith(
                          'video/'
                        )
                      ? '🎬'
                      : '📄'}
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


          {!serverInfo && (

            <Pressable
              style={[
                styles.createButton,
                loading &&
                  styles.disabledButton,
              ]}
              onPress={
                handleCreateServer
              }
              disabled={loading}
            >

              <Text
                style={
                  styles.createButtonText
                }
              >
                {loading
                  ? 'Starting Server...'
                  : 'Create Internet Link'}
              </Text>

              {!loading && (
                <Text
                  style={
                    styles.createArrow
                  }
                >
                  →
                </Text>
              )}

            </Pressable>

          )}

        </View>
      )}


      {/* Bottom information */}

      <View style={styles.securityNote}>

        <Text style={styles.securityIcon}>
          ℹ
        </Text>

        <Text style={styles.securityText}>
          Keep this screen open while
          someone is downloading your files.
        </Text>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#6b7280',
  },

  globe: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e7ff',
  },

  globeText: {
    fontSize: 25,
  },


  /* Hero */

  heroCard: {
    marginTop: 25,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
  },

  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
  },

  heroIconText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '700',
  },

  heroTitle: {
    marginTop: 16,
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  heroText: {
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 21,
    color: '#6b7280',
    fontSize: 14,
  },

  featureRow: {
    width: '100%',
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  feature: {
    alignItems: 'center',
  },

  featureIcon: {
    fontSize: 19,
  },

  featureText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },


  /* Select */

  selectButton: {
    marginTop: 18,
    padding: 17,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectIconText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '400',
  },

  selectContent: {
    flex: 1,
    marginLeft: 13,
  },

  selectTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  selectSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
  },

  arrow: {
    color: '#fff',
    fontSize: 28,
    marginLeft: 10,
  },


  /* Files */

  filesCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  filesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  filesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  filesSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#6b7280',
  },

  sizeBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },

  sizeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  fileRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },

  fileIconText: {
    fontSize: 20,
  },

  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },

  fileSize: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },

  createButton: {
    marginTop: 15,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  createArrow: {
    marginLeft: 9,
    color: '#fff',
    fontSize: 19,
  },


  /* Server */

  statusCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#10b981',
  },

  statusDotPaused: {
    backgroundColor: '#f59e0b',
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  statusSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#6b7280',
  },

  liveBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
  },

  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },

  infoGrid: {
    marginTop: 18,
    flexDirection: 'row',
  },

  infoItem: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
  },

  infoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },

  urlLabel: {
    marginTop: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#9ca3af',
  },

  urlBox: {
    marginTop: 7,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  urlText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1d4ed8',
  },

  urlActions: {
    marginTop: 10,
    flexDirection: 'row',
  },

  urlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },

  shareUrlButton: {
    backgroundColor: '#eff6ff',
  },

  shareUrlButtonText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 13,
  },

  controls: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },

  controlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },

  pauseButton: {
    backgroundColor: '#fef3c7',
  },

  pauseButtonText: {
    color: '#92400e',
    fontWeight: '800',
    fontSize: 13,
  },

  stopButton: {
    backgroundColor: '#fee2e2',
  },

  stopButtonText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 13,
  },


  /* Bottom */

  securityNote: {
    marginTop: 18,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  securityIcon: {
    width: 23,
    height: 23,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 23,
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    fontWeight: '800',
  },

  securityText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
  },

  disabledButton: {
    opacity: 0.6,
  },

});