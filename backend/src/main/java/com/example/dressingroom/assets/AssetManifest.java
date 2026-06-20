package com.example.dressingroom.assets;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AssetManifest {
  private final Map<String, AssetMetadata> assets = Map.of(
      "male-hoodie",
      new AssetMetadata(
          "male-hoodie",
          "Male Hoodie",
          "upper-body",
          "male",
          "male-hoodie.glb",
          "/api/assets/male-hoodie/file",
          new FitProfile(1.20, 1.25, 0.12, 1.14, 1.10, 0.92)),
      "female-dress",
      new AssetMetadata(
          "female-dress",
          "Female Dress",
          "dress",
          "female",
          "female-dress.glb",
          "/api/assets/female-dress/file",
          new FitProfile(1.02, 1.65, 0.10, 1.12, 1.16, 0.88)));

  public List<AssetMetadata> list() {
    return assets.values().stream().toList();
  }

  public AssetMetadata require(String id) {
    AssetMetadata asset = assets.get(id);
    if (asset == null) {
      throw new AssetNotFoundException(id);
    }
    return asset;
  }
}
