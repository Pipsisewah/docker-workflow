# Use the official NGINX image as the base image
FROM node:20

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
#COPY package*.json ./

# Install app dependencies


# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the app files into the container
COPY app.js .

# Expose port 80 to allow external access to the NGINX server
EXPOSE 8081

# Start NGINX when the container starts "app.js"
CMD ls -l /usr/src/app && node app.js

# Use the official Node.js image from the Docker Hub


