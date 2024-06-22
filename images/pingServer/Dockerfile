# Use a lightweight base image
FROM alpine:latest

RUN apk update && apk add --no-cache bash iputils bind-tools

# Install necessary packages
RUN apk update && apk add --no-cache bash iputils && apk add --no-cache nmap nmap-scripts

# Set the working directory
WORKDIR /usr/src/app

# Copy the ping script into the container
COPY ping_webserver.sh /usr/src/app/ping_webserver.sh

# Make the script executable
RUN chmod +x /usr/src/app/ping_webserver.sh

# Set the entrypoint to run the ping script
ENTRYPOINT ["/usr/src/app/ping_webserver.sh"]