# Re-sync the published apps from the private USAMM working repo, then review + push.
# Run from this repo's root: .\sync-from-usamm.ps1
$src = 'C:\Users\bertramj\Documents\USAMM'
$dst = $PSScriptRoot

# Pocket USAMM (mobile/) + DROVE (drove/)
Copy-Item "$src\mobile\*" "$dst\mobile\" -Recurse -Force
New-Item -ItemType Directory -Force "$dst\drove" | Out-Null
foreach ($f in 'index.html', 'drove.js', 'README.txt') {
    Copy-Item "$src\drove\$f" "$dst\drove\" -Force
}

# Shared visuals both apps read
foreach ($f in 'state-geo.js', 'states-data.js', 'usamm-charts.js',
               'state-outlines.js', 'flow-detail.js') {
    Copy-Item "$src\figure-generation\visuals\$f" "$dst\figure-generation\visuals\" -Force
}

# County choropleth SVGs
foreach ($sub in 'maps_svg', 'beef\maps_svg', 'dairy\maps_svg', 'swine\maps_svg') {
    Copy-Item "$src\figure-generation\output\$sub\*.svg" "$dst\figure-generation\output\$sub\" -Force
}
git -C $dst status --short
Write-Host "`nReview the diff above, then: git add -A; git commit; git push"
