import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

import type {
  ReceivedFile,
  ServerInfo,
  SharedFile,
} from '@/lib/nativeDropLink';

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  bg: '#080D1A',
  surface: '#0F172A',
  surfaceCard: '#131D31',
  surfaceElevated: '#1A253C',
  surfaceSubtle: '#0B1222',
  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryLight: '#60A5FA',
  accentCyan: '#38BDF8',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(59, 130, 246, 0.35)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  live: '#10B981',
  liveBg: 'rgba(16, 185, 129, 0.12)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

type FileTypeMeta = {
  iconName: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
};

const getFileMeta = (mimeType?: string | null, category?: string): FileTypeMeta => {
  if (category === 'Images' || mimeType?.startsWith('image/')) {
    return { iconName: 'image-outline', bgColor: 'rgba(16, 185, 129, 0.15)', iconColor: '#34D399' };
  }
  if (category === 'Videos' || mimeType?.startsWith('video/')) {
    return { iconName: 'videocam-outline', bgColor: 'rgba(139, 92, 246, 0.15)', iconColor: '#A78BFA' };
  }
  if (category === 'Audio' || mimeType?.startsWith('audio/')) {
    return { iconName: 'musical-notes-outline', bgColor: 'rgba(244, 63, 94, 0.15)', iconColor: '#FB7185' };
  }
  if (category === 'Archives' || mimeType?.includes('zip') || mimeType?.includes('tar') || mimeType?.includes('rar')) {
    return { iconName: 'archive-outline', bgColor: 'rgba(245, 158, 11, 0.15)', iconColor: '#FBBF24' };
  }
  if (mimeType === 'application/pdf') {
    return { iconName: 'document-text-outline', bgColor: 'rgba(239, 68, 68, 0.15)', iconColor: '#F87171' };
  }
  if (mimeType?.includes('android.package-archive')) {
    return { iconName: 'logo-android', bgColor: 'rgba(34, 197, 94, 0.15)', iconColor: '#4ADE80' };
  }
  return { iconName: 'document-outline', bgColor: 'rgba(59, 130, 246, 0.15)', iconColor: '#60A5FA' };
};

// ─── Pulsing Live Indicator ───────────────────────────────────────────────────
function LiveTransmissionDot({ active }: { active: boolean }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!active) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.8);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.8, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [active, pulseScale, pulseOpacity]);

  return (
    <View style={styles.pulseContainer}>
      {active && (
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
      )}
      <View style={[styles.pulseCore, active && styles.pulseCoreActive]} />
    </View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────────────────
function DashboardHeader({
  isServerStarted,
  onOpenMenu,
}: {
  isServerStarted: boolean;
  onOpenMenu: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.statusPill}>
          <LiveTransmissionDot active={isServerStarted} />
          <Text style={[styles.statusPillText, isServerStarted && styles.statusPillTextActive]}>
            {isServerStarted ? 'LAN SERVER • BROADCASTING' : 'LAN SHARING • STANDBY'}
          </Text>
        </View>
        <Text style={styles.screenTitle}>Local Share</Text>
        <Text style={styles.screenSubtitle}>High-speed transfer over your local Wi-Fi or Hotspot</Text>
      </View>
      <Pressable
        style={styles.menuButton}
        onPress={onOpenMenu}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true }}
      >
        <Feather name="more-vertical" size={20} color={THEME.textSecondary} />
      </Pressable>
    </View>
  );
}

