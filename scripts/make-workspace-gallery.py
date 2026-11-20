from pathlib import Path
import html,json
folder=Path('docs/screenshots/workspace')
shots=[
 ('before-brief-desktop.png','Before · desktop brief'),
 ('after-desktop-brief.png','After · desktop brief'),
 ('before-3d-desktop.png','Before · desktop project screen'),
 ('after-desktop-3d-selected.png','After · desktop selected room'),
 ('before-exterior.png','Before · saved street camera'),
 ('after-exterior-matched-high.png','After · same camera and High quality'),
 ('after-desktop-2d.png','Desktop · furnished 2D'),
 ('after-desktop-present.png','Desktop · Present'),
 ('after-desktop-walk.png','Desktop · room jump and walk'),
 ('compass-angle-a.png','Compass · first angle'),
 ('compass-angle-b.png','Compass · quarter turn'),
 ('after-ipad-landscape-drawer.png','iPad landscape · layers drawer'),
 ('after-ipad-landscape-walk.png','iPad landscape · touch walk'),
 ('after-ipad-portrait-drawer.png','iPad portrait · Inspector drawer'),
 ('after-ipad-portrait-walk.png','iPad portrait · touch walk'),
 ('after-phone-3d-sheet.png','Phone · Inspector bottom sheet'),
 ('after-3d-pick.png','Physical 3D pick · shared Inspector selection'),
 ('after-climate-dock.png','Existing climate study · bottom dock')]
assert all((folder/name).is_file() for name,_ in shots)
cards=''.join('<a href="'+name+'"><figure><img src="'+name+'" alt="'+html.escape(label)+'" loading="lazy"><figcaption>'+html.escape(label)+'</figcaption></figure></a>' for name,label in shots)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace verification</title><style>
body{margin:0;background:#f3f4ee;color:#2a3b30;font:14px/1.6 system-ui,sans-serif}main{max-width:1480px;margin:auto;padding:35px}h1{font-size:30px;letter-spacing:-1px;margin:0}p{max-width:85ch;color:#78816e}nav{display:flex;gap:20px;flex-wrap:wrap;margin:25px 0}a{color:#3e6446;text-decoration:none}.shots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}figure{margin:0;background:#fff;border:1px solid #dde2d5;border-radius:9px;overflow:hidden}img{display:block;width:100%;height:340px;object-fit:contain;background:#e7eade}figcaption{padding:14px;font-weight:600}@media(max-width:760px){main{padding:20px}.shots{grid-template-columns:1fr}img{height:320px}}
</style><main><h1>House Concept Studio · workspace</h1><p>Actual demo-browser captures. House geometry, facade recipes and materials are unchanged. Quality and device limits are described in the report; these images do not establish photorealism or physical iPad performance.</p><nav><a href="../../../WORKSPACE-UPDATE.md">Full update report</a><a href="comparison.md">Honest comparison</a><a href="verification.json">Browser evidence</a><a href="controls-verification.json">Controls and export evidence</a></nav><div class="shots">'''+cards+'''</div></main></html>'''
(folder/'index.html').write_text(page+'\n',encoding='utf-8')
# Preserve the final successful evidence; discard only this task's superseded failure summaries.
for name in ['verification-incomplete.json','controls-incomplete.json']:
 p=folder/name
 if p.exists():p.unlink()
print('Gallery written:',len(shots),'actual screenshots')
