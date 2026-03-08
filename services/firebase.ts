import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// ¡ACCIÓN REQUERIDA! REEMPLAZA ESTA CONFIGURACIÓN CON LA DE TU PROPIO PROYECTO FIREBASE
// =================================================================================
// Para que la aplicación funcione, debes usar la configuración de tu propio proyecto de Firebase.
// Sigue estos pasos:
// 1. Ve a la consola de Firebase: https://console.firebase.google.com/
// 2. Selecciona tu proyecto (o crea uno nuevo).
// 3. Haz clic en el ícono de engranaje (⚙️) junto a "Project Overview" y selecciona "Project settings".
// 4. En la pestaña "General", baja hasta la sección "Your apps".
// 5. Busca tu aplicación web, haz clic en el ícono "</>" (SDK setup and configuration).
// 6. Copia el objeto completo `firebaseConfig` que se muestra allí.
// 7. Pega el objeto que copiaste aquí abajo, reemplazando todo el bloque de `const firebaseConfig`.
//
// La aplicación NO funcionará hasta que completes este paso.
// El bloque que copies de Firebase se verá similar a este, pero con tus claves reales.
// =================================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();