package com.example.dressingroom.assets;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assets")
public class AssetController {
  private final AssetManifest manifest;
  private final AssetService assetService;

  public AssetController(AssetManifest manifest, AssetService assetService) {
    this.manifest = manifest;
    this.assetService = assetService;
  }

  @GetMapping
  public Map<String, List<AssetMetadata>> listAssets() {
    return Map.of("assets", manifest.list());
  }

  @GetMapping("/{id}")
  public AssetMetadata getAsset(@PathVariable String id) {
    return assetService.getMetadata(id);
  }

  @GetMapping("/{id}/file")
  public ResponseEntity<Resource> getAssetFile(@PathVariable String id) {
    AssetFile asset = assetService.loadFile(id);

    return ResponseEntity.ok()
        .contentType(asset.mediaType())
        .contentLength(asset.contentLength())
        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + asset.fileName() + "\"")
        .body(asset.resource());
  }

  @ExceptionHandler(AssetNotFoundException.class)
  public ResponseEntity<Map<String, String>> handleMissingAsset(AssetNotFoundException ex) {
    return ResponseEntity.notFound().build();
  }
}
