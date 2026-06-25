# Acceso directo GMTCH Tune OS para Windows

Este instalador crea accesos directos para abrir la plataforma GMTCH Tune OS en:

- Escritorio del usuario: `%USERPROFILE%\Desktop\GMTCH Tune OS.lnk`
- Inicio automatico: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\GMTCH Tune OS.lnk`

La URL configurada es:

```text
https://gmtchtune.com/login
```

## Como ejecutarlo desde el proyecto

1. Abre CMD o PowerShell.
2. Entra al proyecto:

```bat
cd /d C:\gmtch-tune-app
```

3. Ejecuta:

```bat
scripts\windows\instalar-acceso-gmtch.bat
```

No deberia requerir permisos de administrador. Si Windows bloquea la creacion del icono en `%ProgramData%`, el acceso directo usara el icono del navegador.

## Como usarlo en otros PC

Para instalarlo en otro computador sin copiar todo el proyecto, prepara una carpeta con estos archivos:

```text
instalar-acceso-gmtch.bat
gmtch-isotipo.png
README_ACCESO_GMTCH.md
```

Luego ejecuta `instalar-acceso-gmtch.bat` desde esa carpeta. El instalador buscara primero `gmtch-isotipo.png` junto al `.bat`. Si no lo encuentra, intentara usar el logo del proyecto en `frontend/public/brand/gmtch-isotipo.png`. Si tampoco existe, continuara con el icono del navegador.

## Que crea

El instalador intenta usar `gmtch-isotipo.png` junto al `.bat` para crear:

```text
%ProgramData%\GMTCH Tune\gmtch.ico
```

Si se ejecuta desde el proyecto y no existe el archivo portable, usa como fallback `frontend/public/brand/gmtch-isotipo.png`.

Luego crea accesos directos que abren GMTCH Tune OS en ventana nueva. Prefiere Microsoft Edge; si no existe, usa Google Chrome; si tampoco existe, usa el navegador predeterminado.

## Quitar inicio automatico

Elimina este archivo:

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\GMTCH Tune OS.lnk
```

## Eliminar acceso del Escritorio

Elimina este archivo:

```text
%USERPROFILE%\Desktop\GMTCH Tune OS.lnk
```

## Notas

- Si ejecutas el instalador otra vez, reemplaza los accesos anteriores.
- Puede ejecutarse desde `C:\gmtch-tune-app` o desde una carpeta portable con el `.bat` y `gmtch-isotipo.png`.
- No modifica backend, frontend ni variables de entorno.
