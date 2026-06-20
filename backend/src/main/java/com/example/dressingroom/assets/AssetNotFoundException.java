package com.example.dressingroom.assets;

public class AssetNotFoundException extends RuntimeException {
  public AssetNotFoundException(String id) {
    super("Asset not found: " + id);
  }
}
