import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync('dist/app.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const data=fs.readFileSync('dist/data.js','utf8');
const seed=vm.runInNewContext(data+';SEED');
assert.equal(seed.products.length,110,'Public example must include all 110 products');
assert.equal(seed.products.flatMap(p=>p.quotes).length,330);
assert.ok(seed.products.every(p=>p.sale==null&&p.selected==null&&p.quotes.every(q=>q.price==null&&!q.buyerNote)));
assert.equal(Object.keys(seed.contacts).length,0);
assert.ok(html.includes("connect-src 'none'"));
assert.ok(html.includes("form-action 'none'"));
assert.ok(html.includes('name="referrer" content="no-referrer"'));
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(app));
const f=app.split('\n').find(l=>l.startsWith('function quoteCalc('));
const calc=vm.runInNewContext(f+';quoteCalc',{today:()=> '2026-10-31'});
const p={qty:100};
const q={price:80,tax:'未稅5%',shipping:200,moq:50,stage:'已報價',validUntil:'2026-11-30'};
assert.equal(calc(p,q).unit,86);
assert.equal(calc(p,q).total,8600);
assert.equal(calc(p,q).eligible,true);
assert.equal(calc(p,{...q,validUntil:'2026-10-30'}).eligible,false);
assert.equal(calc(p,{...q,moq:101}).eligible,false);
assert.equal(calc(p,{...q,tax:'待確認'}).eligible,false);
assert.equal(calc(p,{...q,stage:'無法供貨'}).eligible,false);
assert.equal(calc(p,{...q,price:null}).total,null);
assert.equal(calc(p,{...q,price:0,shipping:0}).unit,0);
console.log('PASS: pricing, expiry, MOQ, blank prices, public data isolation and no outbound API.');

const startup=app.split('function toast(')[0];
const boot=saved=>vm.runInNewContext(startup+';state',{
  SEED:seed,document:{querySelector:()=>({textContent:''})},
  localStorage:{getItem:()=>saved?JSON.stringify(saved):null}
});
assert.equal(boot(null).products.length,110,'First visit loads the public example');
const saved=JSON.parse(JSON.stringify(seed));
saved.products[0].sale=123;
saved.products[0].quotes[0].price=77;
saved.contacts={'test supplier':{contact:'local contact'}};
assert.equal(boot(saved).products[0].sale,123,'Existing user sale survives updates');
assert.equal(boot(saved).products[0].quotes[0].price,77);
assert.equal(boot(saved).contacts['test supplier'].contact,'local contact');
console.log('PASS: public example loads on first visit; existing local edits are preserved.');
