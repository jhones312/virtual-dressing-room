package com.example.dressingroom.assets;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

public record AssetFile(
    String fileName,
    long contentLength,
    MediaType mediaType,
    Resource resource) {}
