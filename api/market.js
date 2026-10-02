module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
  var base = process.env.MARKET_DATA_API_URL || 'https://api.twelvedata.com';
  var key = process.env.MARKET_DATA_API_KEY;
  if (!key) return res.status(503).json({live:false,mode:'demo',reason:'MARKET_DATA_API_KEY is not configured'});
  function endpoint(path, params) {
    var u = base.replace(/\/$/,'') + path, q=[], k;
    params=params||{};
    for(k in params) if(params[k]!==undefined && params[k]!==null && params[k]!=='') q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
    q.push('apikey='+encodeURIComponent(key));
    return u+'?'+q.join('&');
  }
  try {
    var action=req.query&&req.query.action?req.query.action:'quote';
    if(action==='search') {
      var term=req.query&&req.query.q?req.query.q:'';
      var sr=await fetch(endpoint('/symbol_search',{symbol:term}));
      if(!sr.ok) throw new Error('search');
      var sd=await sr.json();
      return res.status(200).json({live:true,mode:'live',data:sd.data||[],updatedAt:new Date().toISOString()});
    }
    var symbol=req.query&&req.query.symbol?req.query.symbol:'NIFTY';
    if(action==='chart') {
      var cr=await fetch(endpoint('/time_series',{symbol:symbol,interval:'1min',outputsize:'90'}));
      if(!cr.ok) throw new Error('chart');
      return res.status(200).json({live:true,mode:'live',data:await cr.json(),updatedAt:new Date().toISOString()});
    }
    var qr=await fetch(endpoint('/quote',{symbol:symbol}));
    if(!qr.ok) throw new Error('quote');
    return res.status(200).json({live:true,mode:'live',data:await qr.json(),updatedAt:new Date().toISOString()});
  } catch(e) {
    return res.status(503).json({live:false,mode:'demo',reason:'DATA CONNECTION UNAVAILABLE — DEMO MODE'});
  }
};
