/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { GlobalSearchResponse, SearchCategory } from '../../types';
import {
  Search,
  X,
  Users,
  BookOpen,
  Briefcase,
  GraduationCap,
  Layers,
  Award,
  CreditCard,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

const CATEGORY_META: {
  id: Exclude<SearchCategory, 'all'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'students', label: 'Ardayda', icon: Users },
  { id: 'teachers', label: 'Macallimiinta', icon: BookOpen },
  { id: 'staff', label: 'Shaqaalaha', icon: Briefcase },
  { id: 'classes', label: 'Fasallada', icon: GraduationCap },
  { id: 'subjects', label: 'Maadooyinka', icon: Layers },
  { id: 'exams', label: 'Imtixaanaadka', icon: Award },
  { id: 'invoices', label: 'Biilasha', icon: CreditCard },
];

export const GlobalSearchBar: React.FC = () => {
  const {
    currentRole,
    classes,
    searchGlobal,
    openRecordFromSearch,
    searchTerm,
    setSearchTerm,
  } = useApp();

  const isStudentOrParent = currentRole === 'Student' || currentRole === 'Parent';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [classId, setClassId] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GlobalSearchResponse | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsMobileModalOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !isStudentOrParent) {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStudentOrParent]);

  const executeSearch = useCallback(
    async (qText: string, cat: SearchCategory, clsId: string, pg: number) => {
      if (isStudentOrParent) return;
      if (!qText.trim() && cat === 'all' && clsId === 'all') {
        setResult(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      const res = await searchGlobal({
        query: qText.trim(),
        category: cat,
        classId: clsId,
        page: pg,
        limit: 12,
      });
      setLoading(false);
      if (res.error) {
        setError(res.error);
        setResult(null);
      } else if (res.data) {
        setResult(res.data);
      }
    },
    [isStudentOrParent, searchGlobal]
  );

  // Debounced live search while typing or changing filters
  useEffect(() => {
    if (!isOpen && !isMobileModalOpen) return;
    const handle = window.setTimeout(() => {
      executeSearch(query, category, classId, page);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, category, classId, page, isOpen, isMobileModalOpen, executeSearch]);

  if (isStudentOrParent) return null;

  const allowedSet = new Set<Exclude<SearchCategory, 'all'>>(
    result?.allowedCategories ||
      (currentRole === 'Teacher'
        ? ['students', 'classes', 'subjects', 'exams']
        : currentRole === 'HR Manager'
        ? ['teachers', 'staff']
        : currentRole === 'Accountant'
        ? ['students', 'staff', 'invoices']
        : currentRole === 'Receptionist'
        ? ['students', 'classes', 'invoices']
        : currentRole === 'Academic Manager'
        ? ['students', 'teachers', 'classes', 'subjects', 'exams']
        : ['students', 'teachers', 'staff', 'classes', 'subjects', 'exams', 'invoices'])
  );

  const visibleCategories = CATEGORY_META.filter((c) => allowedSet.has(c.id));

  const handleSelectRecord = (
    type: 'student' | 'teacher' | 'staff' | 'class' | 'subject' | 'exam' | 'invoice',
    id: string
  ) => {
    setIsOpen(false);
    setIsMobileModalOpen(false);
    openRecordFromSearch({ type, id });
  };

  const handleClear = () => {
    setQuery('');
    if (searchTerm) setSearchTerm('');
    setCategory('all');
    setClassId('all');
    setPage(1);
    setResult(null);
    setError(null);
  };

  const statusTone = (st: string) => {
    const low = (st || '').toLowerCase();
    if (low === 'active' || low === 'paid' || low === 'published') {
      return 'text-[#00723A] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
    }
    if (low === 'overdue' || low === 'withdrawn' || low === 'unpaid') {
      return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800';
    }
    return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
  };

  const hasAnyRenderedHit =
    result &&
    (result.groups.students.length > 0 ||
      result.groups.teachers.length > 0 ||
      result.groups.staff.length > 0 ||
      result.groups.classes.length > 0 ||
      result.groups.subjects.length > 0 ||
      result.groups.exams.length > 0 ||
      result.groups.invoices.length > 0);

  const renderResultsPanel = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden text-xs">
      {/* Category & Class Filters */}
      <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                category === 'all'
                  ? 'bg-[#00723A] text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Dhammaan
              {result ? ` (${result.total})` : ''}
            </button>
            {visibleCategories.map((cat) => {
              const count = result?.counts?.[cat.id];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    category === cat.id
                      ? 'bg-[#00723A] text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                  {count !== undefined && query.trim() ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            title="Sifeeyaha Fasalka"
            className={`p-1.5 rounded-md border shrink-0 transition-colors ${
              showFilters || classId !== 'all'
                ? 'bg-[#00723A]/10 text-[#00723A] dark:text-teal-300 border-[#00723A]/40'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {(showFilters || classId !== 'all') && allowedSet.has('students') && (
          <div className="flex items-center gap-2 pt-1">
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
              Fasalka:
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setPage(1);
              }}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
            >
              <option value="all">Dhammaan Fasallada</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.section}) · {c.shift || 'Subax'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results Body */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {loading && (
          <div className="p-6 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#00723A]" />
            <span>Waxaa la baarayaa diiwaanka dugsiga...</span>
          </div>
        )}

        {!loading && error && (
          <div className="p-5 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {!loading && !error && !query.trim() && category === 'all' && classId === 'all' && (
          <div className="p-5 text-center text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Raadinta Guud ee Machadka (Global Search)
            </p>
            <p className="text-[11px]">
              Geli magac, ID arday/shaqaale, Roll No, taleefanka waalidka, fasal, maado, imtixaan, ama lambar rasiid.
            </p>
          </div>
        )}

        {!loading && !error && result && !hasAnyRenderedHit && (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            Wax natiijo ah lagama helin raadinta "{query || category}".
          </div>
        )}

        {/* Group: Students */}
        {!loading && !error && result && result.groups.students.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Ardayda ({result.counts.students})
              </span>
            </div>
            <div className="space-y-1">
              {result.groups.students.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectRecord('student', st.id)}
                  className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#00723A] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-[#FCA700]/60">
                      {st.photoUrl ? (
                        <img
                          src={st.photoUrl}
                          alt={st.fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        st.fullName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {st.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        <span className="font-mono-numbers font-semibold text-[#00723A] dark:text-teal-300">
                          {st.id}
                        </span>
                        {' · '}Roll: <span className="font-mono-numbers">{st.rollNumber}</span>
                        {' · '}
                        {st.className} ({st.section})
                        {st.guardianPhone ? ` · ${st.guardianPhone}` : ''}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border shrink-0 ${statusTone(
                      st.status
                    )}`}
                  >
                    {st.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group: Teachers */}
        {!loading && !error && result && result.groups.teachers.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <BookOpen className="w-3.5 h-3.5" />
              Macallimiinta ({result.counts.teachers})
            </div>
            <div className="space-y-1">
              {result.groups.teachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectRecord('teacher', t.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{t.fullName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <span className="font-mono-numbers font-semibold text-[#00723A] dark:text-teal-300">
                        {t.id}
                      </span>
                      {' · '}
                      {t.specialization}
                      {t.phone ? ` · ${t.phone}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group: Staff */}
        {!loading && !error && result && result.groups.staff.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <Briefcase className="w-3.5 h-3.5" />
              Shaqaalaha ({result.counts.staff})
            </div>
            <div className="space-y-1">
              {result.groups.staff.map((stf) => (
                <button
                  key={stf.id}
                  type="button"
                  onClick={() => handleSelectRecord('staff', stf.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {stf.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <span className="font-mono-numbers font-semibold text-[#00723A] dark:text-teal-300">
                        {stf.id}
                      </span>
                      {' · '}
                      {stf.roleTitle} · {stf.department}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group: Classes */}
        {!loading && !error && result && result.groups.classes.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <GraduationCap className="w-3.5 h-3.5" />
              Fasallada ({result.counts.classes})
            </div>
            <div className="space-y-1">
              {result.groups.classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectRecord('class', c.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {c.name} ({c.section})
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <span className="font-mono-numbers">{c.id}</span> · {c.shift} · {c.roomNumber}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group: Subjects */}
        {!loading && !error && result && result.groups.subjects.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <Layers className="w-3.5 h-3.5" />
              Maadooyinka ({result.counts.subjects})
            </div>
            <div className="space-y-1">
              {result.groups.subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectRecord('subject', sub.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {sub.nameSomali}{' '}
                      <span className="font-arabic text-amber-600 dark:text-amber-400 ml-1">
                        {sub.nameArabic}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-numbers">
                      {sub.code} ({sub.id})
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group: Exams */}
        {!loading && !error && result && result.groups.exams.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <Award className="w-3.5 h-3.5" />
              Imtixaanaadka ({result.counts.exams})
            </div>
            <div className="space-y-1">
              {result.groups.exams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectRecord('exam', ex.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{ex.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {ex.term} · {ex.academicYear} · {ex.startDate}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${statusTone(ex.status)}`}>
                    {ex.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group: Invoices */}
        {!loading && !error && result && result.groups.invoices.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00723A] dark:text-teal-400">
              <CreditCard className="w-3.5 h-3.5" />
              Biilasha & Rasiidadka ({result.counts.invoices})
            </div>
            <div className="space-y-1">
              {result.groups.invoices.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => handleSelectRecord('invoice', inv.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {inv.studentName} · <span className="font-mono-numbers text-[#00723A] dark:text-teal-300">{inv.id}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {inv.title} · Haraaga: ${inv.balance.toFixed(2)}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${statusTone(inv.status)}`}>
                    {inv.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {result && (page > 1 || result.hasMore) && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 font-mono-numbers">
            Bogga {result.page} · Wadarta {result.total} natiijo
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-3 h-3" />
              Hore
            </button>
            <button
              type="button"
              disabled={!result.hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Xiga
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Desktop Global Search Input */}
      <div className="hidden md:block relative w-56 lg:w-80 xl:w-96">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
            setIsOpen(true);
          }}
          placeholder="Raadi arday, ID, waalid, macallin... (Ctrl+K)"
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#00723A]/40 focus:border-[#00723A] focus:bg-white dark:focus:bg-slate-800 transition-all"
        />
        {(query || category !== 'all' || classId !== 'all') && (
          <button
            type="button"
            onClick={handleClear}
            title="Nadiifi raadinta"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {isOpen && (
          <div className="absolute left-0 right-0 mt-1.5 z-50 w-[min(92vw,540px)]">
            {renderResultsPanel()}
          </div>
        )}
      </div>

      {/* Mobile Search Trigger Button */}
      <button
        type="button"
        onClick={() => setIsMobileModalOpen(true)}
        title="Raadinta Guud"
        aria-label="Raadinta Guud"
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:text-[#00723A] transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Mobile Search Overlay */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs p-3 flex flex-col">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Raadi arday, ID, macallin, rasiid..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#00723A]/40"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                Xir
              </button>
            </div>
            {renderResultsPanel()}
          </div>
        </div>
      )}
    </div>
  );
};
