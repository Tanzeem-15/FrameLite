import React, { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

function toPath(points) {
  if (!points || points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
}

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { color = '#ff4757', width = 3, active = false, onChange, initial = [] },
  ref
) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [paths, setPaths] = useState(initial); // [{color, points:[{nx,ny}]}] normalized
  const current = useRef(null); // {color, points:[{nx,ny}]}

  useEffect(() => { setPaths(initial || []); }, [initial]);

  useImperativeHandle(ref, () => ({
    clear: () => setPaths([]),
    getPaths: () => paths,
    setPaths: (p) => setPaths(p || [])
  }), [paths]);

  const scaledPaths = useMemo(() => {
    return paths.map(p => ({
      color: p.color,
      d: toPath(p.points.map(pt => ({ x: pt.nx * size.w, y: pt.ny * size.h })))
    }));
  }, [paths, size]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => active,
    onMoveShouldSetPanResponder: () => active,
    onPanResponderGrant: (e) => {
      if (!active) return;
      const { locationX, locationY } = e.nativeEvent;
      current.current = { color, points: [{ nx: locationX / size.w, ny: locationY / size.h }] };
    },
    onPanResponderMove: (e) => {
      if (!active || !current.current) return;
      const { locationX, locationY } = e.nativeEvent;
      current.current.points.push({ nx: locationX / size.w, ny: locationY / size.h });
      // push temp stroke into paths for immediate feedback
      setPaths(prev => {
        const base = prev.slice(0, prev.length);
        // show draft as last element
        const others = base.filter(p => p !== '__draft__');
        return [...others, '__draft__']; // marker to trigger re-render; we’ll draw current separately
      });
    },
    onPanResponderRelease: () => {
      if (!active || !current.current) return;
      setPaths(prev => {
        const cleaned = prev.filter(p => p !== '__draft__');
        const next = [...cleaned, current.current];
        onChange && onChange(next);
        return next;
      });
      current.current = null;
    }
  }), [active, color, size, onChange]);

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width || 1, h: height || 1 });
      }}
      pointerEvents={active ? 'auto' : 'none'}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg width="100%" height="100%">
        {scaledPaths.filter(p => p !== '__draft__').map((p, i) => (
          <Path key={i} d={p.d} stroke={p.color} strokeWidth={width} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {/* live stroke */}
        {current.current && (
          <Path
            d={toPath(current.current.points.map(pt => ({ x: pt.nx * size.w, y: pt.ny * size.h })))}
            stroke={current.current.color}
            strokeWidth={width}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>
    </View>
  );
});

export default DrawingCanvas;
