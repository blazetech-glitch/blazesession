const { makeid } = require('./gen-id');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { requestPairingCodeFromSocket, buildSessionCodeFromCredsFile, resolveSessionRecipientJid, buildSessionCopyMessage } = require('./pair-utils');
// dynamically load baileys when needed (ESM-only module)
let makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore, jidNormalizedUser;

const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    try {
        await BLAZE_MD_PAIR_CODE();
    } catch (err) {
        console.error('❌ Pairing route crashed:', err);
        if (!res.headersSent) {
            await res.status(502).json({ code: '❗ Pairing service temporarily unavailable' });
        }
    }

    async function BLAZE_MD_PAIR_CODE() {
        // load baileys modules lazily to avoid ESM import errors
        if (!makeWASocket) {
            const baileys = await import('@whiskeysockets/baileys');
            // use named export since default is not a function
            makeWASocket = baileys.makeWASocket;
            useMultiFileAuthState = baileys.useMultiFileAuthState;
            delay = baileys.delay;
            Browsers = baileys.Browsers;
            makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
            jidNormalizedUser = baileys.jidNormalizedUser;
        }
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            const items = ["Safari", "Chrome", "Firefox"];
            const randomItem = items[Math.floor(Math.random() * items.length)];

            let sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS(randomItem),
            });



            if (!sock.authState.creds.registered) {
                try {
                    const code = await requestPairingCodeFromSocket(sock, num, { delayMs: 1500 });
                    if (!res.headersSent) await res.send({ code });
                } catch (err) {
                    if (!res.headersSent) {
                        await res.status(400).send({ code: err.message || "❗ Unable to generate pairing code" });
                    }
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                try {

                    if (connection === "open" && sock?.user?.id) {
                    await delay(3000);
                    let rf = __dirname + `/temp/${id}/creds.json`;

                    function generateBLAZE_ID() {
                        const prefix = "BLAZE~";
                        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        let blazeID = prefix;
                        for (let i = prefix.length; i < 22; i++) {
                            blazeID += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        return blazeID;
                    }

                    const blazeID = generateBLAZE_ID();
                    const userJid = resolveSessionRecipientJid(sock, jidNormalizedUser);

                    if (!userJid) {
                        throw new Error('Unable to resolve your WhatsApp recipient JID after login.');
                    }

                    try {
                        let session_code = buildSessionCodeFromCredsFile(rf) || `${blazeID}`;

                        try {
                            const mega_url = await upload(fs.createReadStream(rf), `${userJid}.json`);
                            const string_session = mega_url.replace('https://mega.nz/file/', '');
                            if (string_session) {
                                session_code = "BLAZE~" + string_session;
                            }
                        } catch (uploadErr) {
                            console.log('⚠️ Mega upload failed, using real credentials-based session id:', uploadErr.message);
                        }

                        const copyMessage = buildSessionCopyMessage(session_code);
                        let code = await sock.sendMessage(userJid, copyMessage);

                        // ===== Message with BOX =====
                        let desc = `┏━❑ *BLAZE-MD SESSION* ✅\n` +
                            `┏━❑ *SAFETY RULES* ━━━━━━━━━\n` +
                            `┃ 🔹 *Code:* Sent above.\n` +
                            `┃ 🔹 *Warning:* Do not share this code!.\n` +
                            `┃ 🔹 Keep this code safe.\n` +
                            `┃ 🔹 Valid for 24 hours only.\n` +
                            `┗━━━━━━━━━━━━━━━\n` +
                            `┏━❑ *CHANNEL* ━━━━━━━━━\n` +
                            `┃ 📢 Follow our channel: https://whatsapp.com/channel/0029VbAjawl9MF8vQQa0ZT32\n` +
                            `┗━━━━━━━━━━━━━━━\n` +
                            `┏━❑ *REPOSITORY* ━━━━━━━━━\n` +
                            `┃ 💻 Repository: https://github.com/ARNOLDT20/Viper2\n` +
                            `┃ 👉 Fork & contribute!\n` +
                            `┗━━━━━━━━━━━━━━━\n\n` +
                            `> © 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 BLAZE 𝐓𝐞𝐜𝐡`;

                        await sock.sendMessage(userJid, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: 'BLAZE MD',
                                    body: '© BLAZE Tech',
                                    thumbnailUrl: 'https://files.catbox.moe/qkzio8.png',
                                    thumbnailWidth: 64,
                                    thumbnailHeight: 64,
                                    sourceUrl: 'https://whatsapp.com/channel/0029VbAjawl9MF8vQQa0ZT32',
                                    mediaUrl: 'https://files.catbox.moe/qkzio8.png',
                                    showAdAttribution: true,
                                    renderLargerThumbnail: false,
                                    previewType: 'PHOTO',
                                    mediaType: 1
                                },
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: "120363421014261315@newsletter",
                                    newsletterName: '© BLAZE Tech',
                                    serverMessageId: Math.floor(Math.random() * 1000000)
                                },
                                isForwarded: true,
                                forwardingScore: 999
                            }
                        }, { quoted: code });

                    } catch (e) {
                        let ddd = await sock.sendMessage(userJid, { text: e.toString() });

                        let descErr = `┏━❑ *BLAZE SESSION* ⚠️\n` +
                            `┏━❑ *SAFETY RULES* ━━━━━━━━━\n` +
                            `┃ 🔹 *Code:* Sent above.\n` +
                            `┃ 🔹 *Error:* Session created with minor issues.\n` +
                            `┃ 🔹 Keep this code safe.\n` +
                            `┃ 🔹 Valid for 24 hours only.\n` +
                            `┗━━━━━━━━━━━━━━━\n\n` +
                            `> © 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 BLAZE 𝐓𝐞𝐜𝐡`;

                        await sock.sendMessage(userJid, {
                            text: descErr,
                            contextInfo: {
                                externalAdReply: {
                                    title: 'BLAZE MD',
                                    body: '© BLAZE Tech',
                                    thumbnailUrl: 'https://files.catbox.moe/qkzio8.png',
                                    thumbnailWidth: 64,
                                    thumbnailHeight: 64,
                                    sourceUrl: 'https://whatsapp.com/channel/0029VbAjawl9MF8vQQa0ZT32',
                                    mediaUrl: 'https://files.catbox.moe/qkzio8.png',
                                    showAdAttribution: true,
                                    renderLargerThumbnail: false,
                                    previewType: 'PHOTO',
                                    mediaType: 1
                                },
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: "120363421014261315@newsletter",
                                    newsletterName: '© BLAZE Tech',
                                    serverMessageId: Math.floor(Math.random() * 1000000)
                                },
                                isForwarded: true,
                                forwardingScore: 999
                            }
                        }, { quoted: ddd });
                    }

                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} 🔥 BLAZE SESSION Connected ✅`);
                    return;
                    }
                } catch (err) {
                    console.log("⚠️ Error in connection.update:", err);
                }

                if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    BLAZE_MD_PAIR_CODE();
                }
            });

        } catch (err) {
            console.log("⚠️ BLAZE SESSION Connection failed — Restarting service...", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ BLAZE-MD Service Unavailable" });
            }
        }
    }

});

module.exports = router;
