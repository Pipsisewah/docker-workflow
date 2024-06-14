# Use the caffix/amass image as a base
FROM caffix/amass:latest

USER root

# Set the working directory
WORKDIR /app

# Copy the minimal configuration file into the container
COPY config.yaml /app/config.yaml

# Create output and logs directories
RUN mkdir -p /app/output /app/logs

# Use the configuration file when running Amass
ENTRYPOINT ["amass", "enum", "-config", "/app/config.yaml", "-log", "/data/scanlogs/amass.txt"]
