import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import './AppChatBot.css';
import { useAuth } from '../context/AuthContext';

const PREDEFINED_QA = [
  // Saludos
  {
    keywords: ['hola', 'buenas', 'saludos', 'buenos', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'hello'],
    question: 'Saludar',
    answer: '¡Hola! Soy SyncBot 🤖. Estoy aquí para ayudarte con cualquier duda sobre la plataforma de préstamos. ¿En qué te puedo ayudar hoy?'
  },

  // Préstamos
  {
    keywords: ['solicitar', 'pedir', 'prestamo', 'préstamo', 'credito', 'crédito', 'necesito dinero', 'pedir plata'],
    question: '¿Cómo solicito un préstamo?',
    answer: 'Ve a la pestaña "Solicitar Crédito" en el menú. Ingresa el monto que necesitas, selecciona las cuotas, acepta el contrato y tu solicitud será revisada por el administrador.'
  },
  {
    keywords: ['tasa', 'interes', 'interés', 'porcentaje', 'cuanto cobran', 'costo'],
    question: '¿Cuáles son las tasas de interés?',
    answer: 'La tasa de interés estándar es del 10%, aunque puede variar según tu nivel en el Rendimiento Crediticio y las condiciones que establezca tu administrador.'
  },
  {
    keywords: ['monto', 'maximo', 'máximo', 'cuanto puedo pedir', 'limite', 'límite'],
    question: '¿Cuál es el monto máximo?',
    answer: 'El monto máximo depende de tu historial crediticio y nivel de Rendimiento. Puedes solicitar desde montos pequeños hasta grandes cantidades. Consulta con tu administrador para los límites específicos.'
  },
  {
    keywords: ['cuotas', 'plazo', 'meses', 'cuantas cuotas', 'tiempo', 'cuanto tiempo'],
    question: '¿En cuántas cuotas puedo solicitar?',
    answer: 'Puedes elegir entre varias opciones de cuotas mensuales. El plazo y número de cuotas se definen al momento de solicitar el préstamo.'
  },
  {
    keywords: ['aprueban', 'aprueban', 'aprobar', 'cuanto tarda', 'tarda', 'demora', 'tiempo respuesta'],
    question: '¿Cuánto tardan en aprobar mi préstamo?',
    answer: 'La aprobación depende del administrador. Normalmente se revisa en menos de 24 horas. Recibirás una notificación cuando sea aprobado o rechazado.'
  },
  {
    keywords: ['renegociar', 'refinanciar', 'refinanciar', 'cambiar cuotas', 'ajustar', 'modificar'],
    question: '¿Puedo refinanciar mi préstamo?',
    answer: 'Sí, desde la sección "Refinanciar" puedes solicitar una nueva tasa y plazo para tu préstamo activo. El administrador revisará tu solicitud.'
  },
  {
    keywords: ['cancelar', 'anular', 'devolver', 'pagar todo'],
    question: '¿Puedo cancelar mi préstamo anticipadamente?',
    answer: 'Sí, puedes liquidar tu préstamo en cualquier momento. El saldo pendiente se calcula automáticamente. Consulta con tu administrador para el proceso de cancelación.'
  },

  // Pagos
  {
    keywords: ['pagar', 'pago', 'cuota', 'abonar', 'como pago'],
    question: '¿Cómo pago mi cuota?',
    answer: 'Dirígete a la sección "Pagar" en el menú. Allí verás tus próximas cuotas y podrás registrar tu pago fácilmente con diferentes métodos de pago.'
  },
  {
    keywords: ['metodo', 'método', 'forma', 'como puedo pagar', 'transferencia', 'efectivo', 'zelle', 'paypal'],
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Aceptamos múltiples monedas y métodos: USD, EUR, COP, VES, MXN y Zelle. El método específico lo define tu administrador al aprobar el préstamo.'
  },
  {
    keywords: ['vencida', 'vencido', 'atraso', 'mora', 'recargo', 'penalidad', 'retraso', 'tarde', 'pago tarde'],
    question: '¿Qué pasa si me retraso?',
    answer: 'Los pagos atrasados generan recargos por mora y afectan negativamente tu Rendimiento Crediticio. ¡Procura pagar a tiempo para mantener buenas condiciones!'
  },
  {
    keywords: ['comprobante', 'recibo', 'boleta', 'probante'],
    question: '¿Cómo obtengo mi comprobante de pago?',
    answer: 'Ve a la sección "Comprobante" en el menú. Allí puedes ver y descargar tu comprobante de pago en formato PDF o imprimirlo.'
  },
  {
    keywords: ['proximo pago', 'próximo pago', 'cuando pago', 'fecha pago', 'cuando vence'],
    question: '¿Cuándo es mi próximo pago?',
    answer: 'Puedes ver tu próximo pago en el calendario de pagos o en tu dashboard. Te aparece la fecha de vencimiento y el monto de cada cuota.'
  },
  {
    keywords: ['calendario', 'cronograma', 'fechas'],
    question: '¿Dónde veo mi calendario de pagos?',
    answer: 'En la sección "Calendario" del menú tienes todas tus fechas de pago marcadas con colores: verde para pagadas, amarillo para próximas, rojo para vencidas.'
  },
  {
    keywords: ['qr', 'codigo qr', 'código qr', 'escanear', 'scan'],
    question: '¿Puedo pagar con código QR?',
    answer: 'Sí, si tu administrador lo activa, puedes generar un código QR desde la sección "Pago QR" para facilitar el proceso de pago.'
  },

  // Rendimiento Crediticio
  {
    keywords: ['rendimiento', 'puntos', 'niveles', 'bronce', 'plata', 'oro', 'diamante', 'score', 'crediticio'],
    question: '¿Qué es el Rendimiento Crediticio?',
    answer: 'Es nuestro sistema de lealtad. Ganas puntos al pagar a tiempo, subiendo de nivel (Bronce → Plata → Oro → Diamante) para desbloquear mejores tasas y condiciones.'
  },
  {
    keywords: ['puntaje', 'credit score', 'calificacion', 'calificación', 'como mejor mi score'],
    question: '¿Cómo mejoro mi puntaje crediticio?',
    answer: 'Tu puntaje mejora pagando tus cuotas a tiempo y completando tu perfil KYC. Mantén un historial de pago consistente para alcanzar niveles superiores.'
  },
  {
    keywords: ['nivel', 'subir nivel', 'como subo'],
    question: '¿Cómo subo de nivel?',
    answer: 'Paga tus cuotas antes de la fecha de vencimiento. Cada pago puntual te suma puntos. Acumula suficientes puntos para subir al siguiente nivel y acceder a mejores tasas.'
  },

  // KYC / Verificación
  {
    keywords: ['kyc', 'verificacion', 'verificación', 'identidad', 'documento', 'cedula', 'cédula', 'pasaporte', 'verificar'],
    question: '¿Cómo verifico mi identidad?',
    answer: 'Ve a la sección "Verificación KYC" donde subirás una foto de tu documento de identidad y una selfie para verificación facial. Tu administrador revisará y aprobará tu perfil.'
  },
  {
    keywords: ['perfil', 'datos', 'informacion', 'información', 'actualizar datos', 'cambiar datos'],
    question: '¿Cómo actualizo mis datos?',
    answer: 'En la sección "Configuración" puedes actualizar tu nombre, teléfono, dirección y otros datos personales. También puedes cambiar tu contraseña desde ahí.'
  },

  // Contrato
  {
    keywords: ['contrato', 'firmar', 'firma', 'documento legal', 'acepto', 'terminos'],
    question: '¿Cómo firmo el contrato?',
    answer: 'Al solicitar tu primer préstamo, se te mostrará el contrato. Debes leerlo, aceptar los términos y firmarlo digitalmente. Sin firma, no se procesa tu solicitud.'
  },
  {
    keywords: ['contrato firmado', 'ya firme', 'mi contrato'],
    question: '¿Dónde veo mi contrato?',
    answer: 'En la sección "Contratos" del menú puedes ver todos los contratos que has firmado, incluyendo los detalles del préstamo asociado.'
  },

  // Monedas
  {
    keywords: ['moneda', 'dolares', 'dólares', 'euros', 'pesos', 'bolivares', 'bolívares', 'divisa', 'currency', 'usd', 'eur', 'cop', 'ves', 'mxn'],
    question: '¿Qué monedas se manejan?',
    answer: 'La plataforma soporta múltiples monedas: USD (Dólares), EUR (Euros), COP (Peso Colombiano), VES (Bolívares), MXN (Peso Mexicano) y ZELLE.'
  },

  // Garantías / Colateral
  {
    keywords: ['garantia', 'garantía', 'colateral', 'prenda', 'aval', 'respaldo'],
    question: '¿Qué son las garantías?',
    answer: 'Las garantías son activos que respaldan tu préstamo. Puedes registrar bienes como colateral desde la sección "Garantías" para mejorar las condiciones de tu crédito.'
  },

  // Período de gracia
  {
    keywords: ['gracia', 'periodo de gracia', 'período de gracia', 'no pagar', 'espera'],
    question: '¿Qué es el período de gracia?',
    answer: 'Es un período de tiempo antes del primer pago donde no generas cuotas. Puede ser útil si necesitas un tiempo para disponer del dinero del préstamo.'
  },

  // Notificaciones
  {
    keywords: ['notificacion', 'notificación', 'aviso', 'alerta', 'aviso pago'],
    question: '¿Cómo recibo notificaciones?',
    answer: 'Recibes notificaciones en la sección "Notificaciones" del menú. Te alertan sobre pagos pendientes, aprobaciones de préstamos y otros eventos importantes.'
  },
  {
    keywords: ['recordar', 'recordatorio', 'alertar', 'avisar antes'],
    question: '¿Puedo configurar recordatorios?',
    answer: 'Sí, en Configuración puedes activar los recordatorios de pago para recibir alertas antes de que venzan tus cuotas.'
  },

  // Reportes y exportación
  {
    keywords: ['reporte', 'reportes', 'exportar', 'excel', 'pdf', 'descargar', 'estadistica', 'estadística'],
    question: '¿Cómo descargo reportes?',
    answer: 'En la sección "Reportes" puedes exportar tu historial de pagos, estados de cuenta y estadísticas en formato Excel (.xlsx) con diseño profesional.'
  },

  // Soporte
  {
    keywords: ['soporte', 'ayuda', 'help', 'problema', 'error', 'no funciona', 'falla', 'bug'],
    question: 'Necesito soporte técnico',
    answer: 'Si tienes problemas con la plataforma, describe tu problema y te ayudaré. También puedes contactar a tu administrador directamente desde la sección de comunicaciones.'
  },
  {
    keywords: ['contacto', 'comunicar', 'mensaje', 'hablar admin', 'hablar administrador', 'escribir'],
    question: '¿Cómo comunico con mi administrador?',
    answer: 'En la sección "Mis Comunicaciones" puedes ver los mensajes de tu administrador y responderles directamente. También puedes registrar interacciones desde ahí.'
  },

  // Referidos
  {
    keywords: ['referido', 'referir', 'invitar', 'codigo invitacion', 'código invitación', 'invite'],
    question: '¿Cómo referir a alguien?',
    answer: 'En la sección "Referidos" puedes ver tu código de invitación y compartirlo. Cuando alguien se registre con tu código, se vinculará a tu cuenta.'
  },

  // Configuración
  {
    keywords: ['configuracion', 'configuración', 'ajustes', 'preferencias', 'tema', 'oscuro', 'claro', 'dark mode'],
    question: '¿Cómo cambio la configuración?',
    answer: 'En la sección "Configuración" puedes cambiar tu tema (oscuro/claro), actualizar datos, cambiar contraseña y ajustar preferencias de notificaciones.'
  },

  // Registro / Login
  {
    keywords: ['registrarse', 'registrar', 'crear cuenta', 'sign up', 'cuenta nueva'],
    question: '¿Cómo me registro?',
    answer: 'Haz clic en "Crear cuenta" en la pantalla de login. Necesitas un correo electrónico, contraseña segura (8+ caracteres) y un código de invitación de tu administrador.'
  },
  {
    keywords: ['iniciar sesion', 'iniciar sesión', 'login', 'entrar', 'acceder', 'contraseña olvidada'],
    question: '¿Cómo inicio sesión?',
    answer: 'Ingresa tu correo y contraseña en la pantalla de login. Si olvidaste tu contraseña, usa "Olvidé mi contraseña" para recibir un correo de recuperación.'
  },

  // Multimoneda
  {
    keywords: ['cambiar moneda', 'otra moneda', 'divisa', 'conversion', 'conversión'],
    question: '¿Puedo cambiar de moneda?',
    answer: 'Sí, la plataforma soporta múltiples monedas. Tu administrador define la moneda del préstamo. Puedes ver las configuraciones de moneda en "Multi-Moneda".'
  },

  // Crédito comparar
  {
    keywords: ['comparar', 'comparacion', 'comparación', 'cual es mejor', 'opciones'],
    question: '¿Puedo comparar opciones de préstamo?',
    answer: 'Sí, en la sección "Comparar" puedes ver diferentes escenarios de préstamo con diferentes tasas y plazos para elegir la mejor opción para ti.'
  },

  // Simulador
  {
    keywords: ['simular', 'simulador', 'calcular', 'calculo', 'cuánto pagaré'],
    question: '¿Puedo simular mi préstamo?',
    answer: 'Sí, el "Simulador de Crédito" te permite calcular cuotas, intereses y amortización antes de solicitar tu préstamo. Es una herramienta muy útil para planificar.'
  },

  // Contrato de plantillas
  {
    keywords: ['plantilla', 'template', 'modelo contrato'],
    question: '¿Qué son las plantillas de contrato?',
    answer: 'Son modelos de contrato que el administrador puede personalizar. Incluyen variables como nombre del cliente, monto, tasa e intereses que se rellenan automáticamente.'
  },

  // Agradecimiento
  {
    keywords: ['gracias', 'thank', 'genial', 'perfecto', 'excellent', 'bien'],
    question: 'Agradecer',
    answer: '¡De nada! Me alegra poder ayudarte. Si tienes más dudas, no dudes en preguntar. ¡Estoy aquí para eso! 😊'
  },

  // Despedida
  {
    keywords: ['adios', 'adiós', 'bye', 'chao', 'hasta luego', 'nos vemos'],
    question: 'Despedirse',
    answer: '¡Hasta luego! Que tengas un excelente día. Recuerda que siempre estaré aquí si necesitas ayuda. 👋'
  },
];

