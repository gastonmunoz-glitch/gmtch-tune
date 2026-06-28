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
  A --> X["Graficos simples sin dependencias"]

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
  X --> X1["Ingresos pagados vs pendientes"]
  X --> X2["Ordenes por estado"]
  X --> X3["Material recuperado del mes"]
  X --> X4["Ingresos vs egresos semana"]
```

Regla: el Centro de Mando V2 prioriza bloqueos operativos, postventa tecnica, File Service, post escritura, pagos pendientes antes de entrega e intervencion fisica sin exponer caja a roles no autorizados. Ingresos reales solo consideran pagos confirmados; montos pendientes o presupuestados se muestran separados.

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

## 5. Flujo File Service Interno

```mermaid
flowchart TD
  A["Operador entra a /archivos-ecu"] --> B["Lista compacta de solicitudes"]
  B --> C{"Selecciona archivo u orden"}
  C -->|No| D["Mensaje: selecciona una orden o archivo para ver detalle tecnico"]
  C -->|Si| E["Panel detalle tecnico"]
  E --> F["Cliente / vehiculo / orden"]
  E --> G["Estado, servicio y responsable"]
  E --> H["Archivo original y MOD"]
  E --> I["Historial MOD"]
  E --> J["Post escritura"]
  E --> K["Correcciones / nueva lectura si aplica"]
  E --> L["Links precisos a ficha vehiculo, historial, archivos, orden y cliente"]
```

Regla: File Service interno debe evitar desplegar masivamente todas las fichas tecnicas. La lista muestra resumen operativo y el panel detalle muestra solo el archivo seleccionado.

## 6. Flujo Navegacion Precisa

```mermaid
flowchart TD
  A["Usuario hace clic en cliente, vehiculo, garage, ficha, historial u orden"] --> B{"Existe ID especifico"}
  B -->|Si vehiculo| C["/vehiculos/:id#historial"]
  B -->|Si archivos| D["/vehiculos/:id#archivos o /archivos-ecu?archivoId=:id"]
  B -->|Si orden| E["/ordenes?ordenId=:id"]
  B -->|Si cliente| F["/clientes?clienteId=:id"]
  B -->|No| G["Mostrar sin vinculo disponible"]
  C --> H["Ficha vehiculo hace scroll suave al anchor"]
  D --> H
  E --> I["OrdenesPage muestra TODAS y hace scroll a la orden"]
  F --> J["ClientesPage abre ficha CRM exacta"]
```

## 7. Flujo Portal Masters / File Service

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

## 8. Flujo Nueva Lectura Requerida

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

## 9. Flujo Correccion Postventa Tecnica Interna

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

## 10. Flujo Bitacora Operativa Global

```mermaid
flowchart TD
  A["Operacion detecta detalle, mejora, error o recordatorio"] --> B["Dashboard / Centro de Mando"]
  B --> C["Anotar observacion en Bitacora rapida"]
  C --> D["Tipo: MEJORA, ERROR_PROCESO, CLIENTE_VOLVIO, RECORDATORIO, OPERACION u OTRO"]
  D --> E["Prioridad: BAJA, MEDIA, ALTA o URGENTE"]
  E --> F["Relacion opcional: orden, vehiculo, archivo ECU o modulo"]
  F --> G["Guardar en bitacora_operativa"]
  G --> H{"Prioridad alta o urgente"}
  H -->|Si| I["Crear notificacion interna a OWNER / ADMIN / SUPERVISOR"]
  H -->|No| J["Queda visible en ultimas abiertas"]
  I --> J
  J --> K["Supervisor / OWNER revisa"]
  K --> L["Marcar como resuelta"]
  L --> M["Guardar resuelto_por y resuelto_at"]
