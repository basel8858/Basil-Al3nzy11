import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    taskGroupId: 81889058,
    depositGroupId: 81889058
};

const MY_INFO = {
    myId: "80055399"
};

const service = new WOLF();

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

service.on('groupMessage', async (message) => {
    try {
        const content = message.body;
        const isTargetGroup = message.targetGroupId === settings.taskGroupId || message.targetGroupId === settings.depositGroupId;
        if (!isTargetGroup) return;

        if (content.includes("اختبار تحقق سريع") && content.includes(MY_INFO.myId)) {
            
            // 1. استخراج الرموز من الرسالة كاملة
            const symbolMatch = content.match(/العلامتين\s*([^\s])\s*و\s*([^\s])/u);

            if (symbolMatch) {
                const sym1 = symbolMatch[1];
                const sym2 = symbolMatch[2];
                console.log(`✅ تم تحديد العلامات: [${sym1}] و [${sym2}]`);

                // 2. الحل الجذري: تقسيم الرسالة عند كلمة "فقط:"
                // هذا سيأخذ كل ما بعد "فقط:" (حيث يوجد الكود)
                const parts = content.split('فقط:');
                if (parts.length < 2) {
                    console.log("❌ لم أجد كلمة 'فقط:' في الرسالة.");
                    return;
                }
                
                const answerArea = parts[1].trim();
                console.log(`🔎 منطقة البحث المخصصة: "${answerArea}"`);

                // 3. البحث عن الإجابة في منطقة البحث فقط
                const pattern = new RegExp(`${escapeRegExp(sym1)}(.*?)${escapeRegExp(sym2)}`, 'u');
                const result = answerArea.match(pattern);

                if (result && result[1]) {
                    const answer = result[1].trim();
                    console.log(`🚀 الإجابة النهائية المحددة: ${answer}`);
                    
                    setTimeout(async () => {
                        await service.messaging.sendGroupMessage(message.targetGroupId, `#${answer}`);
                    }, 3000);
                } else {
                    console.log("❌ لم أجد نصاً بين العلامتين في الجزء المخصص للإجابة.");
                }
            } else {
                console.log("❌ فشل استخراج العلامات من نص السؤال.");
            }
        }
    } catch (err) {
        console.error("خطأ في معالجة الفخ:", err);
    }
});

// --- قسم المهام الدورية ---
service.on('ready', async () => {
    console.log(`🚀 البوت يعمل الآن - نظام عزل الإجابة عبر 'فقط:' مفعل.`);
    try {
        await service.group.joinById(settings.taskGroupId);
        await service.group.joinById(settings.depositGroupId);

        setInterval(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(settings.depositGroupId, "!مد تحالف ايداع كل");
            }, 2000);
        }, 60000); 

        setInterval(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد صندوق فتح");
        }, 180000); 
    } catch (e) {
        console.error("خطأ في المهام:", e);
    }
});

service.login(settings.identity, settings.secret);
