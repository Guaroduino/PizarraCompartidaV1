import type { User, Course } from '../types';

// FIX: Added missing uid and email properties to mockUser to match Omit<User, "role"> type.
export const mockUser: Omit<User, 'role'> = {
  uid: 'mock-alex-doe',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatarUrl: 'https://picsum.photos/seed/user/100/100',
};

export const mockCourse: Course = {
  id: 'robotics-101',
  title: 'Introducción a la Robótica e IA',
  description: 'Un curso fundamental sobre robótica, programación y conceptos de inteligencia artificial.',
  content: [
    {
      id: 'unit1',
      title: 'Unidad 1: Fundamentos de Electricidad',
      topics: [
        {
          id: 'topic1',
          title: 'Circuitos Básicos',
          subtitles: [
            { id: 'sub1', title: '¿Qué es un Circuito?', description: 'Un camino cerrado que permite que fluya la electricidad.', imageUrl: 'https://picsum.photos/seed/circuit/400/200' },
            { id: 'sub2', title: 'Componentes Clave', description: 'Baterías, resistencias, LEDs y interruptores.', imageUrl: 'https://picsum.photos/seed/components/400/200' },
          ]
        },
        {
          id: 'topic2',
          title: 'Ley de Ohm',
          subtitles: [
            { id: 'sub3', title: 'La Fórmula Mágica: V = I * R', description: 'Entendiendo la relación entre Voltaje (V), Corriente (I) y Resistencia (R).', imageUrl: 'https://picsum.photos/seed/ohm/400/200' },
          ]
        }
      ]
    },
    {
      id: 'unit2',
      title: 'Unidad 2: Introducción a la Programación en Python',
      topics: [
          {
              id: 'topic3',
              title: 'Sintaxis y Variables',
              subtitles: [
                  { id: 'sub4', title: 'Escribiendo tu primer "Hola Mundo"', description: 'El primer paso tradicional en la programación.', imageUrl: 'https://picsum.photos/seed/hello/400/200' },
                  { id: 'sub5', title: 'Almacenando Información', description: 'Cómo usar variables para guardar números, texto y más.', imageUrl: 'https://picsum.photos/seed/vars/400/200' },
              ]
          }
      ]
    },
  ],
  assignments: [
    {
      id: 'assign1',
      title: 'Laboratorio 1: Análisis de Circuitos',
      description: 'Analiza el circuito proporcionado y responde las siguientes preguntas. Utiliza la Ley de Ohm para tus cálculos.',
      dueDate: '2024-10-26',
      imageUrls: ['https://picsum.photos/seed/assign1/600/300', 'https://picsum.photos/seed/assign1-alt/600/300'],
      questions: [
          { id: 'q1', text: '¿Cuál es la resistencia total del circuito en serie?', imageUrls: ['https://picsum.photos/seed/q1-circuit/400/200'] },
          { id: 'q2', text: 'Si el voltaje de la batería es de 9V, ¿cuál es la corriente total que fluye a través del circuito?' },
          { id: 'q3', text: 'Explica qué pasaría si se añadiera una tercera resistencia de 100 ohmios.' },
      ],
      submissions: [
        { 
            studentId: 'jane-smith-id', 
            studentName: 'Jane Smith', 
            submittedAt: '2024-10-24', 
            grade: 95, 
            feedback: 'Excelente trabajo, cálculos claros.',
            answers: [
                { questionId: 'q1', text: '<p>La resistencia total es la suma de las resistencias individuales en el circuito en serie.</p>' },
                { questionId: 'q2', text: '<p>Usando V=IR, la corriente es 9V dividido por la Resistencia Total.</p>', imageUrl: 'https://picsum.photos/seed/answer2/200/100' }
            ]
        },
        { 
            studentId: 'john-appleseed-id', 
            studentName: 'John Appleseed', 
            submittedAt: '2024-10-25', 
            grade: 88, 
            feedback: 'Buen análisis, pero revisa tus cálculos en el circuito 2.',
            answers: [
                { questionId: 'q1', text: '<p>Resistencia Total = R1 + R2 + ...</p>' },
            ]
        },
      ],
    },
     {
      id: 'assign2',
      title: 'Desafío de Código: Fundamentos de Python',
      description: 'Completa una serie de pequeños desafíos en Python para demostrar tu comprensión de variables, bucles y funciones.',
      dueDate: '2024-11-05',
      questions: [
        {id: 'q4', text: 'Escribe una función que tome dos números como argumentos y devuelva su suma.'},
        {id: 'q5', text: 'Escribe un bucle `for` que imprima los números del 1 al 10.'}
      ],
      submissions: [],
    },
  ],
  // FIX: Added missing 'quizzes' property to satisfy the Course type.
  quizzes: [],
  projects: [
    {
      id: 'proj1',
      title: 'Proyecto Final: Construye un Rover Inteligente',
      description: 'Diseña, construye y programa un pequeño rover autónomo que pueda navegar por un laberinto simple.',
      team: ['Jane Smith', 'John Appleseed', 'Alex Doe'],
      tasks: [
        { id: 'task1', title: 'Diseñar chasis del rover en CAD', status: 'Done' },
        { id: 'task2', title: 'Imprimir en 3D las partes del chasis', status: 'In Progress' },
        { id: 'task3', title: 'Ensamblar motores y electrónica', status: 'In Progress' },
        { id: 'task4', title: 'Escribir código básico de control de motores', status: 'To Do' },
        { id: 'task5', title: 'Desarrollar código de integración de sensores', status: 'To Do' },
      ],
      steps: [
        { id: 'step1', title: 'Paso 1: Diseño y Planificación', description: 'Crea un boceto de tu rover y un diagrama de los componentes electrónicos.', imageUrl: 'https://picsum.photos/seed/step1/500/250' },
        { id: 'step2', title: 'Paso 2: Ensamblaje del Chasis', description: 'Imprime en 3D o construye el chasis y monta los motores y las ruedas.', imageUrl: 'https://picsum.photos/seed/step2/500/250' },
        { id: 'step3', title: 'Paso 3: Cableado de la Electrónica', description: 'Conecta el microcontrolador, los controladores de motor y los sensores según tu diagrama.', imageUrl: 'https://picsum.photos/seed/step3/500/250' },
      ],
      materialsAndTools: [
        { id: 'mat1', name: 'Arduino Uno', description: 'Placa de microcontrolador para prototipos.', quantity: 1, imageUrl: 'https://picsum.photos/seed/arduino/200/200' },
        { id: 'mat2', name: 'Servomotores SG90', description: 'Pequeños motores para movimiento preciso.', quantity: 4, imageUrl: 'https://picsum.photos/seed/servo/200/200' },
        { id: 'mat3', name: 'Protoboard', description: 'Placa de pruebas para montar circuitos sin soldar.', quantity: 1, imageUrl: 'https://picsum.photos/seed/proto/200/200' },
      ]
    },
  ],
};