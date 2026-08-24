import React, {
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
} from 'react-native';

import {
  pickFiles,
} from '@/lib/nativeFilePicker';

import {
  startLocalServer,
  stopLocalServer,
  getNetworkInfo,
  ServerInfo,
  NetworkInfo,
} from '@/lib/nativeDropLink';


export default function TabOneScreen() {

  const [
    serverInfo,
    setServerInfo,
  ] =
    useState<ServerInfo | null>(
      null
    );


  const [
    networkInfo,
    setNetworkInfo,
  ] =
    useState<NetworkInfo | null>(
      null
    );


  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<
      Awaited<
        ReturnType<
          typeof pickFiles
        >
      >
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  // =========================================================
  // FORMAT SIZE
  // =========================================================

  const formatSize = (
    bytes: number
  ) => {

    if (
      bytes < 1024
    ) {

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
      (
        1024 *
        1024 *
        1024
      )
    ).toFixed(2)} GB`;
  };


  // =========================================================
  // START LOCAL SHARE
  // =========================================================

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


      setNetworkInfo(
        network
      );


      if (
        !network.connected
      ) {

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


      if (
        files.length === 0
      ) {

        return;
      }


      console.log(
        'SELECTED FILES:',
        files
      );


      setSelectedFiles(
        files
      );


      /*
       * Start Local Share server.
       *
       * The server now supports:
       *
       * GET  /download
       * POST /upload
       *
       * Therefore the browser can
       * both download and upload.
       */
      const info =
        await startLocalServer(
          files
        );


      console.log(
        'SERVER INFO:',
        info
      );


      setServerInfo(
        info
      );


      Alert.alert(
        'DropLink Ready',
        'Your device can now send and receive files.\n\n' +
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


  // =========================================================
  // STOP SERVER
  // =========================================================

  const handleStop = async () => {

    try {

      await stopLocalServer();


      setServerInfo(
        null
      );


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


  // =========================================================
  // SHARE URL
  // =========================================================

  const handleShareUrl = async () => {

    if (
      !serverInfo?.url
    ) {

      return;
    }


    try {

      await Share.share({

        message:
          `Send and receive files with DropLink:\n${serverInfo.url}`,

        url:
          serverInfo.url,
      });


    } catch (error) {

      console.error(
        'SHARE URL ERROR:',
        error
      );


      Alert.alert(
        'Share Error',
        String(error)
      );
    }
  };


  // =========================================================
  // TOTAL SIZE
  // =========================================================

  const totalSize =
    selectedFiles.reduce(
      (
        total,
        file
      ) =>
        total +
        (
          file.size ??
          0
        ),
      0
    );


  // =========================================================
  // FILE ICON
  // =========================================================

  const getFileIcon = (
    mimeType?: string | null
  ) => {

    if (
      mimeType?.startsWith(
        'image/'
      )
    ) {

      return '🖼️';
    }


    if (
      mimeType?.startsWith(
        'video/'
      )
    ) {

      return '🎬';
    }


    if (
      mimeType?.startsWith(
        'audio/'
      )
    ) {

      return '🎵';
    }


    if (
      mimeType ===
      'application/pdf'
    ) {

      return '📕';
    }


    if (
      mimeType?.includes(
        'zip'
      ) ||
      mimeType?.includes(
        'rar'
      ) ||
      mimeType?.includes(
        'compressed'
      )
    ) {

      return '🗜️';
    }


    return '📄';
  };


  // =========================================================
  // UI
  // =========================================================

  return (

    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <View
        style={
          styles.header
        }
      >

        <View>

          <Text
            style={
              styles.title
            }
          >
            Local Share
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            Fast file sharing on your network
          </Text>

        </View>


        <View
          style={
            styles.iconBox
          }
        >

          <Text
            style={
              styles.iconText
            }
          >
            📡
          </Text>

        </View>

      </View>


      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      {!serverInfo && (

        <View
          style={
            styles.heroCard
          }
        >

          <View
            style={
              styles.heroIcon
            }
          >

            <Text
              style={
                styles.heroIconText
              }
            >
              ⚡
            </Text>

          </View>


          <Text
            style={
              styles.heroTitle
            }
          >
            Direct Device Sharing
          </Text>


          <Text
            style={
              styles.heroText
            }
          >
            Select files and share them
            directly with another device
            connected to the same network.
            {'\n\n'}
            The other device can both
            download your files and
            upload files to your device.
          </Text>


          <View
            style={
              styles.featureRow
            }
          >

            <View
              style={
                styles.feature
              }
            >

              <Text
                style={
                  styles.featureIcon
                }
              >
                ⚡
              </Text>


              <Text
                style={
                  styles.featureText
                }
              >
                Fast
              </Text>

            </View>


            <View
              style={
                styles.feature
              }
            >

              <Text
                style={
                  styles.featureIcon
                }
              >
                ↕️
              </Text>


              <Text
                style={
                  styles.featureText
                }
              >
                Send & Receive
              </Text>

            </View>


            <View
              style={
                styles.feature
              }
            >

              <Text
                style={
                  styles.featureIcon
                }
              >
                🔒
              </Text>


              <Text
                style={
                  styles.featureText
                }
              >
                Direct
              </Text>

            </View>

          </View>

        </View>

      )}


      {/* ================================================= */}
      {/* SELECT BUTTON */}
      {/* ================================================= */}

      <Pressable
        style={[
          styles.selectButton,
          loading &&
            styles.disabledButton,
        ]}
        onPress={
          handleShare
        }
        disabled={
          loading
        }
      >

        <View
          style={
            styles.selectIcon
          }
        >

          <Text
            style={
              styles.selectIconText
            }
          >
            +
          </Text>

        </View>


        <View
          style={
            styles.selectContent
          }
        >

          <Text
            style={
              styles.selectTitle
            }
          >
            {loading
              ? 'Starting Server...'
              : 'Select & Share'}
          </Text>


          <Text
            style={
              styles.selectSubtitle
            }
          >
            Choose photos, videos or documents
          </Text>

        </View>


        <Text
          style={
            styles.arrow
          }
        >
          ›
        </Text>

      </Pressable>


      {/* ================================================= */}
      {/* NETWORK */}
      {/* ================================================= */}

      {networkInfo && (

        <View
          style={
            styles.networkCard
          }
        >

          <View
            style={
              styles.networkHeader
            }
          >

            <View
              style={
                styles.networkLeft
              }
            >

              <View
                style={[
                  styles.networkDot,
                  !networkInfo.connected &&
                    styles.networkDotOff,
                ]}
              />


              <View>

                <Text
                  style={
                    styles.networkTitle
                  }
                >
                  Network
                </Text>


                <Text
                  style={
                    styles.networkStatus
                  }
                >
                  {networkInfo.connected
                    ? 'Connected'
                    : 'Disconnected'}
                </Text>

              </View>

            </View>


            <View
              style={
                styles.networkBadge
              }
            >

              <Text
                style={
                  styles.networkBadgeText
                }
              >
                {networkInfo.type}
              </Text>

            </View>

          </View>


          {networkInfo.ip && (

            <View
              style={
                styles.ipBox
              }
            >

              <Text
                style={
                  styles.ipLabel
                }
              >
                DEVICE ADDRESS
              </Text>


              <Text
                style={
                  styles.ipText
                }
                selectable
              >
                {networkInfo.ip}
              </Text>

            </View>

          )}

        </View>

      )}


      {/* ================================================= */}
      {/* SELECTED FILES */}
      {/* ================================================= */}

      {selectedFiles.length > 0 && (

        <View
          style={
            styles.filesCard
          }
        >

          <View
            style={
              styles.filesHeader
            }
          >

            <View>

              <Text
                style={
                  styles.filesTitle
                }
              >
                Shared Files
              </Text>


              <Text
                style={
                  styles.filesSubtitle
                }
              >
                {selectedFiles.length}{' '}
                {selectedFiles.length === 1
                  ? 'file'
                  : 'files'}
              </Text>

            </View>


            <View
              style={
                styles.sizeBadge
              }
            >

              <Text
                style={
                  styles.sizeBadgeText
                }
              >
                {formatSize(
                  totalSize
                )}
              </Text>

            </View>

          </View>


          {selectedFiles.map(
            (
              file,
              index
            ) => (

              <View
                key={
                  `${file.uri}-${index}`
                }
                style={
                  styles.fileRow
                }
              >

                <View
                  style={
                    styles.fileIcon
                  }
                >

                  <Text
                    style={
                      styles.fileIconText
                    }
                  >
                    {getFileIcon(
                      file.mimeType
                    )}
                  </Text>

                </View>


                <View
                  style={
                    styles.fileInfo
                  }
                >

                  <Text
                    style={
                      styles.fileName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {file.name}
                  </Text>


                  <Text
                    style={
                      styles.fileSize
                    }
                  >
                    {formatSize(
                      file.size ??
                      0
                    )}
                  </Text>

                </View>

              </View>

            )
          )}

        </View>

      )}


      {/* ================================================= */}
      {/* SERVER */}
      {/* ================================================= */}

      {serverInfo && (

        <View
          style={
            styles.serverCard
          }
        >

          <View
            style={
              styles.serverHeader
            }
          >

            <View
              style={
                styles.serverLeft
              }
            >

              <View
                style={
                  styles.serverDot
                }
              />


              <View>

                <Text
                  style={
                    styles.serverTitle
                  }
                >
                  Server Running
                </Text>


                <Text
                  style={
                    styles.serverSubtitle
                  }
                >
                  Ready to send & receive files
                </Text>

              </View>

            </View>


            <View
              style={
                styles.liveBadge
              }
            >

              <Text
                style={
                  styles.liveText
                }
              >
                LIVE
              </Text>

            </View>

          </View>


          {/* ================================================= */}
          {/* SEND & RECEIVE STATUS */}
          {/* ================================================= */}

          <View
            style={
              styles.directionRow
            }
          >

            <View
              style={
                styles.directionCard
              }
            >

              <Text
                style={
                  styles.directionIcon
                }
              >
                ↓
              </Text>


              <View>

                <Text
                  style={
                    styles.directionTitle
                  }
                >
                  Receive
                </Text>


                <Text
                  style={
                    styles.directionText
                  }
                >
                  Browser can upload
                </Text>

              </View>

            </View>


            <View
              style={
                styles.directionCard
              }
            >

              <Text
                style={
                  styles.directionIcon
                }
              >
                ↑
              </Text>


              <View>

                <Text
                  style={
                    styles.directionTitle
                  }
                >
                  Send
                </Text>


                <Text
                  style={
                    styles.directionText
                  }
                >
                  Browser can download
                </Text>

              </View>

            </View>

          </View>


          {/* ================================================= */}
          {/* URL */}
          {/* ================================================= */}

          <Text
            style={
              styles.urlLabel
            }
          >
            SHARE URL
          </Text>


          <View
            style={
              styles.urlBox
            }
          >

            <Text
              style={
                styles.urlText
              }
              selectable
            >
              {serverInfo.url}
            </Text>

          </View>


          <Pressable
            style={
              styles.shareUrlButton
            }
            onPress={
              handleShareUrl
            }
          >

            <Text
              style={
                styles.shareUrlButtonText
              }
            >
              ↗  Share URL
            </Text>

          </Pressable>


          {/* ================================================= */}
          {/* SERVER INFO */}
          {/* ================================================= */}

          <View
            style={
              styles.serverInfoRow
            }
          >

            <View>

              <Text
                style={
                  styles.infoLabel
                }
              >
                IP ADDRESS
              </Text>


              <Text
                style={
                  styles.infoValue
                }
              >
                {serverInfo.ip}
              </Text>

            </View>


            <View>

              <Text
                style={
                  styles.infoLabel
                }
              >
                PORT
              </Text>


              <Text
                style={
                  styles.infoValue
                }
              >
                {serverInfo.port}
              </Text>

            </View>

          </View>


          {/* ================================================= */}
          {/* STOP */}
          {/* ================================================= */}

          <Pressable
            style={
              styles.stopButton
            }
            onPress={
              handleStop
            }
          >

            <Text
              style={
                styles.stopButtonText
              }
            >
              ■  Stop Server
            </Text>

          </Pressable>

        </View>

      )}


      {/* ================================================= */}
      {/* INFORMATION */}
      {/* ================================================= */}

      <View
        style={
          styles.infoNote
        }
      >

        <Text
          style={
            styles.infoIcon
          }
        >
          ℹ
        </Text>


        <Text
          style={
            styles.infoText
          }
        >
          Keep this screen open while
          another device is connected.
          The browser can download your
          shared files and upload files
          directly to this device.
        </Text>

      </View>

    </ScrollView>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({

    screen: {

      flex: 1,

      backgroundColor:
        '#f8fafc',
    },


    container: {

      padding: 20,

      paddingBottom: 40,
    },


    // -------------------------------------------------------
    // HEADER
    // -------------------------------------------------------

    header: {

      marginTop: 20,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    title: {

      fontSize: 30,

      fontWeight:
        '800',

      color:
        '#111827',
    },


    subtitle: {

      marginTop: 5,

      fontSize: 14,

      color:
        '#6b7280',
    },


    iconBox: {

      width: 50,

      height: 50,

      borderRadius: 16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#dbeafe',
    },


    iconText: {

      fontSize: 24,
    },


    // -------------------------------------------------------
    // HERO
    // -------------------------------------------------------

    heroCard: {

      marginTop: 25,

      padding: 24,

      borderRadius: 24,

      backgroundColor:
        '#eff6ff',

      alignItems:
        'center',
    },


    heroIcon: {

      width: 70,

      height: 70,

      borderRadius: 22,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#2563eb',
    },


    heroIconText: {

      color: '#fff',

      fontSize: 34,
    },


    heroTitle: {

      marginTop: 16,

      fontSize: 21,

      fontWeight:
        '800',

      color:
        '#111827',
    },


    heroText: {

      marginTop: 9,

      textAlign:
        'center',

      lineHeight: 21,

      fontSize: 14,

      color:
        '#6b7280',
    },


    featureRow: {

      width: '100%',

      marginTop: 22,

      flexDirection:
        'row',

      justifyContent:
        'space-around',
    },


    feature: {

      alignItems:
        'center',
    },


    featureIcon: {

      fontSize: 19,
    },


    featureText: {

      marginTop: 5,

      fontSize: 12,

      fontWeight:
        '600',

      color:
        '#4b5563',

      textAlign:
        'center',
    },


    // -------------------------------------------------------
    // SELECT
    // -------------------------------------------------------

    selectButton: {

      marginTop: 18,

      padding: 17,

      borderRadius: 18,

      backgroundColor:
        '#2563eb',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    selectIcon: {

      width: 46,

      height: 46,

      borderRadius: 14,

      alignItems:
        'center',

      justifyContent:
        'center',

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

      fontWeight:
        '800',
    },


    selectSubtitle: {

      marginTop: 3,

      color:
        'rgba(255,255,255,0.78)',

      fontSize: 12,
    },


    arrow: {

      color: '#fff',

      fontSize: 28,
    },


    disabledButton: {

      opacity: 0.6,
    },


    // -------------------------------------------------------
    // NETWORK
    // -------------------------------------------------------

    networkCard: {

      marginTop: 18,

      padding: 18,

      borderRadius: 20,

      backgroundColor:
        '#fff',

      borderWidth: 1,

      borderColor:
        '#e5e7eb',
    },


    networkHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    networkLeft: {

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    networkDot: {

      width: 11,

      height: 11,

      borderRadius: 6,

      marginRight: 10,

      backgroundColor:
        '#10b981',
    },


    networkDotOff: {

      backgroundColor:
        '#ef4444',
    },


    networkTitle: {

      fontSize: 16,

      fontWeight:
        '800',

      color:
        '#111827',
    },


    networkStatus: {

      marginTop: 2,

      fontSize: 12,

      color:
        '#6b7280',
    },


    networkBadge: {

      maxWidth: 140,

      paddingHorizontal: 9,

      paddingVertical: 6,

      borderRadius: 9,

      backgroundColor:
        '#eff6ff',
    },


    networkBadgeText: {

      fontSize: 11,

      fontWeight:
        '700',

      color:
        '#2563eb',
    },


    ipBox: {

      marginTop: 15,

      padding: 12,

      borderRadius: 11,

      backgroundColor:
        '#f8fafc',
    },


    ipLabel: {

      fontSize: 9,

      fontWeight:
        '800',

      color:
        '#9ca3af',
    },


    ipText: {

      marginTop: 5,

      fontSize: 13,

      color:
        '#374151',
    },


    // -------------------------------------------------------
    // FILES
    // -------------------------------------------------------

    filesCard: {

      marginTop: 18,

      padding: 18,

      borderRadius: 20,

      backgroundColor:
        '#fff',

      borderWidth: 1,

      borderColor:
        '#e5e7eb',
    },


    filesHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 8,
    },


    filesTitle: {

      fontSize: 18,

      fontWeight:
        '800',

      color:
        '#111827',
    },


    filesSubtitle: {

      marginTop: 3,

      fontSize: 13,

      color:
        '#6b7280',
    },


    sizeBadge: {

      paddingHorizontal: 11,

      paddingVertical: 7,

      borderRadius: 10,

      backgroundColor:
        '#f3f4f6',
    },


    sizeBadgeText: {

      fontSize: 12,

      fontWeight:
        '700',

      color:
        '#374151',
    },


    fileRow: {

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    fileIcon: {

      width: 44,

      height: 44,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#f3f4f6',
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

      fontWeight:
        '700',

      color:
        '#1f2937',
    },


    fileSize: {

      marginTop: 4,

      fontSize: 12,

      color:
        '#6b7280',
    },


    // -------------------------------------------------------
    // SERVER
    // -------------------------------------------------------

    serverCard: {

      marginTop: 18,

      padding: 18,

      borderRadius: 22,

      backgroundColor:
        '#fff',

      borderWidth: 1,

      borderColor:
        '#bbf7d0',
    },


    serverHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    serverLeft: {

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    serverDot: {

      width: 11,

      height: 11,

      borderRadius: 6,

      marginRight: 10,

      backgroundColor:
        '#10b981',
    },


    serverTitle: {

      fontSize: 17,

      fontWeight:
        '800',

      color:
        '#111827',
    },


    serverSubtitle: {

      marginTop: 3,

      fontSize: 12,

      color:
        '#6b7280',
    },


    liveBadge: {

      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 8,

      backgroundColor:
        '#d1fae5',
    },


    liveText: {

      fontSize: 10,

      fontWeight:
        '800',

      color:
        '#047857',
    },


    // -------------------------------------------------------
    // SEND / RECEIVE
    // -------------------------------------------------------

    directionRow: {

      marginTop: 16,

      flexDirection:
        'row',

      gap: 10,
    },


    directionCard: {

      flex: 1,

      minHeight: 72,

      padding: 12,

      borderRadius: 14,

      backgroundColor:
        '#f8fafc',

      borderWidth: 1,

      borderColor:
        '#e5e7eb',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    directionIcon: {

      width: 34,

      height: 34,

      borderRadius: 10,

      textAlign:
        'center',

      lineHeight: 34,

      fontSize: 22,

      fontWeight:
        '800',

      backgroundColor:
        '#dbeafe',

      color:
        '#2563eb',

      marginRight: 9,
    },


    directionTitle: {

      fontSize: 13,

      fontWeight:
        '800',

      color:
        '#111827',
    },


    directionText: {

      marginTop: 3,

      fontSize: 10,

      color:
        '#6b7280',
    },


    // -------------------------------------------------------
    // URL
    // -------------------------------------------------------

    urlLabel: {

      marginTop: 18,

      fontSize: 10,

      fontWeight:
        '800',

      color:
        '#9ca3af',
    },


    urlBox: {

      marginTop: 7,

      padding: 13,

      borderRadius: 12,

      backgroundColor:
        '#f8fafc',

      borderWidth: 1,

      borderColor:
        '#e5e7eb',
    },


    urlText: {

      fontSize: 13,

      lineHeight: 20,

      color:
        '#2563eb',
    },


    shareUrlButton: {

      marginTop: 10,

      paddingVertical: 13,

      borderRadius: 12,

      alignItems:
        'center',

      backgroundColor:
        '#2563eb',
    },


    shareUrlButtonText: {

      color: '#fff',

      fontSize: 14,

      fontWeight:
        '800',
    },


    // -------------------------------------------------------
    // SERVER INFO
    // -------------------------------------------------------

    serverInfoRow: {

      marginTop: 15,

      flexDirection:
        'row',

      gap: 30,
    },


    infoLabel: {

      fontSize: 9,

      fontWeight:
        '800',

      color:
        '#9ca3af',
    },


    infoValue: {

      marginTop: 4,

      maxWidth: 190,

      fontSize: 13,

      fontWeight:
        '600',

      color:
        '#374151',
    },


    // -------------------------------------------------------
    // STOP
    // -------------------------------------------------------

    stopButton: {

      marginTop: 16,

      paddingVertical: 13,

      borderRadius: 12,

      alignItems:
        'center',

      backgroundColor:
        '#fee2e2',
    },


    stopButtonText: {

      color:
        '#b91c1c',

      fontSize: 14,

      fontWeight:
        '800',
    },


    // -------------------------------------------------------
    // INFO
    // -------------------------------------------------------

    infoNote: {

      marginTop: 18,

      paddingHorizontal: 6,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    infoIcon: {

      width: 23,

      height: 23,

      borderRadius: 12,

      textAlign:
        'center',

      lineHeight: 23,

      backgroundColor:
        '#dbeafe',

      color:
        '#2563eb',

      fontWeight:
        '800',
    },


    infoText: {

      flex: 1,

      marginLeft: 9,

      fontSize: 12,

      lineHeight: 18,

      color:
        '#6b7280',
    },

  });