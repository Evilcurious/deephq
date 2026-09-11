process.env.deephq_READ_WRITE_TOKEN = 'vercel_blob_rw_FAKE_store_secret'; // custom-prefixed name, like Vercel may generate
const { connected, diagnostics } = require('./lib/store');
console.log('detected custom-prefixed token:', connected(), diagnostics());
(async () => {
  const admin = require('./api/admin.js');
  const req = { method:'POST', headers:{'x-admin-password':'evil123'}, body:{ data: require('./data/site.json') }, url:'/api/admin' };
  const res = { setHeader(){}, status(c){this.code=c;return this}, json(o){this.out=o;return this} };
  await admin(req,res); console.log('save with fake token ->', res.code, String(res.out.error||res.out.message).slice(0,90));
})();
