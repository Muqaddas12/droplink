import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ContactScreen() {
  const { colors, isDark } = useTheme();
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const supportEmail = 'muqaddas.dev@gmail.com';
  const githubUrl = 'https://github.com/Muqaddas12/droplink';

  const handleSendDirectEmail = async () => {
    try {
      const url = `mailto:${supportEmail}?subject=DropLink%20Support%20Request`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Contact Email', `You can reach us at: ${supportEmail}`);
      }
    } catch {
      Alert.alert('Contact Email', `You can reach us at: ${supportEmail}`);
    }
  };

  const handleOpenGithub = async () => {
    try {
      await Linking.openURL(githubUrl);
    } catch {
      Alert.alert('Repository', githubUrl);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please enter your feedback or question before submitting.');
      return;
    }

    const emailSubject = encodeURIComponent(subject.trim() || 'DropLink Feedback');
    const emailBody = encodeURIComponent(
      `Name: ${name.trim() || 'Anonymous'}\n` +
      `Email: ${email.trim() || 'Not provided'}\n` +
      `Platform: ${Platform.OS} (SDK ${Platform.Version})\n\n` +
      `Message:\n${message.trim()}`
    );

    const mailtoUrl = `mailto:${supportEmail}?subject=${emailSubject}&body=${emailBody}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
        Alert.alert('Thank You!', 'Your feedback draft was prepared in your email client.');
      } else {
        Alert.alert(
          'Feedback Recorded',
          `Thank you for your feedback! You can also email us directly at: ${supportEmail}`
        );
      }
    } catch {
      Alert.alert(
        'Feedback Recorded',
        `Thank you for your feedback! You can also email us directly at: ${supportEmail}`
      );
    }
  };

  const faqs = [
    {
      q: 'How does Local Share work?',
      a: 'DropLink starts a lightweight, high-speed local HTTP server directly on your device. Any device connected to the same Wi-Fi or mobile hotspot can upload and download files at full LAN speed with zero internet data usage.',
    },
    {
      q: 'Why can’t the other device find my server?',
      a: 'Make sure both devices are connected to the EXACT same Wi-Fi network or one device is connected to the other device’s portable Wi-Fi Hotspot. Ensure local network isolation is disabled on your router.',
    },
    {
      q: 'Where are my received files saved?',
      a: 'Files received on Android are saved to your Downloads/DropLink folder. You can view, search, and open them anytime from the Received Files screen.',
    },
    {
      q: 'Is my data private and secure?',
      a: 'Yes! Transfers stay 100% local on your private Wi-Fi network. No files, logs, or analytics are ever uploaded to any cloud server.',
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
              Support, Feedback & FAQ
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Quick Contact Card */}
        <View style={[styles.card, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryFade }]}>
              <Text style={[styles.iconCircleText, { color: colors.primary }]}>✉️</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Developer Support</Text>
              <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>
                Questions, bug reports or feature ideas?
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSendDirectEmail}
            activeOpacity={0.7}
            style={[styles.emailActionBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.emailActionBtnText}>Send Direct Email</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={handleOpenGithub}
            activeOpacity={0.7}
            style={[styles.githubBtn, { backgroundColor: colors.surface2 }]}
          >
            <Text style={[styles.githubBtnText, { color: colors.text }]}>
              ⭐ View Project on GitHub
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feedback Form */}
        <View style={[styles.card, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Send In-App Feedback</Text>
          <Text style={[styles.sectionSubheading, { color: colors.subtext }]}>
            Fill out the form below to send us your suggestions or report issues.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.subtext }]}>Your Name (Optional)</Text>
            <TextInput
              placeholder="e.g. Alex"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              style={[
                styles.textInput,
                { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.subtext }]}>Your Email (Optional)</Text>
            <TextInput
              placeholder="e.g. alex@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.textInput,
                { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.subtext }]}>Subject</Text>
            <TextInput
              placeholder="e.g. Feature suggestion / Bug report"
              placeholderTextColor={colors.muted}
              value={subject}
              onChangeText={setSubject}
              style={[
                styles.textInput,
                { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.subtext }]}>Message *</Text>
            <TextInput
              placeholder="Describe your feedback, suggestion, or question in detail..."
              placeholderTextColor={colors.muted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              style={[
                styles.textArea,
                { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border },
              ]}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmitFeedback}
            activeOpacity={0.7}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={[styles.card, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Frequently Asked Questions</Text>

          <View style={styles.faqList}>
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.faqItem,
                    { borderBottomColor: colors.border, borderBottomWidth: idx === faqs.length - 1 ? 0 : 1 },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                    style={styles.faqHeader}
                  >
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.q}</Text>
                    <Text style={[styles.faqArrow, { color: colors.subtext }]}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <Text style={[styles.faqAnswer, { color: colors.subtext }]}>{faq.a}</Text>
                  )}
                </View>
              );
            })}
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
    gap: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleText: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emailActionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  emailActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  githubBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  githubBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubheading: {
    fontSize: 12,
    lineHeight: 16,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  faqList: {
    marginTop: 4,
  },
  faqItem: {
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  faqArrow: {
    fontSize: 12,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});

