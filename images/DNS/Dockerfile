# Use a lightweight base image
FROM alpine:latest

# Install dnsmasq
RUN apk update && apk add dnsmasq

# Create the TFTP directory
RUN mkdir -p /var/lib/tftpboot

# Copy the dnsmasq configuration file
COPY dnsmasq.conf /etc/dnsmasq.conf

# Expose DNS port
EXPOSE 53/udp

# Run dnsmasq
CMD ["dnsmasq", "-k"]
