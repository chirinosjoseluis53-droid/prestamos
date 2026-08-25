import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import './AppChatBot.css';
import { useAuth } from '../context/AuthContext';

const PREDEFINED_QA = [
  {
    keywords: ['tasa', 'interes', 'interés', 'porcentaje'],
    question: '¿Cuáles son las tasas de interés?',
    answer: 'La tasa de interés estándar vigente es del 10%, aunque puede variar según tu nivel en el Rendimiento Crediticio.'
  },
  {
    keywords: ['solicitar', 'pedir', 'prestamo', 'préstamo', 'credito', 'crédito'],
    question: '¿Cómo solicito un préstamo?',
    answer: 'Ve a la pestaña "Solicitar" en el menú izquierdo, ingresa el monto que necesitas, las cuotas, acepta el contrato y tu solicitud será revisada.'
  },
  {
    keywords: ['pagar', 'pago', 'cuota', 'abonar'],
    question: '¿Cómo pago mi cuota?',
    answer: 'Dirígete a la sección "Pagar" en el menú. Allí verás tus próximas cuotas y podrás registrar tu pago fácilmente.'
  },
  {
    keywords: ['rendimiento', 'puntos', 'niveles', 'bronce', 'plata'],
    question: '¿Qué es el Rendimiento Crediticio?',
    answer: 'Es nuestro sistema de lealtad. Ganas puntos al pagar a tiempo, subiendo de nivel (Bronce, Plata, Oro, Diamante) para desbloquear mejores condiciones.'
  },
  {
    keywords: ['mora', 'retraso', 'tarde', 'vencido', 'penalidad'],
    question: '¿Qué pasa si me retraso?',
    answer: 'Los pagos atrasados pueden generar recargos y afectar negativamente tus puntos de Rendimiento Crediticio. ¡Procura pagar a tiempo!'
  },
  {
    keywords: ['hola', 'buenas', 'saludos', 'ayuda'],
    question: 'Saludar',
    answer: '¡Hola! Soy SyncBot 🤖. Estoy aquí para ayudarte con cualquier duda sobre la plataforma de préstamos. ¿En qué te puedo ayudar hoy?'
  }
];

export default function AppChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Soy SyncBot 🤖. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = (text = inputValue) => {
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: 'user', text }];
    setMessages(newMessages);
    setInputValue('');

    // Simulate thinking and respond
    setTimeout(() => {
      const response = generateResponse(text.toLowerCase());
      setMessages([...newMessages, { sender: 'bot', text: response }]);
    }, 600);
  };

  const generateResponse = (input) => {
    for (let qa of PREDEFINED_QA) {
      if (qa.keywords.some(kw => input.includes(kw))) {
        return qa.answer;
      }
    }
    return 'No estoy seguro de entender. Puedes preguntarme sobre tasas de interés, cómo solicitar préstamos, cómo pagar cuotas o sobre el rendimiento crediticio.';
  };

  const handleQuickReply = (qa) => {
    handleSend(qa.question);
  };

  return (
    <div className={`chatbot-wrapper ${isOpen ? 'open' : ''}`}>
      {/* Botón flotante */}
      <button 
        className="chatbot-toggle-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir chat de ayuda"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Ventana del Chat */}
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
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length < 4 && (
            <div className="chatbot-quick-replies">
              {PREDEFINED_QA.slice(0, 4).map((qa, i) => (
                <button key={i} className="quick-reply-btn" onClick={() => handleQuickReply(qa)}>
                  {qa.question}
                </button>
              ))}
            </div>
          )}

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
