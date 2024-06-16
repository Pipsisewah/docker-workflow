# Use the official Nuclei image as the base image
FROM projectdiscovery/nuclei:latest

COPY targets.txt /app/targets.txt

# Run Nuclei with the specified target URL and output file
ENTRYPOINT ["nuclei"]
CMD ["-l", "/app/targets.txt", "-rl", "10", "-o", "/data/attacklogs/nuceli.json", "-v"]
