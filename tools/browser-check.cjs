const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = process.env.EAT_NODE_MODULES ? require(path.join(process.env.EAT_NODE_MODULES,'playwright')) : require('playwright');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2,geolocation:{latitude:25.0478,longitude:121.5170},permissions:['geolocation'],serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const base=process.env.EAT_BASE_URL || 'http://localhost:4173';
    async function options(p=page) { if(!await p.locator('#search-options').evaluate(el=>el.open)) await p.locator('#search-options>summary').click(); }
    async function shortlist(p=page) { if(!await p.locator('#shortlist').evaluate(el=>el.open)) await p.locator('#shortlist>summary').click(); }
    await page.goto(base);
    assert.equal(await page.locator('#search-options').evaluate(el=>el.open),false);
    assert.equal(await page.locator('#shortlist').evaluate(el=>el.open),false);
    assert.ok(await page.locator('#spin').evaluate(el=>el.getBoundingClientRect().bottom)<844,'Primary decision fits on a phone screen');
    assert.equal(await page.locator('#spin').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'test-results/mobile-simple.png',fullPage:true});
    await options();
    await page.locator('#demo').click();
    assert.equal(await page.locator('#pool-count').textContent(),'8 家候選');
    await options();
    await page.locator('#quick').check();
    await page.locator('#spin').click();
    assert.equal(await page.locator('#result a').count(),0);
    await page.getByRole('button',{name:'換一家',exact:true}).click();
    assert.equal(await page.locator('#pool-count').textContent(),'7 家候選');
    await shortlist();
    await page.locator('#select-none').click();
    assert.equal(await page.locator('#spin').isDisabled(),true);
    await shortlist();
    await page.locator('#select-all').click();
    assert.equal(await page.locator('#spin').isEnabled(),true);
    await shortlist();
    await page.locator('#manual-name').fill('<img src=x onerror=alert(1)>');
    await page.locator('#add-form button').click();
    assert.equal(await page.locator('.restaurants img').count(),0);
    await page.reload();
    assert.equal(await page.locator('#pool-count').textContent(),'1 家候選');
    await options();
    await page.locator('#quick').check();
    await page.locator('#spin').click();
    await page.getByRole('button',{name:'記錄吃過',exact:true}).click();
    assert.equal(await page.locator('#spin').isDisabled(),true);
    assert.equal(await page.locator('#history-count').textContent(),'1');
    assert.equal(await page.locator('#result a.maps-view').isVisible(),true);
    await options();
    await page.locator('#avoid-recent').uncheck();
    assert.equal(await page.locator('#spin').isEnabled(),true);
    await shortlist();
    await page.getByRole('button',{name:'不想再抽到',exact:true}).click();
    assert.equal(await page.locator('#spin').isDisabled(),true);
    await page.locator('.saved-section details').nth(1).locator('summary').click();
    await page.getByRole('button',{name:'恢復',exact:true}).click();
    assert.equal(await page.locator('#spin').isEnabled(),true);
    await shortlist();
    await page.locator('#restaurants').getByRole('button',{name:'刪除',exact:true}).click();
    let queries=0;
    await page.route('https://overpass-api.de/api/interpreter',route=>{
      queries++;
      route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({elements:[
        {type:'node',id:101,lat:25.048,lon:121.517,tags:{name:'測試麵館',amenity:'restaurant',cuisine:'noodle'}},
        {type:'way',id:102,center:{lat:25.0485,lon:121.517},tags:{name:'測試咖啡',amenity:'cafe'}},
        {type:'node',id:103,lat:26,lon:121,tags:{name:'太遠的店',amenity:'restaurant'}}
      ]})});
    });
    await page.locator('#locate').click();
    await page.waitForFunction(()=>!document.getElementById('search').disabled);
    await options();
    await page.locator('#search').click();
    await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('找到 2'));
    assert.equal(await page.locator('#pool-count').textContent(),'2 家候選');
    await options();
    await page.locator('#kind').selectOption('cafe');
    assert.equal(await page.locator('#pool-count').textContent(),'1 家候選');
    await options();
    await page.locator('#kind').selectOption('all');
    await options();
    await page.locator('#search').click();
    assert.equal(queries,1);
    await options();
    await page.locator('#quick').uncheck();
    await page.locator('#spin').click();
    await page.waitForFunction(()=>!document.getElementById('result').hidden);
    assert.equal(await page.locator('#result a').count(),3);
    const mapsView=page.locator('#result a.maps-view');
    assert.equal(new URL(await mapsView.getAttribute('href')).pathname,'/maps/search/');
    assert.match(new URL(await mapsView.getAttribute('href')).searchParams.get('query'),/測試/);
    assert.equal(await mapsView.getAttribute('target'),'_blank');
    assert.equal(await page.locator('.wheel-area').isVisible(),false);
    await page.screenshot({path:'test-results/mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'test-results/desktop.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: mobile/desktop overflow, demo, re-spin, manual persistence, XSS, history, blocking, GPS, radius, category, cache and animated draw.');
    // A failed data service must never silently substitute demo restaurants.
    await page.reload();
    await page.route('https://overpass-api.de/api/interpreter',route=>route.fulfill({status:429,body:'Busy'}));
    await options();
    await page.locator('.manual-location summary').click();
    await page.getByRole('button',{name:'台北車站',exact:true}).click();
    await options();
    await page.locator('#search').click();
    await page.waitForFunction(()=>document.getElementById('status').classList.contains('error'));
    assert.equal(await page.locator('#pool-count').textContent(),'0 家候選');
    assert.match(await page.locator('#status').textContent(),/等一分鐘/);
    const offlineContext=await browser.newContext({serviceWorkers:'allow'});
    const offlinePage=await offlineContext.newPage();
    await offlinePage.goto(base);
    await offlinePage.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    await shortlist(offlinePage);
    await offlinePage.locator('#manual-name').fill('離線牛肉麵');
    await offlinePage.locator('#add-form button').click();
    await offlineContext.setOffline(true);
    await offlinePage.reload();
    await options(offlinePage);
    await offlinePage.locator('#quick').check();
    await offlinePage.locator('#spin').click();
    assert.equal(await offlinePage.locator('#result h3').textContent(),'離線牛肉麵');
    await offlineContext.close();
    console.log('Failure handling and offline manual draw passed.');
    if(process.env.EAT_LIVE_TEST==='1'){
      await page.unroute('https://overpass-api.de/api/interpreter');
      await page.reload();
    await options();
      await page.locator('.manual-location summary').click();
      await page.getByRole('button',{name:'台北車站',exact:true}).click();
    await options();
      await page.locator('#search').click();
      await page.waitForFunction(()=>!document.getElementById('search').disabled,{},{timeout:40000});
      const message=await page.locator('#status').textContent();
      console.log('Live Overpass: '+message);
      assert.match(message,/^找到 \d+ 家餐廳/);
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});




