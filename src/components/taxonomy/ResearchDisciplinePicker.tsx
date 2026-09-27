import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Search,
  X,
  Plus,
  Check,
  CheckCircle2,
  Sparkles,
  Compass,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import {
  POPULAR_DISCIPLINES,
  RESEARCH_TAXONOMY_FAMILIES,
  INTERDISCIPLINARY_GROUPS,
  TaxonomyItem,
  searchResearchTaxonomy,
} from '../../data/researchTaxonomy';

export interface ResearchDisciplinePickerProps {
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
  onRemoveTopic?: (topic: string) => void;
  onClearAll?: () => void;
  showPopularSection?: boolean;
  showBrowseSection?: boolean;
  searchPlaceholder?: string;
  hint?: string;
}

export const ResearchDisciplinePicker: React.FC<ResearchDisciplinePickerProps> = ({
  selectedTopics,
  onToggleTopic,
  onRemoveTopic,
  onClearAll,
  showPopularSection = true,
  showBrowseSection = true,
  searchPlaceholder = 'Search 1,000+ fields, subfields, or topics...',
  hint = 'These topics configure your customized home feed tabs and preprint recommendations.',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('all');
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  const isTopicSelected = (topic: string) => {
    return selectedTopics.some((t) => t.toLowerCase() === topic.toLowerCase());
  };

  const handleToggle = (topic: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onToggleTopic(topic);
  };

  const handleRemove = (topic: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onRemoveTopic) {
      onRemoveTopic(topic);
    } else {
      onToggleTopic(topic);
    }
  };

  // Real-time search matches
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchResearchTaxonomy(searchQuery.trim(), 30);
  }, [searchQuery]);

  // Filtered families based on category tab
  const displayedFamilies = useMemo(() => {
    if (selectedFamilyFilter === 'all') return RESEARCH_TAXONOMY_FAMILIES;
    if (selectedFamilyFilter === 'interdisciplinary') return [];
    return RESEARCH_TAXONOMY_FAMILIES.filter((f) => f.id === selectedFamilyFilter);
  }, [selectedFamilyFilter]);

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={17} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Topics Chips Summary */}
      <View style={styles.selectedContainer}>
        <View style={styles.selectedHeader}>
          <Text style={styles.selectedHeaderText}>
            SELECTED DISCIPLINES ({selectedTopics.length})
          </Text>
          {selectedTopics.length > 0 && onClearAll && (
            <TouchableOpacity onPress={onClearAll} activeOpacity={0.7}>
              <Text style={styles.clearAllLink}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedTopics.length > 0 ? (
          <View style={styles.selectedChipsWrap}>
            {selectedTopics.map((topic) => (
              <TouchableOpacity
                key={topic}
                onPress={() => handleRemove(topic)}
                style={styles.selectedPill}
                activeOpacity={0.8}
              >
                <Text style={styles.selectedPillText}>{topic}</Text>
                <X size={13} color={colors.white} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptySelectedText}>
            No topics selected yet. Search above or select popular fields below.
          </Text>
        )}
      </View>

      {/* ACTIVE SEARCH RESULTS LIST */}
      {searchQuery.trim().length > 0 ? (
        <View style={styles.searchResultsBox}>
          <Text style={styles.sectionHeaderTitle}>
            SEARCH RESULTS ({searchResults.length})
          </Text>

          {searchResults.length > 0 ? (
            <View style={styles.searchResultsList}>
              {searchResults.map((item) => {
                const isSelected = isTopicSelected(item.name);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.searchResultCard,
                      isSelected && styles.searchResultCardSelected,
                    ]}
                    onPress={() => handleToggle(item.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultInfo}>
                      <Text
                        style={[
                          styles.searchResultName,
                          isSelected && styles.searchResultNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.searchResultHierarchy}>
                        {item.hierarchy}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.searchResultActionCircle,
                        isSelected && styles.searchResultActionCircleActive,
                      ]}
                    >
                      {isSelected ? (
                        <Check size={13} color={colors.white} />
                      ) : (
                        <Plus size={13} color={colors.textSecondary} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No standardized taxonomy field found for "{searchQuery}".
              </Text>
              <TouchableOpacity
                style={styles.addCustomTopicBtn}
                onPress={() => {
                  handleToggle(searchQuery.trim());
                  setSearchQuery('');
                }}
                activeOpacity={0.8}
              >
                <Plus size={14} color={colors.white} />
                <Text style={styles.addCustomTopicText}>
                  Add "{searchQuery.trim()}" as custom topic
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* ================= DEFAULT VIEW (NO ACTIVE SEARCH) ================= */
        <View style={styles.defaultView}>
          {/* SECTION 1: 10 POPULAR RESEARCH FIELDS */}
          {showPopularSection && (
            <View style={styles.popularSection}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={15} color={colors.accentBlue} />
                <Text style={styles.sectionHeaderTitle}>POPULAR RESEARCH FIELDS</Text>
              </View>

              <View style={styles.popularGrid}>
                {POPULAR_DISCIPLINES.map((topic) => {
                  const isSelected = isTopicSelected(topic);
                  return (
                    <TouchableOpacity
                      key={topic}
                      activeOpacity={0.75}
                      onPress={() => handleToggle(topic)}
                      style={[
                        styles.popularChip,
                        isSelected ? styles.popularChipActive : styles.popularChipInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.popularChipText,
                          isSelected
                            ? styles.popularChipTextActive
                            : styles.popularChipTextInactive,
                        ]}
                      >
                        {topic}
                      </Text>
                      {isSelected && (
                        <CheckCircle2
                          size={13}
                          color={colors.white}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* SECTION 2: BROWSE 1,000+ TAXONOMY BY DOMAIN */}
          {showBrowseSection && (
            <View style={styles.browseSection}>
              <View style={styles.sectionTitleRow}>
                <Compass size={15} color={colors.textPrimary} />
                <Text style={styles.sectionHeaderTitle}>EXPLORE BY RESEARCH DOMAIN</Text>
              </View>

              {/* Horizontal Domain Filter Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterTabsRow}
              >
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    selectedFamilyFilter === 'all' && styles.filterTabActive,
                  ]}
                  onPress={() => setSelectedFamilyFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      selectedFamilyFilter === 'all' && styles.filterTabTextActive,
                    ]}
                  >
                    All Domains
                  </Text>
                </TouchableOpacity>

                {RESEARCH_TAXONOMY_FAMILIES.map((family) => (
                  <TouchableOpacity
                    key={family.id}
                    style={[
                      styles.filterTab,
                      selectedFamilyFilter === family.id && styles.filterTabActive,
                    ]}
                    onPress={() => setSelectedFamilyFilter(family.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        selectedFamilyFilter === family.id && styles.filterTabTextActive,
                      ]}
                    >
                      {family.shortName}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    selectedFamilyFilter === 'interdisciplinary' && styles.filterTabActive,
                  ]}
                  onPress={() => setSelectedFamilyFilter('interdisciplinary')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      selectedFamilyFilter === 'interdisciplinary' && styles.filterTabTextActive,
                    ]}
                  >
                    Cross-Domain
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Accordion / Field Cards */}
              {selectedFamilyFilter === 'interdisciplinary' ? (
                <View style={styles.interdisciplinaryContainer}>
                  {INTERDISCIPLINARY_GROUPS.map((group) => (
                    <View key={group.name} style={styles.fieldCard}>
                      <Text style={styles.fieldCardTitle}>{group.name}</Text>
                      <View style={styles.subfieldGrid}>
                        {group.topics.map((topic) => {
                          const isSelected = isTopicSelected(topic);
                          return (
                            <TouchableOpacity
                              key={topic}
                              onPress={() => handleToggle(topic)}
                              style={[
                                styles.subfieldChip,
                                isSelected && styles.subfieldChipActive,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.subfieldChipText,
                                  isSelected && styles.subfieldChipTextActive,
                                ]}
                              >
                                {topic}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.familiesList}>
                  {displayedFamilies.map((family) => (
                    <View key={family.id} style={styles.familyGroup}>
                      <Text style={styles.familyGroupName}>{family.name}</Text>
                      {family.fields.map((field) => {
                        const isExpanded =
                          expandedFieldId === field.id || selectedFamilyFilter !== 'all';
                        return (
                          <View key={field.id} style={styles.fieldCard}>
                            <TouchableOpacity
                              style={styles.fieldCardHeader}
                              onPress={() =>
                                setExpandedFieldId(
                                  expandedFieldId === field.id ? null : field.id
                                )
                              }
                              activeOpacity={0.7}
                            >
                              <View style={styles.fieldCardHeaderLeft}>
                                <Text style={styles.fieldCode}>{field.id}</Text>
                                <Text style={styles.fieldCardTitle}>{field.name}</Text>
                              </View>
                              {isExpanded ? (
                                <ChevronDown size={17} color={colors.textSecondary} />
                              ) : (
                                <ChevronRight size={17} color={colors.textSecondary} />
                              )}
                            </TouchableOpacity>

                            {isExpanded && (
                              <View style={styles.disciplinesContainer}>
                                {field.disciplines.map((discipline) => (
                                  <View key={discipline.id} style={styles.disciplineBlock}>
                                    <TouchableOpacity
                                      onPress={() => handleToggle(discipline.name)}
                                      style={styles.disciplineNameRow}
                                      activeOpacity={0.7}
                                    >
                                      <Text
                                        style={[
                                          styles.disciplineName,
                                          isTopicSelected(discipline.name) &&
                                            styles.disciplineNameSelected,
                                        ]}
                                      >
                                        {discipline.name}
                                      </Text>
                                      {isTopicSelected(discipline.name) && (
                                        <Check size={13} color="#16a34a" />
                                      )}
                                    </TouchableOpacity>

                                    <View style={styles.subfieldGrid}>
                                      {discipline.subfields.map((subfield) => {
                                        const isSelected = isTopicSelected(subfield);
                                        return (
                                          <TouchableOpacity
                                            key={subfield}
                                            onPress={() => handleToggle(subfield)}
                                            style={[
                                              styles.subfieldChip,
                                              isSelected && styles.subfieldChipActive,
                                            ]}
                                            activeOpacity={0.75}
                                          >
                                            <Text
                                              style={[
                                                styles.subfieldChipText,
                                                isSelected && styles.subfieldChipTextActive,
                                              ]}
                                            >
                                              {subfield}
                                            </Text>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Helper hint */}
      {Boolean(hint) && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },

  /* Search Bar */
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...typography.body,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },

  /* Selected Summary Container */
  selectedContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedHeaderText: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  clearAllLink: {
    ...typography.micro,
    color: colors.accentRed,
    fontWeight: '600',
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingLeft: spacing.sm + 2,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  selectedPillText: {
    ...typography.micro,
    fontWeight: '600',
    color: colors.white,
    fontSize: 12,
  },
  emptySelectedText: {
    ...typography.micro,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },

  /* Active Search Results */
  searchResultsBox: {
    gap: spacing.xs,
  },
  sectionHeaderTitle: {
    ...typography.captionBold,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  searchResultsList: {
    gap: spacing.xs,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  searchResultCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  searchResultInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  searchResultName: {
    ...typography.captionBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  searchResultNameSelected: {
    color: '#166534',
  },
  searchResultHierarchy: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  searchResultActionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultActionCircleActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  noResultsContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  noResultsText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  addCustomTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  addCustomTopicText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },

  /* Default View */
  defaultView: {
    gap: spacing.lg,
  },
  popularSection: {
    gap: spacing.xs + 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    paddingTop: 4,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  popularChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  popularChipInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  popularChipText: {
    ...typography.captionBold,
    fontSize: 12.5,
  },
  popularChipTextActive: {
    color: colors.white,
  },
  popularChipTextInactive: {
    color: colors.textPrimary,
  },

  /* Taxonomy Browse Section */
  browseSection: {
    gap: spacing.xs + 2,
  },
  filterTabsRow: {
    gap: spacing.xs + 2,
    paddingVertical: 2,
    marginVertical: 4,
  },
  filterTab: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  filterTabActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterTabText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  familiesList: {
    gap: spacing.sm,
    marginTop: 4,
  },
  familyGroup: {
    gap: spacing.xs,
  },
  familyGroupName: {
    ...typography.captionBold,
    color: colors.accentBlue,
    fontSize: 11.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  fieldCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  fieldCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
    backgroundColor: '#FAFAFA',
  },
  fieldCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  fieldCode: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 10.5,
  },
  fieldCardTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  disciplinesContainer: {
    padding: spacing.sm + 2,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  disciplineBlock: {
    gap: 4,
  },
  disciplineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disciplineName: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  disciplineNameSelected: {
    color: '#16A34A',
    fontWeight: '700',
  },
  subfieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  subfieldChip: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  subfieldChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  subfieldChipText: {
    ...typography.micro,
    fontSize: 11,
    color: colors.textPrimary,
  },
  subfieldChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  interdisciplinaryContainer: {
    gap: spacing.xs + 2,
    marginTop: 4,
  },

  hintText: {
    ...typography.micro,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
