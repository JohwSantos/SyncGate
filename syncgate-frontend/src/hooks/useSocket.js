import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { URL_BASE, pegarToken } from '../api/client';

// URL_BASE é algo como "http://localhost:3000/api" — o Socket.io
// conecta na raiz do servidor, sem o "/api".
const URL_SOCKET = URL_BASE.replace(/\/api\/?$/, '');

// Hook reutilizável: qualquer tela pode "escutar" eventos do
// backend em tempo real chamando useSocket({ 'novo-acesso': fn }).
// A conexão é criada uma vez e fechada automaticamente quando o
// componente que usa o hook é desmontado.
export function useSocket(handlers = {}) {
  const [conectado, setConectado] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = pegarToken();
    if (!token) return undefined;

    const socket = io(URL_SOCKET, { auth: { token } });

    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    // Registra dinamicamente todos os eventos passados pelo
    // componente, sem precisar listar cada um aqui dentro.
    Object.keys(handlersRef.current).forEach((evento) => {
      socket.on(evento, (dados) => handlersRef.current[evento](dados));
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { conectado };
}
