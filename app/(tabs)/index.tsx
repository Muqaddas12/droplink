import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { pickFiles } from '@/lib/nativeFilePicker';

export default function TabOneScreen() {

  const handlePickFiles = async () => {
    try {

      const files = await pickFiles();

      console.log('SELECTED FILES:', files);

      if (files.length === 0) {
        Alert.alert(
          'No files selected',
          'You did not select any files.'
        );

        return;
      }

      Alert.alert(
        'Files selected',
        files
          .map(
            (file) =>
              `${file.name}\n${file.size ?? 0} bytes`
          )
          .join('\n\n')
      );

    } catch (error) {

      console.error(
        'FILE PICKER ERROR:',
        error
      );

      Alert.alert(
        'Error',
        String(error)
      );
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        DropLink
      </Text>

      <Text style={styles.subtitle}>
        Native Android File Picker
      </Text>

      <Pressable
        style={styles.button}
        onPress={handlePickFiles}
      >

        <Text style={styles.buttonText}>
          Select Files
        </Text>

      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 8,
    color: '#777',
  },

  button: {
    marginTop: 30,
    backgroundColor: '#2563EB',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 14,
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

});