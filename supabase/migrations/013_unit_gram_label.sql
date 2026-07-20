-- เปลี่ยนป้ายหน่วยจาก "ก." เป็น "กรัม" ให้อ่านง่ายขึ้น
update listings set unit = 'บาท/100 กรัม' where unit = 'บาท/100 ก.';
update listings set unit = 'บาท/200 กรัม' where unit = 'บาท/200 ก.';
update listings set unit = 'บาท/500 กรัม' where unit = 'บาท/500 ก.';

update orders set unit = 'บาท/100 กรัม' where unit = 'บาท/100 ก.';
update orders set unit = 'บาท/200 กรัม' where unit = 'บาท/200 ก.';
update orders set unit = 'บาท/500 กรัม' where unit = 'บาท/500 ก.';
