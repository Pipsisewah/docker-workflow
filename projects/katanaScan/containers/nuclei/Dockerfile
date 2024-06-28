# Use the official Nuclei image as the base image
FROM projectdiscovery/nuclei:latest

# Set the working directory
WORKDIR /app

# Create a directory for templates
RUN mkdir -p /app/nuclei-templates

# Copy a script to update templates
COPY update-templates.sh /app/update-templates.sh

# Make the script executable
RUN chmod +x /app/update-templates.sh

# Run the template update script
RUN /app/update-templates.sh

# Set the entrypoint to Nuclei
ENTRYPOINT ["nuclei"]

# Default command
CMD ["-t", "cves/", "-target", "http://172.22.0.23:3000", "-j", "-o", "/data/scanlogs/nuclei.txt"]