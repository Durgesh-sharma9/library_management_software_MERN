import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  BookOpen,
  Square,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  onSkipCrop?: () => void;
}

type AspectRatioOption = '2:3' | '3:4' | '1:1' | 'free';

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  onSkipCrop,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('2:3');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pinchDist, setPinchDist] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setProcessing(false);
    }
  }, [isOpen, imageSrc]);

  // Compute crop box dimensions based on container and aspect ratio
  const getCropBoxSize = useCallback(() => {
    // Default container size estimation
    const containerWidth = containerRef.current?.clientWidth || 360;
    const containerHeight = containerRef.current?.clientHeight || 420;

    const maxW = Math.min(containerWidth - 32, 340);
    const maxH = Math.min(containerHeight - 32, 460);

    let ratioVal = 2 / 3;
    if (aspectRatio === '3:4') ratioVal = 3 / 4;
    else if (aspectRatio === '1:1') ratioVal = 1;
    else if (aspectRatio === 'free') ratioVal = 2 / 3; // default visually

    let w = maxW;
    let h = w / ratioVal;

    if (h > maxH) {
      h = maxH;
      w = h * ratioVal;
    }

    return { width: Math.round(w), height: Math.round(h) };
  }, [aspectRatio]);

  // Handle Dragging via Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Dragging and Pinch-to-zoom via Touch for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
      setPinchDist(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchDist !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / pinchDist;
      setZoom((prev) => Math.min(Math.max(prev * factor, 0.8), 3.5));
      setPinchDist(currentDist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPinchDist(null);
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Perform Final Canvas Crop
  const handleApplyCrop = async () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    try {
      setProcessing(true);

      const cropBox = getCropBoxSize();

      // Viewport container center
      const containerRect = container.getBoundingClientRect();
      const cropBoxLeft = (containerRect.width - cropBox.width) / 2;
      const cropBoxTop = (containerRect.height - cropBox.height) / 2;

      // Create high-res canvas
      const canvas = document.createElement('canvas');
      canvas.width = cropBox.width * 2; // 2x retina clarity
      canvas.height = cropBox.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Scale to 2x canvas space
      ctx.scale(2, 2);

      // Translate origin to crop box center
      ctx.translate(cropBox.width / 2, cropBox.height / 2);

      // Apply user position, rotation and zoom
      ctx.translate(position.x, position.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Render image centered
      // We need image rendered dimensions in container
      const displayedWidth = img.width;
      const displayedHeight = img.height;

      ctx.drawImage(
        img,
        -displayedWidth / 2,
        -displayedHeight / 2,
        displayedWidth,
        displayedHeight
      );

      // Convert canvas to Blob & File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedFile = new File([blob], `cropped-cover-${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            onCropComplete(croppedFile);
            onClose();
          } else {
            throw new Error('Failed to create cropped image blob.');
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      alert('Error cropping image: ' + (err.message || 'Unknown error'));
      setProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const cropBox = getCropBoxSize();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-lg bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Crop Book Cover</h3>
              <p className="text-[10px] text-slate-400">Drag & zoom to frame cover</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onSkipCrop && (
              <button
                type="button"
                onClick={onSkipCrop}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Skip Crop
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-1.5 overflow-x-auto text-xs shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Ratio:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            <button
              type="button"
              onClick={() => setAspectRatio('2:3')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                aspectRatio === '2:3'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Book 2:3</span>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio('3:4')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                aspectRatio === '3:4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>3:4</span>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio('1:1')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                aspectRatio === '1:1'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Square className="w-3 h-3" />
              <span>1:1</span>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio('free')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                aspectRatio === 'free'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Free
            </button>
          </div>

          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90 degrees"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer ml-auto shrink-0 flex items-center gap-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">Rotate</span>
          </button>
        </div>

        {/* Viewport / Crop Work Area */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-black min-h-[300px] sm:min-h-[380px] max-h-[55vh] flex items-center justify-center overflow-hidden select-none cursor-move touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Target Image to Crop */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Source to Crop"
            onLoad={() => setImageLoaded(true)}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="max-w-[85%] max-h-[85%] object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* Semi-transparent dark mask outside crop box */}
          <div
            className="absolute pointer-events-none border-2 border-indigo-400/90 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
            style={{
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
            }}
          >
            {/* Grid lines (Rule of thirds) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-white/50 border-dashed" />
              <div className="border-r border-white/50 border-dashed" />
              <div />
              <div className="border-r border-white/50 border-dashed border-t" />
              <div className="border-r border-white/50 border-dashed border-t" />
              <div className="border-t border-white/50 border-dashed" />
              <div className="border-r border-white/50 border-dashed border-t" />
              <div className="border-r border-white/50 border-dashed border-t" />
              <div className="border-t border-white/50 border-dashed" />
            </div>

            {/* Corner crop indicators */}
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-white rounded-tl-sm" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-white rounded-tr-sm" />
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-white rounded-bl-sm" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-white rounded-br-sm" />

            {/* Label */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono text-indigo-300">
              {aspectRatio.toUpperCase()} FRAME
            </div>
          </div>
        </div>

        {/* Zoom Controls Slider */}
        <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.8))}
              className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(prev + 0.1, 3))}
              className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-9 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!imageLoaded || processing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {processing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Cropping...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply & Crop Cover</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
