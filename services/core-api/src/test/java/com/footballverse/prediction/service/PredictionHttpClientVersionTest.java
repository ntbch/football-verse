package com.footballverse.prediction.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.net.http.HttpClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards against h2c upgrade noise: the JDK HttpClient default (HTTP/2)
 * sends "Upgrade: h2c" on every new cleartext connection, and the Python
 * prediction service (uvicorn) rejects each one with a WARNING. Both core
 * prediction clients must pin HTTP/1.1.
 */
class PredictionHttpClientVersionTest {

    @Test
    void predictionClientsPinHttp1_1() throws Exception {
        assertPinned(new FixtureService(null, null));
        assertPinned(new PredictionServiceClient(null));
    }

    private void assertPinned(Object service) throws Exception {
        Field field = findField(service.getClass(), HttpClient.class);
        field.setAccessible(true);
        HttpClient client = (HttpClient) field.get(service);
        assertThat(client.version()).isEqualTo(HttpClient.Version.HTTP_1_1);
    }

    private Field findField(Class<?> type, Class<?> fieldType) {
        for (Class<?> c = type; c != null; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (f.getType() == fieldType) return f;
            }
        }
        throw new IllegalStateException("No " + fieldType.getSimpleName() + " field on " + type);
    }
}
