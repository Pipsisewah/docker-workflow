# Use a base image
FROM node:14

# Create a simple Node.js application
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Copy application files
COPY app.js .

# Expose the application port
EXPOSE 3000

# Run the application
#CMD ["node", "app.js", "${GREETING_ARG}"]

# Copy the script into the container
COPY print_greeting.sh /usr/local/bin/

# Make sure the script is executable
RUN chmod +x /usr/local/bin/print_greeting.sh

# Use CMD to run the script with the environment variable as an argument
CMD sh -c '/usr/local/bin/print_greeting.sh "$apexDomain" && node /usr/src/app/app.js'
