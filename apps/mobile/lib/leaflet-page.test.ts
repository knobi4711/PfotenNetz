import { describe, expect, it } from 'vitest';
import { LEAFLET_MAP_ERROR, LEAFLET_MAP_READY, leafletPage, toScriptJson } from './leaflet-page';

function inlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (match === null || match[1] === undefined) throw new Error('no inline script found');
  return match[1];
}

describe('toScriptJson', () => {
  it('keeps normal data intact', () => {
    expect(toScriptJson({ latitude: 51.1, longitude: 10.2 })).toBe(
      '{"latitude":51.1,"longitude":10.2}'
    );
  });

  it('escapes closing script tags so data cannot break out of the page', () => {
    const json = toScriptJson({ name: '</script><b>x</b>' });
    expect(json).not.toContain('</script>');
    expect(json).toContain('\\u003c');
  });
});

describe('leafletPage', () => {
  it('ships a map container, an error message and both CDN fallbacks', () => {
    const html = leafletPage('function(){}');
    expect(html).toContain('id="map"');
    expect(html).toContain('id="map-error"');
    expect(html).toContain('Karte konnte nicht geladen werden');
    expect(html).toContain('unpkg.com/leaflet@1.9.4');
    expect(html).toContain('cdn.jsdelivr.net/npm/leaflet@1.9.4');
  });

  it('reports the reserved ready and error messages', () => {
    const html = leafletPage('function(){}');
    expect(html).toContain(`post('${LEAFLET_MAP_READY}')`);
    expect(html).toContain(`post('${LEAFLET_MAP_ERROR}')`);
  });

  it('renders the initializer before reporting readiness', () => {
    const html = leafletPage('function(){ window.__mounted = true; }');
    expect(html).toContain('__mounted');
    expect(html.indexOf('__mounted')).toBeLessThan(html.indexOf(LEAFLET_MAP_READY));
  });

  it('produces a page script without syntax errors', () => {
    const html = leafletPage('function(){ var map = L.map("map"); }');
    expect(() => new Function(inlineScript(html))).not.toThrow();
  });

  it('keeps a syntactically valid initializer', () => {
    const init = 'function(){ var map = L.map("map"); map.invalidateSize(); }';
    expect(() => new Function(`(${init})`)).not.toThrow();
  });

  it('adds screen specific styles', () => {
    const html = leafletPage('function(){}', '.hazard{color:#fff}');
    expect(html).toContain('.hazard{color:#fff}');
  });
});
