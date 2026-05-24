import 'dotenv/config';
import wolfjs from 'wolf.js';
import Tesseract from 'tesseract.js';
import axios from 'axios';

const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL,
    secret: process.env.U_PASS,
    taskGroupId: 81889058, // القناة المطلوبة
    verificationGroupId: 9969, // قناة إرسال الحل
    minuteInterval: 60 * 1000 // دقيقة واحدة
};

const service = new WOLF();

// دالة معالجة الكابتشا
async function processCaptcha(imageUrl, targetGroupId) {
    try {
        console.log("جاري تحليل صورة الكابتشا...");
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
        const cleanedText = text.trim();
        
        if (cleanedText) {
            console.log(`تم استخراج النص: ${cleanedText}`);
            // إرسال الحل إلى القناة 9969
            await service.messaging.sendGroupMessage(settings.verificationGroupId, `#${cleanedText}`);
        }
    } catch (error) {
        console.error("خطأ في قراءة الصورة:", error);
    }
}

// دالة المهام الدورية
const sendRoutineCommands = async () => {
    try {
        await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
        setTimeout(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد تحالف ايداع كل");
        }, 3000);
    } catch (e) { console.log(e); }
};

service.on('groupMessage', async (message) => {
    if (message.targetGroupId !== settings.taskGroupId) return;

    const content = message.body;

    // التحقق من وجود "اختبار تحقق بشري"
    if (content.includes("اختبار تحقق بشري")) {
        // البحث عن رابط الصورة (بافتراض أن البوت يستلم الرابط)
        // قد تحتاج لتعديل هذه الجزئية بناءً على كيفية وصول الصورة في wolf.js
        const imageUrlMatch = content.match(/https?:\/\/[^\s]+/); 
        
        if (imageUrlMatch) {
            await processCaptcha(imageUrlMatch[0], settings.verificationGroupId);
        }
    }
});

service.on('ready', async () => {
    console.log(`🚀 البوت متصل.. يراقب ${settings.taskGroupId}`);
    await service.group.joinById(settings.taskGroupId);
    
    // تشغيل المهام كل دقيقة
    setInterval(sendRoutineCommands, settings.minuteInterval);
});

service.login(settings.identity, settings.secret);
