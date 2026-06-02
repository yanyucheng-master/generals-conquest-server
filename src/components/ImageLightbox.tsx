import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  caption?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, caption, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const stateRef = useRef({
    scale: 1,
    pos: { x: 0, y: 0 },
    lastTouchDist: 0,
    lastTouchCenter: { x: 0, y: 0 },
    lastMousePos: { x: 0, y: 0 },
    dragging: false,
    hasDragged: false,
  });

  // Sync ref with state
  useEffect(() => {
    stateRef.current.scale = scale;
  }, [scale]);
  useEffect(() => {
    stateRef.current.pos = pos;
  }, [pos]);

  // ====== Wheel zoom (desktop) ======
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    // Pointer position relative to container center
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;

    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newScale = Math.min(Math.max(s.scale + delta, 0.3), 8);
    const scaleRatio = newScale / s.scale;

    // Zoom towards pointer
    const newX = cx - (cx - s.pos.x) * scaleRatio;
    const newY = cy - (cy - s.pos.y) * scaleRatio;

    s.scale = newScale;
    s.pos = { x: newX, y: newY };
    setScale(newScale);
    setPos({ x: newX, y: newY });
  }, []);

  // ====== Mouse drag ======
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    s.dragging = true;
    s.hasDragged = false;
    s.lastMousePos = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastMousePos.x;
    const dy = e.clientY - s.lastMousePos.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.hasDragged = true;
    s.lastMousePos = { x: e.clientX, y: e.clientY };
    s.pos = { x: s.pos.x + dx, y: s.pos.y + dy };
    setPos({ ...s.pos });
  }, []);

  const handleMouseUp = useCallback(() => {
    const s = stateRef.current;
    s.dragging = false;
    setDragging(false);
  }, []);

  // ====== Touch: pinch zoom + pan ======
  const getTouchDist = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const getTouchCenter = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const s = stateRef.current;
    if (e.touches.length === 2) {
      // Pinch start
      s.lastTouchDist = getTouchDist(e.touches[0], e.touches[1]);
      s.lastTouchCenter = getTouchCenter(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
      // Pan start
      s.dragging = true;
      s.hasDragged = false;
      s.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Pinch zoom
      const newDist = getTouchDist(e.touches[0], e.touches[1]);
      const newCenter = getTouchCenter(e.touches[0], e.touches[1]);

      if (s.lastTouchDist > 0) {
        const scaleFactor = newDist / s.lastTouchDist;
        const newScale = Math.min(Math.max(s.scale * scaleFactor, 0.3), 8);

        const cx = newCenter.x - rect.left - rect.width / 2;
        const cy = newCenter.y - rect.top - rect.height / 2;
        const scaleRatio = newScale / s.scale;
        const newX = cx - (cx - s.pos.x) * scaleRatio;
        const newY = cy - (cy - s.pos.y) * scaleRatio;

        s.scale = newScale;
        s.pos = { x: newX, y: newY };
        setScale(newScale);
        setPos({ x: newX, y: newY });
      }
      s.lastTouchDist = newDist;
      s.lastTouchCenter = newCenter;
    } else if (e.touches.length === 1 && s.dragging) {
      // Pan
      const dx = e.touches[0].clientX - s.lastMousePos.x;
      const dy = e.touches[0].clientY - s.lastMousePos.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.hasDragged = true;
      s.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      s.pos = { x: s.pos.x + dx, y: s.pos.y + dy };
      setPos({ ...s.pos });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const s = stateRef.current;
    s.dragging = false;
    s.lastTouchDist = 0;
  }, []);

  // ====== Double click to zoom in/out ======
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    if (s.scale > 1.5) {
      // Reset
      s.scale = 1;
      s.pos = { x: 0, y: 0 };
    } else {
      // Zoom to 2.5x towards click point
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const newScale = 2.5;
      const newX = cx - (cx - s.pos.x) * (newScale / s.scale);
      const newY = cy - (cy - s.pos.y) * (newScale / s.scale);
      s.scale = newScale;
      s.pos = { x: newX, y: newY };
    }
    setScale(s.scale);
    setPos({ ...s.pos });
  }, []);

  // ====== Background click to close (only if not dragged) ======
  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !stateRef.current.hasDragged) {
      onClose();
    }
  }, [onClose]);

  // ====== Keyboard ======
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ====== Reset ======
  const handleReset = useCallback(() => {
    stateRef.current.scale = 1;
    stateRef.current.pos = { x: 0, y: 0 };
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    const s = stateRef.current;
    const newScale = Math.min(s.scale * 1.3, 8);
    s.scale = newScale;
    setScale(newScale);
  }, []);

  const handleZoomOut = useCallback(() => {
    const s = stateRef.current;
    const newScale = Math.max(s.scale / 1.3, 0.3);
    s.scale = newScale;
    setScale(newScale);
  }, []);

  const percent = Math.round(scale * 100);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] bg-black/92 flex items-center justify-center select-none overflow-hidden"
      onClick={handleBgClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Image with transform */}
      <img
        ref={imgRef}
        src={src}
        alt="放大查看"
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        draggable={false}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 0.1s ease-out',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />

      {/* Close button */}
      <button
        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 rounded-full text-white transition-colors z-10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/70 rounded-full z-10">
        <button onClick={handleZoomOut} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white text-xs font-mono min-w-[48px] text-center">{percent}%</span>
        <button onClick={handleZoomIn} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleReset} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-gray-400 text-xs z-10">
          {caption}
        </div>
      )}

      {/* Hint */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 text-gray-500 text-[10px] z-10 pointer-events-none sm:block hidden">
        滚轮缩放 · 拖拽移动 · 双击放大/还原
      </div>
      <div className="absolute top-14 left-1/2 -translate-x-1/2 text-gray-500 text-[10px] z-10 pointer-events-none sm:hidden">
        双指缩放 · 单指拖拽
      </div>
    </div>
  );
}
