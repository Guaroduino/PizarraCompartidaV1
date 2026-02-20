
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from '../types';

// La inicialización del cliente de IA se ha movido dentro de las funciones de llamada a la API
// para garantizar que la clave de API esté disponible en el momento de la solicitud.

// Export the base prompts so they can be displayed in the UI
export const STUDENT_ASSISTANT_BASE_PROMPT = `Eres un asistente virtual útil y amigable para una plataforma de Pizarra Colaborativa.
Tu objetivo principal es ayudar a los usuarios a generar ideas, resolver dudas generales y mejorar su uso de la pizarra.
Cuando un usuario haga una pregunta, sigue estas reglas:
1.  Usa el "CONTEXTO" proporcionado como tu fuente de información para asegurar que tus respuestas sean relevantes.
2.  Si la pregunta es una solicitud de ayuda con una tarea o idea, proporciona sugerencias y anima al usuario a desarrollarlas.
3.  Nunca escribas soluciones completas que impidan el aprendizaje o la creatividad. Tu rol es fomentar el pensamiento crítico.
4.  Si se proporciona una imagen, es CRUCIAL que la analices. Describe lo que ves en la imagen si el usuario te lo pide y úsala como la referencia principal para responder a su pregunta.
5.  Mantén un tono alentador y positivo.
6.  Siempre responde en español.`.trim();

export const TEACHER_ASSISTANT_BASE_PROMPT = `Eres un experto diseñador de contenido educativo y visual. Tu objetivo es ayudar a un usuario a crear contenido atractivo y preciso para su pizarra.
Basado en la solicitud, genera contenido detallado y bien estructurado.
**Utiliza el "CONTEXTO ACTUAL" proporcionado como tu principal fuente de información.**

**IMPORTANTE: Tu respuesta DEBE estar en formato HTML. Utiliza etiquetas HTML semánticas y simples como <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, y <li>. NO uses Markdown.**
El contenido debe estar listo para copiar y pegar directamente en un editor de texto enriquecido.

Esto puede incluir:
- Ideas para nuevos diagramas o esquemas.
- Descripciones claras y concisas para conceptos complejos.
- Pasos detallados para proyectos colaborativos.
- Explicaciones técnicas.

Si se proporciona una imagen, es CRUCIAL que la analices. Describe la imagen si es relevante y úsala como la inspiración o referencia principal para el contenido que estás creando.
Sé creativo, informativo y preciso.
Siempre responde en español.`.trim();


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export const getAIAssistance = async (history: ChatMessage[], query: string, context: string, basePrompt: string, customContext: string, imageFile?: File | null): Promise<string> => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    console.warn("La variable de entorno API_KEY no está configurada. El Asistente de IA no funcionará.");
    return "El asistente de IA no está disponible actualmente porque la clave de API no está configurada.";
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // FIX: Using gemini-3-pro-preview for complex reasoning.
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    ${basePrompt}

    --- CONTEXTO ---
    ${context}
    --- FIN DEL CONTEXTO ---

    --- INSTRUCCIONES ADICIONALES ---
    ${customContext}
    --- FIN DE INSTRUCCIONES ADICIONALES ---
  `.trim();

  // Construye el historial para la llamada a la API
  const contents = history
    .filter(msg => !msg.isConversationStart && msg.text && msg.text.trim() !== '')
    .map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }],
    }));

  // Añade la consulta actual del usuario y la imagen
  const userParts: any[] = [];
  if (query.trim() !== '') {
    userParts.push({ text: query });
  }
  if (imageFile) {
      const imagePart = await fileToGenerativePart(imageFile);
      userParts.push(imagePart);
  }
  if (userParts.length > 0) {
    contents.push({ role: 'user', parts: userParts });
  }


  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    
    const resultText = response.text;

    if (typeof resultText === 'string' && resultText) {
        return resultText;
    }
    
    console.warn("Gemini API returned a non-string or empty response for student query. Full response object:", response);
    return "Lo siento, no puedo responder a eso en este momento. Por favor, intenta reformular tu pregunta.";
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    return "Parece que estoy teniendo algunas dificultades técnicas en este momento. Por favor, intenta preguntarme de nuevo en un momento.";
  }
};

export const getAIContentCreationAssistance = async (history: ChatMessage[], query: string, courseContext: string, basePrompt: string, customContext: string, imageFile?: File | null): Promise<string> => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    console.warn("La variable de entorno API_KEY no está configurada. El Asistente de IA no funcionará.");
    return "El asistente de IA no está disponible actualmente porque la clave de API no está configurada.";
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // FIX: Using gemini-3-pro-preview for curriculum design and technical content generation.
  const model = 'gemini-3-pro-preview';

  const systemInstruction = `
    ${basePrompt}

    --- CONTEXTO ACTUAL ---
    ${courseContext}
    --- FIN DEL CONTEXTO ---

    --- INSTRUCCIONES ADICIONALES ---
    ${customContext}
    --- FIN DE INSTRUCCIONES ADICIONALES ---
  `.trim();

  const contents = history
    .filter(msg => !msg.isConversationStart && msg.text && msg.text.trim() !== '')
    .map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }],
    }));
  
  const userParts: any[] = [];
  if (query.trim() !== '') {
    userParts.push({ text: query });
  }
  if (imageFile) {
      const imagePart = await fileToGenerativePart(imageFile);
      userParts.push(imagePart);
  }
  if (userParts.length > 0) {
    contents.push({ role: 'user', parts: userParts });
  }


  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const resultText = response.text;

    if (typeof resultText === 'string' && resultText) {
        return resultText;
    }
    
    console.warn("Gemini API returned a non-string or empty response for teacher query. Full response object:", response);
    return "<p>Lo siento, no he podido generar contenido para tu solicitud. Por favor, intenta ser más específico o reformular tu petición.</p>";
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    return "<p>Parece que estoy teniendo algunas dificultades técnicas en este momento. Por favor, intenta de nuevo en un momento.</p>";
  }
};

// --- NEW TEACHER SIDEBAR FUNCTIONS (Gemini 2.5 Flash) ---

export const getTeacherFlashChat = async (history: ChatMessage[], query: string): Promise<string> => {
    const API_KEY = "";
    if (!API_KEY) return "Clave de API no configurada.";

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-flash-latest'; // 2.5 Flash

    const systemInstruction = `Eres un asistente inteligente para profesores. Tu objetivo es ayudar a planificar clases, generar ideas creativas y resolver dudas rápidas. Sé conciso y directo.`;

    const contents = history.map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    contents.push({ role: 'user', parts: [{ text: query }] });

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: { systemInstruction }
        });
        return response.text || "No pude generar una respuesta.";
    } catch (error) {
        console.error("Error calling Gemini Flash:", error);
        return "Error en el servicio de IA.";
    }
};

export const generateTeacherImage = async (prompt: string): Promise<string | null> => {
    const API_KEY = "";
    if (!API_KEY) throw new Error("API Key no configurada");

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-2.5-flash-image';

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            // Do NOT set responseMimeType for image models
        });

        // Find image part
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error; // Re-throw to handle in UI
    }
};
