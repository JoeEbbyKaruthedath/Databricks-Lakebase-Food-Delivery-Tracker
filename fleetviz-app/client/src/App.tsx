import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@databricks/appkit-ui/react';
import { DeliveryPage } from './pages/delivery/DeliveryPage';
import { ThemeToggle } from './components/ThemeToggle';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">FleetViz</h1>
        <nav className="flex gap-1 flex-1">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/delivery" className={navLinkClass}>
            Delivery
          </NavLink>
        </nav>
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
      { path: '/', element: <HomePage /> },
      { path: '/delivery', element: <DeliveryPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

function HomePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-foreground">
          Welcome to FleetViz
        </h2>
        <p className="text-lg text-muted-foreground">
          USA food delivery tracking powered by Databricks Lakebase
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Delivery Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            View ~10,000 synthetic delivery events across US metros. Scrub the timeline
            to see where every order was at any point in time.
          </p>
          <NavLink
            to="/delivery"
            className="inline-flex text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Open Delivery Tracker →
          </NavLink>
        </CardContent>
      </Card>
    </div>
  );
}
