import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { DeliveryPage } from './pages/delivery/DeliveryPage';
import { ThemeToggle } from './components/ThemeToggle';

function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground flex-1">FleetViz</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DeliveryPage /> },
      { path: '/delivery', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
