# Diagramas de Flujo GMTCH Tune OS

Version: V1  
Fecha: 2026-06-25

Documento vivo de arquitectura y flujos operativos de GMTCH Tune OS, web publica, portal interno y Portal Masters/File Service. No incluye tokens, contrasenas ni datos sensibles.

## 1. Mapa General de Arquitectura

```mermaid
flowchart LR
  U1["Cliente final"] --> WEB["https://gmtchtune.com/web"]
  U2["Equipo GMTCH"] --> LOGIN["https://gmtchtune.com/login"]
  U3["Master / Slave externo"] --> PLOGIN["https://gmtchtune.com/portal/login"]

  WEB --> CF["Cloudflare / DNS"]
  LOGIN --> CF
  PLOGIN --> CF

  CF --> FE["Railway Frontend: gmtch-frontend"]
  FE --> API["API oficial: https://api.gmtchtune.com/api"]
  API --> BE["Railway Backend: gmtch-tune"]
  BE --> DB["PostgreSQL Railway"]

  GH["GitHub main"] --> RDEP["Railway deploy"]
  RDEP --> FE
  RDEP --> BE
```

## 2. Flujo Web Publica

```mermaid
flowchart TD
  A["Usuario entra a /web"] --> B["Ve servicios GMTCH Tune"]
  B --> C["Ve GMTCH Tune OS"]
  C --> D{"Accion"}
  D --> W["WhatsApp"]
  D --> I["Instagram"]
  D --> P["Portal File Service /portal/login"]
  D --> L["Plataforma interna /login"]
```

## 3. Flujo Interno GMTCH Tune OS

```mermaid
flowchart TD
  A["Login interno"] --> B["Dashboard / Centro de mando"]
  B --> C["Clientes"]
  B --> D["Vehiculos"]
  B --> E["Ordenes de trabajo"]
  E --> F["Diagnostico"]
  E --> G["File Service interno"]
  E --> H["Fotos / evidencia"]
  E --> I["Pagos / cierre comercial"]
  B --> J["Notificaciones"]
  B --> K["Usuarios / roles"]
```

## 3.1 Centro de Mando Operativo V2

```mermaid
flowchart TD
  A["Dashboard interno"] --> B["Atencion inmediata"]
  A --> C["Semaforo operativo"]
  A --> D["Cola de trabajo del dia"]
  A --> E["File Service"]
  A --> F["Postventa tecnica / correcciones"]
  A --> G["Intervencion fisica"]
  A --> H["Acciones rapidas"]

  B --> B1["Correcciones tecnicas pendientes"]
  B --> B2["Archivos ECU pendientes"]
  B --> B3["Post escritura pendiente"]
  B --> B4["Nueva lectura requerida"]
  B --> B5["MOD listo"]
  B --> B6["Vehiculos listos para entrega"]
  B --> B7["Pagos pendientes antes de entrega"]

  C --> C1{"Estado general"}
  C1 -->|Verde| C2["Operacion normal"]
  C1 -->|Ambar| C3["Atencion requerida"]
  C1 -->|Rojo| C4["Bloqueo operativo"]

  D --> D1["Orden, cliente, vehiculo, estado y prioridad"]
  D1 --> D2["Responsable actual"]
  D2 --> D3["Proxima accion"]

  E --> E1["Pendiente revision"]
  E --> E2["En proceso"]
  E --> E3["MOD listo"]
  E --> E4["Correccion pendiente"]
  E --> E5["Nueva lectura requerida"]
  E --> E6["Post escritura pendiente"]

  F --> F1["Cliente volvio por DTC"]
  F --> F2["Responsable sugerido"]
  F --> F3["Estado de correccion"]
  F3 --> I["Notificacion interna, campana, alerta visual y sonido si aplica"]

  G --> G1["Mecanica asociada al servicio tecnico"]
  G --> G2["Mecanica independiente / mantencion"]
```

Regla: el Centro de Mando V2 prioriza bloqueos operativos, postventa tecnica, File Service, post escritura, pagos pendientes antes de entrega e intervencion fisica sin exponer caja a roles no autorizados.

## 4. Flujo Orden de Trabajo

```mermaid
flowchart TD
  A["Recepcion"] --> B["Diagnostico"]
  B --> C{"Trabajo requerido"}
  C -->|ECU / TCU| D["Programacion ECU/TCU"]
  C -->|Mecanica independiente| E["Mecanica independiente / mantencion"]
  C -->|Archivo externo| F["File Service"]
  D --> X{"Intervencion fisica asociada"}
  F --> X
  X -->|DPF/FAP, EGR, escape, desmontaje o montaje| Y["Mecanica asociada al servicio tecnico"]
  X -->|No aplica| G{"Post escritura aplica"}
  Y --> Z["Checklist: desmontaje, revision fisica, montaje, inspeccion visual"]
  Z --> G
  E --> H["Listo para entrega"]
  G -->|Si| I["Registrar post escritura"]
  G -->|No| H
  I --> H
  H --> J["Cobro / cierre comercial"]
  J --> K["Entregado"]
```

