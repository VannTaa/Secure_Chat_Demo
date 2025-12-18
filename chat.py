from flask import Flask, request, jsonify, render_template
from pathlib import Path
import json, base64

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

app = Flask(__name__, template_folder="templates", static_folder="static")

# -------------------- PATH SETUP --------------------
BASE = Path(__file__).resolve().parent
USER_DIR = BASE / "users"
USER_DIR.mkdir(exist_ok=True)

HISTORY_FILE = BASE / "messages.json"
if not HISTORY_FILE.exists():
    HISTORY_FILE.write_text("[]")

# -------------------- KEY MANAGEMENT --------------------
def get_or_create_keys(username):
    priv = USER_DIR / f"{username}_private.pem"
    pub = USER_DIR / f"{username}_public.pem"

    if not priv.exists():
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        public_key = private_key.public_key()

        priv.write_bytes(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
        )

        pub.write_bytes(
            public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
        )

    return priv, pub


def load_private_key(username):
    return serialization.load_pem_private_key(
        (USER_DIR / f"{username}_private.pem").read_bytes(),
        password=None
    )

# -------------------- ROUTES --------------------
@app.route("/")
def index():
    return render_template("index.html")


# Fetch public key
@app.route("/api/public_key/<username>")
def public_key(username):
    _, pub = get_or_create_keys(username)
    return pub.read_text()


# Receive encrypted message
@app.route("/api/send_message", methods=["POST"])
def receive_message():
    data = request.json

    sender = data["sender"]
    receiver = data["receiver"]
    enc_key_b64 = data["enc_key"]
    nonce_b64 = data["nonce"]
    ciphertext_b64 = data["ciphertext"]

    get_or_create_keys(receiver)

    # Store message with all needed fields
    history = json.loads(HISTORY_FILE.read_text())
    history.append({
        "sender": sender,
        "receiver": receiver,
        "enc_key": enc_key_b64,
        "nonce": nonce_b64,
        "ciphertext": ciphertext_b64
    })
    HISTORY_FILE.write_text(json.dumps(history, indent=2))

    return jsonify({"status": "ok"})


# Receiver fetches message history (server decrypts here)
@app.route("/api/history/<username>")
def history(username):
    priv = load_private_key(username)
    all_msgs = json.loads(HISTORY_FILE.read_text())

    results = []

    for m in all_msgs:
        if m["receiver"] != username:
            continue

        enc_key = base64.b64decode(m["enc_key"])
        nonce = base64.b64decode(m["nonce"])
        encrypted = base64.b64decode(m["ciphertext"])

        ciphertext = encrypted[:-16]
        tag = encrypted[-16:]

        # RSA decrypt AES key
        aes_key = priv.decrypt(
            enc_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        # AES decrypt message
        decryptor = Cipher(
            algorithms.AES(aes_key),
            modes.GCM(nonce, tag)
        ).decryptor()

        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        plaintext = plaintext.decode()

        results.append({
            "sender": m["sender"],
            "receiver": m["receiver"],
            "plaintext": plaintext
        })

    return jsonify(results)


if __name__ == "__main__":
    context = (
        "certs/server.crt",
        "certs/server.key"
    )
    app.run(host="127.0.0.1", port=7000, ssl_context=context, debug=False)
