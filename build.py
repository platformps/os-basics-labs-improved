#!/usr/bin/env python3
"""Builds single-file accessible lab pages from shared engine sources and per-lab content."""
import json, re, sys, pathlib, html

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
import os
DIST = ROOT / os.environ.get('OUT', 'dist')

LABS = json.loads((SRC / 'labs.json').read_text())
GUIDED = bool(os.environ.get('GUIDED'))
GUIDED_SLUG = os.environ.get('GUIDED') if os.environ.get('GUIDED') not in (None, '', '1', 'true') else 'guided'
GUIDED_LABEL = {'guided': 'guided test version'}.get(GUIDED_SLUG, GUIDED_SLUG + ' version')
COURSE = json.loads((SRC / 'course.json').read_text()) if (SRC / 'course.json').exists() else {'key': 'osb', 'title': 'Course', 'eyebrow': '', 'provider': '', 'platform': 'course', 'originalLabel': 'Original lab', 'org': 'Per Scholas', 'orgTeam': 'Per Scholas', 'tagline': 'Accelerating careers. Transforming lives.', 'modules': {}}
if GUIDED:
    COURSE['key'] = COURSE['key'] + '-' + GUIDED_SLUG
    COURSE['title'] = COURSE['title'] + ' (' + GUIDED_LABEL + ')'
    COURSE['basePath'] = os.environ.get('BASE') or (COURSE.get('basePath', '/') + GUIDED_SLUG + '/')
E = html.escape
ROBOTS = '<meta name="robots" content="noindex, nofollow">' if COURSE.get('noindex') else ''

def read(p): return (SRC / p).read_text(encoding='utf-8')
import base64
def data_uri(p): return 'data:image/png;base64,' + base64.b64encode((SRC / p).read_bytes()).decode()
LOGO = None

