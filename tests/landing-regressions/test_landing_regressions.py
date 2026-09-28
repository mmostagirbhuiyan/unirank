# Run against a served production build: BASE=http://localhost:4173 python3 test_landing_regressions.py
import asyncio, os, sys
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://localhost:4173')
results = []
def check(name, ok, detail=''):
    results.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

def legacy_slug(name):
    import re
    s = name.lower(); s = re.sub(r'[^a-z0-9\s-]', '', s); s = re.sub(r'\s+', '-', s); s = re.sub(r'-+', '-', s)
    return s.strip('-')

async def h1(pg):
    return (await pg.evaluate("(document.querySelector('h1')||{textContent:''}).textContent.trim()"))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # R1 legacy profile URLs keep resolving
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        for name in ["King's College London", "Texas A&M University--College Station", "École Polytechnique Federale of Lausanne", "Xi'an Jiaotong University", "Universidade de São Paulo"]:
            await pg.goto(f'{BASE}/university/{legacy_slug(name)}', wait_until='networkidle'); await pg.wait_for_timeout(200)
            got = await h1(pg); check(f'R1 legacy URL /university/{legacy_slug(name)} opens {name}', got == name, got)
        # R2 keyboard focus stays on the activated control
        await pg.goto(BASE + '/', wait_until='networkidle'); await pg.wait_for_selector('.ranking-entry')
        for sel in ['[data-source="the"]', '[data-sort="contested"]', '.ranking-entry [data-expand]']:
            await pg.focus(sel); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(150)
            tag = await pg.evaluate("document.activeElement.tagName")
            check(f'R2 focus remains on a control after Enter on {sel}', tag != 'BODY', tag)
        # R3 focus survives the movement indicator lifecycle
        await pg.goto(BASE + '/', wait_until='networkidle'); await pg.wait_for_selector('.ranking-entry')
        await pg.click('[data-source="usnews"]'); await pg.wait_for_timeout(200)
        await pg.focus('.ranking-entry:nth-child(3) .university-cell a'); await pg.wait_for_timeout(3500)
        tag = await pg.evaluate("document.activeElement.tagName")
        check('R3 focus on a row link survives 3.5 s after a toggle', tag == 'A', tag)
        # R4 interaction latency: chip toggle and one search keystroke under 200 ms of main-thread work
        await pg.goto(BASE + '/', wait_until='networkidle'); await pg.wait_for_selector('.ranking-entry')
        await pg.evaluate("window.__lt=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push(Math.round(e.duration))}).observe({type:'longtask'})")
        await pg.click('[data-source="qs"]'); await pg.wait_for_timeout(600)
        lt = await pg.evaluate("Math.max(0,...window.__lt)"); check('R4a chip toggle longest task < 200 ms', lt < 200, f'{lt} ms')
        await pg.evaluate("window.__lt=[]"); await pg.focus('[data-action="search"]'); await pg.keyboard.type('u'); await pg.wait_for_timeout(600)
        lt = await pg.evaluate("Math.max(0,...window.__lt)"); check('R4b first search keystroke longest task < 200 ms', lt < 200, f'{lt} ms')
        # R5 light-mode consensus rank numerals meet 4.5:1
        cr = await pg.evaluate("""() => { const p=c=>c.match(/\\d+(\\.\\d+)?/g).map(Number); const L=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
          const el=document.querySelector('.consensus-rank'); const fg=L(p(getComputedStyle(el).color)); const bg=L(p(getComputedStyle(document.body).backgroundColor)); return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05) }""")
        check('R5 light consensus rank contrast >= 4.5', cr >= 4.5, f'{cr:.2f}')
        # R6 theme toggle label follows an OS scheme change
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light'); q = await ctx.new_page()
        await q.goto(BASE + '/', wait_until='networkidle'); await q.wait_for_selector('.ranking-entry')
        await q.emulate_media(color_scheme='dark'); await q.wait_for_timeout(200)
        label = await q.get_attribute('[data-action="theme"]', 'aria-label')
        check('R6 toggle label says "Switch to light mode" after OS switches to dark', label == 'Switch to light mode', label)
        # R8 focus remains in the list when the final load-more control disappears
        await pg.goto(BASE + '/', wait_until='networkidle')
        await pg.fill('[data-action="search"]', 'united kingdom')
        while await pg.locator('[data-action="load-more"]').count():
            await pg.focus('[data-action="load-more"]')
            await pg.keyboard.press('Enter')
        tag = await pg.evaluate('document.activeElement.tagName')
        check('R8 focus stays in the list after the final Show more batch', tag != 'BODY', tag)
        # R9 movement indicators cover rows added after a source toggle
        await pg.goto(BASE + '/', wait_until='networkidle')
        await pg.click('[data-source="usnews"]')
        for _ in range(3):
            await pg.click('[data-action="load-more"]')
        for row in range(151, 156):
            count = await pg.locator(f'.ranking-entry:nth-child({row}) .movement').count()
            check(f'R9 rendered row {row} has a movement indicator', count == 1, str(count))
        await pg.wait_for_timeout(3500)
        movement_count, row_count = await pg.evaluate("[document.querySelectorAll('.movement').length, document.querySelectorAll('.ranking-entry').length]")
        check('R9 movement indicators persist for every rendered row', movement_count == row_count, f'{movement_count} of {row_count}')
        await b.close()
    sys.exit(0 if all(ok for _, ok, _ in results) else 1)
asyncio.run(main())
