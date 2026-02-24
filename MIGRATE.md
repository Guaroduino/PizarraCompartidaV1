Migration: allowCopy for existing whiteboard texts
===============================================

Qué hace
--------
Este repo añade una nueva propiedad opcional `allowCopy` a los textos de la pizarra. Este documento describe cómo ejecutar una migración en Firestore para fijar `allowCopy: true` en documentos existentes donde la propiedad falta.

Requisitos
----------
- Tener un usuario de servicio de Firebase (service account JSON) con permisos para leer y escribir en Firestore.
- Tener instalado `firebase-admin` en el proyecto local: `npm install firebase-admin`.

Script
------
Se incluye `scripts/migrate-allowCopy.js` que:

- Lista todos los documentos en `whiteboardTexts` y cuenta cuáles no tienen `allowCopy`.
- En modo dry-run (por defecto) solo muestra la lista y no hace cambios.
- Si se ejecuta con `--confirm`, realiza actualizaciones por lotes (batches) y fija `allowCopy: true`.

Ejecución (PowerShell)
----------------------
1. Instalar dependencia (si no está instalada):

```powershell
npm install firebase-admin
```

2. Ejecutar en modo dry-run (lista cambios sin aplicarlos):

```powershell
$Env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'
node scripts/migrate-allowCopy.js
```

3. Aplicar cambios:

```powershell
$Env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'
node scripts/migrate-allowCopy.js --confirm
```

Alternativa: también añadimos un script npm para facilitar la ejecución:

```powershell
npm run migrate:allowCopy -- --confirm
```

Notas de seguridad
------------------
- Ejecuta la migración sólo desde una máquina de confianza y con credenciales seguras.
- El script actualiza sólo documentos que no tienen `allowCopy` definido. No sobrescribe valores `false` o `true` existentes.

Soporte
-------
Si quieres que ejecute la migración desde aquí no es recomendable compartir credenciales. Mejor ejecutar el script localmente o en un entorno CI/CD con credenciales seguras.
