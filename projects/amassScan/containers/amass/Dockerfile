# Use the caffix/amass image as a base
FROM caffix/amass:latest

USER root

# Set the environment variable
ENV TARGET_URL=${apexDomain}

# Use the configuration file when running Amass
ENTRYPOINT ["sh", "-c", "amass enum -timeout 5 -rqps 10 -nocolor -d ${apexDomain} -log /data/scanlogs/amass.log -o /data/scanlogs/amassresults.txt"]
#ENTRYPOINT ["sh", "-c", "amass enum -d ${apexDomain}", "-log", "/data/scanlogs/amass.log", "-o", "/data/scanlogs/amassresults.txt"]

