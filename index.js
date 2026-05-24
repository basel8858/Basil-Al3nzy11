import 'dotenv/config';
import wolfjs from 'wolf.js';

const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    // تأكد أن هذا الرقم هو رقم القروب الصحيح
    taskGroupId: 81889058 
};

const service = new WOLF();

// دالة تأخير
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

service.on('ready', async () => {
    console.log(`🚀 البوت يعمل الآن!`);
    console.log(`جارٍ محاولة الانضمام للقروب: ${settings.taskGroupId}`);
    
    try {
        await service.group.joinById(settings.taskGroupId);
        console.log("✅ تم طلب الانضمام للقروب بنجاح.");
    } catch (err) {
        console.error("❌ فشل الانضمام للقروب:", err);
    }
});

// هذا الجزء هو "عين البوت"
service.on('groupMessage', async (message) => {
    // طباعة كل رسالة تصل للبوت للتحقق من الاتصال
    console.log("-----------------------------------------");
    console.log("📩 رسالة وصلت:");
    console.log("القروب ID:", message.targetGroupId);
    console.log("نص الرسالة:", message.body);
    console.log("-----------------------------------------");

    // تحقق بسيط
    if (message.targetGroupId === settings.taskGroupId) {
        if (message.body.includes("تحقق")) {
            console.log("⚠️ تم رصد كلمة 'تحقق'! جاري محاولة الرد...");
            await service.messaging.sendGroupMessage(message.targetGroupId, "تم استلام رسالة التحقق، يرجى فحص الكونسول.");
        }
    }
});

service.login(settings.identity, settings.secret);
