// src/components/DrawingCanvas.js
import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** ---------- helpers ---------- */
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const isValidPoint = (pt) =>
  pt &&
  typeof pt === 'object' &&
  isNum(pt.nx) &&
  isNum(pt.ny) &&
  pt.nx >= 0 &&
  pt.ny >= 0;

const normalizeStroke = (s, fallbackColor) => {
  if (!s || typeof s !== 'object') return null;
  const pts = Array.isArray(s.points) ? s.points.filter(isValidPoint) : [];
  if (!pts.length) return null;
  const color = typeof s.color === 'string' && s.color ? s.color : fallbackColor || '#ff4757';
  return { color, points: pts };
};

const coerceStrokeArray = (arr, fallbackColor) => {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const s of arr) {
    const n = normalizeStroke(s, fallbackColor);
    if (n) out.push(n);
  }
  return out;
};

const toPath = (points) => {
  if (!Array.isArray(points) || points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
};

/** ---------- component ---------- */
const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    color = '#ff4757',
    width = 3,
    active = false,
    initial = undefined, // can be undefined/null/array; we’ll sanitize
    onChange,            // (paths) => void
  },
  ref
) {
  const [size, setSize] = useState({ w: 1, h: 1 });

  // Persisted strokes (sanitized)
  const [paths, setPaths] = useState(() => coerceStrokeArray(initial, color));

  // Live stroke while drawing
  const [draftStroke, setDraftStroke] = useState(null); // {color, points:[{nx,ny}]}

  // Sync when parent replaces initial
  useEffect(() => {
    setPaths(coerceStrokeArray(initial, color));
  }, [initial, color]);

  // Expose public API
  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        setPaths([]);
        setDraftStroke(null);
        onChange && onChange([]);
      },
      getPaths: () => paths,
      setPaths: (p) => {
        const safe = coerceStrokeArray(p, color);
        setPaths(safe);
        onChange && onChange(safe);
      },
    }),
    [paths, onChange, color]
  );

  // Scale normalized [{nx,ny}] -> absolute [{x,y}]
  const scaledPaths = useMemo(() => {
    const safe = coerceStrokeArray(paths, color);
    return safe.map((s) => ({
      color: s.color || color,
      d: toPath(
        s.points.map((pt) => ({
          x: pt.nx * (size.w || 1),
          y: pt.ny * (size.h || 1),
        }))
      ),
    }));
  }, [paths, size, color]);

  const scaledDraftD = useMemo(() => {
    if (!draftStroke || !Array.isArray(draftStroke.points)) return '';
    return toPath(
      draftStroke.points.map((pt) => ({
        x: (pt.nx || 0) * (size.w || 1),
        y: (pt.ny || 0) * (size.h || 1),
      }))
    );
  }, [draftStroke, size]);

  // Input handling
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => active,
        onMoveShouldSetPanResponder: () => active,
        onPanResponderGrant: (e) => {
          if (!active) return;
          const { locationX, locationY } = e.nativeEvent;
          setDraftStroke({
            color,
            points: [{ nx: (locationX || 0) / (size.w || 1), ny: (locationY || 0) / (size.h || 1) }],
          });
        },
        onPanResponderMove: (e) => {
          if (!active) return;
          const { locationX, locationY } = e.nativeEvent;
          setDraftStroke((prev) => {
            if (!prev) return null;
            const pts = Array.isArray(prev.points) ? prev.points.slice() : [];
            pts.push({ nx: (locationX || 0) / (size.w || 1), ny: (locationY || 0) / (size.h || 1) });
            return { ...prev, points: pts };
          });
        },
        onPanResponderRelease: () => {
          if (!active) return;
          setPaths((prev) => {
            const safePrev = coerceStrokeArray(prev, color);
            const finalized =
              draftStroke && normalizeStroke(draftStroke, color)
                ? [...safePrev, normalizeStroke(draftStroke, color)]
                : safePrev;
            onChange && onChange(finalized);
            return finalized;
          });
          setDraftStroke(null);
        },
        onPanResponderTerminate: () => setDraftStroke(null),
      }),
    [active, color, size, draftStroke, onChange]
  );

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout || {};
        // guard against zero to avoid NaN
        setSize({ w: width || 1, h: height || 1 });
      }}
      pointerEvents={active ? 'auto' : 'none'}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg width="100%" height="100%">
        {scaledPaths.map((p, i) => (
          <Path
            key={i}
            d={p.d}
            stroke={p.color}
            strokeWidth={width}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {scaledDraftD ? (
          <Path
            d={scaledDraftD}
            stroke={draftStroke?.color || color}
            strokeWidth={width}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
    </View>
  );
});

export default DrawingCanvas;
