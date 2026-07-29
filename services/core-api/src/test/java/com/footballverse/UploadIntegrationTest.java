package com.footballverse;

import com.footballverse.security.JwtService;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserRole;
import com.footballverse.user.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.Set;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.crawl.startup-enabled=false",
    "app.mail.from=test@footballverse.local",
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

    @MockBean
    private JavaMailSender mailSender;

    private UserAccount testUser;
    private String token;
    private String adminToken;

    @BeforeEach
    void setUp() {
        testUser = users.save(new UserAccount(UUID.randomUUID() + "@user.local", "uploaderUser", "pass"));
        token = jwtService.createAccessToken(testUser);
        UserAccount admin = new UserAccount(UUID.randomUUID() + "@admin.local", "uploaderAdmin", "pass");
        admin.setRoles(Set.of(UserRole.ADMIN));
        adminToken = jwtService.createAccessToken(users.save(admin));
    }

    @Test
    void testUploadAndRetrieveImageSuccess() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "file",
                "test-image.png",
                MediaType.IMAGE_PNG_VALUE,
                png()
        );

        // 1. POST - Only an admin can upload public article media.
        String responseContent = mockMvc.perform(multipart("/uploads")
                        .file(imageFile)
                        .header("Authorization", "Bearer " + adminToken))
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
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsImageMimeWithNonImageBytes() throws Exception {
        MockMultipartFile fakeImage = new MockMultipartFile("file", "fake.png", MediaType.IMAGE_PNG_VALUE, "not an image".getBytes());
        mockMvc.perform(multipart("/uploads").file(fakeImage).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testUploadRequiresAdmin() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "file", "test-image.png", MediaType.IMAGE_PNG_VALUE, "fake image content".getBytes()
        );

        mockMvc.perform(multipart("/uploads")
                        .file(imageFile)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
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

    private byte[] png() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB), "png", output);
        return output.toByteArray();
    }
}