// ─── Active Server Transmission Card ──────────────────────────────────────────
function ActiveServerCard({
  serverInfo,
  sharedFiles,
  receivedFiles,
  onShareUrl,
  onStopServer,
  onSelectFiles,
}: {
  serverInfo: ServerInfo;
  sharedFiles: SharedFile[];
  receivedFiles: ReceivedFile[];
  onShareUrl: () => void;
  onStopServer: () => void;
  onSelectFiles: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const totalDownloads = sharedFiles.reduce((acc, f) => acc + f.downloadCount, 0);

  const handleCopy = () => {
    Clipboard.setString(serverInfo.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.liveCard}>
      {/* Top Accent Gradient Line */}
      <View style={styles.cardTopAccent} />

      <View style={styles.liveCardHeader}>
        <View style={styles.liveHeaderLeft}>
          <View style={styles.antennaBadge}>
            <Ionicons name="radio-outline" size={20} color={THEME.accentCyan} />
          </View>
          <View style={styles.liveHeaderText}>
            <Text style={styles.liveCardTitle}>Sharing is Active</Text>
            <Text style={styles.liveCardSubtitle}>Open connection on any browser</Text>
          </View>
        </View>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>ONLINE</Text>
        </View>
      </View>

      {/* URL Address Box */}
      <View style={styles.addressSection}>
        <Text style={styles.metaLabel}>BROWSER ACCESS URL</Text>
        <View style={styles.urlContainer}>
          <Text style={styles.urlText} numberOfLines={1} selectable>
            {serverInfo.url}
          </Text>
          <Pressable
            style={[styles.copyIconBtn, copied && styles.copyIconBtnSuccess]}
            onPress={handleCopy}
            android_ripple={{ color: 'rgba(59, 130, 246, 0.3)' }}
          >
            {copied ? (
              <Feather name="check" size={16} color="#34D399" />
            ) : (
              <Feather name="copy" size={16} color={THEME.primaryLight} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Network Details Grid */}
      <View style={styles.networkGrid}>
        <View style={styles.gridItem}>
          <Text style={styles.metaLabel}>IP ADDRESS</Text>
          <View style={styles.gridValRow}>
            <Feather name="cpu" size={13} color={THEME.textMuted} />
            <Text style={styles.gridValText}>{serverInfo.ip}</Text>
          </View>
        </View>
        <View style={styles.gridDivider} />
        <View style={styles.gridItem}>
          <Text style={styles.metaLabel}>PORT</Text>
          <View style={styles.gridValRow}>
            <Feather name="hash" size={13} color={THEME.textMuted} />
            <Text style={styles.gridValText}>{serverInfo.port}</Text>
          </View>
        </View>
        <View style={styles.gridDivider} />
        <View style={styles.gridItem}>
          <Text style={styles.metaLabel}>PROTOCOL</Text>
          <View style={styles.gridValRow}>
            <Feather name="shield" size={13} color={THEME.textMuted} />
            <Text style={styles.gridValText}>LAN HTTP</Text>
          </View>
        </View>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.serverActionsRow}>
        <Pressable
          style={styles.btnPrimaryAction}
          onPress={onShareUrl}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
        >
          <Feather name="share-2" size={16} color="#FFFFFF" />
          <Text style={styles.btnPrimaryActionText}>Share Link</Text>
        </Pressable>

        <Pressable
          style={styles.btnAddFiles}
          onPress={onSelectFiles}
          android_ripple={{ color: 'rgba(59, 130, 246, 0.2)' }}
        >
          <Feather name="plus" size={16} color={THEME.primaryLight} />
          <Text style={styles.btnAddFilesText}>Add</Text>
        </Pressable>

        <Pressable
          style={styles.btnStopServer}
          onPress={onStopServer}
          android_ripple={{ color: 'rgba(239, 68, 68, 0.2)' }}
        >
          <Feather name="power" size={16} color="#F87171" />
          <Text style={styles.btnStopServerText}>Stop</Text>
        </Pressable>
      </View>

      {/* Live Metrics Row */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricFigure}>{sharedFiles.length}</Text>
          <Text style={styles.metricLabel}>OUTGOING</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColumn}>
          <Text style={styles.metricFigure}>{receivedFiles.length}</Text>
          <Text style={styles.metricLabel}>RECEIVED</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColumn}>
          <Text style={styles.metricFigure}>{totalDownloads}</Text>
          <Text style={styles.metricLabel}>DOWNLOADS</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Idle Quick Action Cards ──────────────────────────────────────────────────
function IdleActionCards({
  loading,
  onSelectFiles,
  onStartEmptyServer,
}: {
  loading: boolean;
  onSelectFiles: () => void;
  onStartEmptyServer: () => void;
}) {
  return (
    <View style={styles.idleCardsWrapper}>
      {/* Primary: Send Files */}
      <Pressable
        style={[styles.heroSendCard, loading && styles.disabledCard]}
        onPress={onSelectFiles}
        disabled={loading}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.15)' }}
      >
        <View style={styles.heroSendIconBox}>
          <Feather name="upload-cloud" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.heroSendTextContent}>
          <Text style={styles.heroSendTitle}>
            {loading ? 'Starting Service…' : 'Send & Share Files'}
          </Text>
          <Text style={styles.heroSendSubtitle}>
            Select photos, videos, apps, or documents to share instantly with anyone on Wi-Fi
          </Text>
        </View>
        <View style={styles.heroSendArrow}>
          <Feather name="chevron-right" size={22} color="#FFFFFF" />
        </View>
      </Pressable>

      {/* Secondary: Receive Only Mode */}
      <Pressable
        style={[styles.heroReceiveCard, loading && styles.disabledCard]}
        onPress={onStartEmptyServer}
        disabled={loading}
        android_ripple={{ color: 'rgba(59, 130, 246, 0.12)' }}
      >
        <View style={styles.heroReceiveIconBox}>
          <Feather name="download-cloud" size={22} color={THEME.primaryLight} />
        </View>
        <View style={styles.heroReceiveTextContent}>
          <Text style={styles.heroReceiveTitle}>Receive Files Only</Text>
          <Text style={styles.heroReceiveSubtitle}>
            Start receiver server without picking files. Nearby devices can upload to you.
          </Text>
        </View>
        <Feather name="arrow-right" size={18} color={THEME.primary} />
      </Pressable>

      {/* Feature Highlights Row */}
      <View style={styles.featuresRow}>
        <View style={styles.featureItem}>
          <Ionicons name="flash-outline" size={16} color={THEME.primaryLight} />
          <Text style={styles.featureText}>Gigabit LAN Speed</Text>
        </View>
        <View style={styles.featureBullet} />
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark-outline" size={16} color={THEME.live} />
          <Text style={styles.featureText}>No Cloud Upload</Text>
        </View>
        <View style={styles.featureBullet} />
        <View style={styles.featureItem}>
          <Ionicons name="globe-outline" size={16} color={THEME.accentCyan} />
          <Text style={styles.featureText}>Any Browser</Text>
        </View>
      </View>
    </View>
  );
}

