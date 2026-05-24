import cv2
import pytesseract
import sys
import numpy as np

# تأكد من تثبيت مكتبات opencv-python و pytesseract
# pip install opencv-python pytesseract numpy

def solve_captcha(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None:
            return "Error: Could not read image"

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # تحديد اللون الأصفر (الإطار المتقطع)
        lower_yellow = np.array([20, 100, 100])
        upper_yellow = np.array([40, 255, 255])
        mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 50 and h > 50:
                roi = img[y:y+h, x:x+w]
                gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

                # قراءة النص
                text = pytesseract.image_to_string(thresh, lang='ara+eng', config='--psm 7')
                return text.strip().replace('\n', '')
        
        return "No text detected"
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(solve_captcha(sys.argv[1]))
