import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AssetManifestResponse, GarmentAsset } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const LOCAL_FALLBACK_ASSETS: GarmentAsset[] = [
  {
    id: "male-hoodie",
    displayName: "Male Hoodie",
    category: "upper-body",
    genderFit: "male",
    fileUrl: "/assets/male-hoodie/male-hoodie.glb",
    fitProfile: {
      localShoulderWidth: 1.2,
      localTorsoLength: 1.25,
      anchorDown: 0.12,
      fitX: 1.14,
      fitY: 1.1,
      fitZ: 0.92,
    },
  },
  {
    id: "female-dress",
    displayName: "Female Dress",
    category: "dress",
    genderFit: "female",
    fileUrl: "/assets/female-dress/female-dress.glb",
    fitProfile: {
      localShoulderWidth: 1.02,
      localTorsoLength: 1.65,
      anchorDown: 0.1,
      fitX: 1.12,
      fitY: 1.16,
      fitZ: 0.88,
    },
  },
];

export async function fetchGarments(): Promise<GarmentAsset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assets`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Asset manifest failed: ${response.status}`);
    }

    const manifest = (await response.json()) as AssetManifestResponse;
    return manifest.assets.map((asset) => ({
      ...asset,
      fileUrl: absoluteAssetUrl(asset.fileUrl),
    }));
  } catch (error) {
    console.warn("Asset API unavailable. Using frontend fallback garments.", error);
    return LOCAL_FALLBACK_ASSETS;
  }
}

export async function loadGarment(asset: GarmentAsset) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(asset.fileUrl);
  const group = gltf.scene;

  group.name = asset.id;
  group.visible = false;
  normalizeGarmentMaterials(group);

  return group;
}

export function disposeGarment(group: THREE.Group | null) {
  if (!group) {
    return;
  }

  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

function normalizeGarmentMaterials(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.frustumCulled = false;
    object.matrixAutoUpdate = true;
    object.renderOrder = 2;
  });
}

function absoluteAssetUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}