```

Regla: la bitacora operativa global sirve para no perder observaciones del dia. No reemplaza la postventa tecnica cuando existe una orden o un DTC claro; permite anotar rapido aunque todavia no se conozca la orden, vehiculo o archivo relacionado.

## 11. Flujo Finanzas y Material Recuperado UX V2

```mermaid
flowchart TD
  A["Finanzas / Material"] --> UX["Resumen compacto + lista compacta"]
  UX --> UX2["Detalle solo al seleccionar o expandir registro"]
  UX --> UX3["Crear nuevo queda colapsado"]
  UX --> UX4["Panel ejecutivo con semaforo y micrograficos"]
  A --> B["Comprobantes de pago"]
  A --> C["Movimientos financieros"]
  A --> D["Sueldos / pagos trabajadores"]
  A --> E["Fondo de reserva"]
  A --> F["Cierre semanal"]
  A --> G["Material recuperado"]

  B --> B1["Recepcion sube comprobante asociado a orden o cliente"]
  B1 --> B2["Estado PENDIENTE_REVISION"]
  B2 --> B3["OWNER / ADMIN valida o rechaza"]
  B3 --> B4["Descarga protegida con token interno"]
  B2 --> B5["No marca pagado automaticamente"]

  C --> C1["Ingreso: SERVICIO, FILE_SERVICE, VENTA_MATERIAL u OTRO"]
  C --> C2["Egreso: gasto operativo, compra, herramienta, arriendo, transporte, marketing, impuesto provision u otro"]
  D --> D1["Movimiento EGRESO categoria SUELDO"]
  D1 --> D2["Semana inicio / semana fin"]
  D2 --> D3["Trabajador, tipo: SUELDO / ADELANTO / BONO / COMISION / OTRO"]
  D3 --> D4["Monto, estado PENDIENTE/PAGADO, fecha pago y observacion"]

  E --> E1["APORTE / RETIRO / AJUSTE"]
  E1 --> E2["Saldo actual e historial"]

  F --> F1["Seleccionar semana"]
  F1 --> F2["Ingresos - egresos - sueldos"]
  F2 --> F3["Aporte fondo reserva sugerido 15%"]
  F3 --> F4["Utilidad distribuible"]
  F4 --> F5["Reparto en 3: Gaston, Felipe y Alejandro"]
  F5 --> F6["Guardar BORRADOR o CERRADO"]

  G --> G1["Orden DPF/FAP autorizada o intervencion fisica asociada"]
  G1 --> G2["Registrar kg, lote mensual y observacion administrativa"]
  G2 --> G3["Panel mensual: kg reales, kg esperados, diferencia, valor estimado y vendido"]
  G3 --> G4["Ranking por modelo: promedio kg, cantidad y confianza"]
  G4 --> G5["Comparar kg contra promedio historico por marca/modelo/motor"]
  G5 --> G6{"Diferencia vs promedio"}
  G6 -->|Hasta 10%| G7["OK"]
  G6 -->|10% a 20%| G8["REVISAR"]
  G6 -->|Mas de 20%| G9["ALERTA"]
  G9 --> G10["Notificacion interna OWNER / ADMIN con accion a Finanzas"]
  G2 --> G11["Marcar venta con comprador y precio real kg"]
  G11 --> G12["Registrar ingreso financiero VENTA_MATERIAL"]
```

Regla: este flujo es administrativo/contable interno. No marca pagado ni entregado automaticamente. No entrega instrucciones tecnicas de extraccion, desmontaje o intervencion. Sueldos se controlan semanalmente usando `periodo` como compatibilidad. Utilidad, reparto, caja y valores de material son visibles solo para roles autorizados. La UX debe mostrar panel ejecutivo, resumen/lista primero, micrograficos simples y detalle despues de seleccionar. Si aun no se ejecuto reset operativo, OWNER/ADMIN pueden ver aviso discreto de datos de prueba.

## 12. Flujo Notificaciones

```mermaid
flowchart TD
  A["Backend crea notificacion"] --> B["Frontend consulta cada 10 segundos si la app esta activa"]
  B --> B2["Si la pestaña esta en segundo plano baja a 30 segundos"]
  B --> C["Campana muestra contador"]
  C --> D{"Nueva no leida"}
  D -->|Si| E["Alerta flotante critica aparece"]
  E --> F{"Sonido activado por usuario"}
  F -->|Normal| G["Beep corto Web Audio"]
  F -->|Fuerte| H["Tres beeps cortos"]
  F -->|Tsunami| I["Secuencia 4 a 6 beeps / sirena breve menor a 3s"]
  F -->|No| J["Solo alerta visual"]
  E --> K["Usuario marca leido o ver detalle"]
  D -->|No| C
