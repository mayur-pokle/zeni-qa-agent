async function sendSlackAlert(message) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    return { skipped: true };
  }

  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      text: message
    })
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed with HTTP ${response.status}`);
  }

  return { skipped: false };
}

module.exports = {
  sendSlackAlert
};
