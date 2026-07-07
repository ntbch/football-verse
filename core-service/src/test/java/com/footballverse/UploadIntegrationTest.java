package com.footballverse;

import com.footballverse.security.JwtService;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.crawl.startup-enabled=false",
    "app.upload.dir=target/test-uploads"
})
@Transactional
public class UploadIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private JwtService jwtService;

    private UserAccount testUser;
    private String token;

    @BeforeEach
    void setUp() {
        testUser = users.save(new UserAccount(UUID.randomUUID() + "@user.local", "uploaderUser", "pass"));
        token = jwtService.createAccessToken(testUser);
    }

    @Test
    void testUploadAndRetrieveImageSuccess() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "file",
                "test-image.png",
                MediaType.IMAGE_PNG_VALUE,
                "fake image content".getBytes()
        );

        // 1. POST - Upload image with JWT token
        String responseContent = mockMvc.perform(multipart("/uploads")
                        .file(imageFile)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.url").exists())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Extract filename from URL (format: /uploads/{filename})
        String fileUrl = com.jayway.jsonpath.JsonPath.read(responseContent, "$.data.url");
        String filename = fileUrl.replace("/uploads/", "");

        // 2. GET - Retrieve image publicly
        mockMvc.perform(get("/uploads/" + filename))
                .andExpect(status().isOk());

        // Clean up test file
        Path path = Paths.get("target/test-uploads", filename);
        Files.deleteIfExists(path);
    }

    @Test
    void testUploadInvalidExtension() throws Exception {
        MockMultipartFile exeFile = new MockMultipartFile(
                "file",
                "malicious.exe",
                "application/octet-stream",
                "fake binary".getBytes()
        );

        // POST - Should reject with 400 Bad Request
        mockMvc.perform(multipart("/uploads")
                        .file(exeFile)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testUploadUnauthenticated() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "file",
                "test-image.png",
                MediaType.IMAGE_PNG_VALUE,
                "fake image content".getBytes()
        );

        // POST - Should fail with 403 Forbidden because of missing token
        mockMvc.perform(multipart("/uploads")
                        .file(imageFile))
                .andExpect(status().isForbidden());
    }
}