HOWTO = {
 'linux': """
<h2 id="howto">How to use this simulation</h2>
<p>The simulated Linux computer is in the region headed <a href="#sim-h">Simulated Linux workstation</a>. It stands in for the course virtual machine. It works with a keyboard and with NVDA, JAWS, Narrator, and VoiceOver, and nothing is installed on your computer.</p>
<ul class="tri">
<li><strong>Open apps</strong> with the <strong>Applications</strong> button on the dock: Terminal, the SciTE text editor, and Firefox.</li>
<li><strong>In the terminal,</strong> type a command in the command box and press Enter. Each command and its output appear under their own level 4 heading, so the H key in your screen reader jumps from command to command. Up Arrow recalls earlier commands. Tables such as <code>ls -l</code> and <code>ps</code> output also have a <strong>Table view</strong> you can open.</li>
<li><strong>sudo</strong> asks for your password, which the lab gives you. The password box does not show what you type, just like a real terminal.</li>
<li><strong>Commands that keep running</strong>, such as <code>tail -f</code>, keep printing until you press <strong>Stop command</strong> or Ctrl+C in the command box.</li>
<li><strong>Long dashes</strong> copied from documents are changed to plain hyphens for you, and you are told when that happens.</li>
<li><strong>Your checklist marks itself</strong> as you complete each task. The computer starts fresh each time you open this page; your answers and checklist are saved in this browser.</li>
</ul>
""",
 'win': """
<h2 id="howto">How to use this simulation</h2>
<p>The simulated Windows PC is in the region headed <a href="#sim-h">Simulated Windows PC</a>. It works with a keyboard and with NVDA, JAWS, Narrator, and VoiceOver. Nothing is installed on your computer, and nothing you do here changes your real computer.</p>
<ul class="tri">
<li><strong>Open apps</strong> with the <strong>Start</strong> button on the simulated taskbar, then type the app name in the search box. Some results also offer <strong>Run as administrator</strong>.</li>
<li><strong>One window shows at a time.</strong> The taskbar lists every open window; choose one to switch to it. When a window opens, focus moves to its title, which is a level 3 heading.</li>
<li><strong>Lists and tables:</strong> each row starts with a button. Select a row with Enter or Space, move between rows with the Up and Down Arrow keys, and open the row's actions with the <strong>Actions</strong> button or with Shift+F10. Column header buttons sort the table.</li>
<li><strong>Trees</strong> (such as a folder or console tree): Up and Down Arrow move, Right Arrow expands, Left Arrow collapses, Enter selects.</li>
<li><strong>Command windows:</strong> type in the command box and press Enter. Each command and its output appear under their own level 4 heading, so the H key in your screen reader jumps from command to command. Up Arrow recalls earlier commands.</li>
<li><strong>Your checklist marks itself</strong> as you complete each task, and your progress is announced. You can also check items yourself.</li>
<li>The simulated PC starts fresh each time you open this page. Your answers and checklist are saved in this browser.</li>
</ul>
<p>Real Windows keyboard shortcuts such as Ctrl+Shift+Esc or the Windows key are not used here, because your real computer would respond to them instead of the simulation. The lab tells you the real shortcut where it matters.</p>
""",
 'mobile': """
<h2 id="howto">How to use this simulation</h2>
<p>The simulated phone is in the region headed <a href="#sim-h">Simulated phone</a>. It works with a keyboard and with NVDA, JAWS, Narrator, and VoiceOver. Nothing is installed, and nothing changes on a real phone.</p>
<ul class="tri">
<li><strong>Touch becomes a button.</strong> Where a real phone uses a tap, the simulation has a button: press Enter or Space. When the screen changes, focus moves to the screen title, a level 3 heading.</li>
<li><strong>Switches</strong> such as Wi-Fi are announced as switches that are on or off. Press Space to flip them.</li>
<li><strong>Touch and hold or drag</strong> becomes an <strong>Actions</strong> button next to each app or widget, with choices such as Move, Create folder, Remove, and Uninstall. This mirrors the Actions menu that TalkBack and VoiceOver users use on real phones.</li>
<li><strong>Back and Home</strong> buttons sit under the phone screen, like the navigation bar or gestures on a real phone.</li>
<li><strong>Messages</strong> that a phone shows briefly, such as "Connected," are spoken for you and stay on screen below the phone content.</li>
<li><strong>Your checklist marks itself</strong> as you complete each task. The phone starts fresh each time you open this page; your answers and checklist are saved in this browser.</li>
</ul>
""",
}

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{robots}
<title>{title_short}: Accessible Simulation, Lab {page}</title>
<meta name="description" content="{desc}">
<style>
{css}
</style>
</head>
<body>
<a class="skip-link" href="#lab-start">Skip to lab steps</a>
<a class="skip-link" href="#sim-h">Skip to the simulation</a>
<header class="site">
  <div class="brandbar"><div class="wrap"><img src="{logo}" alt="{org}" width="310" height="54"><p class="tagline">{tagline}</p></div></div>
  <div class="wrap topbar">
    <div>
      <p class="eyebrow">{course_title} &middot; Module {module} &middot; Lab {page}</p>
      <h1>{title}</h1>
      <ul class="badges" aria-label="About this edition">
        <li class="badge sim">Accessible simulation</li>
        <li class="badge">Nothing to install</li>
        <li class="badge">Keyboard and screen reader ready</li>
      </ul>
    </div>
    <nav aria-label="Lab navigation" class="toolbar">
      <a class="btn secondary" href="../index.html">All labs</a>
      {prevnext}
      <span class="field"><label for="theme">Color theme</label>
      <select id="theme"><option value="">Match my device</option><option value="light">Light</option><option value="dark">Dark</option></select></span>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
  <div class="layout split">
    <div class="lab-col">
      <section aria-labelledby="progress-h" class="panel" style="margin-top:20px">
        <h2 id="progress-h" style="margin-top:0">Your progress</h2>
        <p id="progress-text" class="progress-text">0 tasks complete</p>
        <meter id="progress-meter" min="0" max="1" value="0" aria-labelledby="progress-text"></meter>
        <ol id="tasks" class="checklist" aria-label="Task checklist"></ol>
        <div class="toolbar">
          <button type="button" id="btn-export">Download my answers</button>
          <button type="button" id="btn-clear" class="secondary">Start over</button>
        </div>
        {settings}
      </section>
      <div id="lab-start" tabindex="-1"></div>
      {content}
      {howto}
      {corrections}
    </div>
    <div class="sim-col">
      <section aria-labelledby="sim-h" class="sim-frame">
        <h2 id="sim-h" tabindex="-1" style="margin-top:4px">{sim_heading}</h2>
        <p><a id="back-to-steps" href="#lab-start" hidden>Back to the lab step you were on</a></p>
        <p id="status-visible" class="status-line" aria-hidden="true"></p>
        <div id="sim"></div>
      </section>
    </div>
  </div>
</main>
<footer class="site"><div class="wrap">
  <p>Accessible simulation for {org} learners, based on the {provider} {course_title} course, Lab {page}. Built to be used with a keyboard and a screen reader. If something does not work for you, tell your instructor so it can be fixed.</p>
