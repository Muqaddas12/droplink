import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { pickFiles } from '@/lib/nativeFilePicker';

import {
  addLocalShareFiles,
  getLocalReceivedFiles,
  getLocalServerStatus,
  getLocalSharedFiles,
  getNetworkInfo,
  ReceivedFile,
  ServerInfo,
  ServerStatus,
  SharedFile,
  startLocalServer,
  stopLocalServer,
} from '@/lib/nativeDropLink';

export default function TabOneScreen() {
  // =========================================================
  // STATE
  // =========================================================

  const [serverInfo, setServerInfo] =
    useState<ServerInfo | null>(null);

  const [serverStatus, setServerStatus] =
    useState<ServerStatus | null>(null);

  const [sharedFiles, setSharedFiles] =
    useState<SharedFile[]>([]);

  const [receivedFiles, setReceivedFiles] =
    useState<ReceivedFile[]>([]);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [isServerStarted, setIsServerStarted] =
    useState(false);

  // =========================================================
  // FORMAT SIZE
  // =========================================================

  const formatSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // =========================================================
  // FILE ICON
  // =========================================================

  const getFileIcon = (mimeType?: string | null) => {
    if (mimeType?.startsWith('image/')) {
      return '🖼️';
    }

    if (mimeType?.startsWith('video/')) {
      return '🎬';
    }

    if (mimeType?.startsWith('audio/')) {
      return '🎵';
    }

    if (mimeType === 'application/pdf') {
      return '📕';
    }

    if (
      mimeType?.includes('zip') ||
      mimeType?.includes('rar') ||
      mimeType?.includes('compressed')
    ) {
      return '🗜️';
    }

    return '📄';
  };

  // =========================================================
  // RECEIVED FILE ICON
  // =========================================================

  const getReceivedFileIcon = (
    category?: string,
    mimeType?: string,
  ) => {
    const type = category?.toLowerCase();

    if (type === 'images') {
      return '🖼️';
    }

    if (type === 'videos') {
      return '🎬';
    }

    if (type === 'audio') {
      return '🎵';
    }

    if (type === 'archives') {
      return '🗜️';
    }

    if (mimeType?.startsWith('image/')) {
      return '🖼️';
    }

    if (mimeType?.startsWith('video/')) {
      return '🎬';
    }

    if (mimeType?.startsWith('audio/')) {
      return '🎵';
    }

    return '📄';
  };

  // =========================================================
  // OPEN RECEIVED FILE
  // =========================================================

  const getFileOpenUri = (path: string) => {
    if (
      path.startsWith('content://') ||
      path.startsWith('file://') ||
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      return path;
    }

    return `file://${path}`;
  };

  const openReceivedFile = async (file: ReceivedFile) => {
    try {
      const uri = getFileOpenUri(file.path);

      // Let Android choose the appropriate installed application
      // for the received file.
      const canOpen = await Linking.canOpenURL(uri);

      if (!canOpen) {
        Alert.alert(
          'Cannot Open File',
          `No installed app can open "${file.name}".`,
          [
            {
              text: 'Share',
              onPress: async () => {
                try {
                  await Share.share({
                    title: file.name,
                    message: file.name,
                    url: uri,
                  });
                } catch (shareError) {
                  console.error(
                    'SHARE RECEIVED FILE ERROR:',
                    shareError,
                  );
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
        );
        return;
      }

      await Linking.openURL(uri);
    } catch (error) {
      console.error('OPEN RECEIVED FILE ERROR:', error);

      Alert.alert(
        'Cannot Open File',
        `Could not open "${file.name}".`,
        [
          {
            text: 'Share',
            onPress: async () => {
              try {
                const uri = getFileOpenUri(file.path);

                await Share.share({
                  title: file.name,
                  message: file.name,
                  url: uri,
                });
              } catch (shareError) {
                console.error(
                  'SHARE RECEIVED FILE ERROR:',
                  shareError,
                );
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
    }
  };

  const handleReceivedFilePress = (file: ReceivedFile) => {
    void openReceivedFile(file);
  };

  // =========================================================
  // LOAD SERVER DATA
  // =========================================================

  const loadServerData = useCallback(async () => {
    // =======================================================
    // RECEIVED FILES
    // =======================================================
    // Received files are persistent local data. They must be
    // loaded even when the local server is stopped.
    try {
      const received = await getLocalReceivedFiles();
      setReceivedFiles(received);
    } catch (error) {
      console.error('LOAD RECEIVED FILES ERROR:', error);
    }

    // =======================================================
    // SERVER STATUS
    // =======================================================
    try {
      const status = await getLocalServerStatus();

      setServerStatus(status);
      setIsServerStarted(status.running);

      if (status.running && status.ip && status.url) {
        setServerInfo({
          ip: status.ip,
          port: status.port,
          url: status.url,
        });
      } else {
        setServerInfo(null);
      }
    } catch (error) {
      console.error('LOAD SERVER STATUS ERROR:', error);
      setIsServerStarted(false);
      setServerInfo(null);
    }

    // =======================================================
    // SHARED FILES
    // =======================================================
    try {
      const files = await getLocalSharedFiles();
      setSharedFiles(files);
    } catch (error) {
      console.error('LOAD SHARED FILES ERROR:', error);
    }
  }, []);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    void loadServerData();
  }, [loadServerData]);

  // =========================================================
  // RELOAD WHEN APP BECOMES ACTIVE
  // =========================================================
  // This is important for persistent received files. If the
  // server was stopped while the screen/app was in the
  // background, refresh the local file list when the user
  // returns to DropLink.

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          void loadServerData();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [loadServerData]);

  // =========================================================
  // AUTO REFRESH WHILE SERVER IS RUNNING
  // =========================================================
  //
  // This keeps the received-file list current while another
  // device is uploading files to this phone.
  //
  // The server is NOT restarted and the IP/port do not change.
  // When the server is stopped, polling is automatically removed.
  //

  useEffect(() => {
    if (!isServerStarted) {
      return;
    }

    const interval = setInterval(() => {
      void loadServerData();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isServerStarted, loadServerData]);

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadServerData();
    } finally {
      setRefreshing(false);
    }
  };

  // =========================================================
  // SELECT / ADD FILES
  // =========================================================

  const handleSelectFiles = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      // -----------------------------------------------------
      // NETWORK
      // -----------------------------------------------------

      const network = await getNetworkInfo();

      if (!network.connected) {
        Alert.alert(
          'No Network',
          'Please connect to a Wi-Fi network before sharing.',
        );

        return;
      }

      // -----------------------------------------------------
      // PICK FILES
      // -----------------------------------------------------

      const files = await pickFiles();

      if (!files.length) {
        return;
      }

      // -----------------------------------------------------
      // START NEW SERVER
      // -----------------------------------------------------

      if (!isServerStarted) {
        const info = await startLocalServer(files);

        setServerInfo(info);

        setIsServerStarted(true);

        await loadServerData();

        Alert.alert(
          'DropLink Ready',
          `Your device can now send and receive files.\n\n${info.url}`,
        );

        return;
      }

      // -----------------------------------------------------
      // SERVER ALREADY RUNNING
      // -----------------------------------------------------

      const existingUris = new Set(
        sharedFiles.map(file => file.uri),
      );

      const newFiles = files.filter(
        file => !existingUris.has(file.uri),
      );

      if (!newFiles.length) {
        Alert.alert(
          'Already Added',
          'All selected files are already being shared.',
        );

        return;
      }

      // -----------------------------------------------------
      // ADD WITHOUT STOPPING SERVER
      // -----------------------------------------------------

      await addLocalShareFiles(newFiles);

      // Refresh native list so downloadCount/index/etc.
      // always come from the native server.
      await loadServerData();

      Alert.alert(
        'Files Added',
        `${newFiles.length} ${
          newFiles.length === 1
            ? 'file has'
            : 'files have'
        } been added to the running server.`,
      );
    } catch (error) {
      console.error('FILE SHARE ERROR:', error);

      Alert.alert(
        'Share Error',
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // STOP SERVER
  // =========================================================

  const handleStop = async () => {
    try {
      setLoading(true);

      await stopLocalServer();

      setServerInfo(null);
      setServerStatus(null);
      setSharedFiles([]);
      setIsServerStarted(false);

      // NEVER clear receivedFiles here.
      // They are persisted files and must remain visible when the
      // server is not running.
      try {
        const received = await getLocalReceivedFiles();
        setReceivedFiles(received);
      } catch (error) {
        console.error('LOAD RECEIVED FILES AFTER STOP ERROR:', error);
      }
    } catch (error) {
      console.error('STOP SERVER ERROR:', error);

      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SHARE URL
  // =========================================================

  const handleShareUrl = async () => {
    if (!serverInfo?.url) {
      return;
    }

    try {
      await Share.share({
        message:
          `Send and receive files with DropLink:\n` +
          serverInfo.url,
        url: serverInfo.url,
      });
    } catch (error) {
      console.error('SHARE URL ERROR:', error);

      Alert.alert(
        'Share Error',
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  };

  // =========================================================
  // TOTAL SHARED SIZE
  // =========================================================

  const totalSharedSize = sharedFiles.reduce(
    (total, file) => total + (file.size || 0),
    0,
  );

  // =========================================================
  // TOTAL RECEIVED SIZE
  // =========================================================

  const totalReceivedSize = receivedFiles.reduce(
    (total, file) => total + (file.size || 0),
    0,
  );

  // =========================================================
  // UI
  // =========================================================

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      {!isServerStarted && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              Local Share
            </Text>

            <Text style={styles.subtitle}>
              Fast file sharing on your network
            </Text>
          </View>

          <View style={styles.iconBox}>
            <Text style={styles.iconText}>
              📡
            </Text>
          </View>
        </View>
      )}

      {/* ================================================= */}
      {/* SERVER CARD */}
      {/* ================================================= */}

      {serverInfo && (
        <View style={styles.serverCard}>

          {/* SERVER HEADER */}

          <View style={styles.serverHeader}>

            {/* LEFT */}

            <View style={styles.serverIdentity}>
              <View style={styles.serverDot} />

              <View style={styles.serverIdentityText}>
                <Text
                  style={styles.serverTitle}
                  numberOfLines={1}
                >
                  Server Running
                </Text>

                <Text
                  style={styles.serverSubtitle}
                  numberOfLines={1}
                >
                  Ready to send & receive
                </Text>
              </View>
            </View>

            {/* RIGHT */}

            <View style={styles.serverStatus}>

              <View style={styles.networkInfo}>
                <Text style={styles.infoLabel}>
                  IP ADDRESS
                </Text>

                <Text
                  style={styles.infoValue}
                  numberOfLines={1}
                >
                  {serverInfo.ip}
                </Text>
              </View>

              <View style={styles.networkInfo}>
                <Text style={styles.infoLabel}>
                  PORT
                </Text>

                <Text style={styles.infoValue}>
                  {serverInfo.port}
                </Text>
              </View>

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />

                <Text style={styles.liveText}>
                  LIVE
                </Text>
              </View>

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
              numberOfLines={1}
            >
              {serverInfo.url}
            </Text>
          </View>

          {/* SHARE URL */}

          <Pressable
            style={styles.shareUrlButton}
            onPress={handleShareUrl}
          >
            <Text style={styles.shareUrlButtonText}>
              ↗ Share URL
            </Text>
          </Pressable>

          {/* SERVER STATS */}

          <View style={styles.statsRow}>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {sharedFiles.length}
              </Text>

              <Text style={styles.statLabel}>
                Shared
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {receivedFiles.length}
              </Text>

              <Text style={styles.statLabel}>
                Received
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {sharedFiles.reduce(
                  (total, file) =>
                    total + file.downloadCount,
                  0,
                )}
              </Text>

              <Text style={styles.statLabel}>
                Downloads
              </Text>
            </View>

          </View>

          {/* STOP */}

          <Pressable
            style={styles.stopButton}
            onPress={handleStop}
            disabled={loading}
          >
            <Text style={styles.stopButtonText}>
              ■ Stop Server
            </Text>
          </Pressable>
        </View>
      )}

      {/* ================================================= */}
      {/* SELECT / ADD FILES */}
      {/* ================================================= */}

      <Pressable
        style={[
          styles.selectButton,
          loading && styles.disabledButton,
        ]}
        onPress={handleSelectFiles}
        disabled={loading}
      >
        <View style={styles.selectIcon}>
          <Text style={styles.selectIconText}>
            +
          </Text>
        </View>

        <View style={styles.selectContent}>
          <Text style={styles.selectTitle}>
            {loading
              ? isServerStarted
                ? 'Adding Files...'
                : 'Starting Server...'
              : isServerStarted
                ? 'Add More Files'
                : 'Select & Share'}
          </Text>

          <Text style={styles.selectSubtitle}>
            {isServerStarted
              ? 'Add files without stopping the server'
              : 'Choose photos, videos or documents'}
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>

      {/* ================================================= */}
      {/* SHARED FILES */}
      {/* ================================================= */}

      {sharedFiles.length > 0 && (
        <View style={styles.filesCard}>

          <View style={styles.filesHeader}>
            <View>
              <Text style={styles.filesTitle}>
                Shared Files
              </Text>

              <Text style={styles.filesSubtitle}>
                {sharedFiles.length}{' '}
                {sharedFiles.length === 1
                  ? 'file'
                  : 'files'}
                {' • '}
                {formatSize(totalSharedSize)}
              </Text>
            </View>

            <View style={styles.sizeBadge}>
              <Text style={styles.sizeBadgeText}>
                {sharedFiles.reduce(
                  (total, file) =>
                    total + file.downloadCount,
                  0,
                )}{' '}
                downloads
              </Text>
            </View>
          </View>

          {sharedFiles.map(file => (
            <View
              key={`${file.index}-${file.uri}`}
              style={styles.fileRow}
            >
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>
                  {getFileIcon(file.mimeType)}
                </Text>
              </View>

              <View style={styles.fileInfo}>
                <Text
                  style={styles.fileName}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>

                <View style={styles.fileMeta}>
                  <Text style={styles.fileSize}>
                    {formatSize(file.size)}
                  </Text>

                  <Text style={styles.downloadCount}>
                    ↓ {file.downloadCount}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ================================================= */}
      {/* RECEIVED FILES */}
      {/* ================================================= */}

      {receivedFiles.length > 0 && (
        <View style={styles.receivedCard}>

          <View style={styles.filesHeader}>
            <View>
              <Text style={styles.filesTitle}>
                {isServerStarted
                  ? 'Received Files'
                  : 'Recently Received'}
              </Text>

              <Text style={styles.filesSubtitle}>
                {receivedFiles.length}{' '}
                {receivedFiles.length === 1
                  ? 'file'
                  : 'files'}
                {' • '}
                {formatSize(totalReceivedSize)}
                {!isServerStarted ? ' • Saved on device' : ''}
              </Text>
            </View>

            <View style={styles.receivedBadge}>
              <Text style={styles.receivedBadgeText}>
                {isServerStarted ? 'RECEIVED' : 'RECENT'}
              </Text>
            </View>
          </View>

          {receivedFiles.map((file, index) => (
            <Pressable
              key={`${file.path}-${index}`}
              style={styles.receivedFilePressable}
              onPress={() => handleReceivedFilePress(file)}
              android_ripple={{ color: '#d1fae5' }}
            >
              <View style={styles.receivedIcon}>
                <Text style={styles.fileIconText}>
                  {getReceivedFileIcon(
                    file.category,
                    file.mimeType,
                  )}
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
                  {formatSize(file.size)}
                </Text>

                <Text
                  style={styles.fileCategory}
                  numberOfLines={1}
                >
                  {file.category}
                </Text>
              </View>

              <View style={styles.receivedOpenButton}>
                <Text style={styles.receivedOpenButtonText}>
                  ›
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* ================================================= */}
      {/* EMPTY STATE */}
      {/* ================================================= */}

      {!isServerStarted &&
        sharedFiles.length === 0 &&
        receivedFiles.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📁
            </Text>

            <Text style={styles.emptyTitle}>
              No received files yet
            </Text>

            <Text style={styles.emptyText}>
              Received files will stay here even after
              the server is stopped.
            </Text>
          </View>
        )}

      {/* ================================================= */}
      {/* INFO */}
      {/* ================================================= */}

      <View style={styles.infoNote}>
        <Text style={styles.infoIcon}>
          ℹ
        </Text>

        <Text style={styles.infoText}>
          Keep this screen open while another device
          is connected. Devices can download your
          shared files and upload files directly to
          this device.
        </Text>
      </View>
    </ScrollView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#6b7280',
  },

  iconBox: {
    width: 50,
    height: 50,
    marginLeft: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },

  iconText: {
    fontSize: 24,
  },

  // =======================================================
  // SERVER
  // =======================================================

  serverCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },

  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  serverIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  serverIdentityText: {
    flex: 1,
    minWidth: 0,
  },

  serverDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#10b981',
  },

  serverTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  serverSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#6b7280',
  },

  serverStatus: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  networkInfo: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  infoLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#9ca3af',
  },

  infoValue: {
    marginTop: 2,
    maxWidth: 90,
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  liveBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
  },

  liveDot: {
    width: 5,
    height: 5,
    marginRight: 4,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },

  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },

  // =======================================================
  // URL
  // =======================================================

  urlLabel: {
    marginTop: 18,
    fontSize: 9,
    fontWeight: '800',
    color: '#9ca3af',
  },

  urlBox: {
    marginTop: 7,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  urlText: {
    fontSize: 13,
    color: '#2563eb',
  },

  shareUrlButton: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },

  shareUrlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  // =======================================================
  // SERVER STATS
  // =======================================================

  statsRow: {
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    marginTop: 2,
    fontSize: 10,
    color: '#6b7280',
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e5e7eb',
  },

  // =======================================================
  // SELECT
  // =======================================================

  selectButton: {
    marginTop: 18,
    padding: 17,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },

  selectIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  selectIconText: {
    color: '#ffffff',
    fontSize: 28,
  },

  selectContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  selectTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },

  selectSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
  },

  arrow: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 28,
  },

  disabledButton: {
    opacity: 0.6,
  },

  // =======================================================
  // SHARED FILES
  // =======================================================

  filesCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  filesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },

  sizeBadgeText: {
    fontSize: 11,
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

  receivedIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
  },

  receivedFilePressable: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },

  receivedOpenButton: {
    width: 32,
    height: 32,
    marginLeft: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
  },

  receivedOpenButtonText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
    color: '#059669',
  },

  fileIconText: {
    fontSize: 20,
  },

  fileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },

  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },

  fileMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  fileSize: {
    fontSize: 12,
    color: '#6b7280',
  },

  downloadCount: {
    marginLeft: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },

  // =======================================================
  // RECEIVED
  // =======================================================

  receivedCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },

  receivedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#d1fae5',
  },

  receivedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },

  fileCategory: {
    marginTop: 3,
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyCard: {
    marginTop: 18,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#6b7280',
  },

  // =======================================================
  // STOP
  // =======================================================

  stopButton: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },

  stopButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },

  // =======================================================
  // INFO
  // =======================================================

  infoNote: {
    marginTop: 18,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIcon: {
    width: 23,
    height: 23,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 23,
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    fontWeight: '800',
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
  },
});