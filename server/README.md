# Toran DNS Server Setup Guide

## Quick Start (Local Testing)

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Copy your Firebase service account key:
   ```bash
   # Download from Firebase Console > Project Settings > Service Accounts
   cp /path/to/serviceAccountKey.json ../serviceAccountKey.json
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Test DoH endpoint:
   ```bash
   curl "http://localhost:3000/dns-query?name=google.com&type=A"
   ```

## Deploy to Google Cloud Run

1. Install Google Cloud CLI:
   ```bash
   # Windows
   winget install Google.CloudSDK

   # macOS
   brew install --cask google-cloud-sdk
   ```

2. Authenticate:
   ```bash
   gcloud auth login
   gcloud config set project torandns
   ```

3. Build and deploy:
   ```bash
   gcloud run deploy toran-dns \
     --source . \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --port 3000
   ```

4. Set environment variables:
   ```bash
   gcloud run services update toran-dns \
     --update-env-vars UPSTREAM_DNS=1.1.1.1,HOSTNAME=dns.toran.app
   ```

## Deploy to Fly.io

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. Launch:
   ```bash
   cd server
   fly launch
   fly deploy
   ```

3. Set secrets:
   ```bash
   fly secrets set UPSTREAM_DNS=1.1.1.1
   ```

## DNS Configuration

### Option A: Use Cloudflare (Recommended)

1. Add your domain to Cloudflare
2. Create a CNAME record pointing to your Cloud Run URL
3. Enable Cloudflare proxy for DDoS protection

### Option B: Use Custom Domain

1. Map a custom domain to Cloud Run:
   ```bash
   gcloud run services update toran-dns \
     --add-custom-domain=dns.toran.app
   ```

2. Update DNS records:
   ```
   dns.toran.app.  CNAME  your-service-url.a.run.app
   ```

## Testing

### Test DoH (DNS over HTTPS)
```bash
curl "https://dns.toran.app/dns-query?name=google.com&type=A"
```

### Test with user-specific endpoint
```bash
curl "https://dns.toran.app/YOUR_USER_ID/dns-query?name=ads.doubleclick.net&type=A"
```

### Test blocklist
```bash
# Should be blocked
curl "https://dns.toran.app/dns-query?name=doubleclick.net&type=A"

# Should be allowed
curl "https://dns.toran.app/dns-query?name=google.com&type=A"
```

## Device Configuration

### Windows
1. Open Settings > Network & Internet > Change adapter options
2. Right-click your connection > Properties
3. Select IPv4 > Properties
4. Set DNS to: `YOUR_SERVER_IP`

### Android
1. Settings > Network & Internet > Private DNS
2. Select "Private DNS provider hostname"
3. Enter: `dns.toran.app`

### iOS
1. Settings > Wi-Fi > tap (i) next to network
2. Tap "Configure DNS" > Manual
3. Add server: `YOUR_SERVER_IP`

## Architecture

```
Device → DNS Query → Toran DNS Server
                      ↓
              Check Blocklist/Allowlist
                      ↓
              ┌───────┴───────┐
              │               │
           Blocked         Allowed
              │               │
         Return NXDOMAIN   Forward to Upstream
                              (1.1.1.1 / 8.8.8.8)
                                  │
                              Return Response
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 53 | UDP DNS port |
| DOH_PORT | 3000 | DoH HTTP port |
| DOT_PORT | 853 | DoT TLS port |
| UPSTREAM_DNS | 1.1.1.1 | Primary upstream DNS |
| UPSTREAM_DNS_2 | 8.8.8.8 | Secondary upstream DNS |
| HOSTNAME | dns.toran.app | Server hostname |
| USE_TLS | false | Enable DoT |
