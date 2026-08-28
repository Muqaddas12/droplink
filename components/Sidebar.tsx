import { useSidebar } from '@/context/SidebarContext';
import { ThemeMode, useTheme } from '@/context/ThemeContext';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

type NavItemProps = {
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
};

function NavItem({
  icon,
  title,
  subtitle,
  badge,
  isActive,
  onPress,
  colors,
}: NavItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.navItem,
        {
          backgroundColor: isActive ? colors.primaryFade : 'transparent',
          borderColor: isActive ? colors.primary : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.navIconBox,
          {
            backgroundColor: isActive ? colors.primary : colors.surface2,
          },
        ]}
      >
        <Text
          style={[
            styles.navIcon,
            { color: isActive ? '#FFFFFF' : colors.text },
          ]}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.navTextContainer}>
        <Text
          style={[
            styles.navTitle,
            {
              color: isActive ? colors.primary : colors.text,
              fontWeight: isActive ? '700' : '600',
            },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.navSubtitle, { color: colors.subtext }]}>
          {subtitle}
        </Text>
      </View>

      {badge !== undefined && badge > 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isActive ? colors.primary : colors.surface3,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: isActive ? '#FFFFFF' : colors.text },
            ]}
          >
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Sidebar() {
  const { isOpen, closeSidebar, receivedCount, refreshReceivedCount } = useSidebar();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(isOpen);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      void refreshReceivedCount();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
      });
    }
  }, [isOpen, slideAnim, fadeAnim, refreshReceivedCount]);

  if (!visible) return null;

  const navigateTo = (path: string) => {
    closeSidebar();
    if (path === '/(tabs)') {
      router.replace('/(tabs)' as any);
    } else {
      router.push(path as any);
    }
  };

  const isHomeActive = pathname === '/' || pathname === '/(tabs)' || pathname.startsWith('/(tabs)');
  const isReceivedActive = pathname === '/received-files';
  const isSettingsActive = pathname === '/settings';

  return (
    <View style={styles.modalRoot} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeSidebar}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: SIDEBAR_WIDTH,
            backgroundColor: colors.surface1,
            borderRightColor: colors.border,
            paddingTop: insets.top > 0 ? insets.top : 24,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Drawer Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoLetter}>D</Text>
            </View>
            <View style={styles.brandInfo}>
              <Text style={[styles.brandName, { color: colors.text }]}>DropLink</Text>
              <Text style={[styles.brandTag, { color: colors.subtext }]}>
                Private · Fast · Local
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
            onPress={closeSidebar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeBtnText, { color: colors.subtext }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation List */}
        <View style={styles.navList}>
          <NavItem
            icon="🏠"
            title="Home"
            subtitle="Local & Internet file transfer"
            isActive={isHomeActive}
            colors={colors}
            onPress={() => navigateTo('/(tabs)')}
          />

          <NavItem
            icon="📥"
            title="Received Files"
            subtitle="View & open received files"
            badge={receivedCount}
            isActive={isReceivedActive}
            colors={colors}
            onPress={() => navigateTo('/received-files')}
          />

          <NavItem
            icon="⚙️"
            title="Settings"
            subtitle="Appearance & preferences"
            isActive={isSettingsActive}
            colors={colors}
            onPress={() => navigateTo('/settings')}
          />
        </View>

        {/* Quick Theme Switcher */}
        <View style={[styles.themeCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Text style={[styles.themeCardTitle, { color: colors.subtext }]}>APPEARANCE</Text>
          <View style={styles.themeToggleRow}>
            {(['dark', 'light', 'system'] as ThemeMode[]).map(mode => {
              const selected = themeMode === mode;
              const label = mode === 'dark' ? '🌙 Dark' : mode === 'light' ? '☀️ Light' : '📱 Auto';
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themeBtn,
                    selected && {
                      backgroundColor: colors.surface1,
                      borderColor: colors.primary,
                      borderWidth: 1,
                      shadowColor: colors.primary,
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      {
                        color: selected ? colors.primary : colors.muted,
                        fontWeight: selected ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            DropLink v1.0.0 · Local Transfer
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    elevation: 900,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  brandInfo: {
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navList: {
    flex: 1,
    gap: 8,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  navIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIcon: {
    fontSize: 18,
  },
  navTextContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  navSubtitle: {
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  themeCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  themeBtnText: {
    fontSize: 11,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
  },
});
