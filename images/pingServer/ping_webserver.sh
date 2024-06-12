#!/bin/sh

# Define the web server hostname
WEB_SERVER_HOSTNAME="slopesprogramming2.com"

nslookup slopesprogramming2.com 127.0.0.1
nslookup sub.slopesprogramming2.com 127.0.0.1
nslookup www.slopesprogramming2.com 127.0.0.1

dig slopesprogramming2.com AAAA
dig sub.slopesprogramming2.com AAAA
dig www.slopesprogramming2.com AAAA

# Ping the web server
ping -c 4 $WEB_SERVER_HOSTNAME

# Check if the ping was successful
if [ $? -eq 0 ]; then
    echo "Ping to $WEB_SERVER_HOSTNAME successful"
else
    echo "Ping to $WEB_SERVER_HOSTNAME failed"
fi
