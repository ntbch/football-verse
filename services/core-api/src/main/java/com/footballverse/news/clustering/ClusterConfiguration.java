package com.footballverse.news.clustering;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.clustering")
@Getter
@Setter
public class ClusterConfiguration {
    private String mode = "vector-shadow";
    private int windowHours = 48;
    private int candidateLimit = 20;
    private double semanticWeight = 0.60;
    private double lexicalWeight = 0.10;
    private double entityWeight = 0.25;
    private double timeWeight = 0.05;
    private double autoMergeThreshold = 0.55;
}
