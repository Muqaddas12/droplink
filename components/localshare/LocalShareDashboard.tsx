import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  ReceivedFile,
  ServerInfo,
  SharedFile,
} from '@/lib/nativeDropLink';

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
  onShareUrl: () => void;
  onStopServer: () => void;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const fileIcon = (mimeType?: string | null, category?: string) => {
  if (category === 'Images' || mimeType?.startsWith('image/')) return '▣';
  if (category === 'Videos' || mimeType?.startsWith('video/')) return '▶';
  if (category === 'Audio' || mimeType?.startsWith('audio/')) return '♫';
  if (category === 'Archives' || mimeType?.includes('zip')) return '⌘';
  if (mimeType === 'application/pdf') return 'PDF';
  return 'DOC';
};

function LocalShareHeader({ isServerStarted, onOpenMenu }: Pick<LocalShareDashboardProps, 'isServerStarted'> & { onOpenMenu: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.eyebrowRow}>
          <View style={[styles.statusDot, isServerStarted && styles.statusDotLive]} />
          <Text style={styles.eyebrow}>
            {isServerStarted ? 'LOCAL NETWORK • ACTIVE' : 'LOCAL NETWORK'}
          </Text>
        </View>
        <Text style={styles.title}>Local Share</Text>
        <Text style={styles.subtitle}>Fast, private sharing on your Wi-Fi.</Text>
      </View>
      <Pressable style={styles.headerMark} onPress={onOpenMenu}>
        <Text style={styles.headerMarkText}>☰</Text>
      </Pressable>
    </View>
  );
}

function ServerCard({
  receivedFiles,
  serverInfo,
  sharedFiles,
  onShareUrl,
  onStopServer,
}: Pick<LocalShareDashboardProps, 'receivedFiles' | 'serverInfo' | 'sharedFiles' | 'onShareUrl' | 'onStopServer'>) {
  if (!serverInfo) return null;

  const downloads = sharedFiles.reduce((total, file) => total + file.downloadCount, 0);

  return (
    <View style={styles.serverCard}>
      <View style={styles.serverTopRow}>
        <View style={styles.serverIdentity}>
          <View style={styles.signalBadge}><Text style={styles.signalBadgeText}>⌁</Text></View>
          <View>
            <Text style={styles.serverTitle}>Sharing is live</Text>
            <Text style={styles.serverSubtitle}>Nearby devices can connect now</Text>
          </View>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>

      <Text style={styles.connectionLabel}>CONNECTION ADDRESS</Text>
      <View style={styles.addressBox}>
        <Text style={styles.addressText} numberOfLines={1}>{serverInfo.url}</Text>
      </View>

      <View style={styles.detailRow}>
        <View><Text style={styles.detailLabel}>IP ADDRESS</Text><Text style={styles.detailValue}>{serverInfo.ip}</Text></View>
        <View style={styles.detailDivider} />
        <View><Text style={styles.detailLabel}>PORT</Text><Text style={styles.detailValue}>{serverInfo.port}</Text></View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.shareButton} onPress={onShareUrl} android_ripple={{ color: '#dbeafe' }}>
          <Text style={styles.shareButtonText}>Share link</Text>
          <Text style={styles.shareButtonArrow}>↗</Text>
        </Pressable>
        <Pressable style={styles.stopButton} onPress={onStopServer} android_ripple={{ color: '#fee2e2' }}>
          <Text style={styles.stopButtonText}>Stop</Text>
        </Pressable>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="SHARED" value={sharedFiles.length} />
        <Metric label="RECEIVED" value={receivedFiles.length} />
        <Metric label="DOWNLOADS" value={downloads} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function SelectFilesCard({ isServerStarted, loading, onSelectFiles }: Pick<LocalShareDashboardProps, 'isServerStarted' | 'loading' | 'onSelectFiles'>) {
  return (
    <Pressable
      style={[styles.selectCard, loading && styles.dimmed]}
      onPress={onSelectFiles}
      disabled={loading}
      android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
    >
      <View style={styles.selectIcon}><Text style={styles.selectIconText}>+</Text></View>
      <View style={styles.selectCopy}>
        <Text style={styles.selectTitle}>
          {loading ? (isServerStarted ? 'Adding files…' : 'Starting server…') : (isServerStarted ? 'Add more files' : 'Choose files to share')}
        </Text>
        <Text style={styles.selectSubtitle}>
          {isServerStarted ? 'Keep the connection active while adding files' : 'Photos, videos, documents and more'}
        </Text>
      </View>
      <Text style={styles.selectArrow}>›</Text>
    </Pressable>
  );
}

function FilesSection({
  isServerStarted,
  receivedFiles,
  sharedFiles,
  totalReceivedSize,
  totalSharedSize,
  onOpenReceivedFile,
}: Pick<LocalShareDashboardProps, 'isServerStarted' | 'receivedFiles' | 'sharedFiles' | 'totalReceivedSize' | 'totalSharedSize' | 'onOpenReceivedFile'>) {
  return (
    <>
      {sharedFiles.length > 0 && (
        <SectionCard title="Ready to share" caption={`${sharedFiles.length} file${sharedFiles.length === 1 ? '' : 's'} • ${formatSize(totalSharedSize)}`}>
          {sharedFiles.map(file => <FileRow key={`${file.index}-${file.uri}`} icon={fileIcon(file.mimeType)} name={file.name} detail={`${formatSize(file.size)} • ${file.downloadCount} downloads`} />)}
        </SectionCard>
      )}

      {receivedFiles.length > 0 && (
        <SectionCard title={isServerStarted ? 'Received this session' : 'Received files'} caption={`${receivedFiles.length} file${receivedFiles.length === 1 ? '' : 's'} • ${formatSize(totalReceivedSize)} • Saved on device`}>
          {receivedFiles.map((file, index) => (
            <Pressable key={`${file.path}-${index}`} style={styles.pressableFileRow} onPress={() => onOpenReceivedFile(file)} android_ripple={{ color: '#e0f2fe' }}>
              <FileRow icon={fileIcon(file.mimeType, file.category)} name={file.name} detail={`${formatSize(file.size)} • ${file.category}`} action />
            </Pressable>
          ))}
        </SectionCard>
      )}
    </>
  );
}

function SectionCard({ children, title, caption }: { children: React.ReactNode; title: string; caption: string }) {
  return <View style={styles.sectionCard}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionCaption}>{caption}</Text><View style={styles.fileList}>{children}</View></View>;
}

