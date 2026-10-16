import React, { useState, useEffect, useRef } from 'react';
import { Camera, SwitchCamera, RotateCcw, Check, X, AlertCircle, Sparkles, Upload } from 'lucide-react';

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Book Cover Photo',
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [flash, setFlash] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Stop all camera tracks
  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Start camera stream
  const startCamera = async (facing: 'environment' | 'user') => {
    stopTracks();
    setError(null);
    setIsInitializing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported by your browser or requires HTTPS.');
      setIsInitializing(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera getUserMedia error:', err);
      // Fallback try without specific facingMode if first attempt failed
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission was denied. Please allow camera access in browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera device found on this system.');
        } else {
          setError('Unable to access camera: ' + (err.message || 'Unknown error'));
        }
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      setError(null);
      startCamera(facingMode);
    } else {
      stopTracks();
    }

    return () => {
      stopTracks();
    };
  }, [isOpen]);

  // Attach stream when video element renders
  useEffect(() => {
    if (stream && videoRef.current && !capturedImage) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, capturedImage]);

  // Flip camera (Rear <-> Front)
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture still from video stream
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const previewUrl = URL.createObjectURL(blob);
          setCapturedImage(previewUrl);
          setCapturedBlob(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    if (!stream) {
      startCamera(facingMode);
    }
  };

  // Confirm photo and pass back to parent
  const handleConfirm = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `book-cover-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    stopTracks();
    onCapture(file);
    onClose();
  };

  // Fallback file input change (for mobile camera or when stream blocked)
  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopTracks();
      onCapture(file);
      onClose();
    }
  };

  const handleModalClose = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    stopTracks();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleModalClose} />

      <div
        className="relative z-10 w-full max-w-xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">Position the book cover within the frame</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Capture area */}
        <div className="relative flex-1 bg-black min-h-[320px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Shutter flash animation */}
          {flash && (
            <div className="absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
          )}

          {error ? (
            <div className="p-6 text-center max-w-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Camera Unavailable</h4>
                <p className="text-xs text-slate-400">{error}</p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Device Camera App</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            /* Preview of captured photo */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured Book Cover"
                className="max-h-[60vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Photo Captured
              </div>
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full max-h-[65vh] object-cover sm:object-contain bg-black"
              />

              {/* Viewfinder Target Framing Box */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-indigo-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center text-[10px] font-mono text-indigo-300 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs self-start">
                  Book Cover Frame
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-300/80 self-center bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                  Center book inside this box
                </div>
              </div>

              {/* Live Status indicator */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </div>

              {/* Camera Switch button (if supported) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                title="Switch Camera (Front / Back)"
                className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Hidden Canvas & Fallback Camera Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFallbackFileChange}
        />

        {/* Controls Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Retake Photo</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </>
          ) : (
            <>
              {/* Native device file camera quick button */}
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                title="Take photo using system camera"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Device Camera</span>
              </button>

              {/* Shutter Capture Button */}
              <div className="flex-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isInitializing || !!error}
                  className="w-14 h-14 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-105 active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer bg-white/20 shadow-lg shadow-indigo-500/20 group"
                  aria-label="Take Photo"
                >
                  <div className="w-full h-full rounded-full bg-white group-hover:bg-indigo-400 transition-colors shadow-inner" />
                </button>
              </div>

              {/* Close / Cancel */}
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
