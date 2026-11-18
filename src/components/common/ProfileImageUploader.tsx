/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Camera, Upload, Link, Check, RefreshCw, X } from 'lucide-react';

interface ProfileImageUploaderProps {
  currentImageUrl: string;
  onImageChange: (newUrl: string) => void;
  label?: string;
  shape?: 'circle' | 'square';
  type?: 'student' | 'teacher' | 'staff' | 'logo';
}

const PRESET_AVATARS = {
  student: [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
  ],
  teacher: [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80',
  ],
  staff: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80',
  ],
  logo: [
    '/assets/aistudio/43023dc8-5420-4f4c-b252-3e7c97702259_4598f701.jpg',
  ],
};

export const ProfileImageUploader: React.FC<ProfileImageUploaderProps> = ({
  currentImageUrl,
  onImageChange,
  label = 'Sawirka Profile-ka (Profile Picture)',
  shape = 'circle',
  type = 'student',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Fadlan dooro fayl sawir ah (JPG, PNG, WebP)!');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onImageChange(base64);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Khalad ayaa dhacay xilliga sawirka la akhrinayay.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (urlValue.trim()) {
      onImageChange(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  };

  const presets = PRESET_AVATARS[type] || PRESET_AVATARS.student;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
          {label}
        </label>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          JPG, PNG ama WebP
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Picture Avatar Preview */}
        <div className="relative group shrink-0">
          <div
            className={`w-16 h-16 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs flex items-center justify-center ${
              shape === 'circle' ? 'rounded-full' : 'rounded-xl'
            }`}
          >
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Profile Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Camera className="w-6 h-6 text-slate-400" />
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Guji si aad sawir uga soo geliso kombuyuutarkaaga"
            className="absolute inset-0 bg-slate-900/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
          >
            <Camera className="w-5 h-5 text-amber-300" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex-1 space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005A51] hover:bg-[#004841] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'Waa la soo gelinayaa...' : 'Ka Soo Geli Device-ka'}
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              <Link className="w-3 h-3" />
              Geli Link URL
            </button>
          </div>

          {/* Quick preset avatar selection */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Tusaalooyin:
            </span>
            <div className="flex items-center gap-1">
              {presets.slice(0, 5).map((presetUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onImageChange(presetUrl)}
                  className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                    currentImageUrl === presetUrl
                      ? 'border-[#005A51] ring-2 ring-teal-500/40 scale-105'
                      : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* URL Input Dropdown */}
      {showUrlInput && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Geli cinwaanka sawirka (https://...)"
            className="flex-1 px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-1 bg-[#005A51] text-white text-xs font-semibold rounded-lg hover:bg-[#004841]"
          >
            Dabakh
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Inline Upload Error */}
      {uploadError && (
        <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}
    </div>
  );
};
