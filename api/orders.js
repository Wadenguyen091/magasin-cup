const SHEET_ORDER_ENDPOINT='https://script.google.com/macros/s/AKfycbwekw6QxegElRbCTE2davW4Q2-Z43KxTAKPeltc_h-Tz4ohYaLTw2GWjsghrPrkfKjhNA/exec';

function fail(res,status,error){
 res.status(status).json({ok:false,error});
}

export function validateOrder(order){
 if(!order||typeof order!=='object')return 'Dữ liệu đơn không hợp lệ';
 if(!/^MC\d{4}-[A-Z0-9]{4}$/.test(order.code||''))return 'Mã đơn không hợp lệ';
 if(!Array.isArray(order.lines)||order.lines.length<1||order.lines.length>50)return 'Danh sách sản phẩm không hợp lệ';
 if(!order.contact||!String(order.contact.name||'').trim()||!String(order.contact.shop||'').trim())return 'Thiếu thông tin khách hàng';
 if(!/^0\d{9}$/.test(String(order.contact.phone||'')))return 'Số Zalo không hợp lệ';
 if(!order.consent||order.consent.privacy!==true)return 'Chưa đồng ý chính sách bảo mật';
 const total=order.lines.reduce((sum,line)=>sum+Number(line.qty||0),0);
 if(!Number.isFinite(total)||total<1||total!==Number(order.total))return 'Tổng số lượng không hợp lệ';
 if(JSON.stringify(order).length>250000)return 'Đơn hàng vượt quá giới hạn';
 return '';
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return fail(res,405,'Chỉ hỗ trợ POST');
 let order;
 try{order=typeof req.body==='string'?JSON.parse(req.body):req.body}
 catch{return fail(res,400,'Dữ liệu JSON không hợp lệ')}
 const validationError=validateOrder(order);
 if(validationError)return fail(res,400,validationError);
 try{
  const upstream=await fetch(SHEET_ORDER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({payload:JSON.stringify(order)}),signal:AbortSignal.timeout(12000)});
  const text=await upstream.text();
  let data;
  try{data=JSON.parse(text)}catch{return fail(res,502,'Hệ thống nhận đơn trả phản hồi không hợp lệ')}
  if(!upstream.ok||data.ok!==true)return fail(res,502,data.error||'Google Sheet chưa xác nhận đơn');
  return res.status(200).json({ok:true,code:data.code||order.code,duplicate:Boolean(data.duplicate)});
 }catch(error){
  const message=error&&error.name==='TimeoutError'?'Hệ thống nhận đơn quá thời gian phản hồi':'Không kết nối được hệ thống nhận đơn';
  return fail(res,502,message);
 }
}
