import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import axios from 'axios';
import {
  ArrowLeft,
  Package,
  Check,
  ExternalLink,
  Code,
  FileText,
  Layers,
  Link as LinkIcon,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

const ClientDeliverablePage = () => {
  const { deliverableId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliverable, setDeliverable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  useEffect(() => {
    const fetchDeliverable = async () => {
      try {
        const res = await axios.get(`${API}/deliverables/${deliverableId}`, { withCredentials: true });
        setDeliverable(res.data);
      } catch (error) {
        console.error('Error fetching deliverable:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliverable();
  }, [deliverableId]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API}/deliverables/${deliverableId}/approve`, null, {
        params: { feedback: 'Approved' },
        withCredentials: true
      });
      setDeliverable(prev => ({ ...prev, status: 'approved' }));
      setShowApproveConfirm(false);
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    setActionLoading(true);
    try {
      await axios.post(`${API}/deliverables/${deliverableId}/reject`, null, {
        params: { feedback: rejectReason },
        withCredentials: true
      });
      setDeliverable(prev => ({ ...prev, status: 'revision_requested', client_feedback: rejectReason }));
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to request revision');
    } finally {
      setActionLoading(false);
    }
  };

  const getBlockIcon = (type) => {
    switch (type) {
      case 'feature': return Layers;
      case 'integration': return LinkIcon;
      case 'api': return Code;
      case 'design': return FileText;
      default: return Layers;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!deliverable) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Deliverable not found</p>
        </div>
      </div>
    );
  }

  const isPending = deliverable.status === 'pending';
  const isApproved = deliverable.status === 'approved';
  const isRevisionRequested = deliverable.status === 'revision_requested';

  // Mock change summary (in real app, this would come from backend)
  const changeSummary = {
    added: deliverable.blocks?.filter(b => b.block_type === 'feature').map(b => b.title) || [],
    improved: deliverable.blocks?.filter(b => b.block_type === 'integration').map(b => b.title) || [],
    fixed: deliverable.blocks?.filter(b => b.block_type === 'api').map(b => b.title) || [],
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" data-testid="client-deliverable-page">
      {/* Breadcrumb */}
      <button 
        onClick={() => navigate('/client/dashboard')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Status Banner */}
      {isApproved && (
        <div className="mb-8 border border-success/30 rounded-2xl bg-success/10 p-6 flex items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-success" />
          <div>
            <h3 className="text-lg font-semibold text-success">Delivery Approved</h3>
            <p className="text-success/70 text-sm">Thank you! Development continues to the next phase.</p>
          </div>
        </div>
      )}

      {isRevisionRequested && (
        <div className="mb-8 border border-warning/30 rounded-2xl bg-warning/10 p-6">
          <div className="flex items-center gap-4 mb-3">
            <RefreshCw className="w-8 h-8 text-warning" />
            <div>
              <h3 className="text-lg font-semibold text-warning">Revision In Progress</h3>
              <p className="text-warning/70 text-sm">Our team is working on your requested changes</p>
            </div>
          </div>
          {deliverable.client_feedback && (
            <div className="mt-4 p-4 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground">Your feedback: {deliverable.client_feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 text-muted-foreground text-sm mb-3">
          <span className="px-2 py-1 bg-muted rounded-lg">{deliverable.version}</span>
          <span>·</span>
          <span className={`px-2 py-1 rounded-lg ${
            isPending ? 'bg-warning/10 text-warning' :
            isApproved ? 'bg-success/10 text-success' :
            'bg-signal/10 text-signal'
          }`}>
            {deliverable.status.replace('_', ' ')}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">{deliverable.title}</h1>
        <p className="text-lg text-muted-foreground">{deliverable.summary}</p>
      </div>

      {/* Change Summary */}
      <div className="mb-8 border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            What's Changed in {deliverable.version}
          </h2>
        </div>
        <div className="p-5 space-y-4">
          {changeSummary.added.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-success text-sm font-medium mb-2">
                <Plus className="w-4 h-4" />
                Added
              </div>
              <ul className="space-y-1 ml-6">
                {changeSummary.added.map((item, i) => (
                  <li key={i} className="text-muted-foreground text-sm">• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {changeSummary.improved.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-signal text-sm font-medium mb-2">
                <RefreshCw className="w-4 h-4" />
                Improved
              </div>
              <ul className="space-y-1 ml-6">
                {changeSummary.improved.map((item, i) => (
                  <li key={i} className="text-muted-foreground text-sm">• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {changeSummary.fixed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-warning text-sm font-medium mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
              <ul className="space-y-1 ml-6">
                {changeSummary.fixed.map((item, i) => (
                  <li key={i} className="text-muted-foreground text-sm">• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {changeSummary.added.length === 0 && changeSummary.improved.length === 0 && changeSummary.fixed.length === 0 && (
            <p className="text-muted-foreground text-sm">This delivery includes the features listed below.</p>
          )}
        </div>
      </div>

      {/* What's Included */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">What's Included</h2>
        <div className="space-y-4">
          {deliverable.blocks?.map((block, index) => {
            const Icon = getBlockIcon(block.block_type);
            return (
              <div 
                key={block.block_id || index}
                className="border border-border rounded-xl p-5 hover:border-border transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{block.title}</h3>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">{block.description}</p>
                    {(block.preview_url || block.api_url) && (
                      <div className="flex items-center gap-3 mt-3">
                        {block.preview_url && (
                          <a 
                            href={block.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-signal hover:text-signal"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Preview
                          </a>
                        )}
                        {block.api_url && (
                          <a 
                            href={block.api_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-signal hover:text-signal"
                          >
                            <Code className="w-3 h-3" />
                            API Docs
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resources */}
      {deliverable.resources?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Resources</h2>
          <div className="grid grid-cols-2 gap-4">
            {deliverable.resources.map((res, index) => (
              <a
                key={res.resource_id || index}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border rounded-xl p-4 hover:border-border hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-sm">{res.title}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{res.resource_type}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* What Happens Next */}
      <div className="mb-8 border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-signal" />
            What Happens Next
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-success" />
            </div>
            <div>
              <h4 className="font-medium text-success">If you approve</h4>
              <p className="text-muted-foreground text-sm mt-1">
                Development continues to the next phase. You'll receive the next delivery once ready.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h4 className="font-medium text-warning">If you request changes</h4>
              <p className="text-muted-foreground text-sm mt-1">
                Our team will review your feedback and fix the issues. You'll receive an updated delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="border border-border rounded-2xl p-6 bg-muted/30">
          <h3 className="font-semibold mb-4">Your Decision</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowApproveConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-success text-success-ink font-semibold rounded-xl hover:bg-success/90 transition-colors"
              data-testid="approve-btn"
            >
              <CheckCircle2 className="w-5 h-5" />
              Approve Delivery
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
              data-testid="request-changes-btn"
            >
              <MessageSquare className="w-5 h-5" />
              Request Changes
            </button>
          </div>
          <p className="text-center text-muted-foreground text-sm mt-4">
            <HelpCircle className="w-3 h-3 inline mr-1" />
            Need help deciding? Contact our team through support.
          </p>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md mx-4 bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Approve Delivery?</h3>
                <p className="text-muted-foreground text-sm">This will move the project to the next phase</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="flex-1 px-4 py-3 border border-border rounded-xl text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-success text-success-ink font-semibold rounded-xl hover:bg-success/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Required Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-lg mx-4 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Request Changes</h3>
                  <p className="text-muted-foreground text-sm">Tell us what needs to be fixed</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium mb-2">
                What needs to be changed? <span className="text-danger">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please describe the issues or changes you'd like us to make..."
                rows={5}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border resize-none"
                data-testid="reject-reason-input"
              />
              <p className="text-muted-foreground text-xs mt-2">
                Be specific so our team can address your concerns effectively.
              </p>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-3 border border-border rounded-xl text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 px-4 py-3 bg-warning text-warning-ink font-semibold rounded-xl hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="submit-changes-btn"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDeliverablePage;
