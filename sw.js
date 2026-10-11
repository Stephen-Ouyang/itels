/* 离线缓存：首次打开后，之后断网也能用 */
var CACHE = 'ielts-syn-v3';
var CORE = ['./', './go.html', './雅思同义替换闯关.html', './manifest.webmanifest'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){
      return c.add(u).catch(function(){});
    }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

/* 缓存键规范化：去掉查询串，并按解码后的路径匹配，避免编码差异导致离线失效 */
function keyFor(req){
  var u = new URL(req.url);
  return u.origin + decodeURIComponent(u.pathname);
}

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var key = keyFor(e.request);
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.keys().then(function(reqs){
        var hit = null;
        for(var i=0;i<reqs.length;i++){
          if(keyFor(reqs[i]) === key){ hit = reqs[i]; break; }
        }
        if(hit) return c.match(hit);
        return fetch(e.request).then(function(res){
          if(res && res.status === 200 && res.type !== 'opaque') c.put(e.request, res.clone());
          return res;
        }).catch(function(){
          var main = key.indexOf('go.html') >= 0 ? './go.html' : './雅思同义替换闯关.html';
          return c.match(main);
        });
      });
    })
  );
});
