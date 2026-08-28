import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import { ReceivedFile, scanLocalReceivedFiles } from '@/lib/nativeDropLink';
import { openFile } from '@/lib/openFile';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    Share,
    StyleSheet,
    Text,
    TextInput,
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

const getCategoryMeta = (mimeType?: string | null, category?: string) => {
  const m = (mimeType || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (m.startsWith('image') || c === 'images') {
    return { icon: '🖼️', label: 'Images', color: '#10B981' };
  }
  if (m.startsWith('video') || c === 'videos') {
    return { icon: '🎬', label: 'Videos', color: '#8B5CF6' };
  }
  if (m.startsWith('audio') || c === 'audio') {
    return { icon: '🎵', label: 'Audio', color: '#F59E0B' };
  }
  if (m.includes('pdf') || m.includes('document') || c === 'documents') {
    return { icon: '📄', label: 'Documents', color: '#3B82F6' };
  }
  if (m.includes('zip') || m.includes('rar') || m.includes('tar') || c === 'archives') {
    return { icon: '📦', label: 'Archives', color: '#EC4899' };
  }
  return { icon: '📎', label: 'Others', color: '#64748B' };
};

type SortMode = 'newest' | 'name' | 'size';

export default function ReceivedFilesScreen() {
  const { colors, isDark } = useTheme();
  const { openSidebar, setReceivedCount } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const loadFiles = useCallback(async () => {
    try {
      const scanned = await scanLocalReceivedFiles();
      setFiles(scanned);
      setReceivedCount(scanned.length);
    } catch (err) {
      console.warn('Error loading received files:', err);
    } finally {
      setLoading(false);
    }
  }, [setReceivedCount]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handleOpenFile = async (file: ReceivedFile) => {
    try {
      await openFile(file.path, file.mimeType);
    } catch (error) {
      Alert.alert(
        'Cannot Open File',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleShareFile = async (file: ReceivedFile) => {
    try {
      await Share.share({
        message: `File: ${file.name}\nSize: ${formatSize(file.size)}\nPath: ${file.path}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: files.length,
      Images: 0,
      Videos: 0,
      Audio: 0,
      Documents: 0,
      Archives: 0,
      Others: 0,
    };
    files.forEach(f => {
      const meta = getCategoryMeta(f.mimeType, f.category);
      if (counts[meta.label] !== undefined) {
        counts[meta.label]++;
      } else {
        counts.Others++;
      }
    });
    return counts;
  }, [files]);

  // Total size
  const totalSize = useMemo(() => {
    return files.reduce((sum, f) => sum + (f.size || 0), 0);
  }, [files]);

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter(file => {
        const matchesSearch = file.name
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
        if (!matchesSearch) return false;

        if (selectedCategory === 'All') return true;
        const meta = getCategoryMeta(file.mimeType, file.category);
        return meta.label.toLowerCase() === selectedCategory.toLowerCase();
      })
      .sort((a, b) => {
        if (sortMode === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortMode === 'size') {
          return (b.size || 0) - (a.size || 0);
        }
        // Default / newest
        return 0;
      });
  }, [files, searchQuery, selectedCategory, sortMode]);

  const categories = ['All', 'Images', 'Videos', 'Audio', 'Documents', 'Archives', 'Others'];

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Received Files</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
              {files.length} {files.length === 1 ? 'file' : 'files'} · {formatSize(totalSize)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          activeOpacity={0.7}
          style={[styles.headerBtn, { backgroundColor: colors.surface2 }]}
        >
          <Text style={[styles.headerBtnIcon, { color: colors.text }]}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Sort Row */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search received files..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: colors.subtext }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sort button */}
        <TouchableOpacity
          onPress={() => {
            const nextSort: Record<SortMode, SortMode> = {
              newest: 'name',
              name: 'size',
              size: 'newest',
            };
            setSortMode(nextSort[sortMode]);
          }}
          style={[styles.sortBtn, { backgroundColor: colors.surface1, borderColor: colors.border }]}
        >
          <Text style={[styles.sortBtnText, { color: colors.subtext }]}>
            {sortMode === 'newest' ? '⏱️ Newest' : sortMode === 'name' ? '🔤 A-Z' : '📊 Size'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryScrollWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            const count = categoryCounts[item] || 0;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface1,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {item}
                </Text>
                <View
                  style={[
                    styles.categoryChipBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : colors.surface2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipBadgeText,
                      { color: isSelected ? '#FFFFFF' : colors.subtext },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* File List */}
      <FlatList
        data={filteredFiles}
        keyExtractor={(item, idx) => `${item.path}_${idx}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface2 }]}>
                <Text style={styles.emptyIcon}>📥</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery || selectedCategory !== 'All'
                  ? 'No matching files'
                  : 'No received files yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                {searchQuery || selectedCategory !== 'All'
                  ? 'Try adjusting your search or category filter.'
                  : 'Files sent to this device via Local Share or Internet Share will appear here automatically.'}
              </Text>

              {(!searchQuery && selectedCategory === 'All') && (
                <TouchableOpacity
                  onPress={() => router.replace('/(tabs)' as any)}
                  style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.emptyActionBtnText}>Go to Home to Receive</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => {
          const meta = getCategoryMeta(item.mimeType, item.category);
          return (
            <View
              style={[
                styles.fileCard,
                {
                  backgroundColor: colors.surface1,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Category Icon */}
              <View
                style={[
                  styles.fileIconBox,
                  { backgroundColor: isDark ? colors.surface2 : '#EFF6FF' },
                ]}
              >
                <Text style={styles.fileIconText}>{meta.icon}</Text>
              </View>

              {/* File Info */}
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.fileMetaRow}>
                  <Text style={[styles.fileMetaText, { color: colors.subtext }]}>
                    {formatSize(item.size)}
                  </Text>
                  <Text style={[styles.metaDot, { color: colors.muted }]}>•</Text>
                  <View style={[styles.categoryTag, { backgroundColor: colors.surface2 }]}>
                    <Text style={[styles.categoryTagText, { color: colors.subtext }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.fileActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleOpenFile(item)}
                  style={[styles.openBtn, { backgroundColor: colors.primaryFade, borderColor: colors.primary }]}
                >
                  <Text style={[styles.openBtnText, { color: colors.primary }]}>Open</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleShareFile(item)}
                  style={[styles.shareBtn, { backgroundColor: colors.surface2 }]}
                >
                  <Text style={styles.shareBtnText}>📤</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
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
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sortBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScrollWrap: {
    paddingVertical: 6,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  categoryChipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileIconText: {
    fontSize: 22,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileMetaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 10,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  shareBtn: {
    padding: 8,
    borderRadius: 8,
  },
  shareBtnText: {
    fontSize: 14,
  },
  emptyContainer: {
    marginTop: 40,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
