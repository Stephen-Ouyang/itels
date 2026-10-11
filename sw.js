/* 离线缓存 v4：页面走「网络优先」，离线回退缓存；静态资源走缓存优先 */
var CACHE = 'ielts-syn-v4';
var CORE = ['./', './go.html', './雅思同义替换闯关.html', './manifest.webmanifest'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function keyFor(req){
  var u = new URL(req.url);
  return u.origin + decodeURIComponent(u.pathname);
}
function matchLoose(cache, req){
  var key = keyFor(req);
  return cache.keys().then(function(reqs){
    for(var i=0;i<reqs.length;i++){ if(keyFor(reqs[i]) === key) return cache.match(reqs[i]); }
    return null;
  });
}
function fallback(cache, key){
  var main = key.indexOf('go.html') >= 0 ? './go.html' : './雅思同义替换闯关.html';
  return cache.match(main);
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var accept = req.headers.get('accept') || '';
  var isPage = req.mode === 'navigate' || accept.indexOf('text/html') >= 0;
  var key = keyFor(req);

  e.respondWith(caches.open(CACHE).then(function(cache){
    if(isPage){
      /* 网络优先：有网就取最新，断网回退缓存 */
      return fetch(req).then(function(res){
        if(res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(function(){
        return matchLoose(cache, req).then(function(hit){ return hit || fallback(cache, key); });
      });
    }
    /* 其它资源：缓存优先 */
    return matchLoose(cache, req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type !== 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(function(){ return fallback(cache, key); });
    });
  }));
});
