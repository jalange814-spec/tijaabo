/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Announcement } from '../../types';
import {
  MessageSquare,
  PlusCircle,
  Bell,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  X,
  Send,
} from 'lucide-react';

export const MessagingModule: React.FC = () => {
  const { announcements, addAnnouncement, markAnnouncementRead, settings, currentRole, currentUser } = useApp();

  const canPublishNotice = currentRole !== 'Student' && currentRole !== 'Parent';
  const [filterAudience, setFilterAudience] = useState<string>('All');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [form, setForm] = useState<{
    title: string;
    body: string;
    author: string;
    authorRole: string;
    targetAudience: Announcement['targetAudience'];
    priority: Announcement['priority'];
  }>({
    title: '',
    body: '',
    author: currentUser?.fullName || settings.principalName,
    authorRole: currentRole,
    targetAudience: 'All',
    priority: 'Normal',
  });

  const roleScopedAnnouncements = announcements.filter((a) => {
    if (currentRole === 'Student') return a.targetAudience === 'All' || a.targetAudience === 'Students';
    if (currentRole === 'Parent') return a.targetAudience === 'All' || a.targetAudience === 'Parents';
    return true;
  });

  const filteredAnnouncements = roleScopedAnnouncements.filter(
    (a) => filterAudience === 'All' || a.targetAudience === filterAudience || a.targetAudience === 'All'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    addAnnouncement(form);
    setIsComposeOpen(false);
    setForm({
      title: '',
      body: '',
      author: currentUser?.fullName || settings.principalName,
      authorRole: currentRole,
      targetAudience: 'All',
      priority: 'Normal',
    });
  };

  const visibleAudiences =
    currentRole === 'Student'
      ? ['All', 'Students']
      : currentRole === 'Parent'
      ? ['All', 'Parents']
      : ['All', 'Parents', 'Teachers', 'Students', 'Staff'];

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Farriimaha &amp; Ogeysiisyada (Internal Messaging &amp; Notices)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Xiriirka tooska ah ee maamulka, macallimiinta, ardayda, iyo waalidiinta Machadka Khadiija.
          </p>
        </div>

        {canPublishNotice && (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Qor Ogeysiis Cusub
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {visibleAudiences.map((aud) => (
            <button
              key={aud}
              onClick={() => setFilterAudience(aud)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                filterAudience === aud
                  ? 'bg-[#005A51] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {aud === 'All' && 'Dhammaan (All)'}
              {aud === 'Parents' && 'Waalidiinta (Parents)'}
              {aud === 'Teachers' && 'Macallimiinta (Teachers)'}
              {aud === 'Students' && 'Ardayda (Students)'}
              {aud === 'Staff' && 'Shaqaalaha (Staff)'}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-mono-numbers">
          {filteredAnnouncements.length} Ogeysiis
        </span>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            onClick={() => markAnnouncementRead(ann.id)}
            className={`p-5 rounded-xl border transition-all cursor-pointer bg-white ${
              !ann.read
                ? 'border-amber-300 shadow-xs ring-1 ring-amber-100'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{ann.title}</h3>
                {!ann.read && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    ann.priority === 'Urgent'
                      ? 'bg-red-100 text-red-800'
                      : ann.priority === 'High'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {ann.priority}
                </span>
                <span className="text-[10px] bg-teal-50 text-[#005A51] border border-teal-200 px-2 py-0.5 rounded font-medium">
                  {ann.targetAudience}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {ann.body}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 mt-3 border-t border-slate-100">
              <span className="font-medium text-slate-600">
                Waxaa soo saaray: <strong className="text-slate-800">{ann.author}</strong> ({ann.authorRole})
              </span>
              <span className="font-mono-numbers">{ann.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Compose Announcement Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Qor Ogeysiis Cusub</h3>
              <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Cinwaanka Ogeysiiska: *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="tusaale: Shirka Guud ee Waalidiinta..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Loo Jeediyo (Target):</label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="All">Dhammaan (All)</option>
                    <option value="Parents">Waalidiinta oo kaliya</option>
                    <option value="Teachers">Macallimiinta oo kaliya</option>
                    <option value="Students">Ardayda oo kaliya</option>
                    <option value="Staff">Shaqaalaha oo kaliya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Muhiimadda (Priority):</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Normal">Caadi (Normal)</option>
                    <option value="High">Muhiim (High)</option>
                    <option value="Urgent">Degdeg (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Qoraalka Ogeysiiska: *</label>
                <textarea
                  rows={4}
                  required
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Qor macluumaadka faahfaahsan ee ogeysiiska..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qoraha:</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Xilka Qoraha:</label>
                  <input
                    type="text"
                    value={form.authorRole}
                    onChange={(e) => setForm({ ...form, authorRole: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Faafi Ogeysiiska
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
