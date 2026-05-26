'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, CheckCircle, XCircle, Calendar, Zap } from 'lucide-react';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'closed_won' | 'closed_lost';

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { value: 'booked', label: 'Booked', color: 'bg-purple-100 text-purple-700' },
  { value: 'dismissed', label: 'Dismissed', color: 'bg-red-100 text-red-700' },
];

interface ConversationActionsProps {
  conversationId: string;
  currentStatus: string;
  visitorEmail: string | null;
  agentId: string;
}

export default function ConversationActions({
  conversationId,
  currentStatus,
  visitorEmail,
  agentId,
}: ConversationActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === status) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        toast.success(`Status updated to ${newStatus}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status selector */}
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2">Lead status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateStatus(opt.value)}
                disabled={updating}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2 ${
                  status === opt.value
                    ? `${opt.color} border-current opacity-100`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="space-y-2">
          {visitorEmail && (
            <a
              href={`mailto:${visitorEmail}?subject=Following up on our conversation`}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Phone className="w-4 h-4 text-gray-400" />
              Send follow-up email
            </a>
          )}
          <button
            onClick={() => updateStatus('contacted')}
            disabled={updating || status === 'contacted'}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as contacted
          </button>
          <button
            onClick={() => updateStatus('booked')}
            disabled={updating || status === 'booked'}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Calendar className="w-4 h-4" />
            Mark as booked
          </button>
          <button
            onClick={() => updateStatus('dismissed')}
            disabled={updating || status === 'dismissed'}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Dismiss
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
