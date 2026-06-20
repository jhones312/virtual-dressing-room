"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import { createPoseLandmarker } from "@/lib/ar/createPoseLandmarker";
import { applyGarmentFit, createCoverMapping } from "@/lib/ar/fitGarment";
import { disposeGarment, fetchGarments, loadGarment } from "@/lib/ar/loadGarment";
import type { GarmentAsset } from "@/lib/ar/types";

type RuntimeRefs = {
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.OrthographicCamera | null;
  scene: THREE.Scene | null;
  garment: THREE.Group | null;
  poseLandmarker: PoseLandmarker | null;
  animationFrame: number;
  stream: MediaStream | null;
};

export default function VirtualMirror() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<RuntimeRefs>({
    renderer: null,
    camera: null,
    scene: null,
    garment: null,
    poseLandmarker: null,
    animationFrame: 0,
    stream: null,
  });

  const [assets, setAssets] = useState<GarmentAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [status, setStatus] = useState("Starting camera and pose tracker...");

  useEffect(() => {
    let disposed = false;

    async function boot() {
      try {
        const video = videoRef.current;
        const layer = layerRef.current;

        if (!video || !layer) {
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });

        runtimeRef.current.stream = stream;
        video.srcObject = stream;
        await video.play();

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
        camera.position.z = 10;

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        layer.appendChild(renderer.domElement);

        runtimeRef.current.scene = scene;
        runtimeRef.current.camera = camera;
        runtimeRef.current.renderer = renderer;

        const [poseLandmarker, loadedAssets] = await Promise.all([
          createPoseLandmarker(),
          fetchGarments(),
        ]);

        if (disposed) {
          poseLandmarker.close();
          return;
        }

        runtimeRef.current.poseLandmarker = poseLandmarker;
        setAssets(loadedAssets);
        setSelectedAssetId(loadedAssets[0]?.id ?? null);
        setStatus("Pose tracker ready. Stand centered in frame.");
      } catch (error) {
        console.error(error);
        setStatus(error instanceof Error ? error.message : "AR initialization failed.");
      }
    }

    boot();

    return () => {
      disposed = true;
      cleanupRuntime(runtimeRef.current);
    };
  }, []);

  useEffect(() => {
    const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
    const runtime = runtimeRef.current;

    if (!selectedAsset || !runtime.scene) {
      return;
    }

    const asset = selectedAsset;
    let disposed = false;

    async function swapGarment() {
      setStatus(`Loading ${asset.displayName}...`);

      const nextGarment = await loadGarment(asset);
      if (disposed || !runtime.scene) {
        disposeGarment(nextGarment);
        return;
      }

      if (runtime.garment) {
        runtime.scene.remove(runtime.garment);
        disposeGarment(runtime.garment);
      }

      runtime.garment = nextGarment;
      runtime.scene.add(nextGarment);
      setStatus(`${asset.displayName} loaded. Move naturally.`);
    }

    swapGarment().catch((error) => {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Garment loading failed.");
    });

    return () => {
      disposed = true;
    };
  }, [assets, selectedAssetId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    let resizeObserver: ResizeObserver | null = null;

    function resize() {
      const video = videoRef.current;
      const layer = layerRef.current;

      if (!video || !layer || !runtime.renderer || !runtime.camera) {
        return;
      }

      const rect = layer.getBoundingClientRect();
      runtime.renderer.setSize(rect.width, rect.height, false);
      runtime.camera.left = -rect.width / 2;
      runtime.camera.right = rect.width / 2;
      runtime.camera.top = rect.height / 2;
      runtime.camera.bottom = -rect.height / 2;
      runtime.camera.updateProjectionMatrix();
    }

    resizeObserver = new ResizeObserver(resize);
    if (layerRef.current) {
      resizeObserver.observe(layerRef.current);
    }
    resize();

    return () => resizeObserver?.disconnect();
  }, []);

  useEffect(() => {
    let stopped = false;

    function renderLoop() {
      const runtime = runtimeRef.current;
      const video = videoRef.current;
      const layer = layerRef.current;

      if (
        !stopped &&
        video &&
        layer &&
        runtime.poseLandmarker &&
        runtime.renderer &&
        runtime.camera &&
        runtime.scene
      ) {
        const activeAsset = assets.find((asset) => asset.id === selectedAssetId);
        const pose = runtime.poseLandmarker.detectForVideo(video, performance.now());
        const landmarks = pose.landmarks[0];

        if (runtime.garment && activeAsset && landmarks) {
          const rect = layer.getBoundingClientRect();
          const mapping = createCoverMapping({
            sourceWidth: video.videoWidth,
            sourceHeight: video.videoHeight,
            viewWidth: rect.width,
            viewHeight: rect.height,
          });

          applyGarmentFit({
            group: runtime.garment,
            landmarks,
            worldLandmarks: pose.worldLandmarks?.[0],
            mapping,
            profile: activeAsset.fitProfile,
            mirrored: true,
          });
        } else if (runtime.garment) {
          runtime.garment.visible = false;
        }

        runtime.renderer.render(runtime.scene, runtime.camera);
      }

      runtimeRef.current.animationFrame = requestAnimationFrame(renderLoop);
    }

    renderLoop();

    return () => {
      stopped = true;
      cancelAnimationFrame(runtimeRef.current.animationFrame);
    };
  }, [assets, selectedAssetId]);

  return (
    <main className="mirror-shell">
      <video ref={videoRef} className="mirror-video" muted playsInline />
      <div ref={layerRef} className="mirror-canvas-layer" />

      <div className="mirror-status" role="status" aria-live="polite">
        {status}
      </div>

      <div className="mirror-toolbar" aria-label="Garment selection">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            aria-pressed={asset.id === selectedAssetId}
            onClick={() => setSelectedAssetId(asset.id)}
          >
            {asset.displayName}
          </button>
        ))}
      </div>
    </main>
  );
}

function cleanupRuntime(runtime: RuntimeRefs) {
  cancelAnimationFrame(runtime.animationFrame);

  runtime.stream?.getTracks().forEach((track) => track.stop());
  runtime.poseLandmarker?.close();

  if (runtime.garment && runtime.scene) {
    runtime.scene.remove(runtime.garment);
  }

  disposeGarment(runtime.garment);
  runtime.renderer?.dispose();

  runtime.renderer?.domElement.remove();

  runtime.stream = null;
  runtime.poseLandmarker = null;
  runtime.renderer = null;
  runtime.camera = null;
  runtime.scene = null;
  runtime.garment = null;
}
