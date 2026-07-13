import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * 로그인하지 않은 사용자가 접근하면 /login으로 리다이렉트한다.
 */
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // 초기 refresh 처리 중에는 잠깐 빈 화면 (스피너로 교체 가능)

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
