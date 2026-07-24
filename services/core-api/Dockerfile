FROM maven:3.9-eclipse-temurin-21@sha256:2b4496088e7b80ae10a8c9f74e574ea21380325a006ec684532ad6bad5bc7273 AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=football-verse-maven,target=/root/.m2 \
    for attempt in 1 2 3; do \
      mvn -q -Dmaven.wagon.http.retryHandler.count=3 -DskipTests package && exit 0; \
      sleep 5; \
    done; exit 1

FROM eclipse-temurin:25-jre@sha256:681c543d6f36c50f45e9b5226930a46203dcfa351d3670e9d0bdf0dabae53539
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
