/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SupportTicket } from '../../types';
import {
  HelpCircle,
  PlusCircle,
  MessageSquare,
  CheckCircle,
  Clock,
  Send,
  X,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const SupportModule: React.FC = () => {
  const {
    tickets,
    addTicket,
    replyToTicket,
    updateTicketStatus,
    currentRole,
    currentUser,
    settings,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canManageAllTickets =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager' ||
    currentRole === 'Accountant' ||
    currentRole === 'HR Manager';

  const visibleTickets = canManageAllTickets
    ? tickets
    : tickets.filter((t) => {
        if (!currentUser) return false;
        const nameLower = currentUser.fullName.toLowerCase();
        const emailLower = (currentUser.email || '').toLowerCase();
        return (
          t.requesterName.toLowerCase().includes(nameLower) ||
          (emailLower && t.requesterEmail.toLowerCase() === emailLower)
        );
      });

  const [activeTab, setActiveTab] = useState<'tickets' | 'faqs'>('tickets');

  useEffect(() => {
    if (navigationIntent?.module !== 'support') return;
    if (navigationIntent.tab === 'faqs' || navigationIntent.tab === 'tickets') {
      setActiveTab(navigationIntent.tab);
    }
    clearNavigationIntent();
  }, [navigationIntent, clearNavigationIntent]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(visibleTickets[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const defaultReqName = currentUser?.fullName || `${currentRole} User`;
  const defaultReqEmail = currentUser?.email || settings.email;

  const [ticketForm, setTicketForm] = useState<{
    subject: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    requesterName: string;
    requesterEmail: string;
    message: string;
  }>({
    subject: '',
    category: 'Academics',
    priority: 'Medium',
    requesterName: defaultReqName,
    requesterEmail: defaultReqEmail,
    message: '',
  });

  const selectedTicket =
    visibleTickets.find((t) => t.id === selectedTicketId) || visibleTickets[0] || null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    replyToTicket(selectedTicket.id, replyText);
    setReplyText('');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) return;

    addTicket(
      {
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        requesterName: defaultReqName,
        requesterEmail: defaultReqEmail,
        status: 'Open',
      },
      ticketForm.message
    );

    setIsNewTicketOpen(false);
    setTicketForm({
      subject: '',
      category: 'Academics',
      priority: 'Medium',
      requesterName: defaultReqName,
      requesterEmail: defaultReqEmail,
      message: '',
    });
  };

  const faqs = [
    {
      q: 'Sidee loo soo saaraa Kaarka Aqoonsiga Ardayga (Student ID Card)?',
      a: 'Tag qaybta "Ardayda & Kaararka", ka hel ardayga aad doonayso liiska, ka dibna guji astaanta madbacadaha (Printer Icon) ee ku aaddan magaciisa. Waxaa si degdeg ah kuugu soo baxaya kaarka aqoonsiga oo print-ready ah oo leh astaanta dugsiga, barcode, iyo saxiixa maamulaha.',
    },
    {
      q: 'Sidee loo xareeyaa lacagta lagu bixiyay EVC Plus ama Salaam Bank?',
      a: 'Guji "Biilasha & Rasiidadka", dooro biilka ardayga ee aan weli la bixin ama guji "Xaree Lacag-bixin". Geli cadadka la bixiyay, dooro habka lacag-bixinta (EVC Plus / Salaam Bank), geli tixraaca (Reference Number). Nidaamku wuxuu si toos ah u cusboonaysiinayaa baaqiga wuxuuna kuu soo saarayaa rasiid rasmi ah.',
    },
    {
      q: 'Sidee ardayda loogu dalacsiiyaa fasalka xiga (Batch Promotion)?',
      a: 'Tag qaybta "Fasallada & Maadooyinka", dooro tab-ka "Dalacsiinta Ardayda". Xulo fasalka ay hadda dhigtaan (Source Class) iyo fasalka cusub ee loo wareejinayo (Target Class), dooro ardayda aad rabto inaad dalacsiiso, ka dibna guji "Dalacsii Ardayda".',
    },
    {
      q: 'Sidee loogu shubaa database-ka (.sql) XAMPP phpMyAdmin gudaha Windows?',
      a: 'Tag qaybta "Warbixinada & MySQL", guji "Soo Degso .sql" si aad u hesho faylka machadka_school_db.sql. Ka dib fur browser-kaaga cinwaanka http://localhost/phpmyadmin, guji Import tab, dooro faylka aad soo degsatay, ka dibna guji Import. Dhammaan miisaska iyo xogtu si buuxda ayay u samaysmi doonaan.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Xarunta Caawinta &amp; Tikidhada (Help Center &amp; Support Desk)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Su'aalaha badanaa la isweydiiyo (FAQs) iyo nidaamka tikidhada xallinta cabashooyinka maamulka.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold overflow-x-auto max-w-full whitespace-nowrap">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'tickets'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tikidhada ({visibleTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'faqs'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Su’aalaha Badan (FAQs)
            </button>
          </div>
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Fur Tikidh Cusub
          </button>
        </div>
      </div>

      {/* TAB 1: SUPPORT TICKETS DESK */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Queue List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              {canManageAllTickets ? 'Tikidhada Furan & Dhaqdhaqaaqa' : 'Tikidhadaada Gaarka ah'}
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
              {visibleTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Weli ma furin wax tikidh ah. Guji "Fur Tikidh Cusub" si aad cabasho u dirto.
                </div>
              ) : (
                visibleTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3 text-xs cursor-pointer transition-colors ${
                      selectedTicket?.id === t.id
                        ? 'bg-teal-50/80 border-l-3 border-[#005A51]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-numbers font-bold text-[#005A51] text-[11px]">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{t.requesterName}</span>
                      <span className="font-mono-numbers">{t.createdAt.split(' ')[0]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Thread Inspector */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between min-h-[500px]">
            {selectedTicket ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Ticket Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-numbers font-bold text-[#005A51] text-xs">
                          {selectedTicket.ticketNumber}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {selectedTicket.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-1">
                        {selectedTicket.subject}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Soo gudbiye: {selectedTicket.requesterName} ({selectedTicket.requesterEmail})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManageAllTickets ? (
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value as any)}
                          className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800"
                        >
                          <option value="Open">Furan (Open)</option>
                          <option value="In Progress">Gacanta ku jira (In Progress)</option>
                          <option value="Resolved">Xallisan (Resolved)</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          {selectedTicket.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Messages Thread */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-xs space-y-1 ${
                          msg.role === 'Super Admin' || msg.role === 'Accountant'
                            ? 'bg-teal-50 border border-teal-100 text-slate-800 ml-6'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-200/50">
                          <span className="font-bold text-slate-900">
                            {msg.sender} <span className="font-normal text-slate-400">({msg.role})</span>
                          </span>
                          <span className="font-mono-numbers text-[10px]">{msg.timestamp}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Qor jawaabtaada halkan..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-xs text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dir Jawaabta
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                Dooro tikidh dhanka bidix si aad u aragto farriimaha.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FAQS */}
      {activeTab === 'faqs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm mb-3">
            Su’aalaha Inta Badan La Isweydiiyo (Frequently Asked Questions)
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 text-left font-bold text-xs text-slate-900 bg-slate-50 hover:bg-slate-100 flex items-center justify-between"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-white text-xs text-slate-700 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Fur Tikidh Cusub</h3>
              <button onClick={() => setIsNewTicketOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Cinwaanka Cabashada: *</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="tusaale: Baaris ku saabsan biilka EVC..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qeybta (Category):</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Academics">Academics (Waxbarasho)</option>
                    <option value="Fee Billing">Fee Billing (Maaliyad)</option>
                    <option value="Student Records">Student Records (Ardayda)</option>
                    <option value="Technical">Technical (Farsamo)</option>
                    <option value="General">General (Guud)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Muhiimadda:</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Low">Hoose (Low)</option>
                    <option value="Medium">Dhexdhexaad (Medium)</option>
                    <option value="High">Sare (High)</option>
                    <option value="Urgent">Degdeg (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Farriintaada: *</label>
                <textarea
                  rows={4}
                  required
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  placeholder="Faahfaahi waxa aad u baahan tahay in lagaa caawiyo..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  Gudbi Tikidhka
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
