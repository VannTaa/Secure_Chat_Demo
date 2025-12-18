# SecureChat – Secure Messaging Application

## Overview
SecureChat is a secure web-based messaging system that demonstrates how cryptography
can protect user messages from Man-in-the-Middle (MITM) attacks. Messages are encrypted
before transmission and remain unreadable to attackers.

---

## Features
- AES-256-GCM message encryption  
- RSA-2048 key exchange  
- HTTPS using Self-Signed Certificate Authority  
- Client-side encryption with Web Crypto API  
- Flask backend server  

---

## System Architecture
SecureChat consists of three main components:

1. Client (Web Browser)  
2. Server (Flask Backend)  
3. Self-Signed Certificate Authority (CA)  

Messages are encrypted on the client side and transmitted securely over HTTPS.

---

## Technologies Used
- Frontend: HTML, CSS, JavaScript  
- Backend: Python (Flask)  
- Cryptography:
  - Web Crypto API
  - Python Cryptography Library  
- TLS / HTTPS: OpenSSL  

---

## Requirements
- Python 3.9 or higher  
- OpenSSL  
- Modern web browser  

---

## Installation
```bash
git clone https://github.com/VannTaa/Secure_Chat_Demo
cd SecureChat
pip install -r requirements.txt
```

## Running the Application
```bash 
python chat.py
```
- Open your browser and visit: 
```bash
https://localhost:7000
```
- Browser warning is expected due to self-signed certificate.

## Security Notes
- Private keys are not uploaded to GitHub
- Self-signed certificates are for educational use only

## Demonstration
- Network traffic can be inspected using Burp Suite
- Intercepted data appears as ciphertext
- Plaintext is visible only to the intended receiver

## Future Work
- Full end-to-end encryption
- Digital signatures
- User authentication
- Secure key storage

## Author

Chor Vanta (TaaVann)
Cybersecurity Student