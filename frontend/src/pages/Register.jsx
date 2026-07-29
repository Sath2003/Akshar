import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, GraduationCap, School, Users } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const navigate = useNavigate();
  const { registerSchool, registerUser } = useAuth();
  
  const [tab, setTab] = useState('JOIN'); // 'JOIN' or 'SCHOOL'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form State for Join School
  const [joinData, setJoinData] = useState({
    schoolCode: '',
    displayName: '',
    username: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });

  // Form State for Register School
  const [schoolData, setSchoolData] = useState({
    schoolName: '',
    schoolCode: '',
    adminName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: ''
  });

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await registerUser(joinData);
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await registerSchool(schoolData);
      setSuccessMessage('School created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChange = (e) => setJoinData({ ...joinData, [e.target.id]: e.target.value });
  const handleSchoolChange = (e) => setSchoolData({ ...schoolData, [e.target.id]: e.target.value });

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
          
          {successMessage ? (
            <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Success!</h3>
              <p className="text-green-600">{successMessage}</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h2>
                <p className="text-gray-600">Select how you want to join the platform.</p>
              </div>

              {/* Tabs */}
              <div className="flex space-x-2 mb-6 p-1 bg-gray-100/50 rounded-lg backdrop-blur-sm">
                <button
                  onClick={() => setTab('JOIN')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center ${
                    tab === 'JOIN' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" /> Join School
                </button>
                <button
                  onClick={() => setTab('SCHOOL')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center ${
                    tab === 'SCHOOL' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <School className="w-4 h-4 mr-2" /> Register School
                </button>
              </div>

              {/* Join School Form */}
              {tab === 'JOIN' && (
                <form onSubmit={handleJoinSubmit} className="space-y-4 animate-fade-in">
                  <Input
                    id="schoolCode"
                    label="School Code"
                    type="text"
                    placeholder="e.g. AKSHAR2026"
                    value={joinData.schoolCode}
                    onChange={handleJoinChange}
                    required
                    disabled={isLoading}
                    className="uppercase"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="displayName" label="Full Name" type="text" placeholder="John Doe" value={joinData.displayName} onChange={handleJoinChange} required disabled={isLoading} />
                    <Input id="username" label="Username" type="text" placeholder="johndoe123" value={joinData.username} onChange={handleJoinChange} required disabled={isLoading} />
                  </div>
                  <Input id="email" label="Email Address" type="email" placeholder="john@example.com" value={joinData.email} onChange={handleJoinChange} required disabled={isLoading} />
                  <Input id="password" label="Password" type="password" placeholder="Min. 6 characters" value={joinData.password} onChange={handleJoinChange} required disabled={isLoading} minLength={6} />
                  <div className="premium-input-wrapper">
                    <label className="premium-label">Role</label>
                    <select id="role" value={joinData.role} onChange={handleJoinChange} disabled={isLoading} className="premium-input w-full cursor-pointer">
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                    </select>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" isLoading={isLoading} className="mt-4"><UserPlus className="w-5 h-5 mr-2 inline" /> Register Now</Button>
                </form>
              )}

              {/* Register School Form */}
              {tab === 'SCHOOL' && (
                <form onSubmit={handleSchoolSubmit} className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="schoolName" label="School Name" type="text" placeholder="Akshar Int." value={schoolData.schoolName} onChange={handleSchoolChange} required disabled={isLoading} />
                    <Input id="schoolCode" label="School Code" type="text" placeholder="AKSHAR2026" value={schoolData.schoolCode} onChange={handleSchoolChange} required disabled={isLoading} className="uppercase" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="adminName" label="Admin Name" type="text" placeholder="Jane Smith" value={schoolData.adminName} onChange={handleSchoolChange} required disabled={isLoading} />
                    <Input id="adminUsername" label="Admin Username" type="text" placeholder="adminjane" value={schoolData.adminUsername} onChange={handleSchoolChange} required disabled={isLoading} />
                  </div>
                  <Input id="adminEmail" label="Admin Email" type="email" placeholder="admin@example.com" value={schoolData.adminEmail} onChange={handleSchoolChange} required disabled={isLoading} />
                  <Input id="adminPassword" label="Admin Password" type="password" placeholder="Min. 6 characters" value={schoolData.adminPassword} onChange={handleSchoolChange} required disabled={isLoading} minLength={6} />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" isLoading={isLoading} className="mt-4"><School className="w-5 h-5 mr-2 inline" /> Register School</Button>
                </form>
              )}
            </>
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
