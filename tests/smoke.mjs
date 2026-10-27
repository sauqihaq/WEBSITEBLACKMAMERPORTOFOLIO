import assert from 'node:assert/strict';
const base=process.env.SMOKE_URL||'http://127.0.0.1:3000';
const paths=['/','/portfolio','/portfolio/form-study','/shop','/shop/redline-protocol-asset','/cart','/checkout','/checkout/success','/services','/about','/blog','/contact','/commissions','/faq','/licenses','/privacy','/terms','/refund-policy','/login','/register','/forgot-password','/account','/admin','/search?q=redline','/robots.txt','/sitemap.xml'];
let passed=0;
for(const path of paths){const response=await fetch(base+path);assert.equal(response.status,200,path);const text=await response.text();if(!path.endsWith('.xml')&&!path.endsWith('.txt'))assert.ok(!text.includes('NEXT_HTTP_ERROR_FALLBACK;500'),path);passed++;}
assert.equal((await fetch(base+'/does-not-exist')).status,404);passed++;
for(const path of ['/api/admin/media','/api/download/nonexistent']){const r=await fetch(base+path);assert.ok([401,503].includes(r.status),path+': '+r.status);passed++;}
const forged=await fetch(base+'/api/commerce/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:'fake',status_code:'200',gross_amount:'1',signature_key:'invalid'})});assert.equal(forged.status,403);passed++;
const cross=await fetch(base+'/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(cross.status,403);passed++;
console.log(passed+' HTTP route/security smoke checks passed. No database/payment success is implied.');
