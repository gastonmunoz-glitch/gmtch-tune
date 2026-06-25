@echo off
setlocal

set "APP_NAME=GMTCH Tune OS"
set "APP_URL=https://gmtchtune.com/login"
set "BAT_DIR=%~dp0"
set "ROOT=%~dp0..\.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "REPO_ICON=%ROOT%\frontend\public\brand\gmtch-isotipo.png"

set "PS1=%TEMP%\gmtch-instalar-acceso-%RANDOM%.ps1"

echo Instalando accesos directos de %APP_NAME%...
if exist "%REPO_ICON%" (
  echo Proyecto detectado en: %ROOT%
) else (
  echo Modo portable. Se buscara gmtch-isotipo.png junto al instalador.
)

> "%PS1%" (
  echo $ErrorActionPreference = 'Stop'
  echo $appName = 'GMTCH Tune OS'
  echo $appUrl = 'https://gmtchtune.com/login'
  echo $scriptDir = '%BAT_DIR%'
  echo $root = '%ROOT%'
  echo $desktopShortcut = Join-Path $env:USERPROFILE 'Desktop\GMTCH Tune OS.lnk'
  echo $startupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
  echo $startupShortcut = Join-Path $startupDir 'GMTCH Tune OS.lnk'
  echo $programDataDir = Join-Path $env:ProgramData 'GMTCH Tune'
  echo $portableIconSource = Join-Path $scriptDir 'gmtch-isotipo.png'
  echo $repoIconSource = Join-Path $root 'frontend\public\brand\gmtch-isotipo.png'
  echo $iconSource = $null
  echo if (Test-Path $portableIconSource^) {
  echo   $iconSource = $portableIconSource
  echo } elseif (Test-Path $repoIconSource^) {
  echo   $iconSource = $repoIconSource
  echo }
  echo $iconPath = Join-Path $programDataDir 'gmtch.ico'
  echo $iconOk = $false
  echo try {
  echo   New-Item -ItemType Directory -Force -Path $programDataDir ^| Out-Null
  echo   if ($iconSource -and (Test-Path $iconSource^)^) {
  echo     Add-Type -AssemblyName System.Drawing
  echo     $bitmap = [System.Drawing.Bitmap]::FromFile($iconSource^)
  echo     $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon(^)^)
  echo     $stream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create^)
  echo     $icon.Save($stream^)
  echo     $stream.Close(^)
  echo     $icon.Dispose(^)
  echo     $bitmap.Dispose(^)
  echo     $iconOk = Test-Path $iconPath
  echo   } else {
  echo     Write-Host 'No se encontro gmtch-isotipo.png. Se usara el icono del navegador.'
  echo   }
  echo } catch {
  echo   Write-Host 'No se pudo crear icono personalizado. Se usara el icono del navegador.'
  echo   $iconOk = $false
  echo }
  echo $programFiles = [Environment]::GetFolderPath('ProgramFiles'^)
  echo $programFilesX86 = [Environment]::GetFolderPath('ProgramFilesX86'^)
  echo $localAppData = $env:LOCALAPPDATA
  echo $edgeCandidates = @(^)
  echo if ($programFilesX86^) { $edgeCandidates += Join-Path $programFilesX86 'Microsoft\Edge\Application\msedge.exe' }
  echo if ($programFiles^) { $edgeCandidates += Join-Path $programFiles 'Microsoft\Edge\Application\msedge.exe' }
  echo if ($localAppData^) { $edgeCandidates += Join-Path $localAppData 'Microsoft\Edge\Application\msedge.exe' }
  echo $chromeCandidates = @(^)
  echo if ($programFiles^) { $chromeCandidates += Join-Path $programFiles 'Google\Chrome\Application\chrome.exe' }
  echo if ($programFilesX86^) { $chromeCandidates += Join-Path $programFilesX86 'Google\Chrome\Application\chrome.exe' }
  echo if ($localAppData^) { $chromeCandidates += Join-Path $localAppData 'Google\Chrome\Application\chrome.exe' }
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
