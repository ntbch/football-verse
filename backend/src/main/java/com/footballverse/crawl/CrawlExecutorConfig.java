package com.footballverse.crawl;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class CrawlExecutorConfig {

    @Bean(name = "crawlExecutor")
    public ThreadPoolTaskExecutor crawlExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(1);          // ponytail: 1 crawl concurrent — startup + scheduled never overlap heavily
        ex.setMaxPoolSize(1);
        ex.setQueueCapacity(50);
        ex.setThreadNamePrefix("rss-crawl-");
        ex.setWaitForTasksToCompleteOnShutdown(true);
        ex.setAwaitTerminationSeconds(30);
        ex.initialize();
        return ex;
    }
}