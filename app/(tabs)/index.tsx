import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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

  const [selectedFiles, setSelectedFiles] =
    useState<
      Awaited<ReturnType<typeof pickFiles>>
    >([]);

  const [loading, setLoading] =
    useState(false);


  const handleShare = async () => {

    try {

      setLoading(true);

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
          'Please connect to a network before sharing.'
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

      setSelectedFiles(files);


      /*
       * Start zero-copy server.
       */
      const info =
        await startLocalServer(
          files
        );

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

    } finally {

      setLoading(false);

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


  const totalSize =
    selectedFiles.reduce(
      (total, file) =>
        total + (file.size ?? 0),
      0
    );


  return (

    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* Header */}

      <View style={styles.header}>

        <View>

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


      {/* Hero */}

      {!serverInfo && (

        <View style={styles.heroCard}>

          <View style={styles.heroIcon}>

            <Text style={styles.heroIconText}>
              ⚡
            </Text>

          </View>

          <Text style={styles.heroTitle}>
            Direct Device Sharing
          </Text>

          <Text style={styles.heroText}>
            Select files and share them
            directly with another device
            connected to the same network.
          </Text>


          <View style={styles.featureRow}>

            <View style={styles.feature}>

              <Text style={styles.featureIcon}>
                ⚡
              </Text>

              <Text style={styles.featureText}>
                Fast
              </Text>

            </View>


            <View style={styles.feature}>

              <Text style={styles.featureIcon}>
                📦
              </Text>

              <Text style={styles.featureText}>
                Zero Copy
              </Text>

            </View>


            <View style={styles.feature}>

              <Text style={styles.featureIcon}>
                🔒
              </Text>

              <Text style={styles.featureText}>
                Direct
              </Text>

            </View>

          </View>

        </View>

      )}


      {/* Select Button */}

      <Pressable
        style={[
          styles.selectButton,
          loading &&
            styles.disabledButton,
        ]}
        onPress={handleShare}
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
              ? 'Starting Server...'
              : 'Select & Share'}
          </Text>

          <Text style={styles.selectSubtitle}>
            Choose photos, videos or documents
          </Text>

        </View>


        <Text style={styles.arrow}>
          ›
        </Text>

      </Pressable>


      {/* Network */}

      {networkInfo && (

        <View style={styles.networkCard}>

          <View style={styles.networkHeader}>

            <View style={styles.networkLeft}>

              <View
                style={[
                  styles.networkDot,
                  !networkInfo.connected &&
                    styles.networkDotOff,
                ]}
              />

              <View>

                <Text style={styles.networkTitle}>
                  Network
                </Text>

                <Text style={styles.networkStatus}>
                  {networkInfo.connected
                    ? 'Connected'
                    : 'Disconnected'}
                </Text>

              </View>

            </View>


            <View style={styles.networkBadge}>

              <Text style={styles.networkBadgeText}>
                {networkInfo.type}
              </Text>

            </View>

          </View>


          {networkInfo.ip && (

            <View style={styles.ipBox}>

              <Text style={styles.ipLabel}>
                DEVICE ADDRESS
              </Text>

              <Text
                style={styles.ipText}
                selectable
              >
                {networkInfo.ip}
              </Text>

            </View>

          )}

        </View>

      )}


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

        </View>

      )}


      {/* Server */}

      {serverInfo && (

        <View style={styles.serverCard}>

          <View style={styles.serverHeader}>

            <View style={styles.serverLeft}>

              <View style={styles.serverDot} />

              <View>

                <Text style={styles.serverTitle}>
                  Server Running
                </Text>

                <Text style={styles.serverSubtitle}>
                  Ready for local downloads
                </Text>

              </View>

            </View>


            <View style={styles.liveBadge}>

              <Text style={styles.liveText}>
                LIVE
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


          <View style={styles.serverInfoRow}>

            <View>

              <Text style={styles.infoLabel}>
                IP ADDRESS
              </Text>

              <Text style={styles.infoValue}>
                {serverInfo.ip}
              </Text>

            </View>


            <View>

              <Text style={styles.infoLabel}>
                PORT
              </Text>

              <Text style={styles.infoValue}>
                {serverInfo.port}
              </Text>

            </View>

          </View>


          <Pressable
            style={styles.stopButton}
            onPress={handleStop}
          >

            <Text style={styles.stopButtonText}>
              ■  Stop Server
            </Text>

          </Pressable>

        </View>

      )}


      {/* Information */}

      <View style={styles.infoNote}>

        <Text style={styles.infoIcon}>
          ℹ
        </Text>

        <Text style={styles.infoText}>
          Keep this screen open while
          another device is downloading
          your files.
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


  /* Header */

  header: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },

  iconText: {
    fontSize: 24,
  },


  /* Hero */

  heroCard: {
    marginTop: 25,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },

  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },

  heroIconText: {
    color: '#fff',
    fontSize: 34,
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
    fontSize: 14,
    color: '#6b7280',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  selectIconText: {
    color: '#fff',
    fontSize: 28,
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
  },

  disabledButton: {
    opacity: 0.6,
  },


  /* Network */

  networkCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  networkDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#10b981',
  },

  networkDotOff: {
    backgroundColor: '#ef4444',
  },

  networkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  networkStatus: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },

  networkBadge: {
    maxWidth: 140,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
  },

  networkBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },

  ipBox: {
    marginTop: 15,
    padding: 12,
    borderRadius: 11,
    backgroundColor: '#f8fafc',
  },

  ipLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9ca3af',
  },

  ipText: {
    marginTop: 5,
    fontSize: 13,
    color: '#374151',
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


  /* Server */

  serverCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },

  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  serverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#2563eb',
  },

  serverInfoRow: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 30,
  },

  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9ca3af',
  },

  infoValue: {
    marginTop: 4,
    maxWidth: 190,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

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


  /* Info */

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