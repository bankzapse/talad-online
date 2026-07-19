-- LINE ID ของร้าน (ที่ผู้ซื้อใช้ค้นหา/เพิ่มเพื่อน เช่น @taladshop)
-- หมายเหตุ: LINE Login คืนมาแค่ userId ภายใน (U...) ซึ่งค้นหาไม่ได้
-- ID ที่คนทั่วไปใช้ทักได้ ต้องให้ร้านกรอกเอง
alter table sellers add column if not exists line_id text;
