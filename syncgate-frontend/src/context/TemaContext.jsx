import { createContext, useContext, useEffect, useState } from 'react';

const TemaContext = createContext(null);

function temaInicial() {
  const salvo = localStorage.getItem('syncgate_tema');
  if (salvo === 'dark' || salvo === 'light') return salvo;
  return 'dark';
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem('syncgate_tema', tema);
  }, [tema]);

  function alternarTema() {
    setTema((atual) => (atual === 'dark' ? 'light' : 'dark'));
  }

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error('useTema precisa ser usado dentro de um <TemaProvider>');
  return contexto;
}
