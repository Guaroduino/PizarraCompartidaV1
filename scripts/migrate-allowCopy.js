#!/usr/bin/env node
/**
 * Script de migración: establece allowCopy: true en documentos de la colección `whiteboardTexts`
 *
 * Uso (PowerShell):
 *   # Establecer variable de entorno con el archivo de credenciales JSON del servicio
 *   $Env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'
 *   node scripts/migrate-allowCopy.js --confirm
 *
 * Opciones:
 *   --confirm    Ejecuta la migración (si no, se hace dry-run y sólo lista cambios)
 *   --projectId  Opcional: ID de proyecto para inicializar si es necesario
 *
 * Nota: Este script usa firebase-admin y requiere que instales la dependencia:
 *   npm install firebase-admin
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || true;
}

const confirm = process.argv.includes('--confirm');
const projectId = getArg('--projectId');
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || getArg('--serviceAccount');

if (saPath && fs.existsSync(saPath)) {
  const sa = require(path.resolve(saPath));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: projectId || sa.project_id });
} else {
  // Try default credentials (ADC) - useful if running in GCP environment
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('No se pudo inicializar firebase-admin. Proporcione GOOGLE_APPLICATION_CREDENTIALS o use --serviceAccount <path>');
    console.error(e.message || e);
    process.exit(1);
  }
}

const db = admin.firestore();

async function run() {
  console.log('Iniciando migración: set allowCopy = true where missing (collection: whiteboardTexts)');

  const snapshot = await db.collection('whiteboardTexts').get();
  console.log(`Documentos totales en whiteboardTexts: ${snapshot.size}`);

  const toUpdate = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    // Actualizar sólo si la propiedad es undefined (no existe). Si está en false o true, respetamos.
    if (data.allowCopy === undefined) {
      toUpdate.push(doc.id);
    }
  });

  console.log(`Documentos a actualizar (allowCopy ausente): ${toUpdate.length}`);
  if (toUpdate.length === 0) {
    console.log('Nada que hacer. Salida.');
    return;
  }

  if (!confirm) {
    console.log('Modo dry-run (sin --confirm). Lista de IDs a actualizar (muestra hasta 50):');
    console.log(toUpdate.slice(0, 50));
    console.log('Ejecute con --confirm para aplicar los cambios. Ejemplo: node scripts/migrate-allowCopy.js --confirm');
    return;
  }

  const BATCH_SIZE = 500; // Firestore batch limit
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(id => {
      const ref = db.collection('whiteboardTexts').doc(id);
      batch.update(ref, { allowCopy: true });
    });
    console.log(`Commit batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} documentos`);
    await batch.commit();
  }

  console.log('Migración completada.');
}

run().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
