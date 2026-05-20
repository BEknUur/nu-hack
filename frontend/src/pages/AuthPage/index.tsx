import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'login' | 'register';

export default function AuthPage() {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState<Tab>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (tab === 'login') {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            navigate('/app', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#06080f] flex flex-col items-center justify-center px-4">
            {/* Logo */}
            <a href="/" className="flex flex-col items-center leading-none mb-10">
                <span className="font-display text-xl font-medium text-white tracking-[-0.04em]">DeCentra</span>
                <span className="text-[11px] text-white/30 mt-1 tracking-widest uppercase">Shadow Map</span>
            </a>

            <div
                className="w-full max-w-sm rounded-2xl p-8"
                style={{
                    background: 'linear-gradient(135deg, #0d1117, #111820)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}
            >
                {/* Tabs */}
                <div className="flex rounded-lg overflow-hidden mb-7" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {(['login', 'register'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setError(null); }}
                            className="flex-1 py-2.5 text-sm font-medium transition-all duration-150"
                            style={{
                                color: tab === t ? '#fff' : 'rgba(255,255,255,0.35)',
                                background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                            }}
                        >
                            {t === 'login' ? 'Войти' : 'Регистрация'}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-white/20 transition"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                            className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-white/20 transition"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-50 mt-2"
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                        {loading
                            ? 'Загрузка...'
                            : tab === 'login' ? 'Войти' : 'Создать аккаунт'
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}
