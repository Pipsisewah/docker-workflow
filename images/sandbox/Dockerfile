# Use a base image
FROM node:20

WORKDIR /app

# Copy application files
COPY print_greeting.sh /app/print_greeting.sh
COPY app.js /app/app.js

RUN chmod +x /app/print_greeting.sh

# Expose the application port
EXPOSE 3000

# Run the application
CMD ["sh", "-c", "./print_greeting.sh && node app.js"]
#CMD ["sh", "-c", "/usr/src/app/print_greeting.sh", "node", "app.js", "${GREETING_ARG}"]

# Copy the script into the container


# Make sure the script is executable
#RUN chmod +x /usr/src/app/print_greeting.sh

# Use CMD to run the script with the environment variable as an argument
#CMD sh -c '/usr/src/app/print_greeting.sh'
