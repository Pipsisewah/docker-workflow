# Use the official PostgreSQL image as a base
FROM postgres:latest

# Set environment variables for PostgreSQL
ENV POSTGRES_USER=amass_user
ENV POSTGRES_PASSWORD=amass_password
ENV POSTGRES_DB=amass

# Expose the PostgreSQL port
EXPOSE 5432

# Optional: Copy any initialization scripts or configuration files if needed
COPY init.sql /docker-entrypoint-initdb.d/
# COPY custom-config.conf /etc/postgresql/postgresql.conf

# Run the PostgreSQL server
CMD ["postgres"]
