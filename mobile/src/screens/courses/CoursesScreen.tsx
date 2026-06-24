import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Text, ScrollView } from 'react-native';
import { Search, LayoutGrid, List as ListIcon, BookOpen, GraduationCap, Video } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { CourseCard } from '../../components/cards/CourseCard';
import { CustomInput } from '../../components/inputs/CustomInput';
import { colors, spacing, typography, shadows } from '../../theme';
import { apiClient } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

export const CoursesScreen = ({ navigation }: any) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchCourses = async () => {
    try {
      let endpoint = ENDPOINTS.STUDENT.ALL_COURSES;
      if (activeTab === 'my') {
        endpoint = ENDPOINTS.STUDENT.COURSES;
      } else if (activeTab !== 'all') {
        endpoint = `${ENDPOINTS.STUDENT.ALL_COURSES}?type=${activeTab}`;
      }
      const response = await apiClient.get(endpoint);
      const coursesList = response.data.courses || [];
      const mappedCourses = coursesList.map((c: any) => ({
        id: c._id,
        title: c.name,
        instructor: c.instructor?.name || 'Instructor',
        coverImage: c.coverImage,
        progress: c.learningProgress?.completionPercent || 0,
        category: c.type || 'Course'
      }));
      setCourses(mappedCourses);
    } catch (error) {
      console.log('Failed to fetch courses', error);
      // Fallback mock data
      setCourses([
        { id: 'c1', title: 'Advanced React Native', instructor: 'John Doe', coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80', progress: 45, category: 'Mobile' },
        { id: 'c2', title: 'System Design Mastery', instructor: 'Jane Smith', coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80', progress: 12, category: 'Architecture' },
        { id: 'c3', title: 'UI/UX for Developers', instructor: 'Alice Webb', coverImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80', progress: 0, category: 'Design' },
        { id: 'c4', title: 'Backend Engineering', instructor: 'Robert Chen', coverImage: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80', progress: 0, category: 'Backend' },
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchCourses();
  }, [activeTab]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchCourses();
  };

  const filteredCourses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return courses;
    return courses.filter(c => c.title.toLowerCase().includes(query));
  }, [courses, searchQuery]);

  const stats = useMemo(() => ({
    total: courses.length,
    enrolled: courses.filter(c => c.progress > 0).length,
    recordings: courses.filter(c => c.category === 'Recording').length,
  }), [courses]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Hero Section */}
      <LinearGradient
        colors={['rgba(15, 23, 36, 0.9)', 'rgba(19, 29, 45, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.topGradientLine} />
        
        <View style={styles.badgeContainer}>
          <GraduationCap color={colors.accentMint} size={14} />
          <Text style={styles.badgeText}>LEARNING PORTAL</Text>
        </View>
        
        <Text style={styles.heroTitle}>Course Hub</Text>
        <Text style={styles.heroSubtitle}>
          Browse your specialized library, continue active lessons, and discover new learning paths.
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <BookOpen color={colors.accentMint} size={16} style={styles.statIcon} />
            <Text style={styles.statLabel}>LIBRARY</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statBox}>
            <GraduationCap color={colors.accentMint} size={16} style={styles.statIcon} />
            <Text style={styles.statLabel}>ENROLLED</Text>
            <Text style={styles.statValue}>{stats.enrolled}</Text>
          </View>
          <View style={styles.statBox}>
            <Video color={colors.accentMint} size={16} style={styles.statIcon} />
            <Text style={styles.statLabel}>RECORDINGS</Text>
            <Text style={styles.statValue}>{stats.recordings}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          <View style={styles.tabsContainer}>
            {[
              { id: 'all', label: 'All Courses' }, 
              { id: 'Recording', label: 'Studio Recordings' },
              { id: 'online', label: 'Zoom Recordings' },
              { id: 'my', label: 'My Courses' }
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Search and Layout Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchWrapper}>
          <CustomInput
            placeholder="Search courses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search color={colors.secondaryText} size={20} />}
          />
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, !isGridView && styles.toggleBtnActive]} 
            onPress={() => setIsGridView(false)}
          >
            <ListIcon color={!isGridView ? colors.accentMint : colors.secondaryText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, isGridView && styles.toggleBtnActive]} 
            onPress={() => setIsGridView(true)}
          >
            <LayoutGrid color={isGridView ? colors.accentMint : colors.secondaryText} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsLabel}>COURSE RESULTS</Text>
        <Text style={styles.resultsCount}>
          {isLoading ? "Loading courses..." : `${filteredCourses.length} courses available`}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        key={isGridView ? 'grid' : 'list'}
        data={filteredCourses}
        keyExtractor={(item) => item.id}
        numColumns={isGridView ? 2 : 1}
        columnWrapperStyle={isGridView ? styles.row : undefined}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.accentMint} 
          />
        }
        renderItem={({ item }) => (
          <CourseCard
            {...item}
            isLandscape={!isGridView}
            style={isGridView ? styles.gridCard : styles.listCard}
            onPress={(id) => navigation.navigate('CourseDetails', { id })}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <BookOpen color={colors.accentMint} size={28} />
              </View>
              <Text style={styles.emptyTitle}>No matching courses</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search term or adjust the filter to find what you're looking for.
              </Text>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 120, // space for bottom tab bar
  },
  headerContainer: {
    marginBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(159, 213, 178, 0.1)',
    overflow: 'hidden',
    ...shadows.medium,
    marginBottom: spacing.xl,
  },
  topGradientLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(159, 213, 178, 0.3)',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(159, 213, 178, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(159, 213, 178, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    gap: 6,
  },
  badgeText: {
    color: colors.accentMint,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.primaryText,
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 6,
  },
  statLabel: {
    color: colors.secondaryText,
    fontSize: 10,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    color: colors.primaryText,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
  },
  tabsWrapper: {
    marginBottom: spacing.xl,
  },
  tabsScrollContent: {
    paddingRight: spacing.xl,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.cardBgSolid,
    ...shadows.soft,
  },
  tabText: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  tabTextActive: {
    color: colors.primaryText,
  },
  controlsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    alignItems: 'center',
    zIndex: 5,
  },
  searchWrapper: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBgSolid,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    height: 56, // Match CustomInput height
  },
  toggleBtn: {
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(159, 213, 178, 0.1)',
  },
  resultsHeader: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
  },
  resultsLabel: {
    color: colors.secondaryText,
    fontSize: 10,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultsCount: {
    color: colors.primaryText,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
  },
  row: {
    justifyContent: 'space-between',
  },
  listCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  gridCard: {
    width: '48%',
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.md,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(159, 213, 178, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(159, 213, 178, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.primaryText,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  }
});
