import { useSidebar } from '@/context/SidebarContext';
import { ThemeMode, useTheme } from '@/context/ThemeContext';
import { scanLocalReceivedFiles } from '@/lib/nativeDropLink';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Clipboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [receivedCount, setReceivedCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const files = await scanLocalReceivedFiles();
        setReceivedCount(files.length);
        const bytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
        setTotalSize(bytes);
      } catch {}
    }
    void loadStats();
  }, []);

  const downloadPath = 'Download/DropLink';

  const handleCopyPath = () => {
    Clipboard.setString(downloadPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const themeOptions: {
    mode: ThemeMode;
    icon: string;
    title: string;
    description: string;
  }[] = [
    {
      mode: 'dark',
      icon: '🌙',
      title: 'Dark Mode',
      description: 'Sleek dark theme, easy on the eyes and saves battery.',
    },
    {
      mode: 'light',
      icon: '☀️',
      title: 'Light Mode',
      description: 'Bright and crisp design optimized for daylight viewing.',
    },
    {
      mode: 'system',
      icon: '📱',
      title: 'System Default',
      description: 'Automatically matches your device system appearance.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={openSidebar}
            activeOpacity={0.7}
            style={[styles.headerBtn, { backgroundColor: colors.surface2 }]}
          >
            <Text style={[styles.headerBtnIcon, { color: colors.text }]}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
              Theme & App Preferences
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Section 1: Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>APPEARANCE</Text>
          <Text style={[styles.sectionDescription, { color: colors.subtext }]}>
            Choose how DropLink looks to match your preference or environment.
          </Text>

          <View style={styles.themeCardsList}>
            {themeOptions.map(opt => {
              const isSelected = themeMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  activeOpacity={0.7}
                  onPress={() => setThemeMode(opt.mode)}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: colors.surface1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.themeCardTop}>
                    <View style={styles.themeCardLeft}>
                      <Text style={styles.themeCardIcon}>{opt.icon}</Text>
                      <Text style={[styles.themeCardTitle, { color: colors.text }]}>
                        {opt.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.muted,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <Text style={[styles.themeCardDesc, { color: colors.subtext }]}>
                    {opt.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Storage & Downloads */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>STORAGE & DOWNLOADS</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Save Location</Text>
              <TouchableOpacity onPress={handleCopyPath} style={styles.copyPathBtn}>
                <Text style={[styles.infoValueMonospace, { color: colors.text }]}>
                  {downloadPath}
                </Text>
                <Text style={styles.copyIcon}>{copiedPath ? '✓' : '📋'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Received Storage Used</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatSize(totalSize)} ({receivedCount} {receivedCount === 1 ? 'file' : 'files'})
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={() => router.push('/received-files' as any)}
              style={[styles.manageFilesBtn, { backgroundColor: colors.primaryFade }]}
            >
              <Text style={[styles.manageFilesText, { color: colors.primary }]}>
                Browse All Received Files →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Privacy & Network */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>PRIVACY & LOCAL NETWORK</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
            <View style={styles.privacyFeature}>
              <Text style={styles.featureIcon}>🔒</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Zero Cloud Relays</Text>
                <Text style={[styles.featureDesc, { color: colors.subtext }]}>
                  Local Share sends files directly device-to-device over your local Wi-Fi. No data is stored on third-party servers.
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.privacyFeature}>
              <Text style={styles.featureIcon}>🌐</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>mDNS Apple Discovery</Text>
                <Text style={[styles.featureDesc, { color: colors.subtext }]}>
                  iOS and macOS devices can connect by simply browsing to droplink.local on Safari.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 4: About & Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>ABOUT & SUPPORT</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
            <View style={styles.aboutHeader}>
              <View style={[styles.aboutLogo, { backgroundColor: colors.primary }]}>
                <Text style={styles.aboutLogoText}>D</Text>
              </View>
              <View>
                <Text style={[styles.aboutName, { color: colors.text }]}>DropLink</Text>
                <Text style={[styles.aboutVersion, { color: colors.subtext }]}>
                  Version 1.0.0 (Build 1)
                </Text>
              </View>
            </View>

            <Text style={[styles.aboutDesc, { color: colors.subtext }]}>
              High-speed, private, open-architecture file sharing for mobile and desktop.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={() => router.push('/contact' as any)}
              style={[styles.manageFilesBtn, { backgroundColor: colors.primaryFade }]}
            >
              <Text style={[styles.manageFilesText, { color: colors.primary }]}>
                💬 Contact Us & Support →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  themeCardsList: {
    gap: 10,
  },
  themeCard: {
    padding: 14,
    borderRadius: 14,
  },
  themeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  themeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeCardIcon: {
    fontSize: 20,
  },
  themeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  themeCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 30,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  copyPathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValueMonospace: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  copyIcon: {
    fontSize: 14,
  },
  divider: {
    height: 1,
  },
  manageFilesBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageFilesText: {
    fontSize: 13,
    fontWeight: '700',
  },
  privacyFeature: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aboutLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  aboutName: {
    fontSize: 16,
    fontWeight: '800',
  },
  aboutVersion: {
    fontSize: 12,
    marginTop: 2,
  },
  aboutDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
