package com.example.dressingroom.assets;

public record AssetMetadata(
    String id,
    String displayName,
    String category,
    String genderFit,
    String fileName,
    String fileUrl,
    FitProfile fitProfile) {}
