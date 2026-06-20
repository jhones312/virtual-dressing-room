export type GarmentFitProfile = {
  // Model-space distance between the two garment shoulder points at scale 1.
  localShoulderWidth: number;
  // Model-space vertical distance from upper chest to waist or lower torso anchor.
  localTorsoLength: number;
  // 0 means shoulder line, 1 means hip line. Most tops sit around 0.08-0.18.
  anchorDown: number;
  // Looseness multipliers. Keep these per garment, not global.
  fitX: number;
  fitY: number;
  fitZ: number;
};

export type GarmentAsset = {
  id: string;
  displayName: string;
  category: "upper-body" | "dress" | "outerwear";
  genderFit: "male" | "female" | "unisex";
  fileUrl: string;
  fitProfile: GarmentFitProfile;
};

export type AssetManifestResponse = {
  assets: GarmentAsset[];
};