```

Regla: el modo tsunami es opcional y se usa solo en recepcion/taller cuando se requiere maxima atencion. No debe sonar infinitamente ni repetirse por notificaciones antiguas.

## 12.0.1 Flujo Recordatorios Insistentes

```mermaid
flowchart TD
  A["Notificacion operativa critica creada"] --> B["Primera alerta inmediata"]
  B --> C{"Sigue no leida despues de 2h"}
  C -->|Si| D["Crear RECORDATORIO_OPERATIVO suave"]
  C -->|No| E["No insistir"]
  D --> F{"Prioridad alta/urgente y sigue pendiente despues de 3h"}
  F -->|Si| G["Crear RECORDATORIO_OPERATIVO fuerte"]
  F -->|No| H["No crear duplicados"]
  G --> I["Mantener accion_url original"]
  D --> I
  I --> J["Frontend muestra alerta visual; sonido fuerte/tsunami si usuario lo activo"]
```

Regla: los recordatorios se limitan a familias operativas criticas como post escritura pendiente, nueva lectura requerida, correccion tecnica, cliente volvio por DTC, pago bloqueando entrega, archivo portal sin revisar y bitacora urgente. No se generan duplicados infinitos.

## 12.1 Flujo Notificaciones Accionables

```mermaid
flowchart TD
  A["Evento operativo crea notificacion"] --> B["Backend agrega accion_url, accion_tipo, entidad_tipo y entidad_id"]
  B --> C{"Tipo de entidad"}
  C -->|Orden| D["/ordenes?ordenId=:id"]
  C -->|Postventa tecnica| E["/ordenes?ordenId=:id#postventa"]
  C -->|Archivo ECU interno| F["/archivos-ecu?archivoId=:id"]
  C -->|Portal File Service| G["/portal-admin?fileId=:id"]
  C -->|Nueva lectura portal| H["/portal-admin?fileId=:id#nueva-lectura"]
  C -->|Bitacora| I["/#bitacora"]
  C -->|Sin datos suficientes| J["Fallback por ordenId o archivoECUId"]
  D --> K["Usuario hace clic en campana o alerta flotante"]
  E --> K
  F --> K
  G --> K
  H --> K
  I --> K
  J --> K
  K --> L["Frontend marca leida si corresponde"]
  L --> M["Navega a la accion exacta sin abrir ventana nueva"]
```

Regla: toda notificacion nueva debe incluir una accion directa cuando conozca la orden, archivo ECU, solicitud portal, cliente, vehiculo, bitacora o postventa relacionada. Las notificaciones antiguas usan fallback por `ordenId`, `archivoECUId` o metadata disponible.

## 13. Flujo Agentes IA V1

```mermaid
flowchart TD
  A["OWNER / ADMIN abre Dashboard"] --> B["Frontend carga /api/ai-agents/*"]
  B --> C["Backend autentica token interno"]
  C --> D{"Rol autorizado"}
  D -->|OWNER / ADMIN| E["Leer datos operativos existentes"]
  D -->|Otro rol| X["403 sin mostrar panel"]
  E --> F["Ordenes, clientes y vehiculos"]
  E --> G["File Service interno"]
  E --> H["Bitacora operativa"]
  E --> I["Finanzas y material"]
  F --> J["Reglas deterministicas V1"]
  G --> J
  H --> J
  I --> J
  J --> K["Asistente Recepcion"]
  J --> L["Auditor Operativo"]
  J --> M["Asistente File Service"]
  J --> N["Asistente Finanzas"]
  J --> O["Gerente Diario GMTCH"]
  K --> P["Resumen, alertas, sugerencias y links"]
  L --> P
  M --> P
  N --> P
  O --> P
  P --> Q["Humano decide y actua en modulo correspondiente"]
