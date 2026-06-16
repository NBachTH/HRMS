package org.dummy.facez.common.storage;

import io.minio.*;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import org.dummy.facez.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/** Thin wrapper over MinIO for storing/serving uploaded documents (e.g. contract PDFs). */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public StorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @PostConstruct
    public void ensureBucket() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket '{}'", bucket);
            }
        } catch (Exception e) {
            log.warn("Could not verify/create MinIO bucket '{}': {}", bucket, e.getMessage());
        }
    }

    /** Uploads a file under {@code prefix/} and returns the stored object key. */
    public String upload(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file provided.");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = prefix + "/" + UUID.randomUUID() + "-" + safe;
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .build());
            return key;
        } catch (Exception e) {
            log.error("Upload to MinIO failed: {}", e.getMessage(), e);
            throw new BadRequestException("File upload failed: " + e.getMessage());
        }
    }

    /** Returns a short-lived presigned GET URL the browser can open directly. */
    public String presignedUrl(String key) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(key)
                    .expiry(30, TimeUnit.MINUTES)
                    .build());
        } catch (Exception e) {
            log.error("Presign MinIO URL failed: {}", e.getMessage(), e);
            throw new BadRequestException("Could not generate document URL: " + e.getMessage());
        }
    }

    public void delete(String key) {
        if (key == null) return;
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
        } catch (Exception e) {
            log.warn("Delete from MinIO failed for {}: {}", key, e.getMessage());
        }
    }
}
