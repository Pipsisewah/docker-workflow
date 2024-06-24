# Use the official Katana Docker image as the base image
FROM projectdiscovery/katana:latest

# Set the entrypoint to run Katana with the provided target URL
ENTRYPOINT ["katana", "-u", "http://172.22.0.23:3000", "-v", "-jc", "-j", "-o", "/data/scanlogs/katana.txt"]
