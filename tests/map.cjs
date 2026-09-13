const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({config:{},document:{querySelector:()=>null}});
vm.runInContext(fs.readFileSync('assets/map.js','utf8'),context);
const data = JSON.parse(fs.readFileSync('conventions/vexpo-2026/map.json','utf8'));
const locate = session => context.findMapLocation(data.locations, session)?.id;
assert.equal(locate({stage:'MONARCH STAGE'}),'monarch');
assert.equal(locate({stage:'M&G Booth holo M&G1',booth:'holo M&G1'}),'hololive');
assert.equal(locate({stage:'M&G Booth Auto1'}),'autographs');
assert.equal(locate({stage:'M&G Booth 3'}),'meet-greets');
for (const number of [1,2,3]) assert.equal(locate({stage:`M&G Booth ANYC M&G${number}`}),'nijisanji');
assert.equal(locate({stage:'Phase Connect - Booth S07',booth:'S07'}),'phase');
assert.equal(locate({stage:'Roaming - Halls 9 & 10 - Togichu'}),'roaming');
assert.equal(locate({stage:'HUKEC afterparty - Premier Inn NEC'}),undefined);
assert.equal(locate({stage:'NEC Gallery Suites 1-3'}),undefined);
assert.equal(new Set(data.locations.map(l=>l.id)).size,data.locations.length);
for (const l of data.locations) {
 const [x,y,w,h]=l.bounds;
 assert(w>0 && h>0 && x>=0 && y>=0 && x+w<=100 && y+h<=100);
}
assert.equal(new URL(data.image).hostname, 'images.squarespace-cdn.com');
assert.equal(new URL(data.image).searchParams.get('format'), '2500w');
assert(!fs.existsSync('conventions/vexpo-2026/floor-plan.png'));
assert(data.image_widths.includes(500) && data.image_widths.includes(2500));
console.log('PASS map matching, specific area precedence, unmapped offsite locations and image bounds');