```

Regla: Agentes IA V1 es solo lectura. No crea ordenes, no cambia estados, no marca pagos, no borra datos y no ejecuta acciones automaticas. Toda accion futura requiere confirmacion humana.

## 14. Flujo Automatizaciones Operativas V1

```mermaid
flowchart TD
  A["Usuario interno abre Dashboard"] --> B["Bloque Automatizaciones GMTCH"]
  B --> C{"Accion manual"}
  C --> D["GET /api/automatizaciones/revision-operativa"]
  C --> E["POST /api/automatizaciones/reporte-apertura"]
  C --> F["POST /api/automatizaciones/reporte-cierre"]
  C --> G["GET /api/automatizaciones/file-service"]
  C --> H["GET /api/automatizaciones/finanzas"]
  C --> I["GET /api/automatizaciones/material-recuperado"]
  C --> J["GET /api/automatizaciones/reportes/ultimo"]

  D --> K["Leer ordenes, File Service, bitacora, notificaciones, finanzas y material"]
  G --> K
  H --> K
  I --> K
  E --> K
  F --> K

  K --> L["Generar resumen, alertas, prioridad, accion_url y sugerencias"]
  E --> M["Guardar AutomatizacionReporte"]
  F --> M
  M --> N["Crear notificacion interna a OWNER / ADMIN / SUPERVISOR"]
  L --> O{"Alertas ALTA / URGENTE"}
  O -->|Si| P["Anti-spam: no duplicar en 2 horas por entidad"]
  P --> Q["Crear notificacion accionable origen AUTOMATIZACION"]
  O -->|No| R["Solo mostrar resultado"]
  Q --> S["Humano abre modulo y decide"]
  R --> S
  N --> S
```

Regla: Automatizaciones V1 es manual y no destructiva. No borra datos, no cambia estados criticos, no marca pagos, no cierra ordenes y no envia mensajes externos. `ENABLE_INTERNAL_AUTOMATIONS=false` debe mantenerse como base hasta una fase futura con cron controlado.

## 15. Puesta en marcha lunes / operacion con base limpia

```mermaid
flowchart TD
  A["Base operativa limpia despues del reset"] --> B["OWNER / ADMIN / SUPERVISOR revisa Dashboard"]
  B --> C["Checklist inicio lunes"]
  C --> D["Crear primer cliente real"]
  D --> E["Crear primer vehiculo real"]
  E --> F["Crear primera orden real"]
  F --> G["Motivo / servicio estandarizado"]
  G --> H["Prioridad editable y responsable si aplica"]
  H --> I["Subir fotos / evidencia si corresponde"]
  I --> J{"Requiere File Service"}
  J -->|Si| K["Crear File Service asociado a orden"]
  J -->|No| L["Continuar diagnostico / trabajo tecnico"]
  K --> M["Registrar post escritura y cierre tecnico"]
  L --> N["Listo para entrega cuando corresponda"]
  M --> N
  N --> O["Cobro y entrega comercial"]
```

Regla: con base limpia no se ingresan trabajos sin cliente, vehiculo y motivo claro. Si no esta registrado, no existe. Datos demo no deben volver a contaminar dashboard, finanzas ni estadisticas.

## 16. Flujo Dominios

```mermaid
flowchart LR
  D1["gmtchtune.com"] --> FE["Frontend Railway"]
  D2["www.gmtchtune.com"] --> FE
  D3["api.gmtchtune.com"] --> BE["Backend Railway puerto 8080"]
  ENV["VITE_API_URL"] --> API["https://api.gmtchtune.com/api"]
  FE --> API
  API --> BE
```

## 17. Regla de Mantenimiento

Este documento debe actualizarse cada vez que se cambie un flujo operativo, ruta critica, rol, portal, dominio, integracion, estado de File Service, pago, notificacion o arquitectura.
