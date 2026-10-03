import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocation,distanceMeters,buildQuery,normalizePlaces,eligiblePlaces,randomIndex,targetRotation,mapsUrl} from './core.js';
test('coordinates reject missing, invalid, and injection input',()=>{
  assert.equal(validateLocation(25,121),true);
  for(const pair of [[91,121],[25,181],[NaN,121],[25,Infinity],['25',121]]) assert.equal(validateLocation(...pair),false);
  assert.throws(()=>buildQuery({lat:'25);out;',lon:121},1000));
  assert.throws(()=>buildQuery({lat:25,lon:121},5001));
});
test('radius is geographic distance and OSM nodes/ways are normalized and deduplicated',()=>{
  const origin={lat:25,lon:121};
  assert.equal(distanceMeters(origin,origin),0);
  assert.ok(distanceMeters(origin,{lat:25.001,lon:121})>110);
  const tags={name:'麵店',amenity:'restaurant'};
  const rows=normalizePlaces([
    {type:'node',id:1,lat:25.001,lon:121,tags},
    {type:'way',id:2,center:{lat:25.001,lon:121},tags},
    {type:'node',id:3,lat:26,lon:121,tags},
    {type:'node',id:4,lat:25,lon:121,tags:{name:'公園',amenity:'park'}},
    {type:'way',id:5,center:{lat:25.002,lon:121},tags:{name:'Coffee',amenity:'cafe','name:zh':'咖啡店'}}
  ],origin,500);
  assert.deepEqual(rows.map(p=>p.name),['麵店','咖啡店']);
  assert.equal(rows[0].id,'osm:node:1');
});
test('pool respects selections, history boundary, blocks and categories, keeps manual entries',()=>{
  const places=[{id:'a',source:'osm',kind:'restaurant'},{id:'b',source:'osm',kind:'cafe'},{id:'c',source:'manual'},{id:'d',source:'osm',kind:'restaurant'}];
  const now=8*86400000;
  const options={selected:new Set(['a','b','c','d']),blocked:[{id:'d'}],history:[{id:'a',at:2*86400000}],avoidRecent:true,kind:'restaurant',now};
  assert.deepEqual(eligiblePlaces(places,options).map(p=>p.id),['c']);
  assert.deepEqual(eligiblePlaces(places,{...options,avoidRecent:false}).map(p=>p.id),['a','c']);
  assert.deepEqual(eligiblePlaces(places,{...options,now:9*86400000}).map(p=>p.id),['a','c']);
});
test('fair random draw rejects biased remainder of uint32 space',()=>{
  const sequence=[0xffffffff,4];let calls=0;
  assert.equal(randomIndex(3,{getRandomValues:a=>{a[0]=sequence[calls++];}}),1);
  assert.equal(calls,2);assert.throws(()=>randomIndex(0));
});
test('wheel pointer lands at selected segment across repeated spins',()=>{
  for(const n of [1,2,3,8,19,100]) for(let index=0;index<n;index++) for(const current of [0,72,359,5012]) {
    const end=targetRotation(current,index,n);
    const underPointer=((360-end%360)%360+360)%360;
    assert.equal(Math.floor((underPointer+1e-8)/(360/n)),index);
    assert.ok(end-current>=1800);
  }
});
test('maps links encode manual names and use real coordinates for navigation',()=>{
  const manual={name:'麵 & 飯 #1'};
  assert.equal(new URL(mapsUrl(manual)).searchParams.get('query'),manual.name);
  assert.equal(new URL(mapsUrl({name:'麵',lat:25,lon:121},true)).searchParams.get('destination'),'25,121');
});

