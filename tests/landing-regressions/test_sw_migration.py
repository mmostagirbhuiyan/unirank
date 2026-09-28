import argparse
import asyncio
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlsplit
from urllib.request import urlopen

from playwright.async_api import async_playwright

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVER = Path(__file__).with_name('spa_fallback_server.py')


def options():
    parser = argparse.ArgumentParser(description='Exercise migration from the former CRA service worker.')
    parser.add_argument('--old-build', default=os.environ.get('SW_OLD_BUILD'))
    parser.add_argument(
        '--new-build',
        default=os.environ.get('SW_NEW_BUILD', REPO_ROOT / 'frontend' / 'build'),
    )
    parser.add_argument('--work-dir', default=os.environ.get('SW_WORK_DIR'))
    parser.add_argument('--base', default=os.environ.get('SW_BASE', 'http://unirank.localhost:4180/'))
    args = parser.parse_args()
    if not args.old_build:
        parser.error('--old-build or SW_OLD_BUILD must point to a built copy of the former CRA deployment')
    return args


async def state(pg):
    return await pg.evaluate("({root: !!document.querySelector('#root'), app: !!document.querySelector('#app'), fray: !!document.querySelector('.ranking-entry'), title: document.title, controlled: !!navigator.serviceWorker.controller})")


def replace_link(link, target):
    if link.is_symlink() or link.is_file():
        link.unlink()
    elif link.exists():
        shutil.rmtree(link)
    link.symlink_to(target, target_is_directory=True)


def wait_for_server(base):
    parsed = urlsplit(base)
    probe = f'http://127.0.0.1:{parsed.port or 80}/'
    for _ in range(50):
        try:
            with urlopen(probe, timeout=0.2):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f'Server did not start for {base}')


async def run(args, work):
    old_build = Path(args.old_build).expanduser().resolve()
    new_build = Path(args.new_build).expanduser().resolve()
    for label, build in [('old', old_build), ('new', new_build)]:
        if not (build / 'index.html').is_file():
            raise SystemExit(f'{label} build does not contain index.html: {build}')

    current = work / 'current'
    profile = work / 'profile'
    replace_link(current, old_build)
    shutil.rmtree(profile, ignore_errors=True)

    parsed = urlsplit(args.base)
    port = parsed.port or 80
    origin = f'{parsed.scheme}://{parsed.netloc}'
    browser_args = [
        f'--host-resolver-rules=MAP {parsed.hostname} 127.0.0.1',
        f'--unsafely-treat-insecure-origin-as-secure={origin}',
    ]
    server = subprocess.Popen([
        sys.executable,
        str(SERVER),
        str(current),
        '--port',
        str(port),
    ])
    try:
        wait_for_server(args.base)
        async with async_playwright() as p:
            ctx = await p.chromium.launch_persistent_context(str(profile), viewport={'width':1280,'height':800}, args=browser_args)
            pg=ctx.pages[0] if ctx.pages else await ctx.new_page()
            await pg.goto(args.base, wait_until='load'); await pg.wait_for_timeout(1500)
            await pg.evaluate("navigator.serviceWorker.ready.then(()=>1)")
            await pg.reload(wait_until='load'); await pg.wait_for_timeout(1500)
            print('old deployed, visit 2:', await state(pg))
            replace_link(current, new_build); print('swapped')
            for i in range(3):
                await pg.reload(wait_until='load'); await pg.wait_for_timeout(2500)
                print(f'new deployed, reload {i+1}:', await state(pg))
            await pg.close(); pg=await ctx.new_page(); await pg.goto(args.base, wait_until='load'); await pg.wait_for_timeout(2500)
            print('new deployed, fresh tab:', await state(pg))
            regs = await pg.evaluate("navigator.serviceWorker.getRegistrations().then(r=>r.map(x=>x.active&&x.active.scriptURL))")
            print('registrations', regs)
            await ctx.close()
            # control: a first-time visitor
            b=await p.chromium.launch(args=browser_args); q=await b.new_page(); await q.goto(args.base,wait_until='load'); await q.wait_for_timeout(2000); print('first-time visitor:', await state(q)); await b.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


async def main():
    args = options()
    if args.work_dir:
        work = Path(args.work_dir).expanduser().resolve()
        work.mkdir(parents=True, exist_ok=True)
        await run(args, work)
    else:
        with tempfile.TemporaryDirectory(prefix='unirank-sw-') as directory:
            await run(args, Path(directory))


asyncio.run(main())
