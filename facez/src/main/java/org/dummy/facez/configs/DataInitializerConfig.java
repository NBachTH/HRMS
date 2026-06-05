package org.dummy.facez.configs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.employee.repository.UserAccountRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.dummy.facez.domain.payroll.repository.SystemConfigRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Configuration
public class DataInitializerConfig {

    @Bean

    CommandLineRunner initAdmin(UserAccountRepository userRepo,
            EmployeeInfoRepository employeeRepo,
            PasswordEncoder encoder) {
        return args -> {
            String adminUsername = "admin";
            // Check if admin user already exists
            if (userRepo.findUserAccountByUsername(adminUsername).isEmpty()) {
                String adminId = "admin001";

                // 1. Create EmployeeInfo first (Required by UserAccount relationship)
                if (!employeeRepo.existsById(adminId)) {
                    EmployeeInfo adminInfo = EmployeeInfo.builder()
                            .employeeId(adminId)
                            .name("System Administrator")
                            .role(Role.SYSTEM_ADMIN)
                            .email("admin@dummy.org")
                            .status(EmployeeStatus.ACTIVE)
                            .dateOfJoining(LocalDate.now())
                            .deleteFlag(false)
                            .build();
                    employeeRepo.save(adminInfo);
                    System.out.println("Created admin employee info.");
                }

                EmployeeInfo existingInfo = employeeRepo.findById(adminId).orElseThrow();

                // 2. Create UserAccount linked to EmployeeInfo
                UserAccount admin = UserAccount.builder()
                        .employeeId(adminId)
                        .username(adminUsername)
                        .passwordHash(encoder.encode("admin123"))
                        .role(Role.SYSTEM_ADMIN)
                        .employeeInfo(existingInfo)
                        .build();

                userRepo.save(admin);
                System.out.println("Initialized System Admin account: [User: admin / Pass: admin123]");
            }
        };
    }

    @Bean
    CommandLineRunner initPayrollConfigs(SystemConfigRepository configRepo) {
        return args -> {
            ObjectMapper mapper = new ObjectMapper();

            seedConfig(configRepo, mapper,
                    "SALARY_GRADE", "2026",
                    LocalDate.of(2026, 1, 1),
                    "VTI Salary Regulation v4.0",
                    "config/payroll/salary-grades.json");

            seedConfig(configRepo, mapper,
                    "ALLOWANCE", "2026",
                    LocalDate.of(2026, 1, 1),
                    null,
                    "config/payroll/allowance-config.json");

            seedConfig(configRepo, mapper,
                    "PIT", "2026",
                    LocalDate.of(2026, 1, 1),
                    "Law 109/2025/QH15 + Resolution 110/2025/UBTVQH15",
                    "config/payroll/pit-config.json");

            seedConfig(configRepo, mapper,
                    "INSURANCE", "2026",
                    LocalDate.of(2026, 1, 1),
                    "Law 41/2024/QH15 + Decree 188/2025/NĐ-CP",
                    "config/payroll/insurance-config.json");
        };
    }

    private void seedConfig(SystemConfigRepository repo, ObjectMapper mapper,
                            String configType, String version,
                            LocalDate effectiveDate, String legalBasis,
                            String classpathJson) {
        if (repo.existsByConfigTypeAndActiveTrue(configType)) {
            return;
        }
        try (InputStream is = new ClassPathResource(classpathJson).getInputStream()) {
            JsonNode data = mapper.readTree(is);
            SystemConfig config = SystemConfig.builder()
                    .id(UUID.randomUUID().toString())
                    .configType(configType)
                    .version(version)
                    .effectiveDate(effectiveDate)
                    .legalBasis(legalBasis)
                    .configData(data)
                    .active(true)
                    .build();
            repo.save(config);
            System.out.println("Seeded payroll config: " + configType + " v" + version);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to seed payroll config: " + configType, e);
        }
    }
}
