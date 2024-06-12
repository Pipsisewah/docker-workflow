# Use an official Golang runtime as a parent image
FROM golang:alpine

# Set the working directory inside the container
WORKDIR /go/src/github.com/OWASP/Amass

# Install dependencies
RUN apk update && apk add --no-cache git

# Clone the Amass repository
RUN git clone https://github.com/OWASP/Amass.git .

# Build the Amass binary
RUN go get -v ./...
RUN go install ./...

# Create a directory to store the results
RUN mkdir -p /amass/results

# Set the domain to scan as an environment variable
ENV TARGET_DOMAIN=slopesprogramming2.com

# Set the entrypoint to the Amass binary with the domain to scan
ENTRYPOINT ["/go/bin/amass", "enum", "-d", "slopesprogramming2.com", "-o", "/amass/results/amass_output.txt", "-tr", "172.24.0.2", "-v"]
#ENTRYPOINT ["/usr/local/bin/ping_webserver.sh"]
