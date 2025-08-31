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

function isValidStroke(s) {
  return s && typeof s === 'object' && Array.isArray(s.points);
}
function toPath(points) {
  if (!points || points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
}

const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    color = '#ff4757',
    width = 3,
    active = false,
    initial = [],            // default to array
    onChange,                // (paths) => void
  },
  ref
) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [paths, setPaths] = useState(Array.isArray(initial) ? initial : []);
  const [draftStroke, setDraftStroke] = useState(null); // {color, points:[{nx,ny}]}

  // keep in sync if parent replaces initial (e.g., load from storage)
  useEffect(() => {
    setPaths(Array.isArray(initial) ? initial : []);
  }, [initial]);

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
        const safe = Array.isArray(p) ? p.filter(isValidStroke) : [];
        setPaths(safe);
        onChange && onChange(safe);
      },
    }),
    [paths, onChange]
  );

  // scale normalized points -> view coords
  const scaledPaths = useMemo(() => {
    const safe = (Array.isArray(paths) ? paths : []).filter(isValidStroke);
    return safe.map((s) => ({
      color: s.color || color,
      d: toPath(
        s.points.map((pt) => ({
          x: (pt.nx || 0) * size.w,
          y: (pt.ny || 0) * size.h,
        }))
      ),
    }));
  }, [paths, size, color]);

  const scaledDraftD = useMemo(() => {
    if (!draftStroke || !Array.isArray(draftStroke.points)) return '';
    return toPath(
      draftStroke.points.map((pt) => ({
        x: (pt.nx || 0) * size.w,
        y: (pt.ny || 0) * size.h,
      }))
    );
  }, [draftStroke, size]);

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
            points: [{ nx: locationX / size.w, ny: locationY / size.h }],
          });
        },
        onPanResponderMove: (e) => {
          if (!active) return;
          const { locationX, locationY } = e.nativeEvent;
          setDraftStroke((prev) => {
            if (!prev) return null;
            const next = { ...prev, points: prev.points.slice() };
            next.points.push({ nx: locationX / size.w, ny: locationY / size.h });
            return next;
          });
        },
        onPanResponderRelease: () => {
          if (!active) return;
          setPaths((prev) => {
            const safePrev = Array.isArray(prev) ? prev.filter(isValidStroke) : [];
            const finalized =
              draftStroke && isValidStroke(draftStroke) ? [...safePrev, draftStroke] : safePrev;
            onChange && onChange(finalized);
            return finalized;
          });
          setDraftStroke(null);
        },
        onPanResponderTerminate: () => {
          setDraftStroke(null);
        },
      }),
    [active, color, size, draftStroke, onChange]
  );

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
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
