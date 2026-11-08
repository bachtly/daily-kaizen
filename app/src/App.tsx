import { RouterProvider } from 'react-router';
import { router } from './routes';

const r = router();

export default function App() {
  return <RouterProvider router={r} />;
}
