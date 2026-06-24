import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FileText, Download, Link as LinkIcon, Paperclip } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';

export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'attachment';
  url: string;
  size?: string;
}

interface ResourceListProps {
  resources: Resource[];
  onPressResource: (resource: Resource) => void;
  onDownloadResource?: (resource: Resource) => void;
}

export const ResourceList: React.FC<ResourceListProps> = ({ resources, onPressResource, onDownloadResource }) => {
  if (!resources || resources.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No resources available for this class.</Text>
      </View>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText color={colors.accentYellow} size={24} />;
      case 'link': return <LinkIcon color={colors.accentYellow} size={24} />;
      default: return <Paperclip color={colors.accentYellow} size={24} />;
    }
  };

  return (
    <View style={styles.container}>
      {resources.map((resource) => (
        <TouchableOpacity 
          key={resource.id} 
          style={styles.resourceRow}
          onPress={() => onPressResource(resource)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {getIcon(resource.type)}
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>{resource.title}</Text>
            {resource.size && <Text style={styles.size}>{resource.size}</Text>}
          </View>
          
          {onDownloadResource && resource.type !== 'link' && (
            <TouchableOpacity 
              style={styles.downloadBtn} 
              onPress={() => onDownloadResource(resource)}
            >
              <Download color={colors.secondaryText} size={20} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.secondaryText,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.sm,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    marginBottom: 4,
  },
  size: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  downloadBtn: {
    padding: spacing.sm,
  }
});
