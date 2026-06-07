import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  PlusCircle,
  LayoutDashboard,
  Users,
  FolderGit2,
  Bell,
  Search,
  User,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
  Activity as ActivityIcon,
  Settings as SettingsIcon,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { useToast } from './ui/Toast';

interface LayoutProps {
  children: React.ReactNode;
  onAddExpenseClick: () => void;
}

export function Layout({ children, onAddExpenseClick }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Searching workspace for "${searchQuery}"...`);
    }
  };

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Friends', to: '/friends', icon: <Users className="w-4 h-4" /> },
    { name: 'Groups', to: '/groups', icon: <FolderGit2 className="w-4 h-4" /> },
    { name: 'Settlements', to: '/settlements', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { name: 'Activity', to: '/activity', icon: <ActivityIcon className="w-4 h-4" /> },
    { name: 'Profile', to: '/profile', icon: <User className="w-4 h-4" /> },
    { name: 'Settings', to: '/settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  // Mock notifications matching real-time activity events
  const mockNotifications = [
    { id: 1, text: 'Ram settled $5.00', time: '5 mins ago', read: false },
    { id: 2, text: 'Kiran joined Goa Trip', time: '1 hour ago', read: false },
    { id: 3, text: 'New expense "Pizza Dinner" added', time: '2 hours ago', read: true },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-full">
      <div className="space-y-6 w-full">
        {/* Brand Header */}
        <div 
          className="flex items-center gap-3 px-2 py-1 cursor-pointer transition-all duration-200 hover:opacity-90" 
          onClick={() => navigate('/')}
        >
          <div className="p-2 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 rounded-xl shadow-lg border border-white/10">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-none text-base">GroupPay</h1>
            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest mt-1 block">SaaS Platform</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            onAddExpenseClick();
          }}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs border border-purple-400/20 group cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
          Add New Expense
        </button>

        {/* Main Navigation with active indicators */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `relative w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-3 border ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-white/10 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                    />
                  )}
                  <span className={`${isActive ? 'text-purple-400' : 'text-slate-500'}`}>{item.icon}</span>
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User profile card */}
      {profile && (
        <div
          onClick={() => {
            setMobileMenuOpen(false);
            navigate('/profile');
          }}
          className="glass-card p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 hover:border-white/15 transition-all duration-300 border-white/5 group mt-auto"
        >
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-purple-500/20 group-hover:ring-purple-500/50 transition-all duration-300"
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                  profile.name
                )} flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-purple-500/20 group-hover:ring-purple-500/50 transition-all duration-300`}
              >
                {getInitials(profile.name)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-purple-300 transition-colors duration-200">
              {profile.name}
            </h4>
            <p className="text-[9px] text-slate-500 truncate mt-0.5">{profile.share_id}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* 1. Sidebar for Desktop */}
      <aside className="w-64 fixed inset-y-0 left-0 z-40 glass-panel border-r border-white/5 flex flex-col justify-between p-5 hidden lg:flex">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-64 glass-panel border-r border-white/10 p-5 flex flex-col justify-between z-10"
            >
              <div className="absolute top-5 right-5">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Main Workspace */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-16 lg:pb-0">
        {/* Topbar / Header */}
        <header className="h-16 glass-panel border-b border-white/5 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3.5 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <Layers className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-sm text-white tracking-tight">GroupPay</span>
            </div>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xs hidden md:block">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expenses, groups or friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 text-xs rounded-full glass-input placeholder:text-slate-500 focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10 focus:outline-none"
              />
            </div>
          </form>

          {/* User notification bell + profile dropdown */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserDropdownOpen(false);
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all relative cursor-pointer focus:outline-none"
              >
                <Bell className="w-4.5 h-4.5 text-slate-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full ring-2 ring-slate-950"></span>
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2.5 w-80 glass-panel p-4 rounded-2xl shadow-2xl border-white/10 text-xs space-y-3 z-50"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="font-bold text-white tracking-tight text-xs">Notifications</span>
                        <span className="text-[9px] text-purple-400 font-semibold px-2 py-0.5 rounded-full bg-purple-500/10">3 New</span>
                      </div>
                      <div className="space-y-2">
                        {mockNotifications.map((noti) => (
                          <div key={noti.id} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-colors duration-200">
                            <p className="text-slate-200 text-xs font-semibold leading-normal">{noti.text}</p>
                            <span className="text-[9px] text-slate-500 block mt-1">{noti.time}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            {profile && (
              <div className="relative">
                <button
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all cursor-pointer focus:outline-none"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-8.5 h-8.5 rounded-full object-cover" />
                  ) : (
                    <div
                      className={`w-8.5 h-8.5 rounded-full bg-gradient-to-tr ${getAvatarColor(
                        profile.name
                      )} flex items-center justify-center text-white text-[11px] font-bold`}
                    >
                      {getInitials(profile.name)}
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1.5 hidden sm:block" />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2.5 w-48 glass-panel p-2 rounded-2xl shadow-2xl border-white/10 text-xs space-y-0.5 z-50"
                      >
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigate('/profile');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2.5 font-bold"
                        >
                          <User className="w-4 h-4 text-slate-500" /> My Profile
                        </button>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2.5 font-bold"
                        >
                          <SettingsIcon className="w-4 h-4 text-slate-500" /> Settings
                        </button>
                        <hr className="border-white/5 my-1" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-2.5 font-bold"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 flex flex-col">{children}</main>
      </div>

      {/* 4. Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-white/5 px-2 flex items-center justify-around z-40 lg:hidden">
        {navItems.slice(0, 6).map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[9px] font-extrabold transition-all duration-200 ${
                isActive ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export default Layout;
