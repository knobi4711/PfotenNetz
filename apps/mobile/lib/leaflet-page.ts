const LEAFLET_VERSION = '1.9.4';

const LEAFLET_CSS_URLS = [
  `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
  `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
];

const LEAFLET_JS_URLS = [
  `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
  `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
];

export const LEAFLET_MAP_READY = 'pfotennetz:map-ready';
export const LEAFLET_MAP_ERROR = 'pfotennetz:map-error';

/** JSON that is safe to embed in an inline `<script>` block. */
export function toScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Wraps a per-screen map initializer into a full HTML page.
 *
 * The initializer runs once Leaflet is available and creates the map on the
 * `#map` element. It must not rely on data injected later: everything that
 * should be visible on the first frame belongs in the initializer. If Leaflet
 * cannot be loaded, or the initializer throws, the page reports `map-error`
 * instead of staying blank.
 */
export function leafletPage(initScript: string, extraStyle = ''): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
html,body{height:100%;margin:0;background:#f4f0ed;font-family:sans-serif;-webkit-tap-highlight-color:transparent}
#map{position:absolute;top:0;right:0;bottom:0;left:0;background:#f4f0ed}
#map-error{position:absolute;top:0;right:0;bottom:0;left:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;color:#4a4038}
#map-error b{font-size:15px}
#map-error span{font-size:13px;line-height:19px}
.leaflet-control-attribution{font-size:10px}
${extraStyle}
</style>
</head>
<body>
<div id="map"></div>
<div id="map-error"><b>Karte konnte nicht geladen werden</b><span>Bitte prüfe deine Internetverbindung und öffne die Seite erneut.</span></div>
<script>
(function(){
  var CSS_URLS=${JSON.stringify(LEAFLET_CSS_URLS)};
  var JS_URLS=${JSON.stringify(LEAFLET_JS_URLS)};

  function post(message){
    try{ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(message); } }catch(e){}
  }

  function fail(){
    var map=document.getElementById('map');
    if(map){ map.style.display='none'; }
    var box=document.getElementById('map-error');
    if(box){ box.style.display='flex'; }
    post('${LEAFLET_MAP_ERROR}');
  }

  function init(){
    try{
      (${initScript})();
      post('${LEAFLET_MAP_READY}');
    }catch(e){
      fail();
    }
  }

  function loadCss(){
    for(var i=0;i<CSS_URLS.length;i++){
      var link=document.createElement('link');
      link.rel='stylesheet';
      link.href=CSS_URLS[i];
      document.head.appendChild(link);
    }
  }

  function loadScript(index){
    if(index>=JS_URLS.length){ fail(); return; }
    var script=document.createElement('script');
    script.src=JS_URLS[index];
    script.onload=init;
    script.onerror=function(){ loadScript(index+1); };
    document.head.appendChild(script);
  }

  loadCss();
  loadScript(0);
})();
</script>
</body>
</html>`;
}
