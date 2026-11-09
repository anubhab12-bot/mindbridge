import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Megaphone, 
  Plus, 
  Link2, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Users, 
  MousePointer, 
  Share2, 
  Tag, 
  ExternalLink,
  Award
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export default function InfluencerHub() {
  const { 
    campaigns, 
    createCampaign, 
    updateCampaign, 
    hasPermission, 
    currentRole 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // New Campaign Form State
  const [newCamp, setNewCamp] = useState({
    name: '',
    influencerName: '',
    influencerEmail: '',
    handle: '',
    platform: 'Instagram / TikTok',
    slug: '',
    promoCode: '',
    targetAudience: 'College Students & Gen Z',
    commissionRate: 15,
    discountPercent: 20,
  });

  const canManage = hasPermission('influencers.manage');

  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const totalSignups = campaigns.reduce((acc, c) => acc + (c.signups || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.revenueGenerated || 0), 0);
  const totalCommission = campaigns.reduce((acc, c) => acc + (c.commissionEarned || 0), 0);

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!newCamp.name || !newCamp.slug) return;
    createCampaign({
      name: newCamp.name,
      influencerName: newCamp.influencerName,
      influencerEmail: newCamp.influencerEmail,
      handle: newCamp.handle,
      platform: newCamp.platform,
      slug: newCamp.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      promoCode: newCamp.promoCode.toUpperCase(),
      targetAudience: newCamp.targetAudience,
      commissionRate: parseFloat(newCamp.commissionRate) || 15,
      discountPercent: parseFloat(newCamp.discountPercent) || 20,
    });
    setIsModalOpen(false);
    setNewCamp({
      name: '',
      influencerName: '',
      influencerEmail: '',
      handle: '',
      platform: 'Instagram / TikTok',
      slug: '',
      promoCode: '',
      targetAudience: 'College Students & Gen Z',
      commissionRate: 15,
      discountPercent: 20,
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Growth & Partnerships</span>
            <Badge color="purple">Influencer Operations Hub</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-purple-400" />
            <span>Influencer Marketing Campaigns & Referral Tracking</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Empower creators, campus mental health advocates, and wellness influencers to promote MindBridge with unique trackable referral links, custom promo codes, and automated commission payouts.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Influencer Campaign</span>
          </button>
        )}
      </div>

      {/* Aggregate Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Referral Clicks</span>
            <MousePointer className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {totalClicks.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all trackable creator links</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>New Patients Acquired</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {totalSignups.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">18.2% avg conversion rate</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Gross Revenue Attributed</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
            ${totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Consultations & therapy subscriptions</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Influencer Payouts</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-400">
            ${totalCommission.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Performance commissions earned</p>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-400" />
              <span>Active Creator Partnerships ({campaigns.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live referral campaigns driving community adoption for MindBridge
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {campaigns.map(camp => {
            const liveUrl = `https://anubhab12-bot.github.io/mindbridge/?ref=${camp.slug}`;
            const isCopied = copiedId === camp.id;

            return (
              <div 
                key={camp.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-5"
              >
                {/* Campaign & Creator Metadata */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{camp.name}</h3>
                    <Badge color="purple" className="text-[10px]">
                      {camp.platform}
                    </Badge>
                    <Badge color={camp.payoutStatus === 'paid' ? 'emerald' : camp.payoutStatus === 'processing' ? 'sky' : 'amber'} className="text-[10px]">
                      Payout: {camp.payoutStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span>Creator: <strong className="text-slate-200">{camp.influencerName}</strong> ({camp.handle})</span>
                    <span>Audience: <strong className="text-slate-200">{camp.targetAudience}</strong></span>
                    <span>Commission: <strong className="text-emerald-400 font-bold">{camp.commissionRate}%</strong></span>
                  </div>

                  {/* Trackable Link and Promo Code pills */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {/* Trackable URL */}
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-purple-300">
                      <Link2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{liveUrl}</span>
                      <button
                        onClick={() => copyToClipboard(liveUrl, camp.id + '-url')}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy trackable link"
                      >
                        {copiedId === camp.id + '-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Promo Code */}
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300">
                      <Tag className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Code: <strong>{camp.promoCode}</strong> ({camp.discountPercent}% OFF)</span>
                      <button
                        onClick={() => copyToClipboard(camp.promoCode, camp.id + '-code')}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy promo code"
                      >
                        {copiedId === camp.id + '-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conversion Metrics */}
                <div className="flex items-center gap-6 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 self-start xl:self-auto">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Clicks</p>
                    <p className="text-sm font-bold text-white mt-0.5">{camp.clicks.toLocaleString()}</p>
                  </div>
                  <div className="text-center border-l border-slate-800 pl-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Signups</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{camp.signups.toLocaleString()}</p>
                  </div>
                  <div className="text-center border-l border-slate-800 pl-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Consults</p>
                    <p className="text-sm font-bold text-indigo-400 mt-0.5">{camp.consultationsBooked}</p>
                  </div>
                  <div className="text-center border-l border-slate-800 pl-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Commission</p>
                    <p className="text-sm font-bold text-amber-400 mt-0.5">${camp.commissionEarned.toLocaleString()}</p>
                  </div>
                </div>

                {/* Payout status actions for admin */}
                {canManage && (
                  <div className="flex items-center gap-2 self-end xl:self-center">
                    {camp.payoutStatus === 'pending' && (
                      <button
                        onClick={() => updateCampaign(camp.id, { payoutStatus: 'paid' })}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all"
                      >
                        Approve Payout
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Create Influencer Campaign */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Launch Influencer & Referral Campaign"
        subtitle="Generate unique trackable URL slug and promo discount code"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Campaign Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Finals Week De-Stress Campus Drive"
              value={newCamp.name}
              onChange={e => setNewCamp({ ...newCamp, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Influencer / Creator Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Elena Rostova"
                value={newCamp.influencerName}
                onChange={e => setNewCamp({ ...newCamp, influencerName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Social Handle & Platform</label>
              <input
                type="text"
                required
                placeholder="e.g. @mindful_alex (TikTok)"
                value={newCamp.handle}
                onChange={e => setNewCamp({ ...newCamp, handle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Custom URL Slug (mindbridge.app/ref/...)</label>
              <input
                type="text"
                required
                placeholder="e.g. calm-campus"
                value={newCamp.slug}
                onChange={e => setNewCamp({ ...newCamp, slug: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Coupon Code</label>
              <input
                type="text"
                required
                placeholder="e.g. CALM20"
                value={newCamp.promoCode}
                onChange={e => setNewCamp({ ...newCamp, promoCode: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Creator Commission Rate (%)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={newCamp.commissionRate}
                onChange={e => setNewCamp({ ...newCamp, commissionRate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Consultation Discount (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={newCamp.discountPercent}
                onChange={e => setNewCamp({ ...newCamp, discountPercent: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
            >
              Deploy Campaign
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
