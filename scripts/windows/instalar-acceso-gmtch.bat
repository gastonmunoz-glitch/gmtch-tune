@echo off
setlocal

set "APP_NAME=GMTCH Tune OS"
set "APP_URL=https://gmtchtune.com/login"
set "ROOT=%~dp0..\.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"

set "PS1=%TEMP%\gmtch-instalar-acceso-%RANDOM%.ps1"

echo Instalando accesos directos de %APP_NAME%...
echo Proyecto detectado en: %ROOT%

> "%PS1%" (
  echo $ErrorActionPreference = 'Stop'
  echo $appName = 'GMTCH Tune OS'
  echo $appUrl = 'https://gmtchtune.com/login'
  echo $root = '%ROOT%'
  echo $desktopShortcut = Join-Path $env:USERPROFILE 'Desktop\GMTCH Tune OS.lnk'
  echo $startupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
  echo $startupShortcut = Join-Path $startupDir 'GMTCH Tune OS.lnk'
  echo $programDataDir = Join-Path $env:ProgramData 'GMTCH Tune'
  echo $iconSource = Join-Path $root 'frontend\public\brand\gmtch-isotipo.png'
  echo $iconPath = Join-Path $programDataDir 'gmtch.ico'
  echo $iconOk = $false
  echo try {
  echo   New-Item -ItemType Directory -Force -Path $programDataDir ^| Out-Null
  echo   if (Test-Path $iconSource^) {
  echo     Add-Type -AssemblyName System.Drawing
  echo     $bitmap = [System.Drawing.Bitmap]::FromFile($iconSource^)
  echo     $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon(^)^)
  echo     $stream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create^)
  echo     $icon.Save($stream^)
  echo     $stream.Close(^)
  echo     $icon.Dispose(^)
  echo     $bitmap.Dispose(^)
  echo     $iconOk = Test-Path $iconPath
  echo   }
  echo } catch {
  echo   Write-Host 'No se pudo crear icono personalizado. Se usara el icono del navegador.'
  echo   $iconOk = $false
  echo }
  echo $edgeCandidates = @(
  echo   Join-Path ${env:ProgramFiles(x86^)} 'Microsoft\Edge\Application\msedge.exe',
  echo   Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe',
  echo   Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'
  echo ^)
  echo $chromeCandidates = @(
  echo   Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe',
  echo   Join-Path ${env:ProgramFiles(x86^)} 'Google\Chrome\Application\chrome.exe',
  echo   Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'
  echo ^)
  echo $browser = $edgeCandidates ^| Where-Object { Test-Path $_ } ^| Select-Object -First 1
  echo $browserName = 'Microsoft Edge'
  echo if (-not $browser^) {
  echo   $browser = $chromeCandidates ^| Where-Object { Test-Path $_ } ^| Select-Object -First 1
  echo   $browserName = 'Google Chrome'
  echo }
  echo if ($browser^) {
  echo   $targetPath = $browser
  echo   $arguments = '--new-window "' + $appUrl + '"'
  echo } else {
  echo   $targetPath = Join-Path $env:WINDIR 'System32\rundll32.exe'
  echo   $arguments = 'url.dll,FileProtocolHandler ' + $appUrl
  echo   $browserName = 'navegador predeterminado'
  echo }
  echo function New-GmtchShortcut($path^) {
  echo   if (Test-Path $path^) { Remove-Item -LiteralPath $path -Force }
  echo   $parent = Split-Path $path -Parent
  echo   New-Item -ItemType Directory -Force -Path $parent ^| Out-Null
  echo   $shell = New-Object -ComObject WScript.Shell
  echo   $shortcut = $shell.CreateShortcut($path^)
  echo   $shortcut.TargetPath = $targetPath
  echo   $shortcut.Arguments = $arguments
  echo   $shortcut.WorkingDirectory = Split-Path $targetPath -Parent
  echo   $shortcut.WindowStyle = 1
  echo   $shortcut.Description = 'Abrir GMTCH Tune OS'
  echo   if ($iconOk^) { $shortcut.IconLocation = $iconPath } else { $shortcut.IconLocation = $targetPath + ',0' }
  echo   $shortcut.Save(^)
  echo }
  echo New-GmtchShortcut $desktopShortcut
  echo New-GmtchShortcut $startupShortcut
  echo Write-Host ''
  echo Write-Host 'Instalacion completada.'
  echo Write-Host ('Navegador seleccionado: ' + $browserName^)
  echo Write-Host ('Acceso Escritorio: ' + $desktopShortcut^)
  echo Write-Host ('Inicio automatico: ' + $startupShortcut^)
  echo if ($iconOk^) { Write-Host ('Icono creado: ' + $iconPath^) }
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%ERRORLEVEL%"
del "%PS1%" >nul 2>nul

if not "%RC%"=="0" (
  echo.
  echo No se pudo completar la instalacion. Revisa los permisos de Windows.
  exit /b %RC%
)

echo.
echo Listo. Puedes cerrar esta ventana.
exit /b 0
