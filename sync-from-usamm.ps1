# Re-sync the published app from the private USAMM working repo, then review + push.
# Run from this repo's root: .\sync-from-usamm.ps1
$src = 'C:\Users\bertramj\Documents\USAMM'
$dst = $PSScriptRoot

Copy-Item "$src\mobile\*" "$dst\mobile\" -Recurse -Force
foreach ($f in 'state-geo.js', 'states-data.js', 'usamm-charts.js') {
    Copy-Item "$src\figure-generation\visuals\$f" "$dst\figure-generation\visuals\" -Force
}
foreach ($sub in 'maps_svg', 'beef\maps_svg', 'dairy\maps_svg', 'swine\maps_svg') {
    Copy-Item "$src\figure-generation\output\$sub\*.svg" "$dst\figure-generation\output\$sub\" -Force
}
git -C $dst status --short
Write-Host "`nReview the diff above, then: git add -A; git commit; git push"
