# Use a base image
FROM node:20

WORKDIR /app

# Copy application files
COPY app.js /app/app.js

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose the application port
EXPOSE 8081

# Run the application
CMD ["node", "app.js"]

# Copy the script into the container


# Make sure the script is executable
#RUN chmod +x /usr/src/app/print_greeting.sh

# Use CMD to run the script with the environment variable as an argument
#CMD sh -c '/usr/src/app/print_greeting.sh'
