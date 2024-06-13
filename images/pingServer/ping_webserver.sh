#!/bin/sh

# Define the web server hostname
WEB_SERVER_HOSTNAME="slopesjuiceshop.com"

nslookup slopesjuiceshop.com
nslookup sub.slopesjuiceshop.com
nslookup www.slopesjuiceshop.com

dig slopesjuiceshop.com AAAA
dig sub.slopesjuiceshop.com AAAA
dig www.slopesjuiceshop.com AAAA

nmap -p-  -oG - slopesjuiceshop.com | grep '/open/'

# Ping the web server
ping -c 4 $WEB_SERVER_HOSTNAME

# Check if the ping was successful
if [ $? -eq 0 ]; then
    echo "Ping to $WEB_SERVER_HOSTNAME successful"
else
    echo "Ping to $WEB_SERVER_HOSTNAME failed"
fi
