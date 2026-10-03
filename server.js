const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Danh sách các trường học thuộc hệ thống
const schoolList = {
  "THCS_VT": "Trường THCS Võ Thị Sáu",
  "THCS_LL": "Trường THCS Lê Lợi",
  "THCS_ND": "Trường THCS Nguyễn Du",
  "THCS_DP": "Trường THCS Đoài Phương"
};

// Cơ sở dữ liệu học sinh (Gắn với MAC Address của thẻ SOS)
const studentDB = {
  "AA:BB:CC:DD:EE:01": { name: "Nguyễn Văn Dũng", class: "8A", school_id: "THCS_VT" },
  "11:22:33:44:55:66": { name: "Trần Thị Mai", class: "8B", school_id: "THCS_LL" },
  "C4:4F:33:12:8A:BC": { name: "Lê Hoàng Nam", class: "9C", school_id: "THCS_ND" }
};

// API lấy danh sách trường học cho Menu dropdown trên Web
app.get('/api/schools', (req, res) => {
  res.json(schoolList);
});

// Lắng nghe kết nối Socket.IO từ trang Web
io.on('connection', (socket) => {
  const schoolId = socket.handshake.query.school_id;
  if (schoolId) {
    socket.join(schoolId); // Đưa Web Admin vào phòng nhận tin riêng của trường đó
    console.log(`📡 Màn hình giám sát [${schoolList[schoolId] || schoolId}] đã trực tuyến.`);
  }
});

// API nhận tín hiệu SOS gửi lên từ thẻ ESP32-C3
app.post('/api/sos', (req, res) => {
  const { school_id, student_id, latitude, longitude, bssid } = req.body;
  
  // Tra cứu thông tin học sinh
  const student = studentDB[student_id] || { 
    name: "Học sinh mới (Chưa đăng ký)", 
    class: "Chưa xác định" 
  };

  const sosData = {
    schoolId: school_id,
    schoolName: schoolList[school_id] || school_id,
    studentName: student.name,
    studentClass: student.class,
    macAddress: student_id,
    latitude: latitude || 0,
    longitude: longitude || 0,
    bssid: bssid || "Không rõ",
    timestamp: new Date().toLocaleTimeString('vi-VN')
  };

  console.log(`🚨 BÁO ĐỘNG KHẨN CẤP [${sosData.schoolName}]:`, sosData);

  // Phát tín hiệu CHỈ ĐẾN các màn hình Admin đang chọn đúng mã trường này
  io.to(school_id).emit('sos_alert', sosData);

  res.status(200).json({ status: 'success', message: 'Đã nhận phát tín hiệu SOS' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});