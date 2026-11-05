import { Navigate } from 'react-router-dom';

// Sign-up now happens through the same OTP flow as sign-in — /register just
// forwards to it so old links and bookmarks keep working.
export default function RegisterPage() {
  return <Navigate to="/login" replace />;
}
