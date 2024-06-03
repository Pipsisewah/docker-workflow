# Use the official NGINX image as the base image
FROM nginx:latest

# Copy custom configuration file from the host into the container
#COPY nginx.conf /etc/nginx/nginx.conf

# Copy static files (e.g., HTML, CSS, JavaScript) from the host into the container
#COPY ./html /usr/share/nginx/html

# Expose port 80 to allow external access to the NGINX server
EXPOSE 80

# Start NGINX when the container starts
CMD ["nginx", "-g", "daemon off;"]
