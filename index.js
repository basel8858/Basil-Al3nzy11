const { WOLF } = require('wolf.js');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const service = new WOLF();

// الإعدادات
const ALLOWED_GROUP_ID = 81889058; // ضع هنا رقم الروم الحقيقي
const CAPTCHA_FILE = path.join(__dirname, 'captcha.jpg');

service.on('groupMessage', async (message) => {
    // 1. التحقق من الروم
    if (message.targetGroupId !== ALLOWED_GROUP_ID) return;

    // 2. التأكد من وجود صورة
    if (message.attachments && message.attachments.length > 0) {
        const imageUrl = message.attachments[0].link;

        try {
            // تحميل الصورة
            const response = await axios({ url: imageUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(CAPTCHA_FILE);
            response.data.pipe(writer);

            writer.on('finish', () => {
                // 3. تشغيل كود البايثون
                exec(`python3 solver.py "${CAPTCHA_FILE}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error("Exec error:", error);
                        return;
                    }
                    
                    const result = stdout.trim();
                    if (result && result !== "No text detected") {
                        // 4. إرسال الحل للروم
                        service.messaging.sendGroupMessage(message.targetGroupId, `# ${result}`);
                    }
                });
            });
        } catch (err) {
            console.error("Download error:", err);
        }
    }
});

// تسجيل الدخول
service.login(process.env.U_MAIL, process.env.U_PASS);
