#!/usr/bin/env node
/**
 * Script de limpieza: elimina físicamente todos los documentos que tengan la bandera `deleted: true`
 * en las colecciones: whiteboardStrokes, whiteboardImages, y whiteboardTexts.
 *
 * Uso (PowerShell):
 *   # Establecer variable de entorno con el archivo de credenciales JSON del servicio
 *   $Env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'
 *   node scripts/clean-deleted-strokes.cjs --confirm
 *
 * Opciones:
 *   --confirm    Ejecuta la eliminación (si no, se hace dry-run y sólo cuenta elementos)
 *   --projectId  Opcional: ID de proyecto para inicializar si es necesario
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
const projectId = getArg('--projectId') || 'whiteboard-1e52a';
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || getArg('--serviceAccount');

if (saPath && fs.existsSync(saPath)) {
  const sa = require(path.resolve(saPath));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: projectId || sa.project_id });
} else {
  try {
    // Intentar inicializar con credenciales por defecto (ADC)
    admin.initializeApp({
      projectId: projectId
    });
  } catch (e) {
    console.error('No se pudo inicializar firebase-admin automáticamente.');
    console.error('Proporcione la variable de entorno GOOGLE_APPLICATION_CREDENTIALS o use --serviceAccount <ruta>');
    console.error(e.message || e);
    process.exit(1);
  }
}

const db = admin.firestore();
const collections = ['whiteboardStrokes', 'whiteboardImages', 'whiteboardTexts'];

async function cleanCollection(collName) {
  console.log(`\nBuscando documentos eliminados lógicamente (deleted == true) en: ${collName}...`);
  
  const snapshot = await db.collection(collName).where('deleted', '==', true).get();
  console.log(`Encontrados: ${snapshot.size} documentos para limpiar.`);
  
  if (snapshot.size === 0) {
    return;
  }

  if (!confirm) {
    console.log(`[Dry-run] Se habrían eliminado ${snapshot.size} documentos de ${collName}.`);
    console.log(`Para eliminarlos de verdad, agregue el argumento '--confirm'.`);
    return;
  }

  const toDelete = snapshot.docs.map(doc => doc.ref);
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(ref => batch.delete(ref));
    
    console.log(`Eliminando lote ${Math.floor(i / BATCH_SIZE) + 1} de ${collName} (${chunk.length} documentos)...`);
    await batch.commit();
  }
  
  console.log(`Limpieza de ${collName} completada.`);
}

async function run() {
  for (const coll of collections) {
    await cleanCollection(coll);
  }
  console.log('\nProceso de limpieza terminado.');
}

run().catch(err => {
  console.error('Error durante la limpieza:', err);
  process.exit(1);
});
