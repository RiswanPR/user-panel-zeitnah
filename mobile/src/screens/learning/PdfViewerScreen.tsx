import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Download } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';

export const PdfViewerScreen = ({ route, navigation }: any) => {
  const { url, title } = route.params;
  const [isLoading, setIsLoading] = useState(true);

  // Using Google Docs Viewer for cross-platform PDF rendering in standard WebView
  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.primaryText} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity style={styles.downloadBtn}>
          <Download color={colors.primaryText} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.accentYellow} />
            <Text style={styles.loaderText}>Loading PDF...</Text>
          </View>
        )}
        <WebView 
          source={{ uri: googleDocsUrl }}
          style={styles.webview}
          onLoadEnd={() => setIsLoading(false)}
          scalesPageToFit={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.sm,
    backgroundColor: colors.cardBgSolid,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.primaryBg,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    zIndex: 10,
  },
  loaderText: {
    color: colors.secondaryText,
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.medium,
  }
});
