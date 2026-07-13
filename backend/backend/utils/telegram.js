const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendTelegramAlert(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('Telegram Bot Token or Chat ID not configured. Skipping alert.');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🛡️ [FragArena Server Alert]\n\n${message}`,
                parse_mode: 'HTML'
            })
        });
        console.log('Telegram Server Alert broadcasted successfully.');
    } catch (err) {
        console.error('Error sending Telegram alert:', err.message);
    }
}

module.exports = { sendTelegramAlert };
