#!/bin/sh

# Define the web server hostname
WEB_SERVER_HOSTNAME="slopesprogramming.com"

dig $WEB_SERVER_HOSTNAME
nslookup $WEB_SERVER_HOSTNAME

# Ping the web server
ping -c 4 $WEB_SERVER_HOSTNAME

# Check if the ping was successful
if [ $? -eq 0 ]; then
    echo "Ping to $WEB_SERVER_HOSTNAME successful"
else
    echo "Ping to $WEB_SERVER_HOSTNAME failed"
fi
