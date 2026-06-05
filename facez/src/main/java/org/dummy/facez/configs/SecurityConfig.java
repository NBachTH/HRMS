package org.dummy.facez.configs;

import org.dummy.facez.common.filters.DeviceApiKeyFilter;
import org.dummy.facez.common.filters.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
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
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    List<String> allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider daoAuthenticationProvider = new DaoAuthenticationProvider(userDetailsService);
        daoAuthenticationProvider.setPasswordEncoder(passwordEncoder);
        return daoAuthenticationProvider;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter,
                                            DeviceApiKeyFilter deviceApiKeyFilter) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public
                        .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // Advanced actuator endpoints — SYSTEM_ADMIN only
                        .requestMatchers("/actuator/env", "/actuator/loggers", "/actuator/flyway",
                                         "/actuator/metrics/**").hasAuthority("SYSTEM_ADMIN")

                        // Employee management — HR only
                        .requestMatchers(HttpMethod.POST,   "/api/employees").hasAuthority("HR_ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/employees/**").hasAuthority("HR_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/employees/**").hasAuthority("HR_ADMIN")

                        // Department management — HR only
                        .requestMatchers(HttpMethod.POST,   "/api/departments").hasAuthority("HR_ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/departments/**").hasAuthority("HR_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/departments/**").hasAuthority("HR_ADMIN")
                        // Department reads — authenticated only (not public)
                        .requestMatchers(HttpMethod.GET,    "/api/departments/**").authenticated()

                        // Contract management — HR and Finance (Finance needs salary data)
                        .requestMatchers("/api/contracts/**").hasAnyAuthority("HR_ADMIN", "FINANCE_ADMIN")

                        // Payroll calculation and management — Finance only (was HR_ADMIN)
                        .requestMatchers(HttpMethod.POST,  "/api/payrolls/calculate").hasAnyAuthority("FINANCE_ADMIN")
                        .requestMatchers(HttpMethod.POST,  "/api/payrolls/batch-calculate").hasAnyAuthority("FINANCE_ADMIN")
                        .requestMatchers(HttpMethod.GET,   "/api/payrolls/jobs/**").hasAnyAuthority("FINANCE_ADMIN")
                        .requestMatchers(HttpMethod.GET,   "/api/payrolls/period").hasAnyAuthority("FINANCE_ADMIN", "DIRECTOR")
                        .requestMatchers(HttpMethod.GET,   "/api/payrolls").hasAnyAuthority("FINANCE_ADMIN", "DIRECTOR")

                        // Employee own payslip — EMPLOYEE role (own records only, enforced in service)
                        .requestMatchers(HttpMethod.GET,   "/api/payrolls/my/**").authenticated()

                        // Payroll approval — Director only (was HR_ADMIN)
                        .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/approve").hasAnyAuthority("DIRECTOR")

                        // Payroll mark-paid — Finance (executes the payment after Director approval)
                        .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/mark-paid").hasAnyAuthority("FINANCE_ADMIN")

                        // Payroll delete — Finance (DRAFT only, enforced in service)
                        .requestMatchers(HttpMethod.DELETE, "/api/payrolls/**").hasAnyAuthority("FINANCE_ADMIN")

                        // System configuration — Finance for business rules, SysAdmin for all
                        .requestMatchers("/api/system-configs/**").hasAnyAuthority("FINANCE_ADMIN")

                        // Check-in logs — JWT or X-Device-API-Key header (DEVICE_CHECKIN authority)
                        .requestMatchers("/api/checkin-logs/**").hasAnyAuthority("HR_ADMIN", "DEVICE_CHECKIN", "SYSTEM_ADMIN")

                        // Everything else — authenticated
                        .anyRequest().authenticated());

        http.addFilterBefore(deviceApiKeyFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