function FileRow({ action, detail, icon, name }: { action?: boolean; detail: string; icon: string; name: string }) {
  return <View style={styles.fileRow}><View style={styles.fileIcon}><Text style={styles.fileIconText}>{icon}</Text></View><View style={styles.fileCopy}><Text style={styles.fileName} numberOfLines={1}>{name}</Text><Text style={styles.fileDetail} numberOfLines={1}>{detail}</Text></View>{action && <Text style={styles.fileAction}>Open ›</Text>}</View>;
}

function EmptyState() {
  return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>↓</Text></View><Text style={styles.emptyTitle}>Nothing received yet</Text><Text style={styles.emptyText}>Files sent to this device will appear here and remain available after sharing stops.</Text></View>;
}

export function LocalShareDashboard(props: LocalShareDashboardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isEmpty = !props.isServerStarted && props.sharedFiles.length === 0 && props.receivedFiles.length === 0;
  const closeMenu = () => setMenuOpen(false);
  return <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} tintColor="#2563eb" />}>
      <LocalShareHeader isServerStarted={props.isServerStarted} onOpenMenu={() => setMenuOpen(true)} />
      <ServerCard {...props} />
      <SelectFilesCard {...props} />
      <FilesSection {...props} />
      {isEmpty && <EmptyState />}
      <View style={styles.note}><View style={styles.noteIcon}><Text style={styles.noteIconText}>i</Text></View><Text style={styles.noteText}>Keep this page open while others are connected. They can download shared files and send files back to this device.</Text></View>
    </ScrollView>
    <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={closeMenu}>
      <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
        <Pressable style={styles.menuSheet} onPress={() => undefined}>
          <View style={styles.menuHandle} />
          <Text style={styles.menuTitle}>Local Share controls</Text>
          <Text style={styles.menuStatus}>{props.isServerStarted ? 'Server is active. A notification is shown while it runs.' : 'Server is stopped.'}</Text>
          <Pressable style={styles.menuAction} onPress={() => { closeMenu(); props.onSelectFiles(); }}><Text style={styles.menuActionText}>+ Add files</Text></Pressable>
          {props.isServerStarted && <Pressable style={styles.menuAction} onPress={() => { closeMenu(); props.onShareUrl(); }}><Text style={styles.menuActionText}>↗ Share connection link</Text></Pressable>}
          {props.isServerStarted && <Pressable style={[styles.menuAction, styles.menuStopAction]} onPress={() => { closeMenu(); props.onStopServer(); }}><Text style={styles.menuStopText}>■ Stop Local Share</Text></Pressable>}
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f8fc' }, container: { padding: 20, paddingBottom: 42 },
  header: { marginTop: 18, marginBottom: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94a3b8' }, statusDotLive: { backgroundColor: '#16a34a' }, eyebrow: { color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, title: { marginTop: 7, color: '#0f172a', fontSize: 32, fontWeight: '800', letterSpacing: -0.8 }, subtitle: { marginTop: 5, color: '#64748b', fontSize: 14 }, headerMark: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0ecff' }, headerMarkText: { color: '#2563eb', fontSize: 29, fontWeight: '700' },
  serverCard: { marginBottom: 16, padding: 18, borderRadius: 24, backgroundColor: '#0f172a', shadowColor: '#0f172a', shadowOpacity: 0.16, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 5 }, serverTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, serverIdentity: { flexDirection: 'row', alignItems: 'center' }, signalBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e40af' }, signalBadgeText: { color: '#dbeafe', fontSize: 23 }, serverTitle: { marginLeft: 10, color: '#fff', fontSize: 16, fontWeight: '800' }, serverSubtitle: { marginTop: 2, marginLeft: 10, color: '#94a3b8', fontSize: 11 }, liveBadge: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: '#123825' }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' }, liveText: { color: '#86efac', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }, connectionLabel: { marginTop: 20, color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, addressBox: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e293b' }, addressText: { color: '#bfdbfe', fontSize: 13, fontWeight: '700' }, detailRow: { marginTop: 17, flexDirection: 'row' }, detailLabel: { color: '#94a3b8', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }, detailValue: { marginTop: 4, color: '#f8fafc', fontSize: 13, fontWeight: '700' }, detailDivider: { width: 1, marginHorizontal: 32, backgroundColor: '#334155' }, actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 }, shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, borderRadius: 12, backgroundColor: '#fff' }, shareButtonText: { color: '#0f172a', fontSize: 13, fontWeight: '800' }, shareButtonArrow: { color: '#2563eb', fontSize: 17, fontWeight: '800' }, stopButton: { minWidth: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#2d1b24' }, stopButtonText: { color: '#fda4af', fontSize: 13, fontWeight: '800' }, metricsRow: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#263449' }, metric: { flex: 1, alignItems: 'center' }, metricValue: { color: '#fff', fontSize: 18, fontWeight: '800' }, metricLabel: { marginTop: 3, color: '#94a3b8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  selectCard: { minHeight: 86, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 3 }, dimmed: { opacity: 0.65 }, selectIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }, selectIconText: { color: '#fff', fontSize: 29, fontWeight: '300' }, selectCopy: { flex: 1, marginLeft: 13 }, selectTitle: { color: '#fff', fontSize: 16, fontWeight: '800' }, selectSubtitle: { marginTop: 3, color: '#dbeafe', fontSize: 11, lineHeight: 16 }, selectArrow: { color: '#fff', fontSize: 29, fontWeight: '300' },
  sectionCard: { marginTop: 18, padding: 18, borderWidth: 1, borderColor: '#e5eaf2', borderRadius: 20, backgroundColor: '#fff' }, sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800' }, sectionCaption: { marginTop: 4, color: '#64748b', fontSize: 12 }, fileList: { marginTop: 11 }, pressableFileRow: { borderRadius: 12 }, fileRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }, fileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' }, fileIconText: { color: '#2563eb', fontSize: 12, fontWeight: '800' }, fileCopy: { flex: 1, marginLeft: 11 }, fileName: { color: '#1e293b', fontSize: 13, fontWeight: '700' }, fileDetail: { marginTop: 4, color: '#64748b', fontSize: 11 }, fileAction: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  emptyCard: { marginTop: 18, padding: 28, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', backgroundColor: '#fff' }, emptyIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#eff6ff' }, emptyIconText: { color: '#2563eb', fontSize: 26, fontWeight: '700' }, emptyTitle: { marginTop: 13, color: '#1e293b', fontSize: 16, fontWeight: '800' }, emptyText: { maxWidth: 250, marginTop: 7, color: '#64748b', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  menuBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' }, menuSheet: { padding: 20, paddingBottom: 34, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#fff' }, menuHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' }, menuTitle: { marginTop: 17, color: '#0f172a', fontSize: 19, fontWeight: '800' }, menuStatus: { marginTop: 5, color: '#64748b', fontSize: 12, lineHeight: 18 }, menuAction: { marginTop: 14, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 13, backgroundColor: '#eff6ff' }, menuActionText: { color: '#1d4ed8', fontSize: 14, fontWeight: '800' }, menuStopAction: { backgroundColor: '#fff1f2' }, menuStopText: { color: '#be123c', fontSize: 14, fontWeight: '800' },
  note: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 23, paddingHorizontal: 5 }, noteIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#dbeafe' }, noteIconText: { color: '#2563eb', fontSize: 12, fontWeight: '800' }, noteText: { flex: 1, marginLeft: 9, color: '#64748b', fontSize: 11, lineHeight: 17 },
});
