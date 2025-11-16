import { createMoonwellClient } from "@moonwell-fi/moonwell-sdk";
import "dotenv/config";

// ============================================================================
// Configuration
// ============================================================================

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const BASE_CHAIN_ID = 8453;

const THRESHOLDS = {
  USD_COIN_CORE: 4_500_000,
  FLAGSHIP_USDC: 29_000_000,
};

const DISCORD_CONFIG = {
  ALERT_COLOR: 0xff0000,
  WARNING_COLOR: 0xffa500,
  FOOTER_TEXT: "Moonwell Base Network",
};

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
};

const MARKET_SYMBOLS = {
  USDC_MARKET: "USDC",
  VAULT_TOKEN: "mwUSDC",
};

if (!DISCORD_WEBHOOK_URL) {
  console.error(
    "❌ ERROR: DISCORD_WEBHOOK_URL environment variable is not set"
  );
  console.error(
    "Please set it in your .env file or as an environment variable"
  );
  process.exit(1);
}

// ============================================================================
// Moonwell Client
// ============================================================================

const moonwellClient = createMoonwellClient({
  networks: {
    base: {
      rpcUrls: ["https://mainnet.base.org"],
    },
  },
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a number as USD currency string
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumber(value, decimals = 2) {
  if (!value) return "0";
  const num = parseFloat(value);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format APY percentage
 * @param {number} apy - APY as decimal (e.g., 0.065 for 6.5%)
 * @returns {string} Formatted APY string
 */
function formatApy(apy) {
  return `${apy.toFixed(2)}%`;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch USDC market data with retry logic
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object|null>}
 */
async function fetchMarketData(attempt = 1) {
  try {
    const markets = await moonwellClient.getMarkets({ chainId: BASE_CHAIN_ID });
    console.log(`Found ${markets.length} markets on Base`);

    const usdcMarket = markets.find(
      (m) => m.underlyingToken?.symbol === MARKET_SYMBOLS.USDC_MARKET
    );

    if (usdcMarket) {
      console.log("✓ Found USDC market");
      return usdcMarket;
    } else {
      console.log("✗ USDC market not found");
      return null;
    }
  } catch (error) {
    console.error(
      `Error fetching markets (attempt ${attempt}):`,
      error.message
    );

    if (attempt < RETRY_CONFIG.MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_CONFIG.RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_CONFIG.RETRY_DELAY_MS);
      return fetchMarketData(attempt + 1);
    }

    throw error;
  }
}

/**
 * Fetch vault data with retry logic
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object|null>}
 */
async function fetchVaultData(attempt = 1) {
  try {
    const vaults = await moonwellClient.getMorphoVaults({
      chainId: BASE_CHAIN_ID,
    });
    console.log(`Found ${vaults.length} vaults on Base`);

    const mwusdcVault = vaults.find(
      (v) => v.vaultToken?.symbol === MARKET_SYMBOLS.VAULT_TOKEN
    );

    if (mwusdcVault) {
      console.log("✓ Found mwUSDC vault");
      return mwusdcVault;
    } else {
      console.log("✗ mwUSDC vault not found");
      return null;
    }
  } catch (error) {
    console.error(`Error fetching vaults (attempt ${attempt}):`, error.message);

    if (attempt < RETRY_CONFIG.MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_CONFIG.RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_CONFIG.RETRY_DELAY_MS);
      return fetchVaultData(attempt + 1);
    }

    throw error;
  }
}

/**
 * Fetch USDC market and vault data from Moonwell
 * @returns {Promise<{usdcMarket: Object|null, mwusdcVault: Object|null, errors: Array}>}
 */
async function fetchMoonwellData() {
  console.log("Fetching Moonwell data...");

  let usdcMarket = null;
  let mwusdcVault = null;
  const errors = [];

  try {
    usdcMarket = await fetchMarketData();
  } catch (error) {
    errors.push({ source: "USDC Market", error: error.message });
  }

  try {
    mwusdcVault = await fetchVaultData();
  } catch (error) {
    errors.push({ source: "mwUSDC Vault", error: error.message });
  }

  return { usdcMarket, mwusdcVault, errors };
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/**
 * Calculate metrics for USD Coin Core market
 * @param {Object|null} usdcMarket - USDC market data
 * @returns {Object} Calculated metrics
 */
function calculateUsdcMetrics(usdcMarket) {
  if (!usdcMarket) {
    return {
      totalSupply: 0,
      totalBorrows: 0,
      availableLiquidity: 0,
      apy: 0,
    };
  }

  return {
    totalSupply: usdcMarket.totalSupplyUsd || 0,
    totalBorrows: usdcMarket.totalBorrowsUsd || 0,
    availableLiquidity: usdcMarket.cash?.value || 0,
    apy: usdcMarket.totalSupplyApr || usdcMarket.baseSupplyApy || 0,
  };
}

/**
 * Calculate metrics for Moonwell Flagship USDC vault
 * @param {Object|null} vault - Vault data
 * @returns {Object} Calculated metrics
 */
function calculateVaultMetrics(vault) {
  if (!vault) {
    return {
      totalSupply: 0,
      totalBorrows: 0,
      availableLiquidity: 0,
      apy: 0,
    };
  }

  const vaultLiquidity = vault.totalLiquidityUsd || 0;
  let totalSupplied = 0;
  let totalMarketLiquidity = 0;
  let vaultApy = 0;

  if (vault.markets && vault.markets.length > 0) {
    vault.markets.forEach((market) => {
      const allocation = market.allocation || 0;
      const marketApy = market.marketApy || 0;
      vaultApy += allocation * marketApy;

      totalSupplied += market.totalSuppliedUsd || 0;
      totalMarketLiquidity += market.marketLiquidityUsd || 0;
    });
  } else {
    vaultApy = vault.totalApy || vault.baseApy || 0;
  }

  const idleCash = vaultLiquidity - totalSupplied;
  const availableLiquidity = Math.min(
    vaultLiquidity,
    idleCash + totalMarketLiquidity
  );

  return {
    totalSupply: vaultLiquidity,
    totalBorrows: totalSupplied,
    availableLiquidity,
    apy: vaultApy,
  };
}

// ============================================================================
// Discord Message Formatting
// ============================================================================

/**
 * Create a Discord embed field for a liquidity pool
 * @param {string} name - Field name/title
 * @param {Object} metrics - Pool metrics
 * @param {boolean} hasData - Whether data is available
 * @returns {Object} Discord embed field
 */
function createDiscordField(name, metrics, hasData) {
  if (!hasData) {
    return {
      name,
      value: "⚠️ Data unavailable",
      inline: false,
    };
  }

  return {
    name,
    value: [
      `**Total Supply:** $${formatNumber(metrics.totalSupply)}`,
      `**Total Borrow:** $${formatNumber(metrics.totalBorrows)}`,
      `**Available Liquidity:** $${formatNumber(metrics.availableLiquidity)}`,
      `**APY:** ${formatApy(metrics.apy)}`,
    ].join("\n"),
    inline: false,
  };
}

/**
 * Create Discord embed for liquidity alert
 * @param {Object} usdcMetrics - USD Coin Core metrics
 * @param {Object} vaultMetrics - Flagship USDC metrics
 * @param {boolean} hasUsdcData - Whether USDC market data is available
 * @param {boolean} hasVaultData - Whether vault data is available
 * @returns {Object} Discord embed object
 */
function createAlertEmbed(
  usdcMetrics,
  vaultMetrics,
  hasUsdcData,
  hasVaultData
) {
  const fields = [
    createDiscordField("🏦 USD Coin Core", usdcMetrics, hasUsdcData),
    createDiscordField("🏛️ Moonwell Flagship USDC", vaultMetrics, hasVaultData),
  ];

  return {
    title: "🚨 Moonwell Liquidity Alert",
    color: DISCORD_CONFIG.ALERT_COLOR,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: DISCORD_CONFIG.FOOTER_TEXT,
    },
  };
}

/**
 * Create Discord embed for data fetch errors
 * @param {Array} errors - Array of error objects
 * @returns {Object} Discord embed object
 */
function createErrorEmbed(errors) {
  const errorFields = errors.map((err) => ({
    name: `⚠️ ${err.source}`,
    value: `Failed to fetch data: ${err.error}`,
    inline: false,
  }));

  return {
    title: "⚠️ Moonwell Data Fetch Warning",
    description: `Failed to retrieve data from Moonwell API after ${RETRY_CONFIG.MAX_RETRIES} attempts. This may be a temporary issue.`,
    color: DISCORD_CONFIG.WARNING_COLOR,
    fields: errorFields,
    timestamp: new Date().toISOString(),
    footer: {
      text: DISCORD_CONFIG.FOOTER_TEXT,
    },
  };
}

// ============================================================================
// Alert Logic
// ============================================================================

/**
 * Check if alert should be sent based on thresholds
 * @param {Object} usdcMetrics - USD Coin Core metrics
 * @param {Object} vaultMetrics - Flagship USDC metrics
 * @returns {{shouldAlert: boolean, usdcBelowThreshold: boolean, vaultBelowThreshold: boolean}}
 */
function checkAlertThresholds(usdcMetrics, vaultMetrics) {
  const usdcBelowThreshold =
    usdcMetrics.availableLiquidity < THRESHOLDS.USD_COIN_CORE;
  const vaultBelowThreshold =
    vaultMetrics.availableLiquidity < THRESHOLDS.FLAGSHIP_USDC;

  console.log(
    `USD Coin Core: $${formatNumber(usdcMetrics.availableLiquidity)} ` +
      `(threshold: $${formatNumber(THRESHOLDS.USD_COIN_CORE)}) ` +
      `${usdcBelowThreshold ? "⚠️ BELOW" : "✓"}`
  );
  console.log(
    `Flagship USDC: $${formatNumber(vaultMetrics.availableLiquidity)} ` +
      `(threshold: $${formatNumber(THRESHOLDS.FLAGSHIP_USDC)}) ` +
      `${vaultBelowThreshold ? "⚠️ BELOW" : "✓"}`
  );

  return {
    shouldAlert: usdcBelowThreshold || vaultBelowThreshold,
    usdcBelowThreshold,
    vaultBelowThreshold,
  };
}

/**
 * Send alert to Discord webhook
 * @param {Object} embed - Discord embed object
 * @returns {Promise<boolean>} Success status
 */
async function sendDiscordAlert(embed) {
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [embed],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}`
    );
  }

  return true;
}

/**
 * Process data and send alert if needed
 * @param {Object} data - Moonwell market and vault data
 * @returns {Promise<boolean>} Whether alert was sent
 */
async function processAndAlert(data) {
  const { usdcMarket, mwusdcVault, errors } = data;

  // If we have data fetch errors, send a warning alert
  if (errors.length > 0) {
    console.log("⚠️  WARNING: Data fetch errors detected");

    // Only send error alert if we couldn't fetch ANY data
    if (!usdcMarket && !mwusdcVault) {
      console.log("🚨 CRITICAL: No data available, sending error alert");
      const errorEmbed = createErrorEmbed(errors);
      await sendDiscordAlert(errorEmbed);
      console.log("✅ Error alert sent to Discord");
      return true;
    } else {
      console.log(
        "⚠️  Partial data available, continuing with liquidity check"
      );
    }
  }

  const usdcMetrics = calculateUsdcMetrics(usdcMarket);
  const vaultMetrics = calculateVaultMetrics(mwusdcVault);

  const { shouldAlert } = checkAlertThresholds(usdcMetrics, vaultMetrics);

  if (!shouldAlert) {
    console.log("ℹ️  No alerts needed - all liquidity levels are healthy");
    return false;
  }

  console.log("🚨 ALERT: Sending notification to Discord");

  const embed = createAlertEmbed(
    usdcMetrics,
    vaultMetrics,
    !!usdcMarket,
    !!mwusdcVault
  );

  await sendDiscordAlert(embed);

  console.log("✅ Alert sent to Discord successfully");
  return true;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    console.log(`[${new Date().toISOString()}] Starting liquidity check...`);

    const data = await fetchMoonwellData();
    await processAndAlert(data);

    console.log(`[${new Date().toISOString()}] Check complete!\n`);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
