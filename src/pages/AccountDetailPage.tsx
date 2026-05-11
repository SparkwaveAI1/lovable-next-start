import { Navigate, useParams } from 'react-router-dom';

const AccountDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/crm" replace />;
  }

  return <Navigate to={`/contacts?contact=${id}`} replace />;
};

export default AccountDetailPage;
