import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';

type Point = { x: number; y: number };

function createPoints(values: number[], width: number, height: number) {
  if (!width || values.length < 2) return [];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const horizontalInset = 5;
  const verticalInset = 9;
  return values.map((value, index) => ({
    x: horizontalInset + index * ((width - horizontalInset * 2) / (values.length - 1)),
    y: range === 0 ? height / 2 : verticalInset + (maximum - value) / range * (height - verticalInset * 2),
  }));
}

function smoothPath(points: Point[]) {
  if (!points.length) return '';
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1]!;
    const afterNext = points[index + 2] ?? next;
    const controlOne = { x: point.x + (next.x - previous.x) / 6, y: point.y + (next.y - previous.y) / 6 };
    const controlTwo = { x: next.x - (afterNext.x - point.x) / 6, y: next.y - (afterNext.y - point.y) / 6 };
    return `${path} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${next.x} ${next.y}`;
  }, `M ${points[0]!.x} ${points[0]!.y}`);
}

export function PerformanceLineChart({ color, height = 112, values }: { color?: string; height?: number; values: number[] }) {
  const [width, setWidth] = useState(0);
  const lineColor = color ?? (values[values.length - 1]! >= values[0]! ? colors.positive : colors.danger);
  const points = useMemo(() => createPoints(values, width, height), [height, values, width]);
  const linePath = useMemo(() => smoothPath(points), [points]);
  const areaPath = points.length ? `${linePath} L ${points[points.length - 1]!.x} ${height - 5} L ${points[0]!.x} ${height - 5} Z` : '';
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  return <View onLayout={onLayout} style={[styles.root, { height }]}>{width ? <Svg height={height} width={width}>
    <Defs><LinearGradient id="performanceFill" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={lineColor} stopOpacity="0.17"/><Stop offset="1" stopColor={lineColor} stopOpacity="0"/></LinearGradient></Defs>
    {[.25, .5, .75].map((position) => <Line key={position} stroke="#25282C" strokeWidth={1} x1={0} x2={width} y1={height * position} y2={height * position}/>) }
    <Path d={areaPath} fill="url(#performanceFill)"/>
    <Path d={linePath} fill="none" stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25}/>
    <Circle cx={points[points.length - 1]!.x} cy={points[points.length - 1]!.y} fill={lineColor} r={3.5} stroke={colors.background} strokeWidth={1.5}/>
  </Svg> : null}</View>;
}

const styles = StyleSheet.create({ root: { overflow: 'hidden' } });