// ─── File Item Row ────────────────────────────────────────────────────────────
function FileItemRow({
  name,
  size,
  mimeType,
  category,
  downloadCount,
  isReceived,
  onPress,
}: {
  name: string;
  size: number;
  mimeType?: string | null;
  category?: string;
  downloadCount?: number;
  isReceived?: boolean;
  onPress?: () => void;
}) {
  const meta = getFileMeta(mimeType, category);

  return (
    <Pressable
      style={styles.fileRow}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{ color: 'rgba(59, 130, 246, 0.12)' }}
    >
      <View style={[styles.fileTypeBadge, { backgroundColor: meta.bgColor }]}>
        <Ionicons name={meta.iconName} size={22} color={meta.iconColor} />
      </View>

      <View style={styles.fileDetails}>
        <Text style={styles.fileName} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.fileMetaRow}>
          <Text style={styles.fileMetaSize}>{formatSize(size)}</Text>
          {downloadCount !== undefined && (
            <>
              <Text style={styles.fileMetaDot}>•</Text>
              <Text style={styles.fileMetaInfo}>
                {downloadCount} {downloadCount === 1 ? 'download' : 'downloads'}
              </Text>
            </>
          )}
          {category && (
            <>
              <Text style={styles.fileMetaDot}>•</Text>
              <Text style={styles.fileMetaInfo}>{category}</Text>
            </>
          )}
        </View>
      </View>

      {isReceived && (
        <View style={styles.openFileBtn}>
          <Text style={styles.openFileText}>Open</Text>
          <Feather name="arrow-up-right" size={14} color={THEME.primary} />
        </View>
      )}
    </Pressable>
  );
}

