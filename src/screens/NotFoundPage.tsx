import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-ink-faint">404</p>
      <p className="mt-2 text-lg font-semibold">Page not found</p>
      <p className="mt-1 text-sm text-ink-soft">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
