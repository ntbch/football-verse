FROM maven:3.9-eclipse-temurin-21@sha256:2b4496088e7b80ae10a8c9f74e574ea21380325a006ec684532ad6bad5bc7273 AS build
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
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
