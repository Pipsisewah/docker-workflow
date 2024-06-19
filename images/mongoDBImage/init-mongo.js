db.createUser({
    user: 'admin',
    pwd: 'password',
    roles: [
        {
            role: 'readWrite',
            db: 'mydatabase'
        }
    ]
});

db.createCollection('slopesCollection');