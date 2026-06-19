import { useState } from 'react';

export const useUser = () => {
  // Inicializamos el estado directamente desde localStorage
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  return { user };
};
