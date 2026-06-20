package com.example.dressingroom.assets;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssetService {
  private final Path assetRoot;
  private final AssetManifest manifest;

  public AssetService(
      @Value("${dressing-room.assets.root}") Path assetRoot,
      AssetManifest manifest) {
    this.assetRoot = assetRoot.toAbsolutePath().normalize();
    this.manifest = manifest;
  }

  public AssetMetadata getMetadata(String id) {
    return manifest.require(id);
  }

  public AssetFile loadFile(String id) {
    AssetMetadata metadata = manifest.require(id);
    Path file = resolveWhitelistedAsset(metadata);

    if (!Files.isRegularFile(file) || !Files.isReadable(file)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset file is not readable");
    }

    try {
      Resource resource = new UrlResource(file.toUri());
      return new AssetFile(
          metadata.fileName(),
          Files.size(file),
          mediaTypeFor(metadata.fileName()),
          resource);
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Asset load failed", ex);
    }
  }

  private Path resolveWhitelistedAsset(AssetMetadata metadata) {
    // The request never supplies a raw path. The manifest maps IDs to filenames,
    // then this normalized startsWith check closes path traversal escapes.
    Path file = assetRoot.resolve(metadata.id()).resolve(metadata.fileName()).normalize();

    if (!file.startsWith(assetRoot)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid asset path");
    }

    return file;
  }

  private MediaType mediaTypeFor(String fileName) {
    if (fileName.endsWith(".gltf")) {
      return MediaType.parseMediaType("model/gltf+json");
    }
    return MediaType.parseMediaType("model/gltf-binary");
  }
}
