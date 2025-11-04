# MVP Chợ Hải Sản — HTML/CSS/JS

Tách file theo cấu trúc:
```
cho-hai-san-mvp/
├─ index.html
├─ styles.css
└─ app.js
```

## Chạy
Mở `index.html` bằng trình duyệt (không cần server). Ứng dụng là SPA dùng `localStorage` để lưu dữ liệu demo.

## Đăng nhập (demo)
- Nhập bất kỳ SĐT hợp lệ (bắt đầu bằng `0`, 10-11 số)
- Bấm **Gửi OTP**, mã mặc định: **123456**
- Chọn vai trò: **Người mua / Ngư dân / Admin**

## Ghi chú tích hợp thật
- Gửi OTP: nối gateway tại hàm `sendOTP()` trong `app.js`.
- Backend thật: thay lớp `DB` bằng API fetch đến server.
