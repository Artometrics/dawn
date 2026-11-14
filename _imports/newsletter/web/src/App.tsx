import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '@/lib/session';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { Compose } from '@/pages/admin/Compose';
import { Counts } from '@/pages/admin/Counts';
import { Letters } from '@/pages/admin/Letters';
import { Log } from '@/pages/admin/Log';
import { Subscribers } from '@/pages/admin/Subscribers';
import { Archive } from '@/pages/Archive';
import { Confirm } from '@/pages/Confirm';
import { Home } from '@/pages/Home';
import { IssuePage } from '@/pages/IssuePage';
import { Unsubscribed } from '@/pages/Unsubscribed';

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/archive/:slug" element={<IssuePage />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/unsubscribed" element={<Unsubscribed />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Subscribers />} />
            <Route path="write" element={<Compose />} />
            <Route path="write/:id" element={<Compose />} />
            <Route path="letters" element={<Letters />} />
            <Route path="counts" element={<Counts />} />
            <Route path="log" element={<Log />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