Regla: la mecanica asociada a DPF/FAP, EGR, SCR/AdBlue/DEF, linea de escape o desmontaje/montaje necesario forma parte del servicio tecnico ECU/File Service y no debe gestionarse como mantencion independiente. Servicio sujeto a evaluacion tecnica, normativa aplicable y uso autorizado segun corresponda.

## 5. Flujo Portal Masters / File Service

```mermaid
flowchart TD
  A["Master / Slave entra a /portal/login"] --> B["Carga archivo"]
  B --> C["GMTCH revisa en /portal-admin"]
  C --> D["Estado EN_REVISION"]
  D --> E{"Resultado tecnico"}
  E -->|OK| F["MOD listo"]
  F --> G["Descarga protegida"]
  G --> H["Credito descontado"]
  E -->|Correccion| I["Correccion si aplica"]
  I --> C
  H --> J["Historial / auditoria"]
  I --> J
```

## 6. Flujo Nueva Lectura Requerida

```mermaid
flowchart TD
  A["GMTCH detecta lectura incorrecta"] --> B["Solicita nueva lectura desde /portal-admin"]
  B --> C["Estado REQUIERE_NUEVA_LECTURA"]
  C --> D["Master / Slave ve alerta"]
  D --> E["Sube nuevo archivo de lectura"]
  E --> F["Estado vuelve a EN_REVISION"]
  F --> G["GMTCH continua revision"]
  B --> H["Auditoria registra solicitud"]
  E --> I["Auditoria registra nueva lectura"]
```

## 7. Flujo Correccion Postventa Tecnica Interna

```mermaid
flowchart TD
  A["Cliente vuelve por DTC / sintoma postventa"] --> B["Recepcion u operador ubica orden, vehiculo o File Service"]
  B --> C["Registrar postventa tecnica"]
  C --> D["Guardar motivo, descripcion, DTC, sintoma, prioridad y responsable sugerido"]
  D --> E["Estado CORRECCION_SOLICITADA"]
  E --> F["Backend registra usuario, fecha, orden, vehiculo, cliente y archivo ECU si aplica"]
  F --> G["Crear notificacion interna"]
  G --> H["OWNER / ADMIN / SUPERVISOR / OPERADOR_ECU / TUNER revisan"]
  H --> I["EN_REVISION_CORRECCION"]
  I --> J{"Resultado tecnico"}
  J -->|MOD listo| K["MOD_CORRECCION_LISTO"]
  J -->|Aplicada| L["CORRECCION_APLICADA"]
  L --> M["CERRADA"]
```

Regla: una correccion tecnica no marca pago, entrega ni cierre comercial. Es flujo tecnico/auditivo.

## 8. Flujo Bitacora Rapida Operativa

```mermaid
flowchart TD
  A["Operador detecta observacion"] --> B["Anotar observacion en orden"]
  B --> C["Tipo: Mejora / Error proceso / Cliente volvio / Recordatorio / Otro"]
  C --> D["Prioridad y modulo relacionado"]
  D --> E["Guardar en bitacora_operativa"]
  E --> F["Ficha vehiculo muestra historial"]
```

## 9. Flujo Notificaciones

```mermaid
flowchart TD
  A["Backend crea notificacion"] --> B["Frontend consulta cada 30 segundos"]
  B --> C["Campana muestra contador"]
  C --> D{"Nueva no leida"}
  D -->|Si| E["Alerta flotante aparece"]
  E --> F{"Sonido activado por usuario"}
  F -->|Si| G["Sonido corto Web Audio"]
  F -->|No| H["Solo alerta visual"]
  E --> I["Usuario marca leido o ver detalle"]
  D -->|No| C
```

## 10. Flujo Dominios

```mermaid
flowchart LR
  D1["gmtchtune.com"] --> FE["Frontend Railway"]
  D2["www.gmtchtune.com"] --> FE
  D3["api.gmtchtune.com"] --> BE["Backend Railway puerto 8080"]
  ENV["VITE_API_URL"] --> API["https://api.gmtchtune.com/api"]
  FE --> API
  API --> BE
```

## 11. Regla de Mantenimiento

Este documento debe actualizarse cada vez que se cambie un flujo operativo, ruta critica, rol, portal, dominio, integracion, estado de File Service, pago, notificacion o arquitectura.
