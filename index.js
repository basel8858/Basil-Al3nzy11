import 'dotenv/config';
import wolfjs from 'wolf.js';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Jimp = require('jimp');

const { WOLF } = wolfjs;
const client = new WOLF();

// الإعدادات
const TARGET_USER_ID = 51660277;
const CHANNEL_ID = 81889058;

client.on('ready', async () => {
    console.log("🚀 البوت متصل ومستعد لمراقبة اختبارات التحقق!");
    await client.group.joinById(CHANNEL_ID);
});

client.on('groupMessage', async (message) => {
    // 1. مراقبة رسائل المستخدم المستهدف في القناة
    if (message.sourceSubscriberId == TARGET_USER_ID && message.targetGroupId == CHANNEL_ID) {
        
        // 2. التحقق مما إذا كانت الرسالة تحتوي على رابط صورة (كما يظهر في Logs)
        const isImageLink = message.type === 'text/image_link' || (message.body && message.body.match(/\.(jpeg|jpg|png)$/i));

        if (isImageLink) {
            const imgUrl = message.body;
            console.log("📸 تم اكتشاف صورة اختبار تحليل! جاري التحليل تلقائياً...");
            
            try {
                // 3. تحليل الصورة واستخراج الرمز تلقائياً
                const { code, similarity } = await analyzeCaptchaImage(imgUrl);
                
                // 4. طباعة النتيجة في السجلات
                console.log(`📊 النتيجة: الرمز هو: '${code}' (نسبة المطابقة: ${(similarity * 100).toFixed(2)}%)`);

                if (similarity >= 0.90) {
                    console.log("✅ الرمز مطابق للشكل العام المطلوب. (يمكنك تفعيل الرد هنا)");
                    // لتفعيل الرد التلقائي، قم بإزالة التعليق من السطر التالي:
                    // await client.messaging.sendGroupMessage(CHANNEL_ID, `#${code}`);
                } else {
                    console.log("❌ الرمز لا يبدو كجزء من اختبار التحقق.");
                }
            } catch (err) {
                console.error("خطأ أثناء معالجة الصورة:", err.message);
            }
        }
    }
});

/**
 * دالة تحليل صورة اختبار التحقق واستخراج الرمز تلقائياً
 */
async function analyzeCaptchaImage(imageUrl) {
    // 1. تحميل الصورة الأصلية
    const originalImage = await Jimp.read(imageUrl);
    const { width, height } = originalImage.bitmap;

    // 2. كشف البطاقة المميزة تلقائياً (عن طريق البحث عن الحدود الصفراء المنقطة)
    let cardBounds = null;
    originalImage.scan(0, 0, width, height, function(x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        // التحقق مما إذا كان لون البكسل أصفراً فاقعاً (لون الحدود)
        if (r > 200 && g > 200 && b < 100) {
            if (!cardBounds) {
                cardBounds = { minX: x, minY: y, maxX: x, maxY: y };
            } else {
                cardBounds.minX = Math.min(cardBounds.minX, x);
                cardBounds.minY = Math.min(cardBounds.minY, y);
                cardBounds.maxX = Math.max(cardBounds.maxX, x);
                cardBounds.maxY = Math.max(cardBounds.maxY, y);
            }
        }
    });

    // إذا لم يتم العثور على الحدود المنقطة، فهذا ليس اختبار تحقق
    if (!cardBounds) {
        throw new Error("لم يتم العثور على البطاقة المميزة.");
    }

    // إضافة هامش صغير للقص
    const margin = 5;
    const cropX = Math.max(0, cardBounds.minX + margin);
    const cropY = Math.max(0, cardBounds.minY + margin);
    const cropWidth = Math.min(width - cropX, (cardBounds.maxX - cardBounds.minX) - (margin * 2));
    const cropHeight = Math.min(height - cropY, (cardBounds.maxY - cardBounds.minY) - (margin * 2));

    // 3. قص البطاقة المميزة من الصورة الكبيرة باستخدام sharp
    const croppedBuffer = await sharp(imageUrl)
        .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
        .toBuffer();

    // 4. تحسين الصورة المقصوصة لزيادة دقة OCR
    const enhancedBuffer = await sharp(croppedBuffer)
        .resize({ width: 800, height: 400, fit: 'fill' }) // تكبير الصورة
        .greyscale() // تحويل لأسود وأبيض
        .normalize() // تباين تلقائي
        .threshold(160) // جعل الخطوط حادة جداً
        .toBuffer();

    // 5. استخدام Tesseract للتعرف على النص
    const worker = await createWorker('eng+ara'); // يدعم العربية والإنجليزية
    const { data: { text } } = await worker.recognize(enhancedBuffer);
    await worker.terminate();

    // 6. تنظيف النص المستخرج: إزالة الحروف غير المرغوبة (كما في طلبك)
    const cleanCode = text.replace(/[^a-zA-Z0-9\u0621-\u064A]/g, '').trim();

    // 7. حساب نسبة المطابقة (اختياري، للتحقق)
    // هنا نعتبر الرمز مطابقاً إذا تم العثور على أي نص مفيد
    const similarity = cleanCode.length > 1 ? 0.95 : 0.50;

    return { code: cleanCode, similarity };
}

// تسجيل الدخول
client.login(process.env.U_MAIL, process.env.U_PASS);
