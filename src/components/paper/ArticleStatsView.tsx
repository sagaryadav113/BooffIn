import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  LayoutChangeEvent,
  Linking,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  BookOpen,
  Eye,
  MessageSquare,
  BarChart2,
  Share2,
  ExternalLink,
  Activity,
  Info,
  Radio,
} from 'lucide-react-native';
import { Paper } from '../../types/paper';
import { PaperMetrics } from '../../api/hypeScoreService';
import { PaperStatsTimeframe } from '../../types/paperStats';
import { getPaperStats } from '../../api/paperStatsService';
import { SaveButton } from '../core/SaveButton';
import { colors } from '../../theme';

interface ArticleStatsViewProps {
  paper: Paper;
  metrics: PaperMetrics | null;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onSwitchToArticleView?: () => void;
  onOpenPdf?: () => void;
}

const TIMEFRAMES: PaperStatsTimeframe[] = ['1H', '6H', '24H', '7D', '30D', 'All Time'];

/**
 * Generates smooth SVG cubic Bezier curve commands through given points
 */
function createSmoothBezierPath(
  coords: { x: number; y: number }[]
): { linePath: string; areaPath: string } {
  if (coords.length === 0) return { linePath: '', areaPath: '' };
  if (coords.length === 1) {
    return {
      linePath: `M ${coords[0].x} ${coords[0].y}`,
      areaPath: `M ${coords[0].x} ${coords[0].y} L ${coords[0].x} ${coords[0].y} Z`,
    };
  }

  let linePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    const prev = coords[i - 1] || current;
    const nextNext = coords[i + 2] || next;

    // Catmull-Rom to Cubic Bezier control points
    const cp1x = current.x + (next.x - prev.x) / 6;
    const cp1y = current.y + (next.y - prev.y) / 6;
    const cp2x = next.x - (nextNext.x - current.x) / 6;
    const cp2y = next.y - (nextNext.y - current.y) / 6;

    linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const bottomY = 160; // chart baseline
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;

  return { linePath, areaPath };
}

