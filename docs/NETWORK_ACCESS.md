# Network Access Setup Guide

This guide explains how to access the Xinema backend from another computer or network using your public IP address.

## Prerequisites

1. ✅ Backend is configured to listen on `0.0.0.0` (already done)
2. ⚠️ Router port forwarding (required)
3. ⚠️ Firewall configuration (required)
4. ⚠️ Frontend configuration (required)

---

## Step 1: Find Your Public IP Address

1. Visit https://whatismyipaddress.com/ or https://www.whatismyip.com/
2. Note your **IPv4 Address** (e.g., `123.45.67.89`)

**Important:** Your public IP may change if your ISP uses dynamic IP addresses. Consider using a dynamic DNS service for a stable address.

---

## Step 2: Configure Router Port Forwarding

You need to forward port **5000** from your router to your local machine.

### General Steps (varies by router):

1. **Access your router's admin panel:**
   - Usually at `192.168.1.1` or `192.168.0.1`
   - Check your router's manual for the exact address
   - Login with admin credentials

2. **Find Port Forwarding section:**
   - Look for "Port Forwarding", "Virtual Server", "NAT", or "Applications & Gaming"
   - Router interfaces vary, but the concept is the same

3. **Add a new port forwarding rule:**
   - **Service Name:** Xinema Backend (or any name)
   - **External Port:** `5000`
   - **Internal Port:** `5000`
   - **Protocol:** TCP (or Both)
   - **Internal IP:** Your computer's local IP (e.g., `192.168.1.100`)
     - Find this by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - **Status:** Enabled

4. **Save the configuration**

### Router-Specific Guides:
- **Netgear:** Advanced → Port Forwarding / Port Triggering
- **Linksys:** Application & Gaming → Single Port Forwarding
- **TP-Link:** Advanced → NAT Forwarding → Port Forwarding
- **ASUS:** WAN → Virtual Server / Port Forwarding

---

## Step 3: Configure Windows Firewall

Allow incoming connections on port 5000:

### Windows Firewall:

1. Open **Windows Defender Firewall**
2. Click **Advanced Settings**
3. Click **Inbound Rules** → **New Rule**
4. Select **Port** → **Next**
5. Select **TCP** and enter port **5000** → **Next**
6. Select **Allow the connection** → **Next**
7. Check all profiles (Domain, Private, Public) → **Next**
8. Name it "Xinema Backend" → **Finish**

### Alternative (Command Line - Run as Administrator):
```powershell
netsh advfirewall firewall add rule name="Xinema Backend" dir=in action=allow protocol=TCP localport=5000
```

---

## Step 4: Configure Frontend

The frontend needs to know where to find the backend when accessed from another network.

### Option A: Use Browser Console (Quick Test)

1. Open your frontend in a browser
2. Open Developer Console (F12)
3. Run this command:
```javascript
localStorage.setItem('backendUrl', 'http://YOUR_PUBLIC_IP:5000');
location.reload();
```

Replace `YOUR_PUBLIC_IP` with your actual public IP address.

### Option B: Environment Variable (Recommended)

1. Create a `.env` file in `Xinema/frontend/`:
```env
REACT_APP_BACKEND_URL=http://YOUR_PUBLIC_IP:5000
```

2. Restart your frontend development server

### Option C: Modify config/api.js (Permanent)

Edit `Xinema/frontend/src/config/api.js` and change the default URL.

---

## Step 5: Test the Connection

### From Another Computer:

1. Make sure the backend is running on your machine
2. Open a browser on the other computer
3. Navigate to: `http://YOUR_PUBLIC_IP:5000/api/test`
4. You should see: `{"message":"Backend is running"}`

### Troubleshooting:

- **Connection refused:** Check firewall and port forwarding
- **Timeout:** Router may be blocking the connection
- **404:** Backend is running but endpoint is wrong
- **CORS errors:** Backend CORS is configured, should work

---

## Security Considerations

⚠️ **WARNING:** Exposing your backend to the internet has security risks:

1. **Use HTTPS in production** (requires SSL certificate)
2. **Add authentication** to protect your backend
3. **Use a VPN** instead of public IP for better security
4. **Limit access** to specific IPs if possible
5. **Keep software updated** to patch vulnerabilities
6. **Use a reverse proxy** (nginx/Apache) for additional security

### Recommended: Use VPN Instead

For better security, consider:
- Setting up a VPN server on your network
- Using services like Tailscale, ZeroTier, or WireGuard
- This avoids exposing your backend directly to the internet

---

## Dynamic IP Address Solution

If your public IP changes frequently:

1. **Use Dynamic DNS (DDNS):**
   - Services: No-IP, DuckDNS, Dynu
   - Set up DDNS on your router
   - Use the DDNS hostname instead of IP

2. **Example:**
   ```javascript
   localStorage.setItem('backendUrl', 'http://yourname.duckdns.org:5000');
   ```

---

## Quick Reference

- **Backend URL (local):** `http://localhost:5000`
- **Backend URL (public):** `http://YOUR_PUBLIC_IP:5000`
- **Port to forward:** `5000`
- **Protocol:** TCP
- **Test endpoint:** `http://YOUR_PUBLIC_IP:5000/api/test`

---

## Need Help?

- Check router logs for connection attempts
- Use `netstat -an | findstr 5000` (Windows) to verify backend is listening
- Test with `telnet YOUR_PUBLIC_IP 5000` from another computer
- Check Windows Firewall logs for blocked connections