</div></footer>
<div id="sr-polite" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="sr-assert" class="sr-only" role="alert" aria-live="assertive" aria-atomic="true"></div>
<dialog id="confirm-clear" aria-labelledby="cc-t" aria-describedby="cc-b">
  <form method="dialog">
    <div class="dlg-head"><h2 id="cc-t">Start over?</h2></div>
    <div class="dlg-body"><p id="cc-b">This clears your answers and checklist for this lab and restarts the simulation. It cannot be undone.</p></div>
    <div class="dlg-foot"><button value="yes">Yes, start over</button><button value="no" class="secondary" autofocus>Cancel</button></div>
  </form>
</dialog>
<script>
{js}
</script>
</body>
</html>
"""

SETTINGS_TERM = """<details class="settings"><summary>Simulation settings</summary>
<div class="opt"><input type="checkbox" id="opt-readaloud" checked><label for="opt-readaloud">Read command output aloud automatically. Turn this off to hear only a short summary, then read the output with your screen reader's reading keys.</label></div>
</details>"""

DASHES = re.compile('[\u2010-\u2015\u2212]')

def build_lab(meta, all_labs):
    lid = meta['id']
    frag = read(f"labs/{lid}.html")
    corr_m = re.search(r'<!--CORRECTIONS-->(.*)<!--/CORRECTIONS-->', frag, re.S)
    corrections = corr_m.group(1) if corr_m else ''
    content = frag.replace(corr_m.group(0), '') if corr_m else frag
    engine = meta['engine']
    css = read('shell.css') + '\n' + read('win.css')
    js_parts = [read('shell.js'), read('term.js')]
    if engine == 'win':
        js_parts += [read('win.js'), read('win-apps.js')] + [read(x) for x in meta.get('extra', [])]
    elif engine == 'linux':
        js_parts += [read('win.js'), read('linux.js')]
    elif engine == 'mobile':
        css += '\n' + read('mobile.css')
        js_parts = [read('shell.js'), read('mobile.js')]
    js_parts.append(read(f"labs/{lid}.js"))
    if GUIDED:
        js_parts.append(read('guided.js')); css += '\n' + read('guided.css')
    js = f'window.COURSE_KEY = {json.dumps(COURSE["key"])};\n' + '\n'.join(js_parts)
    built = [l for l in all_labs if l.get('built')]
    idx = [l['id'] for l in built].index(lid)
    pn = []
    if idx > 0: pn.append(f'<a class="btn secondary" href="{built[idx-1]["file"]}">Previous lab: {built[idx-1]["page"]}</a>')
    if idx < len(built) - 1: pn.append(f'<a class="btn secondary" href="{built[idx+1]["file"]}">Next lab: {built[idx+1]["page"]}</a>')
    out = TEMPLATE.format(
        title=html.escape(meta['title']), title_short=html.escape(meta.get('short', meta['title'])), page=meta['page'], module=meta['module'],
        desc=html.escape(meta['summary']), css=css, js=js, content=content, corrections=corrections,
        howto=HOWTO.get(engine, ''), sim_heading=meta.get('sim_heading', {'linux': 'Simulated Linux workstation', 'mobile': 'Simulated phone'}.get(engine, 'Simulated Windows PC')),
        settings=SETTINGS_TERM if meta.get('terminal') else '', prevnext=' '.join(pn), logo=data_uri('brand/wordmark-white.png'), robots=ROBOTS, org=E(COURSE['org']), tagline=E(COURSE['tagline']), course_title=E(COURSE['title']), provider=E(COURSE['provider']))
    if GUIDED:
        out = out.replace('<li class="badge sim">Accessible simulation</li>', '<li class="badge sim">Accessible simulation, ' + GUIDED_LABEL + '</li>', 1)
    bad = DASHES.findall(out)
    if bad:
        for m in DASHES.finditer(out):
            print('DASH in', lid, repr(out[max(0, m.start()-40):m.end()+20]))
        sys.exit(1)
    (DIST / 'labs').mkdir(parents=True, exist_ok=True)
    (DIST / 'labs' / meta['file']).write_text(out, encoding='utf-8')
    print('built', meta['file'], len(out)//1024, 'KB')

def real_template():
    t = TEMPLATE
    t = t.replace(': Accessible Simulation, Lab {page}', ': Screen Reader Edition, Lab {page}')
    t = t.replace('<a class="skip-link" href="#sim-h">Skip to the simulation</a>\n', '')
    t = re.sub(r'<li class="badge sim">.*?</ul>', '<li class="badge real">Screen reader edition for your own phone</li>\n        <li class="badge">{sr_badge}</li>\n      </ul>', t, flags=re.S)
    t = t.replace('<div class="layout split">', '<div class="layout">')
    t = re.sub(r'\s*<div class="sim-col">.*?</section>\s*</div>', '', t, flags=re.S)
    t = t.replace('Accessible simulation for {org} learners', 'Screen reader edition for {org} learners').replace('Built to be used with a keyboard and a screen reader.', 'Written for VoiceOver and TalkBack on a real phone.')
    return t

def build_real(meta, ed, all_labs):
    lid = meta['id']
    frag = read(f"labs/{lid}.real.html")
    corr_m = re.search(r'<!--CORRECTIONS-->(.*)<!--/CORRECTIONS-->', frag, re.S)
    corrections = corr_m.group(1) if corr_m else ''
    content = frag.replace(corr_m.group(0), '') if corr_m else frag
    css = read('shell.css') + '\n' + read('win.css')
    js = f'window.COURSE_KEY = {json.dumps(COURSE["key"])};\n' + read('shell.js') + '\n' + read(f"labs/{lid}.real.js")
    sim_file = meta['file']
    pn = [f'<a class="btn secondary" href="{sim_file}">Simulation edition of this lab</a>']
    out = real_template().format(
        title=html.escape(meta['title']), title_short=html.escape(meta.get('short', meta['title'])), page=meta['page'], module=meta['module'],
        desc=html.escape(meta['summary']), css=css, js=js, content=content, corrections=corrections, howto='', sim_heading='',
        settings='', prevnext=' '.join(pn), logo=data_uri('brand/wordmark-white.png'), robots=ROBOTS, org=E(COURSE['org']), tagline=E(COURSE['tagline']), course_title=E(COURSE['title']), provider=E(COURSE['provider']), sr_badge=html.escape(ed.get('badge', 'VoiceOver and TalkBack')))
    if DASHES.search(out):
        for m in DASHES.finditer(out): print('DASH in', lid, 'real', repr(out[max(0, m.start()-40):m.end()+20]))
        sys.exit(1)
    (DIST / 'labs' / ed['file']).write_text(out, encoding='utf-8')
    print('built', ed['file'], len(out)//1024, 'KB')

def main():
    only = sys.argv[1:]
    for meta in LABS:
        if meta.get('built') and (not only or meta['id'] in only):
            build_lab(meta, LABS)
            for ed in meta.get('editions', []):
                if ed['type'] == 'real' and ed.get('status') == 'available':
                    build_real(meta, ed, LABS)
    hub = read('hub.html') if (SRC / 'hub.html').exists() else None
    if hub:
        page = hub.replace('/*CSS*/', read('shell.css')).replace('/*COURSE_JSON*/', json.dumps(COURSE, ensure_ascii=True)).replace('%COURSE_TITLE%', E(COURSE['title'])).replace('%EYEBROW%', E(COURSE['eyebrow'])).replace('%ORIG_LABEL%', E(COURSE['originalLabel'])).replace('%PLATFORM%', E(COURSE['platform'])).replace('%PROVIDER%', E(COURSE['provider'])).replace('%ORG_TEAM%', E(COURSE['orgTeam'])).replace('%ORG%', E(COURSE['org'])).replace('%TAGLINE%', E(COURSE['tagline'])).replace('%LOGO%', data_uri('brand/wordmark-white.png')).replace('%ARC%', data_uri('brand/brandmark-slate-luminous.png')).replace('/*LABS_JSON*/', json.dumps(LABS, ensure_ascii=True))
        if DASHES.search(page):
            for m in DASHES.finditer(page): print('DASH in hub', repr(page[max(0, m.start()-40):m.end()+20]))
            sys.exit(1)
        page = page.replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + ROBOTS, 1)
        (DIST / 'index.html').write_text(page, encoding='utf-8')
        nf = read('404.html') if (SRC / '404.html').exists() else None
        if nf:
            nf = nf.replace('/*CSS*/', read('shell.css')).replace('%ROBOTS%', ROBOTS).replace('%LOGO%', data_uri('brand/wordmark-white.png')).replace('%ORG%', E(COURSE['org'])).replace('%COURSE_TITLE%', E(COURSE['title'])).replace('%BASE%', COURSE.get('basePath', '/'))
            (DIST / '404.html').write_text(nf, encoding='utf-8')
        (DIST / '.nojekyll').write_text('', encoding='utf-8')
        print('built index.html')

if __name__ == '__main__':
    main()
