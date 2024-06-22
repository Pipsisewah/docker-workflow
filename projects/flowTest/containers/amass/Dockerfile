# Use the caffix/amass image as a base
FROM caffix/amass:latest

# Set the environment variable
ENV TARGET_URL=${apexDomain}

# Use the configuration file when running Amass
ENTRYPOINT ["sh", "-c", "amass enum -d ${apexDomain}"]