export default function AppChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Soy SyncBot 🤖. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const getQuickReplies = () => {
    const q = messages.length < 3
      ? PREDEFINED_QA.slice(0, 6)
      : PREDEFINED_QA.slice(0, 4);
    return q;
  };

  const handleSend = (text = inputValue) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { sender: 'user', text }];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(text.toLowerCase());
      setMessages([...newMessages, { sender: 'bot', text: response }]);
      setIsTyping(false);
    }, 800);
  };

  const generateResponse = (input) => {
    for (let qa of PREDEFINED_QA) {
      if (qa.keywords.some(kw => input.includes(kw))) {
        return qa.answer;
      }
    }

    const suggestions = [
      'puedo preguntarte sobre: solicitud de préstamos, pagos, tasas de interés, rendimiento crediticio, KYC, contratos, monedas, garantías, reportes y más.',
      '¿Tienes alguna duda sobre cómo funciona la plataforma? Pregúntame sobre préstamos, pagos o tu puntaje crediticio.',
    ];
    return `No estoy seguro de entender tu pregunta. ${suggestions[Math.floor(Math.random() * suggestions.length)]}`;
  };

  const handleQuickReply = (qa) => {
    handleSend(qa.question);
  };

  return (
    <div className={`chatbot-wrapper ${isOpen ? 'open' : ''}`}>
      <button
        className="chatbot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir chat de ayuda"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isOpen && (
        <div className="chatbot-window neo-card">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <Bot size={20} />
              </div>
              <div>
                <div className="chatbot-name">SyncBot</div>
                <div className="chatbot-status">En línea</div>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.sender}`}>
                {msg.sender === 'bot' && <div className="msg-avatar bot"><Bot size={14}/></div>}
                <div className="msg-bubble">{msg.text}</div>
                {msg.sender === 'user' && <div className="msg-avatar user"><User size={14}/></div>}
              </div>
            ))}
            {isTyping && (
              <div className="chat-message bot">
                <div className="msg-avatar bot"><Bot size={14}/></div>
                <div className="msg-bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-quick-replies">
            {getQuickReplies().map((qa, i) => (
              <button key={i} className="quick-reply-btn" onClick={() => handleQuickReply(qa)}>
                {qa.question}
              </button>
            ))}
          </div>

          <div className="chatbot-input-area">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu duda aquí..."
              className="chatbot-input"
            />
            <button className="chatbot-send-btn" onClick={() => handleSend()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
