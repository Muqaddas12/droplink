import React, { useState } from 'react';
import {
  Alert,
  Clipboard,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

import { pickFiles } from '@/lib/nativeFilePicker';
import { openFile } from '@/lib/openFile';

import {
  createInternetServer,
  pauseInternetServer,
  resumeInternetServer,
  stopInternetServer,
  InternetServerInfo,
} from '@/lib/nativeInternetTransfer';

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const THEME = {
  bg: '#080D1A',
  surface: '#0F172A',
  surfaceCard: '#131D31',
  surfaceElevated: '#1A253C',
  surfaceSubtle: '#0B1222',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  accentCyan: '#38BDF8',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(99, 102, 241, 0.35)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  live: '#10B981',
  liveBg: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
};

type PickedFile = Awaited<ReturnType<typeof pickFiles>>[number];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getMimeMeta = (mimeType?: string | null) => {
  if (mimeType?.startsWith('image/')) {
    return { iconName: 'image-outline' as const, bgColor: 'rgba(16, 185, 129, 0.15)', iconColor: '#34D399' };
  }
  if (mimeType?.startsWith('video/')) {
    return { iconName: 'videocam-outline' as const, bgColor: 'rgba(139, 92, 246, 0.15)', iconColor: '#A78BFA' };
  }
  if (mimeType?.startsWith('audio/')) {
    return { iconName: 'musical-notes-outline' as const, bgColor: 'rgba(244, 63, 94, 0.15)', iconColor: '#FB7185' };
  }
  if (mimeType?.includes('zip') || mimeType?.includes('tar') || mimeType?.includes('rar')) {
    return { iconName: 'archive-outline' as const, bgColor: 'rgba(245, 158, 11, 0.15)', iconColor: '#FBBF24' };
  }
  if (mimeType === 'application/pdf') {
    return { iconName: 'document-text-outline' as const, bgColor: 'rgba(239, 68, 68, 0.15)', iconColor: '#F87171' };
  }
  return { iconName: 'document-outline' as const, bgColor: 'rgba(99, 102, 241, 0.15)', iconColor: '#818CF8' };
};

export default function TabTwoScreen() {
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);
  const [serverInfo, setServerInfo] = useState<InternetServerInfo | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSelectFiles = async () => {
    try {
      const files = await pickFiles();
      if (files.length === 0) return;
      setSelectedFiles(files);
      setServerInfo(null);
      setPaused(false);
    } catch (error) {
      Alert.alert('Selection Error', String(error));
    }
  };

  const handleCreateServer = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files', 'Please select at least one file to share.');
      return;
    }
    try {
      setLoading(true);
      const info = await createInternetServer(selectedFiles);
      setServerInfo(info);
      setPaused(false);
    } catch (error) {
      Alert.alert('Server Error', String(error));
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
      Alert.alert('Control Error', String(error));
    }
  };

  const handleStopServer = async () => {
    try {
      await stopInternetServer();
      setServerInfo(null);
      setPaused(false);
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const handleShareUrl = async () => {
    if (!serverInfo?.url) return;
    try {
      await Share.share({
        message: `Download shared files with DropLink:\n${serverInfo.url}`,
        url: serverInfo.url,
      });
    } catch (error) {
      console.error('SHARE URL ERROR:', error);
    }
  };

  const handleCopyUrl = () => {
    if (!serverInfo?.url) return;
    Clipboard.setString(serverInfo.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectedFilePress = async (file: PickedFile) => {
    try {
      await openFile(file.uri, file.mimeType);
    } catch (error) {
      Alert.alert(
        'Cannot Open File',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const totalSize = selectedFiles.reduce((t, f) => t + (f.size ?? 0), 0);

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  serverInfo && (paused ? styles.statusDotPaused : styles.statusDotLive),
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  serverInfo && (paused ? styles.statusPillTextPaused : styles.statusPillTextLive),
                ]}
              >
                {serverInfo
                  ? (paused ? 'TRANSFER • PAUSED' : 'DIRECT P2P • LIVE')
                  : 'GLOBAL SHARING • READY'}
              </Text>
            </View>
            <Text style={styles.screenTitle}>Internet Share</Text>
            <Text style={styles.screenSubtitle}>
              Direct peer-to-peer transmission over public internet with no cloud
            </Text>
          </View>
          <View style={styles.globeBadge}>
            <Ionicons name="globe-outline" size={22} color={THEME.primaryLight} />
          </View>
        </View>

        {/* Active Live Server Transmission Card OR Idle Hero */}
        {serverInfo ? (
          <View style={styles.liveCard}>
            <View style={[styles.cardTopAccent, paused && styles.cardTopAccentPaused]} />

            <View style={styles.liveCardHeader}>
              <View style={styles.liveHeaderLeft}>
                <View style={[styles.antennaBadge, paused && styles.antennaBadgePaused]}>
                  <Ionicons
                    name={paused ? 'pause-outline' : 'wifi-outline'}
                    size={20}
                    color={paused ? THEME.warning : THEME.primaryLight}
                  />
                </View>
                <View style={styles.liveHeaderText}>
                  <Text style={styles.liveCardTitle}>
                    {paused ? 'Transfer Paused' : 'Broadcasting Online'}
                  </Text>
                  <Text style={styles.liveCardSubtitle}>
                    {paused ? 'Downloads are temporarily halted' : 'Recipients can download via browser'}
                  </Text>
                </View>
              </View>
              <View style={[styles.activeBadge, paused && styles.activeBadgePaused]}>
                <View style={[styles.activeDot, paused && styles.activeDotPaused]} />
                <Text style={[styles.activeBadgeText, paused && styles.activeBadgeTextPaused]}>
                  {paused ? 'PAUSED' : 'LIVE'}
                </Text>
              </View>
            </View>

            {/* Network & Protocol Info */}
            <View style={styles.networkGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>NETWORK INTERFACE</Text>
                <View style={styles.gridValRow}>
                  <Feather name="activity" size={13} color={THEME.textMuted} />
                  <Text style={styles.gridValText}>{serverInfo.networkType || 'Internet'}</Text>
                </View>
              </View>
              <View style={styles.gridDivider} />
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>PUBLIC PORT</Text>
                <View style={styles.gridValRow}>
                  <Feather name="hash" size={13} color={THEME.textMuted} />
                  <Text style={styles.gridValText}>{serverInfo.port}</Text>
                </View>
              </View>
              <View style={styles.gridDivider} />
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>DIRECT SOCKET</Text>
                <View style={styles.gridValRow}>
                  <Feather name="zap" size={13} color={THEME.live} />
                  <Text style={[styles.gridValText, { color: THEME.live }]}>SENDFILE</Text>
                </View>
              </View>
            </View>

            {/* URL Address Box */}
            <View style={styles.addressSection}>
              <Text style={styles.metaLabel}>PUBLIC DOWNLOAD LINK</Text>
              <View style={styles.urlContainer}>
                <Text style={styles.urlText} numberOfLines={1} selectable>
                  {serverInfo.url}
                </Text>
                <Pressable
                  style={[styles.copyIconBtn, copied && styles.copyIconBtnSuccess]}
                  onPress={handleCopyUrl}
                  android_ripple={{ color: 'rgba(99, 102, 241, 0.3)' }}
                >
                  {copied ? (
                    <Feather name="check" size={16} color="#34D399" />
                  ) : (
                    <Feather name="copy" size={16} color={THEME.primaryLight} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Actions Bar */}
            <View style={styles.serverActionsRow}>
              <Pressable
                style={styles.btnPrimaryAction}
                onPress={handleShareUrl}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Feather name="share-2" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryActionText}>Share Link</Text>
              </Pressable>

              <Pressable
                style={[styles.btnSecondaryAction, paused && styles.btnResumeAction]}
                onPress={handlePauseResume}
                android_ripple={{ color: 'rgba(245, 158, 11, 0.2)' }}
              >
                <Feather name={paused ? 'play' : 'pause'} size={16} color={paused ? '#34D399' : '#FBBF24'} />
                <Text style={[styles.btnSecondaryActionText, paused && { color: '#34D399' }]}>
                  {paused ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.btnStopServer}
                onPress={handleStopServer}
                android_ripple={{ color: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Feather name="power" size={16} color="#F87171" />
                <Text style={styles.btnStopServerText}>Stop</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.heroBadgeBox}>
              <Ionicons name="paper-plane-outline" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Worldwide Peer-to-Peer</Text>
            <Text style={styles.heroSubtitle}>
              Share directly with anyone on the planet. Receivers open your private link in any browser and download directly from your hardware.
            </Text>

            {/* 3 Step Flow */}
            <View style={styles.stepsFlow}>
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={styles.stepLabel}>Pick Files</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <Text style={styles.stepLabel}>Share Link</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <Text style={styles.stepLabel}>Zero Cloud</Text>
              </View>
            </View>
          </View>
        )}

        {/* Select Files CTA */}
        <Pressable
          style={[styles.selectCard, loading && styles.disabledCard]}
          onPress={handleSelectFiles}
          disabled={loading}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.15)' }}
        >
          <View style={styles.selectIconBox}>
            <Feather name="folder-plus" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.selectTextContent}>
            <Text style={styles.selectTitle}>
              {selectedFiles.length > 0 ? 'Change Selected Files' : 'Select Files to Share'}
            </Text>
            <Text style={styles.selectSubtitle}>
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file selected (${formatSize(totalSize)})`
                : 'Choose any photo, video, document or package'}
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color="rgba(255, 255, 255, 0.7)" />
        </Pressable>

        {/* Selected Files Section */}
        {selectedFiles.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconBadge}>
                  <Feather name="layers" size={15} color={THEME.primaryLight} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Selected Payload</Text>
                  <Text style={styles.sectionSubtitle}>Ready to stream over socket</Text>
                </View>
              </View>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>
                  {selectedFiles.length} file • {formatSize(totalSize)}
                </Text>
              </View>
            </View>

            <View style={styles.fileList}>
              {selectedFiles.map((file, idx) => {
                const meta = getMimeMeta(file.mimeType);
                return (
                  <Pressable
                    key={`${file.uri}-${idx}`}
                    style={styles.fileRow}
                    onPress={() => handleSelectedFilePress(file)}
                    android_ripple={{ color: 'rgba(99, 102, 241, 0.12)' }}
                  >
                    <View style={[styles.fileTypeBadge, { backgroundColor: meta.bgColor }]}>
                      <Ionicons name={meta.iconName} size={22} color={meta.iconColor} />
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileMetaSize}>{formatSize(file.size ?? 0)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Start Server Button (if not already running) */}
            {!serverInfo && (
              <Pressable
                style={[styles.btnStartServer, loading && styles.disabledCard]}
                onPress={handleCreateServer}
                disabled={loading}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Ionicons name="flash" size={18} color="#FFFFFF" />
                <Text style={styles.btnStartServerText}>
                  {loading ? 'Initiating Public Socket…' : 'Generate Internet Download Link'}
                </Text>
                {!loading && <Feather name="arrow-right" size={18} color="#FFFFFF" />}
              </Pressable>
            )}
          </View>
        )}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={THEME.textMuted} />
          <Text style={styles.footerNoteText}>
            Direct zero-copy kernel streaming. Files are sent straight from your flash storage without touching any middleman cloud server.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
    marginTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.textMuted,
  },
  statusDotLive: {
    backgroundColor: THEME.live,
  },
  statusDotPaused: {
    backgroundColor: THEME.warning,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 1.1,
  },
  statusPillTextLive: {
    color: THEME.live,
  },
  statusPillTextPaused: {
    color: THEME.warning,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  globeBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.22)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadgeBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: THEME.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  stepsFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primaryLight,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  stepLine: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    marginHorizontal: 8,
    marginBottom: 18,
  },

  /* Live Card */
  liveCard: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.borderActive,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: THEME.primary,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  cardTopAccent: {
    height: 3,
    backgroundColor: THEME.primary,
    width: '100%',
  },
  cardTopAccentPaused: {
    backgroundColor: THEME.warning,
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  antennaBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  antennaBadgePaused: {
    backgroundColor: THEME.warningBg,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  liveHeaderText: {
    gap: 2,
  },
  liveCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  liveCardSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.liveBg,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activeBadgePaused: {
    backgroundColor: THEME.warningBg,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.live,
  },
  activeDotPaused: {
    backgroundColor: THEME.warning,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.live,
    letterSpacing: 0.8,
  },
  activeBadgeTextPaused: {
    color: THEME.warning,
  },

  /* Network Grid */
  networkGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    backgroundColor: THEME.surfaceSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
  },
  gridValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  gridValText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  gridDivider: {
    width: 1,
    height: '80%',
    backgroundColor: THEME.border,
    marginHorizontal: 8,
    alignSelf: 'center',
  },

  /* Address Section */
  addressSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surfaceSubtle,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.22)',
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primaryLight,
    fontFamily: 'monospace',
    marginRight: 10,
  },
  copyIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIconBtnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },

  /* Actions Row */
  serverActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  btnPrimaryAction: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: THEME.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 3,
  },
  btnPrimaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnSecondaryAction: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: THEME.warningBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  btnResumeAction: {
    backgroundColor: THEME.liveBg,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  btnSecondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.warning,
  },
  btnStopServer: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: THEME.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnStopServerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F87171',
  },

  /* Select Card */
  selectCard: {
    borderRadius: 20,
    backgroundColor: THEME.primaryDark,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 16,
  },
  selectIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTextContent: {
    flex: 1,
    marginLeft: 14,
  },
  selectTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  disabledCard: {
    opacity: 0.6,
  },

  /* Section Container */
  sectionContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: THEME.textMuted,
  },
  sectionCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: THEME.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  fileList: {
    gap: 2,
  },

  /* File Item Row */
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  fileTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  fileMetaSize: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },

  /* Start Server CTA */
  btnStartServer: {
    marginTop: 16,
    height: 50,
    borderRadius: 15,
    backgroundColor: THEME.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: THEME.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  btnStartServerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Footer Note */
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    color: THEME.textMuted,
    lineHeight: 16,
  },
});
