import "dotenv/config";

// ============================================================================
// Configuration
// ============================================================================

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const DISCORD_CONFIG = {
  ALERT_COLOR: 0xff0000,
  FOOTER_TEXT: "Moonwell Base Network - TEST RUN",
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
// Test Data
// ============================================================================

/**
 * Generate mock metrics that simulate low liquidity scenario
 */
function generateTestMetrics() {
  // Simulate USD Coin Core with liquidity BELOW threshold (4.5M)
  const usdcMetrics = {
    totalSupply: 10_000_000,
    totalBorrows: 7_000_000,
    availableLiquidity: 3_000_000, // Below 4.5M threshold
    apy: 6.5,
  };

  // Simulate Flagship USDC with liquidity BELOW threshold (29M)
  const vaultMetrics = {
    totalSupply: 50_000_000,
    totalBorrows: 28_000_000,
    availableLiquidity: 22_000_000, // Below 29M threshold
    apy: 8.2,
  };

  return { usdcMetrics, vaultMetrics };
}

// ============================================================================
// Discord Message Formatting
// ============================================================================

/**
 * Create a Discord embed field for a liquidity pool
 * @param {string} name - Field name/title
 * @param {Object} metrics - Pool metrics
 * @returns {Object} Discord embed field
 */
function createDiscordField(name, metrics) {
  return {
    name,
    value: [
      `**Total Supply:** ${formatNumber(metrics.totalSupply)}`,
      `**Total Borrow:** ${formatNumber(metrics.totalBorrows)}`,
      `**Available Liquidity:** ${formatNumber(metrics.availableLiquidity)}`,
      `**APY:** ${formatApy(metrics.apy)}`,
    ].join("\n"),
    inline: false,
  };
}

/**
 * Create Discord embed for test alert
 * @param {Object} usdcMetrics - USD Coin Core metrics
 * @param {Object} vaultMetrics - Flagship USDC metrics
 * @returns {Object} Discord embed object
 */
function createTestAlertEmbed(usdcMetrics, vaultMetrics) {
  const fields = [
    {
      name: "⚠️ TEST ALERT",
      value:
        "This is a test run to verify Discord webhook functionality when liquidity falls below thresholds.",
      inline: false,
    },
    createDiscordField("🏦 USD Coin Core (Simulated)", usdcMetrics),
    createDiscordField("🏛️ Moonwell Flagship USDC (Simulated)", vaultMetrics),
  ];

  return {
    title: "🧪 TEST: Moonwell Liquidity Alert",
    description: "**This is a test message with simulated low liquidity data**",
    color: DISCORD_CONFIG.ALERT_COLOR,
    fields,
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

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    console.log(`[${new Date().toISOString()}] Starting TEST alert...`);
    console.log("🧪 This is a test run with simulated data\n");

    const { usdcMetrics, vaultMetrics } = generateTestMetrics();

    console.log("📊 Simulated Metrics:");
    console.log(
      `USD Coin Core: ${formatNumber(
        usdcMetrics.availableLiquidity
      )} (threshold: 4,500,000) ⚠️ BELOW`
    );
    console.log(
      `Flagship USDC: ${formatNumber(
        vaultMetrics.availableLiquidity
      )} (threshold: 29,000,000) ⚠️ BELOW\n`
    );

    console.log("🚨 Sending TEST notification to Discord...");

    const embed = createTestAlertEmbed(usdcMetrics, vaultMetrics);
    await sendDiscordAlert(embed);

    console.log("✅ TEST alert sent to Discord successfully!");
    console.log(`[${new Date().toISOString()}] Test complete!\n`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

main();
