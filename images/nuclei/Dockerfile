# Use the official Nuclei image as the base image
FROM projectdiscovery/nuclei:latest

# Run Nuclei with the specified target URL and output file
ENTRYPOINT ["nuclei"]

CMD ["-u", "slopesjuiceship.com" , "-rl", "10", "-o", "/data/attacklogs/nuceli.json", "-v"]
