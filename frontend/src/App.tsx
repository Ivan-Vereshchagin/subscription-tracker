import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateSubscription from './pages/CreateSubscription';
import EditSubscription from './pages/EditSubscription';
import Payments from './pages/Payments';
import EditPayment from './pages/EditPayment';
import CreatePayment from './pages/CreatePayment';
import Stats from './pages/Stats';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscriptions/new" element={<CreateSubscription />} />
        <Route path="/subscriptions/:id/edit" element={<EditSubscription />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payments/new" element={<CreatePayment />} />
        <Route path="/payments/:id/edit" element={<EditPayment />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
