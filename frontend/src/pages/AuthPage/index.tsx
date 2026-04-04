import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthUI } from '@/components/ui/auth-fuse';

export default function AuthPage() {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async (email: string, password: string) => {
        await signIn(email, password);
        navigate('/app', { replace: true });
    };

    const handleSignUp = async (email: string, password: string) => {
        await signUp(email, password);
        navigate('/app', { replace: true });
    };

    return <AuthUI onSignIn={handleSignIn} onSignUp={handleSignUp} />;
}
