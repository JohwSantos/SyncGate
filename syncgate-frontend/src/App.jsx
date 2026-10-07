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
import ImportacaoExportacao from './pages/ImportacaoExportacao';
import AcessoNegado from './pages/AcessoNegado';
import RotaPermissao from './routes/RotaPermissao';
import { TemaProvider } from './context/TemaContext';

export default function App() {
  return (
    <TemaProvider>
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
          <Route path="acesso-negado" element={<AcessoNegado />} />
          <Route path="usuarios" element={<RotaPermissao perfis={['gestor', 'master']}><Usuarios /></RotaPermissao>} />
          <Route path="cartoes" element={<RotaPermissao perfis={['master']}><Cartoes /></RotaPermissao>} />
          <Route path="dispositivos" element={<RotaPermissao perfis={['master']}><Dispositivos /></RotaPermissao>} />
          <Route path="horarios" element={<RotaPermissao perfis={['gestor', 'master']}><Horarios /></RotaPermissao>} />
          <Route path="solicitacoes" element={<Solicitacoes />} />
          <Route path="historico" element={<Historico />} />
          <Route path="importacao-exportacao" element={<ImportacaoExportacao />} />
        </Route>
        </Routes>
      </AuthProvider>
    </TemaProvider>
  );
}
