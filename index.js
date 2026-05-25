import 'dotenv/config';
import wolfjs from 'wolf.js';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const { WOLF } = wolfjs;
const client = new WOLF();

// الإعدادات
const TARGET_USER_ID = 51660277;
const CHANNEL_ID = 81889058;
const INTERVAL_MS = 63000;

client.on('ready', async () => {
    console.log("🚀 البوت متصل ومستعد للعمل التلقائي!");
    await client.group.joinById(CHANNEL_ID);
    startAutomation();
});

// 1. نظام الأتمتة (كل 63 ثانية)
async function startAutomation() {
    setInterval(async () => {
        try {
            console.log("⏳ جاري إرسال أوامر التمديد...");
            await client.messaging.sendGroupMessage(CHANNEL_ID, '!مد مهام');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await client.messaging.sendGroupMessage(CHANNEL_ID, '!مد تحالف ايداع كل');
        } catch (err) {
            console.error("❌ خطأ في الأتمتة:", err.message);
        }
    }, INTERVAL_MS);
}

// 2. نظام المراقبة والتحقق
client.on('groupMessage', async (message) => {
    if (message.sourceSubscriberId != TARGET_USER_ID || message.targetGroupId != CHANNEL_ID) return;

    const imageUrl = message.body || (message.attachments && message.attachments[0]?.link);
    if (!imageUrl) return;

    try {
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());

        // التحقق أولاً: هل هذه الصورة كابتشا؟
        const isCaptcha = await isCaptchaImage(buffer);
        if (!isCaptcha) return; // تجاهل أي صورة لا تحمل عنوان اختبار

        // إذا كانت كابتشا، نبدأ الحل
        console.log("🛡️ كابتشا تم اكتشافها! جاري المعالجة...");
        const code = await solveCaptcha(buffer);
        
        if (code) {
            await client.messaging.sendGroupMessage(CHANNEL_ID, `#${code}`);
            console.log(`✅ تم الإرسال: #${code}`);
        }
    } catch (err) {
        console.error("⚠️ خطأ في المعالجة:", err.message);
    }
});

// وظيفة: التحقق هل الصورة كابتشا فعلاً عبر قراءة النص العلوي
async function isCaptchaImage(buffer) {
    try {
        const headerBuffer = await sharp(buffer)
            .extract({ left: 0, top: 0, width: 1000, height: 300 })
            .greyscale()
            .threshold(150)
            .toBuffer();

        const worker = await createWorker('ara');
        const { data: { text } } = await worker.recognize(headerBuffer);
        await worker.terminate();

        // نتحقق من وجود كلمات تدل على كابتشا
        return text.includes('اختبار') || text.includes('تحقق');
    } catch (e) {
        return false;
    }
}

// وظيفة: استخراج الرمز من الإطار الأصفر
async function solveCaptcha(buffer) {
    const { data, info } = await sharp(buffer).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0, found = false;

    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * 4;
            // البحث عن اللون الأصفر
            if (data[idx] > 200 && data[idx + 1] > 200 && data[idx + 2] < 100) {
                minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                found = true;
            }
        }
    }
    if (!found) throw new Error("لم يتم العثور على الإطار الأصفر");

    const margin = 10;
    const processedBuffer = await sharp(buffer)
        .extract({ 
            left: minX + margin, 
            top: minY + margin, 
            width: (maxX - minX) - (margin * 2), 
            height: (maxY - minY) - (margin * 2) 
        })
        .greyscale()
        .normalize()
        .linear(1.5, -0.2)
        .sharpen()
        .toBuffer();

    const worker = await createWorker('eng+ara');
    await worker.setParameters({ tessedit_pageseg_mode: '7' });
    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();

    return text.replace(/[^a-zA-Z0-9\u0621-\u064A]/g, '').trim();
}

client.login(process.env.U_MAIL, process.env.U_PASS);
