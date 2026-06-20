package com.example.dressingroom.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  private final List<String> allowedOrigins;

  public CorsConfig(
      @Value("${dressing-room.cors.allowed-origins}") List<String> allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins(allowedOrigins.toArray(String[]::new))
        .allowedMethods("GET", "HEAD", "OPTIONS")
        .allowedHeaders("Accept", "Content-Type", "Range")
        .exposedHeaders("Content-Length", "Content-Disposition", "Accept-Ranges")
        .maxAge(3600);
  }
}
