FROM maven:3-eclipse-temurin-26@sha256:d5617b9a6307e1b51dc7c55edf09bacb66f1c91fb861949c34a3a0d4e16bd241 AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=football-verse-maven,target=/root/.m2 \
    for attempt in 1 2 3; do \
      mvn -q -Dmaven.wagon.http.retryHandler.count=3 package && exit 0; \
      sleep 5; \
    done; exit 1

FROM eclipse-temurin:21-jre@sha256:273396ed5998598ed1091e8d72711c2d36980a0e65103859c55a4e977a41ffd3
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