// ─── Files Section Container ──────────────────────────────────────────────────
function FilesSection({
  title,
  subtitle,
  badgeText,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  badgeText: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconBadge}>
            <Feather name={icon} size={15} color={THEME.primaryLight} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.sectionCountBadge}>
          <Text style={styles.sectionCountText}>{badgeText}</Text>
        </View>
      </View>
      <View style={styles.sectionFileList}>{children}</View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="file-tray-outline" size={32} color={THEME.primaryLight} />
      </View>
      <Text style={styles.emptyTitle}>No Transfers Yet</Text>
      <Text style={styles.emptyDescription}>
        Tap "Send & Share Files" above to broadcast files on your network, or connect from another device to receive.
      </Text>
    </View>
  );
}

// ─── Main Screen Component ────────────────────────────────────────────────────
export function LocalShareDashboard(props: LocalShareDashboardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const isEmpty =
    !props.isServerStarted &&
    props.sharedFiles.length === 0 &&
    props.receivedFiles.length === 0;

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={props.refreshing}
            onRefresh={props.onRefresh}
            tintColor={THEME.primary}
            colors={[THEME.primary]}
          />
        }
      >
        {/* Header */}
        <DashboardHeader
          isServerStarted={props.isServerStarted}
          onOpenMenu={() => setMenuOpen(true)}
        />

        {/* Server Active Transmission Card OR Idle Action Cards */}
        {props.isServerStarted && props.serverInfo ? (
          <ActiveServerCard
            serverInfo={props.serverInfo}
            sharedFiles={props.sharedFiles}
            receivedFiles={props.receivedFiles}
            onShareUrl={props.onShareUrl}
            onStopServer={props.onStopServer}
            onSelectFiles={props.onSelectFiles}
          />
        ) : (
          <IdleActionCards
            loading={props.loading}
            onSelectFiles={props.onSelectFiles}
            onStartEmptyServer={props.onStartEmptyServer}
          />
        )}

        {/* Shared Files List */}
        {props.sharedFiles.length > 0 && (
          <FilesSection
            title="Ready to Share"
            subtitle="Broadcasting on your local network"
            badgeText={`${props.sharedFiles.length} file • ${formatSize(props.totalSharedSize)}`}
            icon="upload"
          >
            {props.sharedFiles.map(file => (
              <FileItemRow
                key={`${file.index}-${file.uri}`}
                name={file.name}
                size={file.size}
                mimeType={file.mimeType}
                downloadCount={file.downloadCount}
              />
            ))}
          </FilesSection>
        )}

        {/* Received Files List */}
        {props.receivedFiles.length > 0 && (
          <FilesSection
            title={props.isServerStarted ? 'Received This Session' : 'Saved on Device'}
            subtitle="Permanently stored in local Downloads"
            badgeText={`${props.receivedFiles.length} file • ${formatSize(props.totalReceivedSize)}`}
            icon="download"
          >
            {props.receivedFiles.map((file, idx) => (
              <FileItemRow
                key={`${file.path}-${idx}`}
                name={file.name}
                size={file.size}
                mimeType={file.mimeType}
                category={file.category}
                isReceived
                onPress={() => props.onOpenReceivedFile(file)}
              />
            ))}
          </FilesSection>
        )}

        {/* Empty State */}
        {isEmpty && <EmptyState />}

        {/* Privacy Note */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={18} color={THEME.textMuted} />
          <Text style={styles.footerNoteText}>
            Keep this app active during transfers. All connections happen directly peer-to-peer over your Wi-Fi router.
          </Text>
        </View>
      </ScrollView>

      {/* Control Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Local Share Options</Text>
            <Text style={styles.modalStatus}>
              {props.isServerStarted ? '● Server is running' : '○ Server is idle'}
            </Text>

            <Pressable
              style={styles.modalOptionBtn}
              onPress={() => {
                closeMenu();
                props.onSelectFiles();
              }}
            >
              <Feather name="plus-circle" size={18} color={THEME.primary} />
              <Text style={styles.modalOptionText}>Add more files</Text>
            </Pressable>

            {props.isServerStarted && (
              <Pressable
                style={styles.modalOptionBtn}
                onPress={() => {
                  closeMenu();
                  props.onShareUrl();
                }}
              >
                <Feather name="share-2" size={18} color={THEME.primary} />
                <Text style={styles.modalOptionText}>Share connection link</Text>
              </Pressable>
            )}

            {props.isServerStarted && (
              <Pressable
                style={[styles.modalOptionBtn, styles.modalStopBtn]}
                onPress={() => {
                  closeMenu();
                  props.onStopServer();
                }}
              >
                <Feather name="power" size={18} color="#EF4444" />
                <Text style={styles.modalStopText}>Stop Local Server</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 1.1,
  },
  statusPillTextActive: {
    color: THEME.live,
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
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Pulse Dot */
  pulseContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.live,
  },
  pulseCore: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.textMuted,
  },
  pulseCoreActive: {
    backgroundColor: THEME.live,
  },

  /* Active Live Transmission Card */
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
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.live,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.live,
    letterSpacing: 0.8,
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
    borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: THEME.accentCyan,
    fontFamily: 'monospace',
    marginRight: 10,
  },
  copyIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIconBtnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },

  /* Network Details Grid */
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
    marginHorizontal: 10,
    alignSelf: 'center',
  },

  /* Server Actions */
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
  btnAddFiles: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: THEME.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  btnAddFilesText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primaryLight,
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

  /* Metrics */
  metricsContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricFigure: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.textPrimary,
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.6,
  },
  metricDivider: {
    width: 1,
    height: '70%',
    backgroundColor: THEME.border,
    alignSelf: 'center',
  },

  /* Idle Cards */
  idleCardsWrapper: {
    gap: 12,
    marginBottom: 20,
  },
  heroSendCard: {
    borderRadius: 22,
    backgroundColor: THEME.primaryDark,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroSendIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSendTextContent: {
    flex: 1,
    marginLeft: 16,
  },
  heroSendTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSendSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
  },
  heroSendArrow: {
    marginLeft: 8,
  },
  heroReceiveCard: {
    borderRadius: 18,
    backgroundColor: THEME.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  heroReceiveIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroReceiveTextContent: {
    flex: 1,
    marginLeft: 14,
  },
  heroReceiveTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  heroReceiveSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: THEME.textMuted,
    lineHeight: 15,
  },
  disabledCard: {
    opacity: 0.6,
  },

  /* Feature highlights */
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  featureBullet: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.textMuted,
  },

  /* File Section */
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
  sectionFileList: {
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
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  fileMetaSize: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  fileMetaDot: {
    marginHorizontal: 5,
    fontSize: 10,
    color: THEME.textMuted,
  },
  fileMetaInfo: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  openFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  openFileText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
  },

  /* Empty State */
  emptyContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  emptyDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    maxWidth: 270,
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

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 38,
    borderTopWidth: 1,
    borderColor: THEME.border,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.textMuted,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  modalStatus: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 3,
    marginBottom: 18,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.surfaceSubtle,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  modalStopBtn: {
    backgroundColor: THEME.dangerBg,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  modalStopText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
});
