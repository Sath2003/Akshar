import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, GraduationCap, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function Login() {
  const navigate = useNavigate();
  const { login, verifyOtp } = useAuth();
  
  // Step 1: Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Step 2: OTP
  const [step, setStep] = useState(1); // 1 = Credentials, 2 = OTP
  const [userId, setUserId] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  
  // Shared state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Focus first OTP input when step changes
  useEffect(() => {
    if (step === 2 && otpRefs[0].current) {
      otpRefs[0].current.focus();
    }
  }, [step]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.requiresOtp) {
        setUserId(result.userId);
        setEmailSent(result.emailSent);
        setStep(2);
      } else {
        // If backend somehow doesn't require OTP
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await verifyOtp(userId, code);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtpValues = [...otpValues];
    // Take only the last character if they pasted or typed fast
    newOtpValues[index] = value.slice(-1);
    setOtpValues(newOtpValues);

    // Auto-advance
    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtpValues(['', '', '', '', '', '']);
    setError('');
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

        {/* Right Side: Dynamic Form Container */}
        <div className="p-12 flex flex-col justify-center bg-white/40 relative">
          
          {/* ── STEP 1: CREDENTIALS ── */}
          {step === 1 && (
            <div className="animate-fade-in w-full">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Please enter your credentials to continue.</p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-6">
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
              
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">Don't have an account? </span>
                <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                  Register here
                </Link>
              </div>
            </div>
          )}

          {/* ── STEP 2: OTP VERIFICATION ── */}
          {step === 2 && (
            <div className="animate-fade-in w-full">
              <button 
                onClick={handleBack}
                disabled={isLoading}
                className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Two-Factor Authentication</h2>
                <p className="text-gray-600">
                  {emailSent 
                    ? "We've sent a 6-digit verification code to your email."
                    : "Please enter your 6-digit verification code."}
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-8">
                <div className="flex justify-between gap-2 max-w-sm mx-auto">
                  {otpValues.map((val, index) => (
                    <input
                      key={index}
                      ref={otpRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold bg-white/80 border-2 border-gray-200 rounded-lg focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    />
                  ))}
                </div>

                {error && (
                  <div className="p-4 bg-red-50/80 border-l-4 border-red-500 rounded-r-md animate-fade-in">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                <Button type="submit" isLoading={isLoading}>
                  Verify & Continue
                </Button>
              </form>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={handleCredentialsSubmit} 
                  disabled={isLoading}
                  className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center mx-auto"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Didn't receive a code? Resend
                </button>
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-12 right-12 text-center text-sm text-gray-500">
            Secure connection via TLS 1.3
          </div>
        </div>

      </div>
    </div>
  );
}
