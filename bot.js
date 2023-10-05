const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const querystring = require('querystring');

const token = 'API BOT TELE';
const bot = new TelegramBot(token, { polling: true });

const customHeaders = {
    'Sec-Ch-Ua-Mobile': '?0',
    'X-Sz-Sdk-Version': '3.1.0-2&1.5.1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.63 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Api-Source': 'pc',
    'Accept': 'application/json',
    'X-Shopee-Language': 'id',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Csrftoken': 'OIQrdP3ae2lduDeevb60tCm4cOKg7iXt',
    'Af-Ac-Enc-Sz-Token': 'OazXiPqlUgm158nr1h09yA==|0/eMoV7m/rlUHbgxsRgRC/n0vyOe6XzhDMa2PcnZPv3ecioRaJQg2W7ur5GfhoDDEeuMz2az7GGj/8Y=|Pu2hbrwoH+45rDNC|08|3',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
};

const userSessions = new Map();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/start')) {
    bot.sendMessage(chatId, 'Hello! I am your Telegram bot.');
  } else if (text.startsWith('/help')) {
    bot.sendMessage(chatId, 'You can use /start and /help commands.');
  }else if (text.startsWith('/donate')) {
    bot.sendMessage(chatId, 'DANA/GOPAY = 082183190627, Makasi bang');
  } else if (text.startsWith('/scan')) {
    try {
      if (userSessions.has(chatId)) {
        bot.sendMessage(chatId, 'You already have an active session. Please complete or cancel it.');
        return;
      }

      const session = {
        lastQrCodeId: null,
        lastStatus: '',
        duration: 0,
        intervalId: null,
      };

      userSessions.set(chatId, session);

      const qrResponse = await axios.get('https://shopee.co.id/api/v2/authentication/gen_qrcode');

      if (qrResponse.status === 200) {
        const qrData = qrResponse.data.data;
        session.lastQrCodeId = qrData.qrcode_id;

        const intervalId = setInterval(async () => {
          if (!session.lastQrCodeId || session.duration >= 60) {
            clearInterval(intervalId);
            if (session.duration >= 60) {
              bot.sendMessage(chatId, 'QR Code has expired.');
            }
            userSessions.delete(chatId);
            return;
          }

          const encodedQrCodeId = querystring.escape(session.lastQrCodeId);
          const statusResponse = await axios.get(`https://shopee.co.id/api/v2/authentication/qrcode_status?qrcode_id=${encodedQrCodeId}`);
          const statusData = statusResponse.data.data;
          const currentStatus = statusData.status;

          if (currentStatus !== session.lastStatus) {
            session.lastStatus = currentStatus;
            bot.sendMessage(chatId, `Status QR: ${currentStatus}`);
            if (currentStatus === 'EXPIRED') {
                clearInterval(intervalId); 
                userSessions.delete(chatId);
            }
            if (currentStatus === 'CONFIRMED') {
                const qrcodeToken = statusData.qrcode_token;
                const postData = {
                  qrcode_token: qrcodeToken,
                  device_sz_fingerprint: 'OazXiPqlUgm158nr1h09yA==|0/eMoV7m/rlUHbgxsRgRC/n0vyOe6XzhDMa2PcnZPv3ecioRaJQg2W7ur5GfhoDDEeuMz2az7GGj/8Y=|Pu2hbrwoH+45rDNC|08|3',
                  client_identifier: {
                    security_device_fingerprint: 'OazXiPqlUgm158nr1h09yA==|0/eMoV7m/rlUHbgxsRgRC/n0vyOe6XzhDMa2PcnZPv3ecioRaJQg2W7ur5GfhoDDEeuMz2az7GGj/8Y=|Pu2hbrwoH+45rDNC|08|3',
                  },
                };

                const loginResponse = await axios.post(
                  'https://shopee.co.id/api/v2/authentication/qrcode_login',
                  postData,
                  {
                    headers: customHeaders,
                  }
                );

                if (loginResponse.headers['set-cookie']) {
                  const cookies = loginResponse.headers['set-cookie'];
                  for (const cookie of cookies) {
                    if (cookie.startsWith('SPC_EC')) {
                      spcEcCookie = cookie.split(';')[0];
                      break;
                    }
                  }
                }

                const saveVoucherResponse = await axios.post(
                  'https://mall.shopee.co.id/api/v2/voucher_wallet/save_voucher',
                  {
                    voucher_promotionid: 724159412043776,
                    signature: '5fe09c4c65d0e8d5d0b046390dfe6aac8b1726ffc99093985a7009c638bb6c68',
                    security_device_fingerprint: '',
                    signature_source: '0',
                  },
                  {
                    headers: {
                      'Cookie': spcEcCookie,
                      'Accept': 'application/json',
                      'Af-Ac-Enc-Dat': '',
                      'Af-Ac-Enc-Id': '',
                      'Af-Ac-Enc-Sz-Token': '',
                      'If-None-Match-': '55b03-97d86fe6888b54a9c5bfa268cf3d922f',
                      'Shopee_http_dns_mode': '1',
                      'User-Agent': 'Android app Shopee appver=30420 app_type=1',
                      'X-Api-Source': 'rn',
                      'X-Sap-Access-F': '',
                      'X-Sap-Access-T': '',
                      'X-Shopee-Client-Timezone': 'Asia/Jakarta',
                      'X-Csrftoken': '',
                      'Content-Type': 'application/json; charset=utf-8',
                      'Accept-Encoding': 'gzip, deflate, br',
                    },
                  }
                );

                if (saveVoucherResponse.data.error === 0) {
                  bot.sendMessage(chatId, 'Voucher redemption successful.');
                } else {
                  const errorMsg = saveVoucherResponse.data.error_msg;
                  bot.sendMessage(chatId, `Voucher redemption failed: ${errorMsg}`);
                }

              clearInterval(intervalId);
              userSessions.delete(chatId);
            }
          }

          session.duration++;
        }, 1000);

        const qrcodeBase64 = qrData.qrcode_base64;
        bot.sendPhoto(chatId, Buffer.from(qrcodeBase64, 'base64'), {
          caption: 'Scan the QR Code above; it will expire in 60 seconds.',
        });
      } else {
        bot.sendMessage(chatId, 'Failed to fetch QR code data.');
        userSessions.delete(chatId);
      }
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, 'An error occurred while processing your request.');
      userSessions.delete(chatId);
    }
  } else {
    bot.sendMessage(chatId, 'I do not understand that command.');
  }
});
