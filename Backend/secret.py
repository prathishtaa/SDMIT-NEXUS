import secrets

# Generate a 256-bit (32-byte) secret key
secret_key = secrets.token_hex(32)
print("Your JWT Secret Key:", secret_key)