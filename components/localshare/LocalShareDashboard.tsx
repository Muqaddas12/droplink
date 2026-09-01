import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Clipboard,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/context/ThemeContext';
import type { ReceivedFile, ServerInfo, SharedFile } from '@/lib/nativeDropLink';

type LocalShareDashboardProps = {
  isServerStarted: boolean;
  loading: boolean;
  refreshing: boolean;
  receivedFiles: ReceivedFile[];
  serverInfo: ServerInfo | null;
  sharedFiles: SharedFile[];
  totalReceivedSize: number;
  totalSharedSize: number;
  onOpenReceivedFile: (file: ReceivedFile) => void;
  onRefresh: () => void;
  onSelectFiles: () => void;
  onStartEmptyServer: () => void;
  onShareUrl: () => void;
  onStopServer: () => void;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const getCategoryIcon = (mimeType?: string | null, category?: string) => {
  const m = (mimeType || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (m.startsWith('image') || c === 'images') return '🖼️';
  if (m.startsWith('video') || c === 'videos') return '🎬';
  if (m.startsWith('audio') || c === 'audio') return '🎵';
  if (m.includes('pdf') || m.includes('document') || c === 'documents') return '📄';
  if (m.includes('zip') || m.includes('rar') || c === 'archives') return '📦';
  return '📎';
};

export default function LocalShareDashboard({
  isServerStarted,
  loading,
  refreshing,
  receivedFiles,
  serverInfo,
  sharedFiles,
  totalReceivedSize,
  totalSharedSize,
  onOpenReceivedFile,
  onRefresh,
  onSelectFiles,
  onStartEmptyServer,
  onShareUrl,
  onStopServer,
}: LocalShareDashboardProps) {
  const { colors, isDark } = useTheme();
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      const createAnimation = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      createAnimation(ring1, 0).start();
      createAnimation(ring2, 600).start();
      createAnimation(ring3, 1200).start();
    }
  }, [loading, ring1, ring2, ring3, isServerStarted]);

  const handleCopyUrl = () => {
    if (serverInfo?.url) {
      Clipboard.setString(serverInfo.url);
    }
  };

  const handleShareUrl = () => {
    if (serverInfo?.url) {
      Share.share({ message: serverInfo.url });
    }
    onShareUrl();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Starting server...</Text>
      </View>
    );
  }

  if (!isServerStarted) {
    return (
      <View style={[styles.idleContainer, { backgroundColor: colors.bg }]}>
        <View style={styles.heroAnimation}>
          {[ring1, ring2, ring3].map((ring, index) => (
            <Animated.View
              key={index}
              style={[
                styles.ring,
                {
                  backgroundColor: colors.primaryFade,
                  opacity: ring.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [0.6, 0.2, 0],
                  }),
                  transform: [
                    {
                      scale: ring.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 2.5],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
          <View style={[styles.centerIconContainer, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <Text style={styles.centerIcon}>⊕</Text>
          </View>
        </View>

        <Text style={[styles.headline, { color: colors.text }]}>Share Anything</Text>
        <Text style={[styles.subtext, { color: colors.subtext }]}>No cloud. No accounts. Same network.</Text>

        <View style={styles.actionCards}>
          <TouchableOpacity style={[styles.cardPrimary, { backgroundColor: colors.primary }]} onPress={onSelectFiles}>
            <Text style={styles.cardPrimaryText}>↑ Select Files</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardOutline, { borderColor: colors.border }]} onPress={onStartEmptyServer}>
            <Text style={[styles.cardOutlineText, { color: colors.text }]}>○ Start Empty</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trustRow}>
          <View style={[styles.trustChip, { backgroundColor: colors.surface2 }]}><Text style={[styles.trustChipText, { color: colors.subtext }]}>🔒 Private</Text></View>
          <View style={[styles.trustChip, { backgroundColor: colors.surface2 }]}><Text style={[styles.trustChipText, { color: colors.subtext }]}>⚡ LAN Speed</Text></View>
          <View style={[styles.trustChip, { backgroundColor: colors.surface2 }]}><Text style={[styles.trustChipText, { color: colors.subtext }]}>🌐 Browser Access</Text></View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* 1. Active Server Card */}
      <View style={[styles.serverCard, { backgroundColor: colors.surface1, borderColor: colors.primaryFade }]}>
        <View style={styles.serverHeader}>
          <View style={[styles.liveBadge, { backgroundColor: colors.successFade }]}>
            <Animated.View
              style={[
                styles.liveDot,
                {
                  backgroundColor: colors.success,
                  opacity: ring1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.3, 1],
                  }),
                },
              ]}
            />
            <Text style={[styles.liveBadgeText, { color: colors.success }]}>SERVER LIVE</Text>
          </View>
          <TouchableOpacity style={[styles.stopButton, { backgroundColor: colors.dangerFade }]} onPress={onStopServer}>
            <Text style={[styles.stopButtonText, { color: colors.danger }]}>Stop</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ready to Receive</Text>

        {serverInfo && (
          <View style={styles.qrContainer}>
            <Text style={[styles.qrLabelAbove, { color: colors.subtext }]}>SCAN TO CONNECT</Text>
            <View style={[styles.qrWrapper, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              <QRCode value={serverInfo.url} size={160} backgroundColor={colors.surface1} color={colors.text} />
            </View>
            <Text style={[styles.qrLabelBelow, { color: colors.subtext }]}>Point any phone camera at this code</Text>
            
            <View style={styles.urlSection}>
              <View style={[styles.urlChip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Text style={[styles.urlText, { color: colors.text }]}>{serverInfo.url}</Text>
              </View>
              <View style={styles.urlButtons}>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={handleCopyUrl}>
                  <Text style={styles.iconButtonText}>📋</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={handleShareUrl}>
                  <Text style={styles.iconButtonText}>📤</Text>
                </TouchableOpacity>
              </View>
            </View>
            {serverInfo.mdnsName && (
              <View style={[styles.mdnsChip, { backgroundColor: colors.surface3 }]}>
                <Text style={[styles.mdnsText, { color: colors.subtext }]}>LAN name: {serverInfo.mdnsName}:{serverInfo.port}</Text>
                <Text style={[styles.mdnsInfo, { color: colors.primary }]}>ⓘ Wi-Fi / Ethernet</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 2. Stats row */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
        <View style={styles.statColumn}>
          <Text style={[styles.statValue, { color: colors.text }]}>{sharedFiles.length}</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>📤 Shared</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={[styles.statValue, { color: colors.text }]}>{receivedFiles.length}</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>📥 Received</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatSize(totalSharedSize + totalReceivedSize)}</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>💾 Total</Text>
        </View>
      </View>

      {/* 3. "Files You're Sharing" section */}
      {sharedFiles.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Files You're Sharing</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primaryFade }]}>
              <Text style={[styles.countBadgeText, { color: colors.primary }]}>{sharedFiles.length}</Text>
            </View>
          </View>
          {sharedFiles.map((file, i) => (
            <View key={i} style={[styles.fileCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              <Text style={styles.fileIcon}>{getCategoryIcon(file.mimeType, undefined)}</Text>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                <Text style={[styles.fileMeta, { color: colors.subtext }]}>{formatSize(file.size)}</Text>
              </View>
              <View style={[styles.downloadCount, { backgroundColor: colors.surface3 }]}>
                <Text style={[styles.downloadCountText, { color: colors.text }]}>↓ {file.downloadCount || 0}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 4. Add More Files button */}
      <TouchableOpacity style={[styles.addMoreButton, { borderColor: colors.primary }]} onPress={onSelectFiles}>
        <Text style={[styles.addMoreButtonText, { color: colors.primary }]}>+ Add More Files</Text>
      </TouchableOpacity>

      {/* 5. "Received Files" section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Received Files</Text>
          <Text style={[styles.totalText, { color: colors.subtext }]}>Total: {formatSize(totalReceivedSize)}</Text>
        </View>

        {receivedFiles.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
            <Text style={[styles.emptyStateIcon, { color: colors.muted }]}>↓</Text>
            <Text style={[styles.emptyStateText, { color: colors.subtext }]}>Waiting for incoming files...</Text>
          </View>
        ) : (
          receivedFiles.map((file, i) => (
            <View key={i} style={[styles.fileCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              <Text style={styles.fileIcon}>{getCategoryIcon(file.mimeType, undefined)}</Text>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                <Text style={[styles.fileMeta, { color: colors.subtext }]}>{formatSize(file.size)}</Text>
              </View>
              <TouchableOpacity style={[styles.openButton, { backgroundColor: colors.primaryFade }]} onPress={() => onOpenReceivedFile(file)}>
                <Text style={[styles.openButtonText, { color: colors.primary }]}>Open</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroAnimation: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  centerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  centerIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  actionCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  cardPrimary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardPrimaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardOutline: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardOutlineText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trustChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  trustChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  serverCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stopButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  stopButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrLabelAbove: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  qrLabelBelow: {
    fontSize: 14,
    marginBottom: 24,
  },
  urlSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  urlChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  urlText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  urlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconButtonText: {
    fontSize: 16,
  },
  mdnsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  mdnsText: {
    fontSize: 13,
  },
  mdnsInfo: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalText: {
    fontSize: 14,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 13,
  },
  downloadCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  downloadCountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  openButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  addMoreButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 24,
  },
  addMoreButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
  },
});
