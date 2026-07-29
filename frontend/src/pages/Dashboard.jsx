import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { LogOut, LayoutDashboard, User } from 'lucide-react';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <header className="glass-panel p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-indigo-600 w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Platform Dashboard</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-600 bg-white/50 px-4 py-2 rounded-full shadow-sm">
              <User className="w-4 h-4" />
              <span className="font-medium">{user.username} ({user.role})</span>
            </div>
            <Button onClick={handleLogout} className="!w-auto !py-2 !px-4 !bg-red-50 !text-red-600 hover:!bg-red-100 !shadow-none">
              <LogOut className="w-4 h-4 mr-2 inline" />
              Logout
            </Button>
          </div>
        </header>

        {/* Dashboard Content Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 text-center hover-scale">
            <h3 className="text-lg font-bold text-gray-800 mb-2">My Profile</h3>
            <p className="text-gray-600">View your settings and preferences.</p>
          </div>
          <div className="glass-panel p-8 text-center hover-scale delay-100">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Recent Activity</h3>
            <p className="text-gray-600">Check your latest actions and notifications.</p>
          </div>
          <div className="glass-panel p-8 text-center hover-scale delay-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Platform Stats</h3>
            <p className="text-gray-600">View overall system health and metrics.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
