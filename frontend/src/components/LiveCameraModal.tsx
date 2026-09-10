"use client";

import { useEffect, useRef, useState } from "react";
import { api, ProjectItem } from "@/lib/api";
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Video,
  X,
} from "lucide-react";

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectItem;
  onInspectionComplete: (inspectionId: string) => void;
}

interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number;
  isSimulated?: boolean;
}

interface CapturedImage {
  id?: string;
  blob: Blob;
  preview: string;
  hash: string;
  timestamp: string;
  filename: string;
}

// Haversine distance calculation in meters
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// SHA-256 hash calculation for evidence integrity
async function calculateSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function LiveCameraModal({
  isOpen,
  onClose,
  project,
  onInspectionComplete,
}: LiveCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [gpsPosition, setGpsPosition] = useState<GPSPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(false);
  const [geofenceDistance, setGeofenceDistance] = useState<number>(0);

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Scene type hint for AI work-photo classification
  const [sceneType, setSceneType] = useState<"work_site" | "selfie" | "other">("work_site");
  // AI classification result for last uploaded photo
  interface AIClassResult { is_work_photo: boolean; detected_category: string | null; confidence: number | null; requires_peer: boolean; }
  const [lastAIResult, setLastAIResult] = useState<AIClassResult | null>(null);

  // Initialize or ensure active inspection exists
  const ensureInspection = async (lat: number, lng: number, accuracy: number): Promise<string> => {
    if (inspectionId) return inspectionId;
    try {
      const res = await api.startInspection(project.id, lat, lng, accuracy);
      setInspectionId(res.id);
      return res.id;
    } catch (err: any) {
      console.warn("Failed to start inspection:", err);
      throw err;
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setVideoStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Live camera access failed:", err);
      setCameraError(
        `Live camera access required: ${err.message || "Permission denied or no camera device available"}. Please enable camera permissions in your browser to capture on-site evidence.`
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setCameraActive(false);
  };

  // Simulate on-site GPS for SIH Demo & testing
  const handleSimulateOnSite = async () => {
    const simulated: GPSPosition = {
      lat: project.latitude,
      lng: project.longitude,
      accuracy: 5.0,
      isSimulated: true,
    };
    setGpsPosition(simulated);
    setGpsError(null);
    setGeofenceDistance(0);
    setIsWithinGeofence(true);

    try {
      const currentInspId = await ensureInspection(simulated.lat, simulated.lng, simulated.accuracy);
      setInspectionId(currentInspId);
    } catch (err: any) {
      console.error("Simulation error:", err);
    }
  };

  // Acquire device GPS
  const acquireGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      handleSimulateOnSite();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pos: GPSPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 10.0,
          isSimulated: false,
        };
        setGpsPosition(pos);
        setGpsError(null);

        const distance = haversineDistance(
          pos.lat,
          pos.lng,
          project.latitude,
          project.longitude
        );
        const roundedDistance = Math.round(distance);
        setGeofenceDistance(roundedDistance);
        const within = roundedDistance <= project.inspection_radius_m;
        setIsWithinGeofence(within);

        if (within) {
          try {
            await ensureInspection(pos.lat, pos.lng, pos.accuracy);
          } catch (err: any) {
            setGpsError(`Inspection start failed: ${err.message}`);
          }
        }
      },
      (error) => {
        setGpsError(`GPS Notice: ${error.message}. You can use 'Simulate On-Site GPS' for SIH demo.`);
        // Fallback to simulate
        handleSimulateOnSite();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    acquireGPS();
    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, project]);

  // Upload evidence blob to backend
  const uploadEvidenceBlob = async (blob: Blob, originalName?: string) => {
    try {
      setUploadStatus("uploading");
      setErrorMessage(null);
      setLastAIResult(null);

      const lat = gpsPosition?.lat || project.latitude;
      const lng = gpsPosition?.lng || project.longitude;
      const accuracy = gpsPosition?.accuracy || 10.0;

      // Ensure active inspection ID
      const activeInspId = inspectionId || (await ensureInspection(lat, lng, accuracy));

      // Calculate SHA-256 hash for cryptographic proof
      const hash = await calculateSHA256(blob);
      const preview = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString();
      const filename = originalName || `live_capture_${Date.now()}.jpg`;

      // Construct multipart form data matching backend expectations
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("capture_timestamp", timestamp);
      formData.append("latitude", lat.toString());
      formData.append("capture_latitude", lat.toString());
      formData.append("longitude", lng.toString());
      formData.append("capture_longitude", lng.toString());
      formData.append("gps_accuracy", accuracy.toString());
      formData.append("sha256_hash", hash);
      formData.append("device_info", navigator.userAgent);
      // Pass scene classification hints to AI pipeline
      formData.append("is_selfie", (sceneType === "selfie").toString());
      formData.append("scene_hint", sceneType === "selfie" ? "selfie" : sceneType === "other" ? "non_work" : "");

      const res = await api.uploadEvidence(activeInspId, formData);

      // Store AI classification result for display
      setLastAIResult({
        is_work_photo: res.is_work_photo ?? true,
        detected_category: res.detected_category ?? null,
        confidence: res.work_match_confidence ?? null,
        requires_peer: res.requires_peer_acceptance ?? false,
      });

      setCapturedImages((prev) => [
        ...prev,
        {
          id: res.id,
          blob,
          preview,
          hash,
          timestamp,
          filename,
        },
      ]);

      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 2500);
    } catch (err: any) {
      console.error("Evidence upload failed:", err);
      setUploadStatus("error");
      setErrorMessage(err.message || "Failed to capture and upload live image. Please try again.");
      setTimeout(() => setUploadStatus("idle"), 4000);
    }
  };

  // Capture frame from live video feed (strictly only allowed when within geofence)
  const handleCapture = async () => {
    if (!isWithinGeofence) {
      setErrorMessage(
        `Geofence Violation: You are ${geofenceDistance}m away from the project site. Physical presence within the ${project.inspection_radius_m}m radius is strictly required to capture inspection evidence.`
      );
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        await uploadEvidenceBlob(blob, `live_site_evidence_${Date.now()}.jpg`);
      },
      "image/jpeg",
      0.92
    );
  };

  // Remove photo from captured list
  const handleRemoveImage = (index: number) => {
    setCapturedImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  // Final submission of inspection
  const handleSubmit = async () => {
    if (!inspectionId && capturedImages.length === 0) {
      alert("Please capture at least one live evidence photo before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      const lat = gpsPosition?.lat || project.latitude;
      const lng = gpsPosition?.lng || project.longitude;
      const accuracy = gpsPosition?.accuracy || 10.0;
      const activeInspId = inspectionId || (await ensureInspection(lat, lng, accuracy));

      await api.submitInspection(activeInspId, notes || undefined);
      onInspectionComplete(activeInspId);
      handleClose();
    } catch (err: any) {
      alert(`Failed to submit inspection: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    capturedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setInspectionId(null);
    setGpsPosition(null);
    setGpsError(null);
    setIsWithinGeofence(false);
    setGeofenceDistance(0);
    setCapturedImages([]);
    setUploadStatus("idle");
    setErrorMessage(null);
    setNotes("");
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/85 backdrop-blur-xs p-4 overflow-y-auto transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Live Geofenced Camera Capture
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {project.project_code} • {project.name}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1">
          {/* GPS Geofencing Status Card */}
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-sm text-slate-900 dark:text-white">Inspector Geofence Position</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={acquireGPS}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded cursor-pointer"
                  title="Re-acquire current hardware GPS coordinates"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh GPS
                </button>

                <button
                  type="button"
                  onClick={handleSimulateOnSite}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer"
                  title="Simulate on-site coordinates for SIH evaluation / presentation"
                >
                  <MapPin className="w-3 h-3" /> Use Project GPS (Demo)
                </button>
              </div>
            </div>

            {/* GPS Detail readout */}
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Inspector Location:</span>{" "}
                  {gpsPosition ? (
                    <span className="font-mono">{gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}</span>
                  ) : (
                    <span className="italic text-slate-400">Acquiring...</span>
                  )}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Target Site:</span>{" "}
                  <span className="font-mono">{project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}</span>
                </div>
              </div>

              <div className="flex items-center sm:justify-end">
                {isWithinGeofence ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Within Geofence ({geofenceDistance}m ≤ {project.inspection_radius_m}m)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-lg text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>Outside Geofence ({geofenceDistance}m &gt; {project.inspection_radius_m}m)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Geofence Lockdown Banner when Outside */}
            {!isWithinGeofence && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 rounded-md text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <Lock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Live Capture Locked:</span> You are currently{" "}
                  <span className="font-mono font-bold">{geofenceDistance}m</span> away from the project site.
                  Physical presence within the <span className="font-bold">{project.inspection_radius_m}m geofence radius</span> is strictly required to capture inspection evidence. For evaluation/demo, use &quot;Use Project GPS (Demo)&quot;.
                </div>
              </div>
            )}

            {gpsError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 bg-amber-50/50 dark:bg-amber-950/40 p-1.5 rounded">
                {gpsError}
              </p>
            )}
          </div>

          {/* Live Video Camera Stream */}
          <div className="space-y-3">
            {cameraError ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Live Camera Access Notice</span>
                </div>
                <p>{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera Access
                </button>
              </div>
            ) : (
              <div className="relative bg-black rounded-lg overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center min-h-[320px] max-h-[440px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full max-h-[440px] object-contain"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Top Live Stream Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-600/90 text-white text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Live Video Stream
                </div>

                {/* Geofence Status Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-xs border text-[11px] font-semibold">
                  {isWithinGeofence ? (
                    <span className="flex items-center gap-1 text-emerald-400 bg-slate-900/80 border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Geofence Verified ({geofenceDistance}m)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 bg-slate-900/80 border-red-500/30 px-2 py-0.5 rounded-full">
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      Locked: Outside Geofence ({geofenceDistance}m)
                    </span>
                  )}
                </div>

                {/* Outside Geofence Watermark Banner on Video */}
                {!isWithinGeofence && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="w-12 h-12 rounded-full bg-red-600/80 flex items-center justify-center mb-3 shadow-lg">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      Live Capture Locked
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md">
                      You must be physically located within the <span className="font-semibold text-white">{project.inspection_radius_m}m geofence radius</span> of this project to capture live evidence frames.
                    </p>
                    <p className="text-[11px] text-red-300 mt-2 font-mono">
                      Current Distance: {geofenceDistance}m • Geofence Radius: {project.inspection_radius_m}m
                    </p>
                  </div>
                )}

                {/* Scene Type Selector (shown only when inside geofence) */}
                {isWithinGeofence && (
                  <div className="absolute bottom-16 left-0 right-0 flex items-center justify-center gap-2 z-10 px-4">
                    <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">Photo Type:</span>
                    {(["work_site", "selfie", "other"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSceneType(type)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                          sceneType === type
                            ? type === "work_site"
                              ? "bg-emerald-500 text-white shadow-md"
                              : "bg-red-500 text-white shadow-md"
                            : "bg-slate-900/70 text-white/70 hover:bg-slate-800/90"
                        }`}
                      >
                        {type === "work_site" ? "✓ Work Site" : type === "selfie" ? "⚠ Selfie" : "Other"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Capture Trigger Button */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-10">
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!isWithinGeofence || uploadStatus === "uploading"}
                    className={`group flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm shadow-xl transition-all ${
                      !isWithinGeofence
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                    }`}
                  >
                    {!isWithinGeofence ? (
                      <>
                        <Lock className="w-5 h-5 text-amber-400" />
                        <span>Live Capture Locked (Outside Geofence)</span>
                      </>
                    ) : uploadStatus === "uploading" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Analysing &amp; Uploading Evidence...</span>
                      </>
                    ) : uploadStatus === "success" ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                        <span>Captured &amp; Cryptographically Sealed!</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span>Capture Evidence Frame</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Classification Result Banner */}
          {lastAIResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              lastAIResult.requires_peer
                ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300"
                : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
            }`}>
              {lastAIResult.requires_peer ? (
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              ) : (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              )}
              <div>
                <div className="font-bold">
                  {lastAIResult.requires_peer
                    ? "⚠ Non-Work Photo Detected — Peer Inspector Acceptance Required"
                    : `✓ AI Verified: Work Site Photo (${lastAIResult.detected_category || "infrastructure"} · Confidence ${lastAIResult.confidence?.toFixed(1)}%)`}
                </div>
                {lastAIResult.requires_peer && (
                  <p className="mt-0.5 text-[11px]">
                    AI Scene Classifier detected this image does not depict project work ({project.project_type}). Another field inspector must accept this photo before the project can be marked complete. A critical alert has been raised.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload Status & Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Captured Evidence Gallery */}
          {capturedImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Captured Evidence Assets ({capturedImages.length})
                </h3>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> SHA-256 Cryptographically Sealed
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {capturedImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-black/5 flex items-center justify-center">
                      <img
                        src={img.preview}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>

                    <div className="p-2 bg-white dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-[10px] space-y-0.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {img.filename}
                      </div>
                      <div className="font-mono text-slate-400 truncate" title={`SHA-256: ${img.hash}`}>
                        SHA: {img.hash.slice(0, 12)}...
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {new Date(img.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full shadow-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspection Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Field Observations & Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any physical progress observations, foundation completion, materials observed on site..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={capturedImages.length === 0 || isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running AI Forensics & Submitting...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Inspection ({capturedImages.length} Photo{capturedImages.length === 1 ? "" : "s"})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
