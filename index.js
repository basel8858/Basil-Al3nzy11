‏import 'dotenv/config';
‏import wolfjs from 'wolf.js';

‏const { WOLF } = wolfjs;
‏const client = new WOLF();

‏const TARGET_CHANNEL = 22271611;

‏client.on('ready', async () => {
‏    console.log('🚀 البوت متصل وجاهز للعمل!');

    // الانضمام للقناة المطلوبة
‏    try {
‏        await client.group.joinById(TARGET_CHANNEL);
‏        console.log(`تم الانضمام للقناة: ${TARGET_CHANNEL}`);
‏    } catch (err) {
‏        console.error("❌ خطأ في الانضمام للقناة:", err.message);
    }

    // إرسال الأمر كل 2 دقيقة
‏    setInterval(async () => {
‏        try {
‏            await client.messaging.sendGroupMessage(TARGET_CHANNEL, '!مط ضرب 3');
‏            console.log('✅ تم إرسال "!مط ضرب 3" بنجاح.');
‏        } catch (err) {
‏            console.error("❌ خطأ في إرسال الرسالة:", err.message);
        }
    }, 120000); // 120,000 ثانية = 2 دقيقة
});

// تسجيل الدخول
‏client.login(process.env.U_MAIL, process.env.U_PASS);
