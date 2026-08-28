import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { colors, marketOutcomeColors } from '../theme/colors';
import type { Outcome } from '../types/market';

const CHART_HEIGHT = 285;
const PLOT_TOP = 18;
const PLOT_HEIGHT = 210;
const LABEL_WIDTH = 45;
const MIN_VALUE = 39;
const MAX_VALUE = 91;
const GRID_VALUES = [91, 78, 65, 52, 39];
const SERIES = [
  [78, 77, 77, 74, 76, 73, 77, 76, 76, 78, 76, 77, 75, 77, 78, 78, 78, 78, 77, 79, 79, 82, 78, 85, 83, 85, 85, 84, 86, 86],
  [59, 59, 59, 59, 59, 58, 60, 59, 59, 59, 59, 59, 59, 59, 59, 59, 59, 59, 59, 60, 61, 61, 63, 61, 65, 64, 64, 66, 64, 65],
  [72, 73, 73, 75, 75, 76, 74, 74, 72, 72, 72, 72, 71, 71, 71, 70, 70, 68, 69, 69, 69, 69, 60, 63, 61, 65, 63, 62, 61, 61],
  [56, 56, 56, 56, 56, 56, 57, 56, 56, 55, 55, 55, 56, 56, 56, 54, 53, 55, 51, 50, 49, 49, 47, 47, 47, 41, 42, 41, 41, 43],
];

function valueToY(value: number) {
  return PLOT_TOP + ((MAX_VALUE - value) / (MAX_VALUE - MIN_VALUE)) * PLOT_HEIGHT;
}

function Segment({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const width = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);

  return <View style={[styles.segment, { left: x1, top: y1, width, backgroundColor: color, transform: [{ rotateZ: `${angle}rad` }] }]} />;
}

export function CryptoProbabilityChart({ outcomes }: { outcomes: Outcome[] }) {
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(0, width - LABEL_WIDTH);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return <View onLayout={onLayout} style={styles.chart}>
    {GRID_VALUES.map((value) => <View key={value} style={[styles.gridRow, { top: valueToY(value) }]}><View style={styles.gridLine} /><Text allowFontScaling={false} style={styles.gridLabel}>{value}%</Text></View>)}
    {width > 0 && SERIES.map((values, seriesIndex) => {
      const color = outcomes[seriesIndex]?.color ?? marketOutcomeColors[seriesIndex] ?? colors.accent;
      const points = values.map((value, index) => ({
        x: (index / (values.length - 1)) * (plotWidth - 8),
        y: valueToY(value),
      }));

      return <View key={seriesIndex} style={StyleSheet.absoluteFill} pointerEvents="none">
        {points.slice(1).map((point, index) => <Segment key={index} x1={points[index]!.x} y1={points[index]!.y} x2={point.x} y2={point.y} color={color} />)}
        <View style={[styles.endPointHalo, { left: points.at(-1)!.x - 7, top: points.at(-1)!.y - 7, backgroundColor: `${color}45` }]} />
        <View style={[styles.endPoint, { left: points.at(-1)!.x - 4, top: points.at(-1)!.y - 4, backgroundColor: color }]} />
      </View>;
    })}
    <Text allowFontScaling={false} style={styles.leftDate}>08/27 22:30</Text>
    <Text allowFontScaling={false} style={styles.rightDate}>08/28 22:22</Text>
  </View>;
}

const styles = StyleSheet.create({
  chart: { height: CHART_HEIGHT, position: 'relative', marginTop: 18 },
  gridRow: { position: 'absolute', right: 0, left: 0, height: 20, flexDirection: 'row', alignItems: 'center' },
  gridLine: { flex: 1, borderTopWidth: 1, borderTopColor: '#292B30', borderStyle: 'dashed' },
  gridLabel: { width: LABEL_WIDTH, paddingLeft: 10, color: '#6F727A', fontSize: 12 },
  segment: { position: 'absolute', height: 2.25, borderRadius: 2, transformOrigin: 'left center' },
  endPointHalo: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
  endPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  leftDate: { position: 'absolute', bottom: 11, left: 0, color: '#6F727A', fontSize: 11 },
  rightDate: { position: 'absolute', bottom: 11, right: LABEL_WIDTH, color: '#6F727A', fontSize: 11 },
});
