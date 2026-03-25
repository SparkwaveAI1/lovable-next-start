import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccountDetail } from '@/components/crm/AccountDetail';

const AccountDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/crm');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <AccountDetail accountId={id} onBack={() => navigate('/crm')} />
      </div>
    </DashboardLayout>
  );
};

export default AccountDetailPage;
