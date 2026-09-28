import os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:4173')
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS' if ok else 'FAIL'), name, f'[{detail}]')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900})
    # U1 share of score: an absent source never carries a positive share, a ranked source never a negative one, no share exceeds 100%
    for slug in ['suez-university', 'charit-university-medicine-berlin', 'karolinska-institute']:
        pg.goto(f'{BASE}/university/{slug}'); pg.wait_for_selector('.profile-table tbody tr')
        rows = pg.eval_on_selector_all('.profile-table tbody tr', 'rs=>rs.map(r=>[...r.children].map(c=>c.innerText.trim()))')
        for source, rank, points, weight, share in rows:
            s = float(share.rstrip('%'))
            check(f'U1 {slug} {source} share sign and bound', not (rank == 'Absent' and s > 0) and not (rank != 'Absent' and s < 0) and s <= 100, f'{rank} {share}')
    # U2 the calculation line shows its result without horizontal scrolling at desktop widths
    for width in [1024, 1280, 1440]:
        pg.set_viewport_size({'width': width, 'height': 900})
        for slug in ['princeton-university', 'karolinska-institute', 'suez-university']:
            pg.goto(f'{BASE}/university/{slug}'); pg.wait_for_selector('.profile-equation code')
            sw, cw = pg.eval_on_selector('.profile-equation code', 'c=>[c.scrollWidth,c.clientWidth]')
            check(f'U2 {width}px {slug} calculation line fully visible', sw <= cw, f'{sw} > {cw}' if sw > cw else '')
    # U3 Back after a header search from a profile returns to that profile
    pg.set_viewport_size({'width': 1440, 'height': 900})
    pg.goto(f'{BASE}/university/karolinska-institute'); pg.wait_for_selector('h1')
    pg.fill('.header-search input', 'Sweden'); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
    pg.go_back(); pg.wait_for_timeout(600)
    h1 = pg.text_content('h1')
    check('U3 Back returns to the profile that was searched from', pg.url.endswith('/university/karolinska-institute') and h1 == 'Karolinska Institute', f'{pg.url} | {h1}')
    b.close()
raise SystemExit(0 if all(results) else 1)
