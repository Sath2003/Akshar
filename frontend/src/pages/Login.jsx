import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 overflow-hidden animate-fade-in">
        
        {/* Left Side: Branding / Info */}
        <div className="bg-indigo-600 p-12 text-white flex flex-col justify-center relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-200"></div>
          
          <div className="relative z-10 flex flex-col items-start hover-scale">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm mb-6">
              <GraduationCap size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">Akshar<br/>International</h1>
            <p className="text-indigo-100 text-lg">
              Empowering education through next-generation digital assessment and interactive learning.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-12 flex flex-col justify-center bg-white/40">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Please enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="username"
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />

            {error && (
              <div className="p-4 bg-red-50/80 border-l-4 border-red-500 rounded-r-md animate-fade-in">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="mt-4">
              <LogIn className="w-5 h-5 mr-2 inline" />
              Sign In
            </Button>
          </form>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            Secure connection via TLS 1.3
          </div>
        </div>

      </div>
    </div>
  );
}
