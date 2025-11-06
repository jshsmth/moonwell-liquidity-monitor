# Moonwell USDC Liquidity Tracker

Automated monitoring tool that tracks USDC liquidity on Moonwell (Base network) and sends Discord alerts when liquidity drops below configured thresholds.

## Features

- 🔍 **Monitors two liquidity pools:**
  - USD Coin Core (lending/borrowing market)
  - Moonwell Flagship USDC (Morpho vault)

- 🚨 **Smart Alerts:**
  - Only sends Discord notifications when liquidity drops below thresholds
  - Configurable threshold levels
  - Visual indicators (⚠️) for breached thresholds

- 📊 **Accurate Data:**
  - Uses official Moonwell SDK
  - Calculates weighted APY from market allocations
  - Real-time liquidity tracking

- ☁️ **Automated Deployment:**
  - Runs on GitHub Actions (free)
  - Checks every 10 minutes
  - Zero maintenance required

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/moonwell_usdc_tracker.git
cd moonwell_usdc_tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Discord webhook URL:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 4. Test Locally

```bash
npm start
```

## Configuration

### Alert Thresholds

Edit `moonwell-liquidity-tracker.js` to adjust thresholds:

```javascript
const USD_COIN_CORE_THRESHOLD = 4_500_000;  // $4.5M
const FLAGSHIP_USDC_THRESHOLD = 29_000_000;  // $29M
```

### Discord Webhook Setup

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Add it to your `.env` file

## GitHub Actions Deployment

### Setup GitHub Secret

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Your Discord webhook URL
6. Click "Add secret"

### Enable Workflow

The workflow will automatically:
- Run every 5 minutes
- Check liquidity levels
- Send alerts only when thresholds are breached

You can also manually trigger it:
1. Go to Actions tab
2. Select "Moonwell Liquidity Tracker"
3. Click "Run workflow"

## How It Works

1. **Data Collection:** Fetches liquidity data from Moonwell's official SDK
2. **Threshold Check:** Compares current liquidity against configured thresholds
3. **Smart Alerting:** Only sends Discord notifications when liquidity drops below thresholds
4. **Automated Scheduling:** GitHub Actions runs the check every 5 minutes

## Sample Discord Alert

When liquidity drops below thresholds, you'll receive a Discord embed like:

```
🚨 Moonwell Liquidity Alert

🏦 USD Coin Core
**Total Supply:** $39,708,425.00
**Total Borrow:** $34,963,216.65
**Available Liquidity:** $4,288,336.16
**APY:** 6.45%

🏛️ Moonwell Flagship USDC
**Total Supply:** $32,063,787.76
**Total Borrow:** $32,063,787.76
**Available Liquidity:** $32,063,787.76
**APY:** 6.76%

Moonwell Base Network
```

## Local Development

Run the tracker once to test:

```bash
npm start
```

## Data Sources

- **USD Coin Core:** https://moonwell.fi/markets/supply/base/usdc
- **Moonwell Flagship USDC:** https://moonwell.fi/vaults/deposit/base/mwusdc
- **Morpho Vault:** https://app.morpho.org/vault?address=0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca&network=base
