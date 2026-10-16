FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY apps/api/pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline
COPY apps/api/src src
RUN mvn -B -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /workspace/target/lrd-api-0.1.0-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","/app/app.jar"]
