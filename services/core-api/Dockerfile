FROM maven:3-eclipse-temurin-24@sha256:a137a467ec89b5713d0be817b55bdba6b4d6ef16e3d05565a79bc08d8e775a1c AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=football-verse-maven,target=/root/.m2 \
    for attempt in 1 2 3; do \
      mvn -q -Dmaven.wagon.http.retryHandler.count=3 -DskipTests package && exit 0; \
      sleep 5; \
    done; exit 1

FROM eclipse-temurin:21-jre@sha256:273396ed5998598ed1091e8d72711c2d36980a0e65103859c55a4e977a41ffd3
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN useradd --system --uid 1001 --create-home appuser \
    && mkdir -p /app/uploads \
    && chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
