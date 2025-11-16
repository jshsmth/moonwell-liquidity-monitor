import "dotenv/config";

// ============================================================================
// Configuration
// ============================================================================

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const DISCORD_CONFIG = {
  WARNING_COLOR: 0xffa500,
  FOOTER_TEXT: "Moonwell Base Network - TEST RUN",
};

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
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
// Discord Message Formatting
// ============================================================================

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
    console.log(`[${new Date().toISOString()}] Starting ERROR alert test...`);
    console.log("🧪 This is a test run simulating API fetch failures\n");

    // Simulate errors from both data sources
    const errors = [
      {
        source: "USDC Market",
        error: "Network timeout after 3 retries",
      },
      {
        source: "mwUSDC Vault",
        error: "API rate limit exceeded",
      },
    ];

    console.log("📊 Simulated Errors:");
    errors.forEach((err) => {
      console.log(`  - ${err.source}: ${err.error}`);
    });
    console.log();

    console.log("🚨 Sending ERROR notification to Discord...");

    const embed = createErrorEmbed(errors);
    await sendDiscordAlert(embed);

    console.log("✅ ERROR alert sent to Discord successfully!");
    console.log(`[${new Date().toISOString()}] Test complete!\n`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

main();
