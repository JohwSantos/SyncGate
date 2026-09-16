import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RotaPrivada from './routes/RotaPrivada';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Cartoes from './pages/Cartoes';
import Dispositivos from './pages/Dispositivos';
import Horarios from './pages/Horarios';
import Solicitacoes from './pages/Solicitacoes';
import Historico from './pages/Historico';
import EmConstrucao from './pages/EmConstrucao';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* O Layout inteiro fica atrás de UMA única RotaPrivada —
            assim, toda tela nova que adicionarmos aqui dentro já
            nasce protegida, sem precisar lembrar de proteger cada
            uma individualmente. */}
        <Route
          path="/"
          element={
            <RotaPrivada>
              <Layout />
            </RotaPrivada>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="cartoes" element={<Cartoes />} />
          <Route path="dispositivos" element={<Dispositivos />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="solicitacoes" element={<Solicitacoes />} />
          <Route path="historico" element={<Historico />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
