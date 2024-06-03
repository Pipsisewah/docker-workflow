# Use the official MongoDB image as the base image
FROM mongo:latest

# Optionally, you can specify a custom MongoDB configuration file
# COPY mongodb.conf /etc/mongo/mongodb.conf
# CMD ["mongod", "--config", "/etc/mongo/mongodb.conf"]

# Expose the default MongoDB port (27017)
EXPOSE 27017

# Start MongoDB when the container starts
CMD ["mongod"]
