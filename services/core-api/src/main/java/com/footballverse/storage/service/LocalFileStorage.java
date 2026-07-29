package com.footballverse.storage.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class LocalFileStorage {

    private final Path rootLocation;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    public LocalFileStorage(@Value("${app.upload.dir}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
            log.info("Initialized upload directory at: {}", rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location at " + rootLocation, e);
        }
    }

    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Failed to store empty file");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Invalid file name");
        }

        // Extension and MIME are hints only; bytes decide whether this is an image.
        String extension = getFileExtension(originalFilename).toLowerCase();
        String contentType = file.getContentType();
        if (!ALLOWED_EXTENSIONS.contains(extension) || contentType == null || !contentType.startsWith("image/") || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Unsupported file type. Only images are allowed (jpg, jpeg, png, gif, webp).");
        }

        // Generate secure random filename
        String safeFilename = UUID.randomUUID().toString() + "." + extension;

        try {
            byte[] bytes = file.getBytes();
            validateImage(bytes, extension);
            Path destinationFile = this.rootLocation.resolve(Paths.get(safeFilename)).normalize().toAbsolutePath();
            
            // Prevent Path Traversal
            if (!destinationFile.getParent().equals(this.rootLocation)) {
                throw new SecurityException("Cannot store file outside current directory.");
            }

            Files.write(destinationFile, bytes);
            log.info("Saved file {} successfully", safeFilename);
            return safeFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + originalFilename, e);
        }
    }

    public Resource loadAsResource(String filename) {
        try {
            Path file = rootLocation.resolve(filename).normalize().toAbsolutePath();
            
            // Prevent Path Traversal
            if (!file.startsWith(rootLocation)) {
                throw new SecurityException("Cannot access file outside upload directory.");
            }

            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
    }

    private String getFileExtension(String filename) {
        int lastIndex = filename.lastIndexOf('.');
        if (lastIndex == -1 || lastIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastIndex + 1);
    }

    private void validateImage(byte[] bytes, String extension) {
        boolean png = bytes.length >= 8 && bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47;
        boolean jpeg = bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8 && bytes[2] == (byte) 0xff;
        boolean gif = bytes.length >= 6 && new String(bytes, 0, 6, java.nio.charset.StandardCharsets.US_ASCII).matches("GIF8[79]a");
        boolean webp = bytes.length >= 12 && new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
        boolean extensionMatches = switch (extension) {
            case "png" -> png;
            case "jpg", "jpeg" -> jpeg;
            case "gif" -> gif;
            case "webp" -> webp;
            default -> false;
        };
        if (!extensionMatches) throw new IllegalArgumentException("Uploaded bytes do not match the file extension");
        if (!"webp".equals(extension)) {
            BufferedImage image;
            try {
                image = ImageIO.read(new ByteArrayInputStream(bytes));
            } catch (IOException exception) {
                throw new IllegalArgumentException("Invalid image bytes");
            }
            if (image == null || image.getWidth() < 1 || image.getHeight() < 1 || image.getWidth() > 8000 || image.getHeight() > 8000) {
                throw new IllegalArgumentException("Invalid image dimensions");
            }
        }
    }
}
