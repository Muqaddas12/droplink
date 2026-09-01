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
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '@/context/ThemeContext';
import { pickFiles } from '@/lib/nativeFilePicker';
import {
    createInternetServer,
    InternetServerInfo,
    pauseInternetServer,
    resumeInternetServer,
    stopInternetServer,
} from '@/lib/nativeInternetTransfer';
import { openFile } from '@/lib/openFile';

type PickedFile = Awaited<ReturnType<typeof pickFiles>>[number];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getMimeMeta = (mimeType?: string | null) => {
  if (mimeType?.startsWith('image/')) return { emoji: '🖼️', color: '#10B981' };
  if (mimeType?.startsWith('video/')) return { emoji: '🎬', color: '#8B5CF6' };
  if (mimeType?.startsWith('audio/')) return { emoji: '🎵', color: '#F59E0B' };
  if (mimeType?.includes('zip') || mimeType?.includes('tar') || mimeType?.includes('rar')) return { emoji: '📦', color: '#EF4444' };
  if (mimeType === 'application/pdf') return { emoji: '📄', color: '#EF4444' };
  return { emoji: '📄', color: '#3B82F6' };
};

export default function TabTwoScreen() {
  const { colors, isDark } = useTheme();
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
      setSelectedFiles([]);
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
      Alert.alert('Cannot Open File', error instanceof Error ? error.message : String(error));
    }
  };

  const totalSize = selectedFiles.reduce((t, f) => t + (f.size ?? 0), 0);

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {(!serverInfo && selectedFiles.length === 0) ? (
          <View style={styles.idleState}>
            <View style={[styles.idleIconWrap, { backgroundColor: colors.accentFade }]}>
              <Text style={[styles.idleIcon, { color: colors.accent }]}>◎</Text>
            </View>
            <Text style={[styles.idleTitle, { color: colors.text }]}>Share via Internet</Text>
            <Text style={[styles.idleSubtitle, { color: colors.subtext }]}>
              Connect devices across networks. No app needed on the other side.
            </Text>
            
            <View style={[styles.howItWorksCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              <View style={styles.stepRow}>
                <Text style={[styles.stepNum, { color: colors.accent }]}>①</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>Select Files</Text>
                <Text style={[styles.stepArrow, { color: colors.muted }]}>→</Text>
                <Text style={[styles.stepNum, { color: colors.accent }]}>②</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>Share Link</Text>
                <Text style={[styles.stepArrow, { color: colors.muted }]}>→</Text>
                <Text style={[styles.stepNum, { color: colors.accent }]}>③</Text>
                <Text style={[styles.stepText, { color: colors.text }]}>Receiver Downloads</Text>
              </View>
            </View>

            <Pressable
              style={[styles.btnSelectFiles, { backgroundColor: colors.accent }]}
              onPress={handleSelectFiles}
              disabled={loading}
            >
              <Text style={styles.btnSelectFilesText}>Select Files to Share</Text>
            </Pressable>
            
            <Pressable
              style={[styles.btnReceiveOutline, { borderColor: colors.border }]}
              onPress={() => Alert.alert('Receive', 'Use Local Share to receive files instantly on LAN')}
            >
              <Text style={[styles.btnReceiveText, { color: colors.subtext }]}>Receive via Local Share</Text>
            </Pressable>
          </View>
        ) : serverInfo ? (
          <View style={styles.activeState}>
            <View style={styles.statusBanner}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusBannerText, { color: colors.success }]}>CONNECTED</Text>
            </View>
            
            {serverInfo.url && (
              <View style={[styles.qrCard, { backgroundColor: colors.surface1, borderColor: colors.accent }]}>
                <View style={[styles.qrWrapper, { backgroundColor: colors.surface1 }]}>
                  <QRCode value={serverInfo.url} size={150} color={colors.text} backgroundColor={colors.surface1} />
                </View>
                <View style={[styles.urlRow, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.urlText, { color: colors.text }]} numberOfLines={1}>{serverInfo.url}</Text>
                  <Pressable style={[styles.btnCopy, { backgroundColor: colors.surface3 }]} onPress={handleCopyUrl}>
                    <Text style={styles.btnCopyText}>{copied ? '✓' : '📋'}</Text>
                  </Pressable>
                  <Pressable style={[styles.btnCopy, { backgroundColor: colors.surface3 }]} onPress={handleShareUrl}>
                    <Text style={styles.btnCopyText}>📤</Text>
                  </Pressable>
                </View>
              </View>
            )}
            
            <View style={styles.networkChips}>
              <View style={[styles.chip, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.subtext }]}>Port: {serverInfo.port}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.subtext }]}>Net: {serverInfo.networkType || 'Internet'}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.subtext }]}>Status: {paused ? 'Paused' : 'Active'}</Text>
              </View>
            </View>
            
            <View style={[styles.fileList, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              {selectedFiles.map((file, idx) => (
                <View key={idx} style={styles.fileRow}>
                  <Text style={styles.fileEmoji}>{getMimeMeta(file.mimeType).emoji}</Text>
                  <View style={styles.fileRowInfo}>
                    <Text style={[styles.fileRowName, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.fileRowSize, { color: colors.muted }]}>{formatSize(file.size ?? 0)}</Text>
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.controlButtons}>
              <Pressable
                style={[styles.btnPause, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={handlePauseResume}
              >
                <Text style={[styles.btnPauseText, { color: colors.text }]}>{paused ? '▶ Resume' : '⏸ Pause'}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnStop, { backgroundColor: colors.dangerFade, borderColor: colors.danger }]}
                onPress={handleStopServer}
              >
                <Text style={[styles.btnStopText, { color: colors.danger }]}>⏹ Stop / Disconnect</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.previewState}>
             <View style={styles.sectionHeader}>
               <Text style={[styles.sectionTitle, { color: colors.text }]}>Selected Files</Text>
               <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
                 {selectedFiles.length} files • {formatSize(totalSize)}
               </Text>
             </View>
             <View style={[styles.fileList, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              {selectedFiles.map((file, idx) => (
                <Pressable key={idx} style={styles.fileRow} onPress={() => handleSelectedFilePress(file)}>
                  <Text style={styles.fileEmoji}>{getMimeMeta(file.mimeType).emoji}</Text>
                  <View style={styles.fileRowInfo}>
                    <Text style={[styles.fileRowName, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.fileRowSize, { color: colors.muted }]}>{formatSize(file.size ?? 0)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.btnSelectFiles, { backgroundColor: colors.accent }]}
              onPress={handleCreateServer}
              disabled={loading}
            >
              <Text style={styles.btnSelectFilesText}>{loading ? 'Starting...' : 'Share Selected Files'}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnReceiveOutline, { borderColor: colors.border }]}
              onPress={handleSelectFiles}
              disabled={loading}
            >
              <Text style={[styles.btnReceiveText, { color: colors.subtext }]}>Change Selection</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  // Idle State
  idleState: { alignItems: 'center', marginTop: 40 },
  idleIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  idleIcon: { fontSize: 40 },
  idleTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  idleSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  howItWorksCard: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, width: '100%', marginBottom: 32,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  stepNum: { fontSize: 14, fontWeight: 'bold' },
  stepText: { fontSize: 12 },
  stepArrow: { fontSize: 12, marginHorizontal: 2 },
  
  btnSelectFiles: {
    borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', marginBottom: 16,
  },
  btnSelectFilesText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  btnReceiveOutline: {
    backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', borderWidth: 1,
  },
  btnReceiveText: { fontSize: 16, fontWeight: 'bold' },

  // Active State
  activeState: { marginTop: 10 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBannerText: { fontWeight: 'bold', fontSize: 14 },
  
  qrCard: {
    borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 2, marginBottom: 24,
  },
  qrWrapper: { padding: 16, borderRadius: 12, marginBottom: 20 },
  urlRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
  urlText: { flex: 1, fontFamily: 'monospace', fontSize: 12, marginRight: 8 },
  btnCopy: { padding: 8, borderRadius: 6, marginLeft: 8 },
  btnCopyText: { fontSize: 16 },
  
  networkChips: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 12 },
  
  // File List & Preview State
  previewState: { marginTop: 20 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14 },
  
  fileList: { borderRadius: 16, padding: 12, borderWidth: 1, marginBottom: 24, gap: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileEmoji: { fontSize: 24, marginRight: 12 },
  fileRowInfo: { flex: 1 },
  fileRowName: { fontSize: 14, fontWeight: '600' },
  fileRowSize: { fontSize: 12, marginTop: 2 },
  
  controlButtons: { flexDirection: 'row', gap: 12 },
  btnPause: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  btnPauseText: { fontWeight: 'bold' },
  btnStop: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  btnStopText: { fontWeight: 'bold' },
});
