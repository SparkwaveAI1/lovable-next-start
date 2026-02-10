import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If not authenticated, redirect to auth page
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  return <OnboardingWizard />;
}
