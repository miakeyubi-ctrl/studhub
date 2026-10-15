# Script: convertir StudHub-brief-backend.html → StudHub-brief-backend.pdf
# Usage : clic DROIT sur ce fichier → "Exécuter avec PowerShell"
#        OU : ouvre un PowerShell dans le dossier → .\generer-pdf.ps1

$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $proj

$html = Join-Path $proj 'StudHub-brief-backend.html'
$pdf  = Join-Path $proj 'StudHub-brief-backend.pdf'
$md   = Join-Path $proj 'README.md'
$conv = Join-Path $proj 'scripts\md-to-html.cjs'

if (!(Test-Path $html) -or (Get-Item $html).Length -lt 1000) {
  Write-Host "(Re)generation du HTML depuis README.md..." -ForegroundColor Cyan
  if (!(Test-Path $md)) { throw "README.md introuvable dans $proj" }
  node $conv README.md StudHub-brief-backend.html
  if (!(Test-Path $html)) { throw "Echec generation HTML" }
}

$browsers = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
)

$exe = $browsers | Where-Object { Test-Path $_ } | Select-Object -First 1
if (!$exe) {
  Write-Host "Aucun Chrome / Edge installe. Methode alternative :" -ForegroundColor Red
  Write-Host "  1) Ouvre $html dans ton navigateur"
  Write-Host "  2) Ctrl+P → Destination : Enregistrer en PDF"
  throw "Chrome / Edge introuvable"
}

$tmp = Join-Path $proj '.tmp-edge-profile'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

if (Test-Path $pdf) { Remove-Item $pdf -Force }

Write-Host "Navigateur utilise : $exe" -ForegroundColor Green
Write-Host "Generation du PDF en cours..." -ForegroundColor Cyan

$url = 'file:///' + $html.Replace('\','/')
& $exe --headless=new `
  --disable-gpu --hide-scrollbars --no-sandbox --mute-audio `
  --user-data-dir="$tmp" `
  --print-to-pdf="$pdf" `
  --print-to-pdf-no-header `
  $url | Out-Null

# Attendre que le fichier apparaisse (max 15s)
$i = 0
while (!(Test-Path $pdf) -and $i -lt 30) { Start-Sleep -Milliseconds 500 ; $i++ }

if (Test-Path $pdf) {
  $f = Get-Item $pdf
  Write-Host ""
  Write-Host "======================================================" -ForegroundColor Green
  Write-Host "  PDF GENERE AVEC SUCCES !" -ForegroundColor Green
  Write-Host "  Fichier : $($f.FullName)" -ForegroundColor Green
  Write-Host "  Taille  : $([math]::Round($f.Length/1KB,1)) KB" -ForegroundColor Green
  Write-Host "======================================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "Ouvrir le PDF ? (O/N)  defaut: O" -ForegroundColor Cyan -NoNewline
  $rep = (Read-Host).Trim().ToLower()
  if ($rep -ne 'n') { Start-Process $pdf }
} else {
  Write-Host ""
  Write-Host "La generation auto a echoue (souvent blocage antivirus)." -ForegroundColor Yellow
  Write-Host "==> Methode ULTRA SIMPLE, 3 clics :" -ForegroundColor Yellow
  Write-Host "   1. Double-clique sur :  $html"
  Write-Host "   2. Quand Edge l'ouvre : appuie sur  CTRL + P"
  Write-Host "   3. 'Destination' → choisis :  Enregistrer en PDF  →  Enregistrer"
  Write-Host ""
  Start-Process $html
}

# Nettoyage
if (Test-Path $tmp) { Remove-Item -Recurse -Force -Path $tmp -ErrorAction SilentlyContinue }
