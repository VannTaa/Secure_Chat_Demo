// Enhanced encryption and sending function
async function encryptAndSend() {
    const sender = document.getElementById("sender").value.trim();
    const receiver = document.getElementById("receiver").value.trim();
    const plaintext = document.getElementById("message").value.trim();
    const sendBtn = document.querySelector('.primary-btn');

    if (!sender || !receiver || !plaintext) {
        showToast("Please fill all fields before sending!", "error");
        return;
    }

    try {
        // Show loading state
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Encrypting...';
        sendBtn.disabled = true;

        // Fetch receiver public key
        const pubPem = await fetch(`/api/public_key/${receiver}`).then(r => {
            if (!r.ok) throw new Error(`User "${receiver}" not found`);
            return r.text();
        });
        
        const pubKey = await importPublicKey(pubPem);

        // Generate AES key
        const aesKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt"]
        );

        const rawKey = await crypto.subtle.exportKey("raw", aesKey);

        // RSA encrypt AES key
        const encKey = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            pubKey,
            rawKey
        );

        // AES encrypt message
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: nonce },
            aesKey,
            new TextEncoder().encode(plaintext)
        );

        const ciphertextWithTag = new Uint8Array(encrypted);

        const payload = {
            sender,
            receiver,
            enc_key: b64(encKey),
            nonce: b64(nonce),
            ciphertext: b64(ciphertextWithTag)
        };

        // Send to server
        const response = await fetch("/api/send_message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to send message to server');
        }

        showToast(`✓ Message encrypted and sent to ${receiver}`, "success");
        
        // Clear message field only
        document.getElementById("message").value = "";
        
        // Update status indicator
        const statusIndicator = document.querySelector('.send-panel .status-indicator');
        statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>Message sent successfully ✓</span>';
        statusIndicator.className = 'status-indicator status-online';
        
        // Revert after 3 seconds
        setTimeout(() => {
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>Ready to encrypt and send</span>';
        }, 3000);

    } catch (error) {
        console.error('Encryption error:', error);
        showToast(`Error: ${error.message}`, "error");
        
        // Update status indicator
        const statusIndicator = document.querySelector('.send-panel .status-indicator');
        statusIndicator.innerHTML = `<i class="fas fa-circle"></i><span>Error: ${error.message}</span>`;
        statusIndicator.className = 'status-indicator status-offline';
    } finally {
        // Restore button state
        if (sendBtn) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Encrypt & Send</span>';
            sendBtn.disabled = false;
        }
    }
}

// Enhanced message loading function
async function loadHistory() {
    const username = document.getElementById("recvUsername").value.trim();
    const box = document.getElementById("historyBox");
    const loadBtn = document.querySelector('.receive-panel .primary-btn');
    
    if (!username) {
        showToast("Please enter your username first", "error");
        return;
    }

    try {
        // Show loading state
        showLoadingState(box, "Decrypting messages...");
        
        if (loadBtn) {
            const originalText = loadBtn.innerHTML;
            loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Decrypting...';
            loadBtn.disabled = true;
        }

        const response = await fetch(`/api/history/${username}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load messages for "${username}"`);
        }

        const data = await response.json();

        box.innerHTML = "";
        
        if (data.length === 0) {
            box.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3>No Messages Found</h3>
                    <p>No encrypted messages found for user "${username}"</p>
                </div>
            `;
            
            // Update status indicator
            const statusIndicator = document.querySelector('.receive-panel .status-indicator');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>No messages found</span>';
            statusIndicator.className = 'status-indicator status-offline';
            
            return;
        }

        // Display messages
        data.forEach((msg, index) => {
            const msgElement = document.createElement('div');
            msgElement.className = 'message-card';
            msgElement.style.animationDelay = `${index * 0.1}s`;
            
            const timestamp = new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            msgElement.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${msg.sender}</span>
                    <span class="message-arrow">→</span>
                    <span class="message-receiver">${msg.receiver}</span>
                </div>
                <div class="message-content">
                    ${msg.plaintext}
                </div>
                <div class="message-timestamp">
                    <i class="far fa-clock"></i>
                    <span>Decrypted at ${timestamp}</span>
                </div>
            `;
            box.appendChild(msgElement);
        });

        // Update status indicator
        const statusIndicator = document.querySelector('.receive-panel .status-indicator');
        statusIndicator.innerHTML = `<i class="fas fa-circle"></i><span>${data.length} messages decrypted successfully ✓</span>`;
        statusIndicator.className = 'status-indicator status-online';
        
        showToast(`✓ ${data.length} messages decrypted for ${username}`, "success");

    } catch (error) {
        console.error('Decryption error:', error);
        showToast(`Error: ${error.message}`, "error");
        
        box.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Decryption Failed</h3>
                <p>${error.message}</p>
            </div>
        `;
        
        // Update status indicator
        const statusIndicator = document.querySelector('.receive-panel .status-indicator');
        statusIndicator.innerHTML = `<i class="fas fa-circle"></i><span>Error: ${error.message}</span>`;
        statusIndicator.className = 'status-indicator status-offline';
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = '<i class="fas fa-key"></i><span>Decrypt Messages</span>';
            loadBtn.disabled = false;
        }
    }
}

// Helper function for loading state
function showLoadingState(element, message) {
    element.innerHTML = `
        <div class="loading">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h3>${message}</h3>
            <p>Please wait while we decrypt your messages...</p>
        </div>
    `;
}

// ----- Original Helper Functions (Keep these unchanged) -----
function b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function pemToArrayBuffer(pem) {
    const clean = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "").trim();
    const bin = atob(clean);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

async function importPublicKey(pem) {
    return crypto.subtle.importKey(
        "spki",
        pemToArrayBuffer(pem),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

// Add event listeners for better UX
document.addEventListener('DOMContentLoaded', function() {
    // Add real-time validation
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '#5eead4';
            } else {
                this.style.borderColor = '';
            }
        });
    });
    
    // Enter key support
    document.getElementById('message').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            encryptAndSend();
        }
    });
    
    document.getElementById('recvUsername').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            loadHistory();
        }
    });
});