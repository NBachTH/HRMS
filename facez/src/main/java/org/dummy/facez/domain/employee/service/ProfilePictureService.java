package org.dummy.facez.domain.employee.service;

import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class ProfilePictureService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_BYTES = 5 * 1024 * 1024; // 5 MB

    private final EmployeeInfoRepository employeeInfoRepository;
    private final String uploadDir;

    public ProfilePictureService(EmployeeInfoRepository employeeInfoRepository,
                                  @Value("${app.upload.profile-pictures:uploads/profile-pictures}") String uploadDir) {
        this.employeeInfoRepository = employeeInfoRepository;
        this.uploadDir = uploadDir;
    }

    @Transactional
    public String uploadProfilePicture(String employeeId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File must not be empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("Only JPEG, PNG, and WebP images are allowed");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("File size must not exceed 5 MB");
        }

        EmployeeInfo emp = employeeInfoRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeInfo", "id", employeeId));

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            String ext = contentType.equals("image/png") ? ".png" :
                         contentType.equals("image/webp") ? ".webp" : ".jpg";
            String filename = employeeId + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path dest = dir.resolve(filename);
            file.transferTo(dest);

            String url = "/uploads/profile-pictures/" + filename;
            emp.setProfilePictureUrl(url);
            employeeInfoRepository.save(emp);
            return url;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store profile picture: " + e.getMessage());
        }
    }
}
