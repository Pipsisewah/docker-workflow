# Use a lightweight base image
FROM alpine:latest

# Install dnsmasq
RUN apk update && apk add --no-cache dnsmasq

# Create the TFTP directory
RUN mkdir -p /var/lib/tftpboot

# Copy the dnsmasq configuration file
COPY dnsmasq.conf /etc/dnsmasq.conf

# Expose DNS port
EXPOSE 53/tcp
EXPOSE 53/udp

# Run dnsmasq
CMD ["dnsmasq", "--no-daemon"]