export const ArticleStatsView: React.FC<ArticleStatsViewProps> = ({
  paper,
  metrics,
  isSaved = false,
  onToggleSave,
  onSwitchToArticleView,
  onOpenPdf,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<PaperStatsTimeframe>('24H');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(Dimensions.get('window').width - 48);

  const stats = useMemo(() => {
    return getPaperStats(paper, metrics, selectedTimeframe);
  }, [paper, metrics, selectedTimeframe]);

  const handleTimeframeChange = (tf: PaperStatsTimeframe) => {
    if (tf === selectedTimeframe) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedTimeframe(tf);
    setActivePointIndex(null);
  };

  const handleChartLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 50) {
      setChartWidth(width);
    }
  };

  const handleOpenDoi = async () => {
    if (!paper.doi && !paper.canonicalUrl) return;
    const targetUrl = paper.doi ? `https://doi.org/${paper.doi}` : paper.canonicalUrl;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(targetUrl);
    } catch {
      Linking.openURL(targetUrl);
    }
  };

  // Chart coordinate calculation
  const chartHeight = 170;
  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 28;
  const innerWidth = Math.max(chartWidth - paddingLeft - paddingRight, 100);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = stats.chartPoints;
  const activePoint =
    activePointIndex !== null && points[activePointIndex]
      ? points[activePointIndex]
      : points[points.length - 1];

  const coords = useMemo(() => {
    if (points.length === 0) return [];
    const minVal = 0;
    const maxVal = 5.0; // scale from 0 to 5.0

    return points.map((p, idx) => {
      const x = paddingLeft + (idx / (points.length - 1)) * innerWidth;
      const normalizedY = (p.value - minVal) / (maxVal - minVal);
      const y = paddingTop + innerHeight * (1 - normalizedY);
      return { x, y, point: p };
    });
  }, [points, innerWidth, innerHeight]);

  const { linePath, areaPath } = useMemo(() => {
    return createSmoothBezierPath(coords);
  }, [coords]);

  const activeCoord =
    activePointIndex !== null && coords[activePointIndex]
      ? coords[activePointIndex]
      : coords[coords.length - 1];

  // Y-axis grid levels
  const yLevels = [
    { val: 5.0, label: '5.0' },
    { val: 3.0, label: '3.0' },
    { val: 1.0, label: '1.0' },
    { val: 0, label: '0' },
  ];

  // Authors summary
  const authorsText = useMemo(() => {
    if (!paper.authors || paper.authors.length === 0) return 'Author details in publisher portal';
    if (paper.authors.length === 1) return paper.authors[0].name;
    if (paper.authors.length === 2) return `${paper.authors[0].name} & ${paper.authors[1].name}`;
    return `${paper.authors[0].name} et al.`;
  }, [paper.authors]);

  return (
    <View style={styles.container}>
      {/* ==================================================================== */}
      {/* 1. HERO PAPER CARD WITH NATIVE SAVE & READ BUTTONS                   */}
      {/* ==================================================================== */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          {/* Paper Cover Thumbnail */}
          <View style={styles.thumbnailContainer}>
            <View style={styles.thumbnailArt}>
              <View style={styles.thumbnailNeuralGlow} />
              <Activity size={28} color="#059669" />
              <View style={styles.journalBadgeInThumb}>
                <Text style={styles.journalBadgeInThumbText} numberOfLines={1}>
                  {paper.journal ? paper.journal.split(' ')[0] : 'Nature'}
                </Text>
              </View>
            </View>
          </View>

          {/* Paper Main Meta */}
          <View style={styles.heroMetaContent}>
            {/* Badges row */}
            <View style={styles.badgeRow}>
              {paper.isOpenAccess && (
                <View style={styles.openAccessPill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.openAccessText}>Open Access</Text>
                </View>
              )}
              <View style={styles.licensePill}>
                <Text style={styles.licenseText}>CC BY</Text>
              </View>
            </View>

            {/* Paper Title */}
            <Text style={styles.heroTitle} numberOfLines={3}>
              {paper.title}
            </Text>

            {/* Author */}
            <Text style={styles.heroAuthor} numberOfLines={1}>
              {authorsText}
            </Text>

            {/* Journal, Year, DOI */}
            <TouchableOpacity
              style={styles.doiRow}
              onPress={handleOpenDoi}
              activeOpacity={0.7}
            >
              <Text style={styles.doiText} numberOfLines={1}>
                {paper.journal || 'Academic Journal'} · {paper.publicationYear || '2024'} ·{' '}
                {paper.doi ? paper.doi : 'Publisher Reference'}
              </Text>
              <ExternalLink size={11} color="#6B7280" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Top Right Action Buttons: Official Save Button + Read Paper */}
          <View style={styles.heroActionsCol}>
            {onToggleSave && (
              <View style={styles.saveBtnWrap}>
                <SaveButton
                  isSaved={isSaved}
                  onPress={onToggleSave}
                  size={20}
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.readPaperBtn}
              onPress={onSwitchToArticleView || onOpenPdf}
              activeOpacity={0.85}
            >
              <BookOpen size={14} color={colors.white} />
              <Text style={styles.readPaperBtnText}>Read Paper</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Topic Pills */}
        {paper.topics && paper.topics.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicsScrollContent}
            style={styles.topicsContainer}
          >
            {paper.topics.map((topic, i) => {
              const topicName = typeof topic === 'string' ? topic : (topic as any)?.name || String(topic);
              return (
                <View key={`topic-${i}-${topicName}`} style={styles.topicPill}>
                  <Text style={styles.topicPillText}>{topicName}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ==================================================================== */}
      {/* 2. PAPER IMPACT SECTION WITH INTERACTIVE CHART                        */}
      {/* ==================================================================== */}
      <View style={styles.impactCard} onLayout={handleChartLayout}>
        {/* Section Header */}
        <View style={styles.impactHeader}>
          <View style={styles.impactTitleRow}>
            <View style={styles.impactSignalIcon}>
              <Radio size={16} color="#059669" />
            </View>
            <Text style={styles.impactTitle}>Paper Impact</Text>
          </View>

          {/* HYPE Rating Badge Box */}
          <View style={styles.hypeBox}>
            <Text style={styles.hypeBoxLabel}>HYPE</Text>
            <View style={styles.hypeValueRow}>
              <Text style={styles.hypeValueMain}>
                {stats.currentHypeScore.toFixed(1)}
              </Text>
              <Text style={styles.hypeValueSub}> / 5</Text>
            </View>
            <View style={styles.hypeBarBg}>
              <View
                style={[
                  styles.hypeBarFill,
                  { width: `${(stats.currentHypeScore / 5) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Dynamic Tooltip Badge based on active scrubbed point */}
        {activePoint && (
          <View style={styles.tooltipBadgeContainer}>
            <View style={styles.tooltipBadge}>
              <Text style={styles.tooltipValue}>
                {activePoint.value > 0 ? activePoint.value.toFixed(1) : '0.0'}
              </Text>
              {activePoint.deltaPercent > 0 ? (
                <Text style={styles.tooltipDelta}>
                  ▲ +{activePoint.deltaPercent}%
                </Text>
              ) : null}
              <Text style={styles.tooltipTimeframe}>
                {stats.timeframeLabel}
              </Text>
            </View>
          </View>
        )}

        {/* Interactive SVG Area & Line Chart */}
        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                <Stop offset="70%" stopColor="#10B981" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yLevels.map((lvl) => {
              const y = paddingTop + innerHeight * (1 - lvl.val / 5.0);
              return (
                <React.Fragment key={`grid-${lvl.label}`}>
                  <Line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#F3F4F6"
                    strokeWidth="1"
                    strokeDasharray="3, 3"
                  />
                  <SvgText
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    fontSize="10"
                    fill="#9CA3AF"
                    textAnchor="end"
                    fontWeight="500"
                  >
                    {lvl.label}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Gradient Area Fill */}
            {areaPath ? <Path d={areaPath} fill="url(#impactGradient)" /> : null}

            {/* Smooth Curve Stroke */}
            {linePath ? (
              <Path
                d={linePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Active Highlight Dot */}
            {activeCoord && (
              <>
                <Circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="7"
                  fill="#059669"
                  opacity="0.25"
                />
                <Circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="4.5"
                  fill="#059669"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </>
            )}
          </Svg>

          {/* Interactive Touch Overlay for Scrubbing Across Points */}
          <View style={styles.touchOverlay}>
            {coords.map((c, idx) => (
              <TouchableOpacity
                key={`touch-${idx}`}
                style={[
                  styles.touchColumn,
                  {
                    left: c.x - 22,
                    width: 44,
                    height: chartHeight,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setActivePointIndex(idx);
                }}
              />
            ))}
          </View>
        </View>

        {/* X-Axis Time Labels */}
        <View style={[styles.xAxisRow, { paddingLeft, paddingRight }]}>
          {points.map((p, idx) => (
            <Text
              key={`xlabel-${idx}`}
              style={[
                styles.xAxisLabel,
                activePointIndex === idx && styles.xAxisLabelActive,
              ]}
              numberOfLines={1}
            >
              {p.label}
            </Text>
          ))}
        </View>

        {/* Timeframe Selector Pills */}
        <View style={styles.timeframeRow}>
          {TIMEFRAMES.map((tf) => {
            const isSelected = selectedTimeframe === tf;
            return (
              <TouchableOpacity
                key={tf}
                style={[
                  styles.timeframePill,
                  isSelected && styles.timeframePillActive,
                ]}
                onPress={() => handleTimeframeChange(tf)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    isSelected && styles.timeframeTextActive,
                  ]}
                >
                  {tf}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ==================================================================== */}
      {/* 3. FOUR METRIC STAT CARDS (2x2 GRID)                                  */}
      {/* ==================================================================== */}
      <View style={styles.statsGrid}>
        {/* Card 1: Views */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Eye size={18} color="#059669" />
            <Text style={styles.statCardTotal}>
              {stats.views.totalFormatted}
            </Text>
            {stats.views.delta > 0 && (
              <View style={styles.statDeltaPill}>
                <Text style={styles.statDeltaText}>
                  ▲ {stats.views.deltaFormatted}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statCardSubtitle}>
            Views ({stats.timeframe === '24H' ? 'last 24h' : stats.timeframe.toLowerCase()})
          </Text>
        </View>

        {/* Card 2: Discussions */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <MessageSquare size={18} color="#059669" />
            <Text style={styles.statCardTotal}>
              {stats.discussions.totalFormatted}
            </Text>
            {stats.discussions.delta > 0 && (
              <View style={styles.statDeltaPill}>
                <Text style={styles.statDeltaText}>
                  ▲ {stats.discussions.deltaFormatted}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statCardSubtitle}>
            Discussions ({stats.timeframe === '24H' ? 'last 24h' : stats.timeframe.toLowerCase()})
          </Text>
        </View>

        {/* Card 3: HYPE Votes */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <BarChart2 size={18} color="#059669" />
            <Text style={styles.statCardTotal}>
              {stats.hypeVotes.totalFormatted}
            </Text>
            {stats.hypeVotes.delta > 0 && (
              <View style={styles.statDeltaPill}>
                <Text style={styles.statDeltaText}>
                  ▲ {stats.hypeVotes.deltaFormatted}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statCardSubtitle}>
            HYPE Votes ({stats.timeframe === '24H' ? 'last 24h' : stats.timeframe.toLowerCase()})
          </Text>
        </View>

        {/* Card 4: Shares */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Share2 size={18} color="#059669" />
            <Text style={styles.statCardTotal}>
              {stats.shares.totalFormatted}
            </Text>
            {stats.shares.delta > 0 && (
              <View style={styles.statDeltaPill}>
                <Text style={styles.statDeltaText}>
                  ▲ {stats.shares.deltaFormatted}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statCardSubtitle}>
            Shares ({stats.timeframe === '24H' ? 'last 24h' : stats.timeframe.toLowerCase()})
          </Text>
        </View>
      </View>

      {/* ==================================================================== */}
      {/* 4. HYPE BREAKDOWN CARD WITH CIRCULAR SVG PROGRESS RINGS               */}
      {/* ==================================================================== */}
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>HYPE Breakdown</Text>
          <Info size={14} color="#9CA3AF" />
        </View>

        <View style={styles.ringsRow}>
          {/* Ring 1: Impact */}
          <CircularProgressRing
            score={stats.breakdown.impact}
            label="Impact"
          />

          {/* Ring 2: Clarity */}
          <CircularProgressRing
            score={stats.breakdown.clarity}
            label="Clarity"
          />

          {/* Ring 3: Visuals */}
          <CircularProgressRing
            score={stats.breakdown.visuals}
            label="Visuals"
          />
        </View>
      </View>
    </View>
  );
};

/**
 * Circular progress ring component using SVG strokes
 */
interface CircularProgressRingProps {
  score: number;
  label: string;
}

const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  score,
  label,
}) => {
  const size = 84;
  const strokeWidth = 6.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress normalized out of 5.0
  const progress = score > 0 ? Math.min(1.0, score / 5.0) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.ringItem}>
      <View style={styles.ringSvgContainer}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          {progress > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#059669"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
        <View style={styles.ringCenterTextWrap}>
          <Text style={styles.ringScoreText}>{score > 0 ? score.toFixed(1) : '—'}</Text>
        </View>
      </View>
      <Text style={styles.ringLabelText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: '#FAFAF9',
  },

  // 1. Hero Card
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnailArt: {
    width: 68,
    height: 78,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailNeuralGlow: {
    position: 'absolute',
    top: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    opacity: 0.25,
  },
  journalBadgeInThumb: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  journalBadgeInThumbText: {
    color: '#F9FAFB',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroMetaContent: {
    flex: 1,
    paddingRight: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  openAccessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  openAccessText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  licensePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  licenseText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  heroAuthor: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  doiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doiText: {
    fontSize: 11,
    color: '#6B7280',
    flexShrink: 1,
  },
  heroActionsCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  saveBtnWrap: {
    marginBottom: 14,
  },
  readPaperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#065F46',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  readPaperBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  topicsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  topicsScrollContent: {
    flexDirection: 'row',
    gap: 6,
  },
  topicPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicPillText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },

  // 2. Paper Impact Card
  impactCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
    position: 'relative',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  impactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactSignalIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hypeBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  hypeBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  hypeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hypeValueMain: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  hypeValueSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  hypeBarBg: {
    width: 58,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    overflow: 'hidden',
  },
  hypeBarFill: {
    height: '100%',
    backgroundColor: '#065F46',
    borderRadius: 2,
  },

  // Tooltip
  tooltipBadgeContainer: {
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  tooltipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tooltipDelta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  tooltipTimeframe: {
    fontSize: 10,
    color: '#6B7280',
  },

  // Chart
  chartWrapper: {
    position: 'relative',
    marginVertical: 4,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchColumn: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  xAxisLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },

  // Timeframe selector
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframePillActive: {
    backgroundColor: '#064E3B', // dark green active state
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeframeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  timeframeTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // 3. Stats Grid (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (Dimensions.get('window').width - 32 - 12) / 2,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statCardTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statDeltaPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  statDeltaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  statCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // 4. HYPE Breakdown
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ringItem: {
    alignItems: 'center',
  },
  ringSvgContainer: {
    position: 'relative',
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterTextWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringScoreText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ringLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 8,
  },
});
