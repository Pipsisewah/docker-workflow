# Use the official Nuclei image as the base image
FROM projectdiscovery/nuclei:latest

# Run Nuclei with the specified target URL and output file
ENTRYPOINT ["nuclei"]

CMD sh -c 'nuclei -u "$apexDomain" -rl 10 -o /data/attacklogs/nuclei.json -v'