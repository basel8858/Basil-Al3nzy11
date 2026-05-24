import 'dotenv/config';
import wolfjs from 'wolf.js';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import sharp from 'sharp';

const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    taskGroupId: 81889058,
    depositGroupId: 81889058,
    tasksInterval: 63 * 1000,
    boxInterval: 3 * 60 * 1000
};

const MY_INFO = { myId: "80055399" };
const service = new WOLF();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// دالة التعرف على الصور
async function solveCaptcha(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const processed = await sharp(response.data)
            .greyscale()
            .threshold(128)
            .toBuffer();
        const { data: { text } } = await Tesseract.recognize(processed, 'eng');
        const match = text.match(/[A-Z0-9]{3,}/i);
        return match ? match[0] : null;
    } catch (e) {
        console.error("خطأ OCR:", e);
        return null;
    }
}

service.on('groupMessage', async (message) => {
    try {
        const content = message.body;
        const isTargetGroup = message.targetGroupId === settings.taskGroupId || message.targetGroupId === settings.depositGroupId;
        if (!isTargetGroup) return;

        // 1. التعامل مع الفخاخ (صور)
        if (message.attachments && message.attachments.length > 0 && content.includes("تحقق")) {
            await delay(3000); // تأخير طبيعي
            const answer = await solveCaptcha(message.attachments[0].link);
            if (answer) {
                await service.messaging.sendGroupMessage(message.targetGroupId, `#${answer}`);
                return;
            }
        }

        // 2. التعامل مع الفخاخ (نصوص)
        if (content.includes("تحقق") && content.includes(MY_INFO.myId)) {
            await delay(3000);
            if (content.includes("العلامتين")) {
                const symMatch = content.match(/العلامتين\s*([^\s\w\u0600-\u06FF])\s*و\s*([^\s\w\u0600-\u06FF])/u);
                if (symMatch) {
                    const pattern = new RegExp(`${escapeRegExp(symMatch[1])}(.*?)${escapeRegExp(symMatch[2])}`, 'gu');
                    const matches = [...content.matchAll(pattern)];
                    if (matches.length > 0) {
                        const target = matches.length > 1 ? matches[1] : matches[0];
                        await service.messaging.sendGroupMessage(message.targetGroupId, `#${target[1].trim()}`);
                    }
                }
            } else if (content.includes("داخل القوسين")) {
                const match = content.match(/\((.*?)\)/);
                if (match) await service.messaging.sendGroupMessage(message.targetGroupId, `#${match[1].trim()}`);
            } else if (content.includes("الأقواس المعقوفة")) {
                const match = content.match(/\{(.*?)\}/);
                if (match) await service.messaging.sendGroupMessage(message.targetGroupId, `#${match[1].trim()}`);
            } else if (content.includes("يمين") || content.includes("يسار")) {
                const symMatch = content.match(/للعلامة\s*([^\s])/u);
                const dirMatch = content.match(/(اليمين|يمين|اليسار|يسار)/u);
                if (symMatch && dirMatch) {
                    const regex = new RegExp(`([^\\s]+)\\s*${escapeRegExp(symMatch[1])}\\s*([^\\s]+)`, 'gu');
                    const matches = [...content.matchAll(regex)];
                    if (matches.length > 0) {
                        const target = matches.length > 1 ? matches[1] : matches[0];
                        const answer = dirMatch[0].includes("يمين") ? target[2] : target[1];
                        await service.messaging.sendGroupMessage(message.targetGroupId, `#${answer}`);
                    }
                }
            } else if (content.includes("الرمز رقم")) {
                const indexMatch = content.match(/رقم\s*(\d+)/u);
                const listMatch = content.match(/⁦(.*?)\s*⁩/u);
                if (indexMatch && listMatch) {
                    const items = listMatch[1].split('|').map(s => s.trim());
                    const index = parseInt(indexMatch[1]) - 1;
                    if (items[index]) {
                        await service.messaging.sendGroupMessage(message.targetGroupId, `#${items[index]}`);
                    }
                }
            }
        }
    } catch (err) { console.error("خطأ:", err); }
});

service.on('ready', async () => {
    console.log(`🚀 البوت نشط وجاهز.`);
    await service.group.joinById(settings.taskGroupId);
    await service.group.joinById(settings.depositGroupId);

    // مهام الميد
    setInterval(async () => {
        await service.messaging.sendGroupMessage(settings.taskGroupId, '!مد مهام');
        await delay(2000);
        await service.messaging.sendGroupMessage(settings.depositGroupId, '!مد تحالف ايداع كل');
    }, settings.tasksInterval);

    // الصناديق
    setInterval(async () => {
        await service.messaging.sendGroupMessage(settings.taskGroupId, '!مد صندوق فتح');
    }, settings.boxInterval);
});

service.login(settings.identity, settings.secret);
