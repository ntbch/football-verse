package com.footballverse.security;

import com.footballverse.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final InternalTokenAuthenticationFilter internalTokenAuthenticationFilter;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**", "/auth/**").permitAll()
                        .requestMatchers("/api/v1/internal/**", "/internal/**").permitAll()
                        .requestMatchers("/api/v1/billing/webhooks/sepay", "/billing/webhooks/sepay",
                                "/api/v1/billing/webhooks/sepay-bankhub", "/billing/webhooks/sepay-bankhub").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/billing/plans", "/billing/plans").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/news/**", "/api/v1/forum/**", "/api/v1/uploads/**", "/api/v1/search/**", "/api/v1/notifications/stream/**", "/api/v1/predictions/**", "/api/v1/minigames/daily", "/api/v1/minigames/players", "/api/v1/minigames/leaderboard", "/predictions/**", "/minigames/daily", "/minigames/players", "/minigames/leaderboard", "/api/v1/matches/**", "/matches/**", "/news/**", "/forum/**", "/uploads/**", "/search/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/minigames/**", "/minigames/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/uploads/**", "/uploads/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/**", "/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/moderator/**", "/moderator/**").hasAnyRole("MODERATOR", "ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(internalTokenAuthenticationFilter, JwtAuthenticationFilter.class)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @org.springframework.beans.factory.annotation.Value("${app.cors-origin:http://localhost:3000}")
    private String corsOrigin;

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(corsOrigin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
