import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Building2, MapPin, UserPlus, ArrowRight, Clock, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { InvitationItem } from '../types/memberLifecycle.js';

export const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, token: authToken } = useAuth();

  const [invitation, setInvitation] = useState<InvitationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchInvitation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient<InvitationItem>(`/invitations/${token}`);
        setInvitation(data);
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
        } else if (data.name) {
          setName(data.name);
          setPhone(data.phone || '');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation link');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token, user]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!authToken) {
      // Redirect to login or register with return URL
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient(`/invitations/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({ name, phone }),
      });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/members');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <PageLoader message="Verifying invitation link..." />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Invitation Unavailable</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {error || 'This invitation token is invalid or has expired. Please contact the mess manager for a new link.'}
          </p>
          <Button variant="secondary" onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to {invitation.mess?.name}!</h2>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            Your invitation has been accepted. Redirecting you to your mess workspace...
          </p>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">Mess Invitation</span>
              <h1 className="text-2xl font-bold text-white leading-tight">{invitation.mess?.name || 'MessMate Workspace'}</h1>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" /> Location
              </span>
              <span className="text-slate-200 font-medium">
                {invitation.mess?.area ? `${invitation.mess.area}, ${invitation.mess.city}` : 'Dhaka, Bangladesh'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500" /> Assigned Role
              </span>
              <Badge variant="primary">{invitation.role}</Badge>
            </div>

            {invitation.roomNo && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500" /> Room Allocation
                </span>
                <span className="text-slate-200 font-medium">{invitation.roomNo}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Link Valid Until
              </span>
              <span className="text-slate-300 font-medium">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Siam Ahmed"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number (Optional)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1700 000000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {!authToken && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You will need to sign in or register to connect this invitation with your account.</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full py-3 text-base flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                'Joining Mess...'
              ) : authToken ? (
                <>
                  <UserPlus className="w-5 h-5" /> Accept & Join Mess
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" /> Sign In to Accept
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
