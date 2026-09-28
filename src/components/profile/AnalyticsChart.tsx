import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
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
import { Users, Eye, Zap, MessageSquare, TrendingUp } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DayDataPoint } from '../../types/analytics';

export type ChartMetricType = 'followers' | 'views' | 'engagement' | 'discussions';

interface AnalyticsChartProps {
  data: DayDataPoint[];
  timeframeLabel: string;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  timeframeLabel,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetricType>('followers');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(
    Dimensions.get('window').width - 48
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const metricConfig = useMemo(() => {
    switch (selectedMetric) {
      case 'followers':
        return {
          title: 'Follower Growth',
          icon: Users,
          color: colors.accentBlue,
          gradientId: 'gradFollowers',
          getValue: (d: DayDataPoint) => d.cumulativeFollowers,
          getSubValue: (d: DayDataPoint) => `+${d.newFollowers} new`,
          unit: 'followers',
        };
      case 'views':
        return {
          title: 'Views & Reach',
          icon: Eye,
          color: '#3B82F6',
          gradientId: 'gradViews',
          getValue: (d: DayDataPoint) => d.views,
          getSubValue: (d: DayDataPoint) => `${d.views} views`,
          unit: 'views',
        };
      case 'engagement':
        return {
          title: 'Post Engagement & Clicks',
          icon: Zap,
          color: '#F59E0B',
          gradientId: 'gradEngagement',
          getValue: (d: DayDataPoint) => d.engagement,
          getSubValue: (d: DayDataPoint) => `${d.engagement} actions`,
          unit: 'engagements',
        };
      case 'discussions':
        return {
          title: 'Scientific Discussions',
          icon: MessageSquare,
          color: colors.accentGreen,
          gradientId: 'gradDiscussions',
          getValue: (d: DayDataPoint) => d.discussionsCount,
          getSubValue: (d: DayDataPoint) => `${d.discussionsCount} comments`,
          unit: 'discussions',
        };
    }
  }, [selectedMetric]);

  const chartHeight = 160;
  const paddingHorizontal = 16;
  const paddingTop = 20;
  const paddingBottom = 26;
  const innerWidth = Math.max(containerWidth - paddingHorizontal * 2, 100);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d) => metricConfig.getValue(d));
  }, [data, metricConfig]);

  const maxValue = useMemo(() => {
    if (points.length === 0) return 10;
    const max = Math.max(...points);
    return max > 0 ? Math.ceil(max * 1.15) : 5;
  }, [points]);

  const minValue = useMemo(() => {
    if (points.length === 0) return 0;
    const min = Math.min(...points);
    return Math.max(0, Math.floor(min * 0.85));
  }, [points]);

  // Generate SVG path coordinates
  const svgCoordinates = useMemo(() => {
    if (points.length === 0) return [];
    const count = points.length;
    const range = maxValue - minValue || 1;

    return points.map((val, idx) => {
      const x = paddingHorizontal + (idx / Math.max(count - 1, 1)) * innerWidth;
      const normalizedY = (val - minValue) / range;
      const y = paddingTop + innerHeight - normalizedY * innerHeight;
      return { x, y, value: val, dataPoint: data[idx] };
    });
  }, [points, maxValue, minValue, innerWidth, innerHeight, data]);

  // Construct smooth bezier curve path
  const { linePath, areaPath } = useMemo(() => {
    if (svgCoordinates.length === 0) return { linePath: '', areaPath: '' };
    if (svgCoordinates.length === 1) {
      const p = svgCoordinates[0];
      return {
        linePath: `M ${p.x} ${p.y}`,
        areaPath: `M ${p.x} ${p.y} L ${p.x} ${paddingTop + innerHeight} Z`,
      };
    }

    let d = `M ${svgCoordinates[0].x} ${svgCoordinates[0].y}`;

    for (let i = 0; i < svgCoordinates.length - 1; i++) {
      const current = svgCoordinates[i];
      const next = svgCoordinates[i + 1];
      const controlX1 = current.x + (next.x - current.x) * 0.45;
      const controlY1 = current.y;
      const controlX2 = current.x + (next.x - current.x) * 0.55;
      const controlY2 = next.y;
      d += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }

    const last = svgCoordinates[svgCoordinates.length - 1];
    const first = svgCoordinates[0];
    const baselineY = paddingTop + innerHeight;
    const area = `${d} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [svgCoordinates, innerHeight]);

  const activeData = activePointIndex !== null && svgCoordinates[activePointIndex]
    ? svgCoordinates[activePointIndex]
    : svgCoordinates[svgCoordinates.length - 1];

  const totalGrowthOrSum = useMemo(() => {
    if (data.length === 0) return 0;
    if (selectedMetric === 'followers') {
      return data.reduce((acc, d) => acc + d.newFollowers, 0);
    }
    return points.reduce((acc, v) => acc + v, 0);
  }, [data, selectedMetric, points]);

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Metric Selector Pills */}
      <View style={styles.metricTabs}>
        {(
          [
            { key: 'followers', label: 'Followers' },
            { key: 'views', label: 'Views' },
            { key: 'engagement', label: 'Engagement' },
            { key: 'discussions', label: 'Discussions' },
          ] as const
        ).map((tab) => {
          const isActive = selectedMetric === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => {
                setSelectedMetric(tab.key);
                setActivePointIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabChipText,
                  isActive && styles.tabChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Metric Callout Header */}
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartSubTitle}>
            {metricConfig.title} ({timeframeLabel})
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.mainValue, { color: metricConfig.color }]}>
              {activeData ? activeData.value : points[points.length - 1] || 0}
            </Text>
            <Text style={styles.unitText}>{metricConfig.unit}</Text>
            {selectedMetric === 'followers' && (
              <View style={styles.growthBadge}>
                <TrendingUp size={11} color={colors.accentGreen} />
                <Text style={styles.growthBadgeText}>
                  +{totalGrowthOrSum} in period
                </Text>
              </View>
            )}
          </View>
        </View>

        {activeData && (
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{activeData.dataPoint.label}</Text>
            <Text style={styles.dateBadgeSubText}>
              {metricConfig.getSubValue(activeData.dataPoint)}
            </Text>
          </View>
        )}
      </View>

      {/* SVG Interactive Chart */}
      <View style={styles.svgWrapper}>
        <Svg width={containerWidth} height={chartHeight}>
          <Defs>
            <LinearGradient
              id={metricConfig.gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0%" stopColor={metricConfig.color} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={metricConfig.color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line
            x1={paddingHorizontal}
            y1={paddingTop}
            x2={containerWidth - paddingHorizontal}
            y2={paddingTop}
            stroke={colors.borderLight}
            strokeDasharray="4, 4"
            strokeWidth="1"
          />
          <Line
            x1={paddingHorizontal}
            y1={paddingTop + innerHeight / 2}
            x2={containerWidth - paddingHorizontal}
            y2={paddingTop + innerHeight / 2}
            stroke={colors.borderLight}
            strokeDasharray="4, 4"
            strokeWidth="1"
          />
          <Line
            x1={paddingHorizontal}
            y1={paddingTop + innerHeight}
            x2={containerWidth - paddingHorizontal}
            y2={paddingTop + innerHeight}
            stroke={colors.borderLight}
            strokeWidth="1"
          />

          {/* Area Fill */}
          {areaPath ? (
            <Path
              d={areaPath}
              fill={`url(#${metricConfig.gradientId})`}
            />
          ) : null}

          {/* Main Curve Line */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={metricConfig.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Data Points / Markers */}
          {svgCoordinates.map((coord, idx) => {
            const isSelected =
              activePointIndex === idx ||
              (activePointIndex === null && idx === svgCoordinates.length - 1);
            return (
              <Circle
                key={`dot-${idx}`}
                cx={coord.x}
                cy={coord.y}
                r={isSelected ? 5.5 : 2.5}
                fill={isSelected ? metricConfig.color : colors.white}
                stroke={metricConfig.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                onPress={() => setActivePointIndex(idx)}
              />
            );
          })}

          {/* X-Axis Date Labels */}
          {svgCoordinates.length > 0 && (
            <>
              <SvgText
                x={svgCoordinates[0].x}
                y={chartHeight - 6}
                fontSize="10"
                fill={colors.textSecondary}
                textAnchor="start"
              >
                {svgCoordinates[0].dataPoint.label}
              </SvgText>
              {svgCoordinates.length > 3 && (
                <SvgText
                  x={svgCoordinates[Math.floor(svgCoordinates.length / 2)].x}
                  y={chartHeight - 6}
                  fontSize="10"
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {svgCoordinates[Math.floor(svgCoordinates.length / 2)].dataPoint.label}
                </SvgText>
              )}
              <SvgText
                x={svgCoordinates[svgCoordinates.length - 1].x}
                y={chartHeight - 6}
                fontSize="10"
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {svgCoordinates[svgCoordinates.length - 1].dataPoint.label}
              </SvgText>
            </>
          )}
        </Svg>
      </View>

      <Text style={styles.hintText}>
        Tap any point on the chart to inspect daily metrics
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  metricTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    padding: 3,
    borderRadius: radii.full,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabChipText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  chartSubTitle: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  mainValue: {
    ...typography.h1,
    fontSize: 22,
  },
  unitText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  growthBadgeText: {
    ...typography.microBold,
    fontSize: 10.5,
    color: colors.accentGreen,
  },
  dateBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'flex-end',
  },
  dateBadgeText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  dateBadgeSubText: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  svgWrapper: {
    alignItems: 'center',
    marginHorizontal: -spacing.md,
  },
  hintText: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
