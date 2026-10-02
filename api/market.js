module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  var base = process.env.MARKET_DATA_API_URL || 'https://api.twelvedata.com';
  var key = process.env.MARKET_DATA_API_KEY;
  if (!key) return res.status(503).json({live:false,mode:'demo',reason:'MARKET_DATA_API_KEY is not configured'});

  var fxCache = {};
  function endpoint(path, params) {
    var u = base.replace(/\/$/,'') + path, q=[], k;
    params=params||{};
    for(k in params) if(params[k]!==undefined && params[k]!==null && params[k]!=='') q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
    q.push('apikey='+encodeURIComponent(key));
    return u+'?'+q.join('&');
  }
  async function json(path, params) {
    var r=await fetch(endpoint(path,params));
    var d=await r.json();
    if(!r.ok || d.status==='error' || d.code) throw new Error(d.message||'provider error');
    return d;
  }
  async function rate(pair) {
    var now=Date.now();
    if(fxCache[pair] && now-fxCache[pair].at<60000) return fxCache[pair].value;
    var d=await json('/exchange_rate',{symbol:pair});
    var v=Number(d.rate||d.close||d.price);
    if(!isFinite(v)) throw new Error('fx');
    fxCache[pair]={at:now,value:v};
    return v;
  }
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  try {
    var action=req.query&&req.query.action?req.query.action:'quote';
    if(action==='search') {
      var term=req.query&&req.query.q?req.query.q:'';
      var sd=await json('/symbol_search',{symbol:term});
      return res.status(200).json({live:true,mode:'live',data:sd.data||[],updatedAt:new Date().toISOString()});
    }

    var symbol=req.query&&req.query.symbol?req.query.symbol:'NIFTY';
    if(action==='chart') {
      var tf=req.query&&req.query.tf?req.query.tf:'1D';
      var p={symbol:symbol,include_ohlc:true,previous_close:true,adjust:'splits'};
      if(tf==='1D'){ p.interval='1min'; p.date='today'; p.outputsize=500; }
      else if(tf==='5D'){ p.interval='15min'; p.outputsize=500; }
      else if(tf==='1M'){ p.interval='1day'; p.outputsize=31; }
      else if(tf==='6M'){ p.interval='1day'; p.outputsize=150; }
      else if(tf==='1Y'){ p.interval='1day'; p.outputsize=260; }
      else if(tf==='YTD'){ p.interval='1day'; p.start_date=new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10); p.end_date=todayISO(); }
      else if(tf==='ALL'){ p.interval='1week'; p.outputsize=5000; }
      var cd=await json('/time_series',p);
      return res.status(200).json({live:true,mode:'live',data:cd,updatedAt:new Date().toISOString()});
    }

    var qd=await json('/quote',{symbol:symbol});
    var currency=qd.currency||'USD', local=Number(qd.close||qd.price||qd.last);
    var usd=local, inr=null, usdInr=null, usdPerLocal=null;
    if(currency==='USD'){
      usdInr=await rate('USD/INR'); inr=local*usdInr;
    } else if(currency==='INR'){
      usdInr=await rate('USD/INR'); usd=local/usdInr; inr=local;
    } else {
      usdPerLocal=await rate('USD/'+currency);
      usdInr=await rate('USD/INR');
      usd=local/usdPerLocal;
      inr=usd*usdInr;
    }
    qd.local_price=local; qd.usd_price=usd; qd.inr_price=inr;
    qd.conversion={usd_inr:usdInr,usd_per_local:usdPerLocal};
    return res.status(200).json({live:true,mode:'live',data:qd,updatedAt:new Date().toISOString()});
  } catch(e) {
    return res.status(503).json({live:false,mode:'demo',reason:'DATA CONNECTION UNAVAILABLE — DEMO MODE'});
  }
};