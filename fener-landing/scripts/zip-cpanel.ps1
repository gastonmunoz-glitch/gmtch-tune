$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$distPath = Join-Path $projectRoot "dist"
$zipPath = Join-Path $projectRoot "fener-web-dist.zip"
$indexPath = Join-Path $distPath "index.html"
$healthPath = Join-Path $distPath "health-check.txt"

if (-not (Test-Path -LiteralPath $distPath -PathType Container)) {
  throw "No existe la carpeta dist. Ejecuta 'npm run build' antes de crear el ZIP."
}

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "No existe dist/index.html. Revisa el build antes de subir a cPanel."
}

if (-not (Test-Path -LiteralPath $healthPath -PathType Leaf)) {
  throw "No existe dist/health-check.txt. Revisa que public/health-check.txt exista y ejecuta 'npm run build'."
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

# includeBaseDirectory = $false deja index.html y _astro en la raiz del ZIP, sin envolverlos en una carpeta dist.
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $distPath,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

Write-Host "ZIP listo para cPanel: $zipPath"
