import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, GraduationCap } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 overflow-hidden animate-fade-in">
        
        {/* Left Side: Branding / Info */}
        <div className="bg-indigo-600 p-12 text-white flex flex-col justify-center relative overflow-hidden hidden md:flex">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-200"></div>
          
          <div className="relative z-10 flex flex-col items-start hover-scale">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm mb-6">
              <GraduationCap size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">Join<br/>Akshar</h1>
            <p className="text-indigo-100 text-lg">
              Start your educational journey with our next-generation digital platform today.
            </p>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white/40">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-600">Register to access the education platform.</p>
          </div>

          {success ? (
            <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Registration Successful!</h3>
              <p className="text-green-600">Redirecting you to the login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="displayName"
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={formData.displayName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                id="username"
                label="Username"
                type="text"
                placeholder="johndoe123"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                id="email"
                label="Email Address"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                minLength={6}
              />

              <div className="premium-input-wrapper">
                <label className="premium-label">Role</label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="premium-input w-full cursor-pointer"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                </select>
              </div>

              {error && (
                <div className="p-4 bg-red-50/80 border-l-4 border-red-500 rounded-r-md animate-fade-in">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <Button type="submit" isLoading={isLoading} className="mt-6">
                <UserPlus className="w-5 h-5 mr-2 inline" />
                Register Now
              </Button>
            </form>
          )}
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign In here
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
