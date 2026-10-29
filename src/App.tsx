import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabase';
import { Player, PlayerRole, PaymentMethod, PaymentStatus } from './types';
import { cn } from './lib/utils';
import {
  Trophy,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  User,
  Star,
  Flame,
  Award,
  CheckCircle2,
  ArrowRight,
  Check,
  AlertCircle,
  HelpCircle,
  QrCode,
  CreditCard,
  Smartphone,
  Copy,
  Upload,
  Search,
  Users,
  RefreshCw,
  Download,
  Coins,
  Clock,
  LayoutGrid,
  List,
  X,
  Radio,
  Eye,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Hash,
  Calendar,
  Link2,
} from 'lucide-react';

const OFFICIAL_UPI_ID = 'idb250700481480@idbi';
const OFFICIAL_PAYEE_NAME = 'Premier League 3.0';
const REGISTRATION_ENTRY_FEE = 500;
const OFFICIAL_SCANNER_IMG = '/images/scanner.png';
const PLACEHOLDER_SCANNER_SVG = '/images/scanner-placeholder.svg';

const PREVIOUS_TEAMS = [
  "Kapil's Warriors",
  "Kapil Falcons",
  "Insta Paltans",
  "Kapil's Devils",
  "Goodness Royals",
  "Kapil Ke Singham",
  "Super Strikers",
  "Kapil Avengers",
  "Other / Custom Franchise",
];

// Simple UUID v4 generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Formatter for Playing Experience labels
const formatExperienceLabel = (exp?: string) => {
  if (!exp) return 'New Player';
  if (exp === 'season_1') return 'Season 1 Player';
  if (exp === 'season_2') return 'Season 2 Player';
  if (exp === 'both_seasons') return 'Season 1 & 2 Player';
  if (exp === 'new_player' || exp === 'new') return 'New Player';
  if (exp === 'casual') return 'Casual Player';
  if (exp === 'semi_professional') return 'Semi-Pro';
  if (exp === 'professional') return 'Pro Player';
  if (exp === 'experienced') return 'Veteran Player';
  return exp;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'roster'>('register');

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [tournamentId, setTournamentId] = useState('kapl-3-mens');
  const [role, setRole] = useState<PlayerRole>('all_rounder');
  const [battingStyle, setBattingStyle] = useState('Right-hand bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right-arm medium');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');

  // Experience / History
  const [experience, setExperience] = useState('new_player');
  const [previousTeam, setPreviousTeam] = useState('');
  const [customPreviousTeam, setCustomPreviousTeam] = useState('');
  const [pastAchievements, setPastAchievements] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi_qr');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [paymentReceiptName, setPaymentReceiptName] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [scannerImgError, setScannerImgError] = useState(false);

  // Status & Success state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [newlyRegisteredPlayer, setNewlyRegisteredPlayer] = useState<Player | null>(null);

  // All Registered Players (from Supabase)
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterRoleFilter, setRosterRoleFilter] = useState('all');
  const [rosterGenderFilter, setRosterGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [rosterTournamentFilter, setRosterTournamentFilter] = useState('all');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [rosterSortBy, setRosterSortBy] = useState<'newest' | 'oldest' | 'name' | 'jersey'>('newest');
  const [rosterViewMode, setRosterViewMode] = useState<'grid' | 'table'>('grid');

  // Player Detail & Lightbox Modal State
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<Player | null>(null);
  const [expandedReceiptModal, setExpandedReceiptModal] = useState<string | null>(null);
  const [copiedModalUtr, setCopiedModalUtr] = useState(false);


  // Fetch all registered players from Supabase
  const fetchRegisteredPlayers = useCallback(async () => {
    setIsLoadingRoster(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error:', error.message);
      }

      const map = new Map<string, Player>();

      if (data && Array.isArray(data)) {
        data
          .filter((p) => p && !/^[ab][1-4]-/.test(p.id))
          .forEach((p) => {
            const rawBio = p.bio || '';
            const parsedFlat = p.flat_no || rawBio.match(/\[Flat:\s*([^\]|]+)/i)?.[1]?.trim() || undefined;
            const parsedAge = p.age || rawBio.match(/Age:\s*([^\]|]+)/i)?.[1]?.trim() || undefined;
            const cleanBio = rawBio.replace(/\[Flat:[^\]]+\]\s*/i, '').trim();

            map.set(p.id, {
              id: p.id,
              name: p.name,
              role: (p.role as PlayerRole) || 'all_rounder',
              batting_style: p.batting_style || 'Right-hand bat',
              bowling_style: p.bowling_style || 'Right-arm medium',
              jersey_number: p.jersey_number,
              tournament_id: p.tournament_id || 'kapl-3-mens',
              base_price: Number(p.base_price || 100),
              photo_url: p.photo_url,
              mobile_number: p.mobile_number || '',
              email: p.email || undefined,
              experience: p.experience || undefined,
              previous_team: p.previous_team || undefined,
              past_achievements: p.past_achievements || undefined,
              bio: cleanBio || undefined,
              gender: (p.gender as 'male' | 'female') || undefined,
              age: parsedAge,
              flat_no: parsedFlat,
              payment_method: p.payment_method || 'upi_qr',
              payment_status: (p.payment_status as PaymentStatus) || 'pending',
              transaction_id: p.transaction_id || undefined,
              payment_amount: p.payment_amount || undefined,
              payment_receipt_url: p.payment_receipt_url || undefined,
              created_at: p.created_at,
            });
          });

        // Prune deleted players from local storage cache so they do not resurrect
        try {
          const rawLocal = localStorage.getItem('portal_registered_players');
          if (rawLocal) {
            const list: Player[] = JSON.parse(rawLocal);
            if (Array.isArray(list)) {
              const activeList = list.filter((p) => map.has(p.id));
              localStorage.setItem('portal_registered_players', JSON.stringify(activeList));
            }
          }
        } catch {}
      } else if (error) {
        // Fallback to local storage only if database is offline or unreachable
        try {
          const rawLocal = localStorage.getItem('portal_registered_players');
          if (rawLocal) {
            const list: Player[] = JSON.parse(rawLocal);
            if (Array.isArray(list)) {
              list.forEach((p) => {
                if (p && p.id) map.set(p.id, p);
              });
            }
          }
        } catch {}
      }

      const sorted = Array.from(map.values()).sort((a, b) => {
        const tA = new Date(a.created_at || 0).getTime();
        const tB = new Date(b.created_at || 0).getTime();
        return tB - tA;
      });

      setRegisteredPlayers(sorted);
      setNewlyRegisteredPlayer((prev) => (prev && map.has(prev.id) ? prev : null));
    } catch (e) {
      console.error('Failed to load roster:', e);
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  // Initial load, real-time subscription, and active sync
  useEffect(() => {
    fetchRegisteredPlayers();

    // 1. Supabase Postgres Realtime Subscription
    const channel = supabase
      .channel('player-portal-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchRegisteredPlayers();
        }
      )
      .subscribe();

    // 2. Window focus & visibility sync (immediately updates when switching back from Supabase dashboard)
    const handleSync = () => {
      fetchRegisteredPlayers();
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    });

    // 3. Periodic fallback poll every 5 seconds
    const intervalId = setInterval(() => {
      fetchRegisteredPlayers();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleSync);
      clearInterval(intervalId);
    };
  }, [fetchRegisteredPlayers]);

  // Synchronize open player modal with live database updates (e.g. payment status verified in Supabase)
  useEffect(() => {
    if (selectedPlayerModal) {
      const updated = registeredPlayers.find((p) => p.id === selectedPlayerModal.id);
      if (updated) {
        setSelectedPlayerModal(updated);
      }
    }
  }, [registeredPlayers, selectedPlayerModal?.id]);

  // Keyboard shortcut listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedReceiptModal) {
          setExpandedReceiptModal(null);
        } else if (selectedPlayerModal) {
          setSelectedPlayerModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedReceiptModal, selectedPlayerModal]);

  // Copy UPI ID
  const handleCopyUpi = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(OFFICIAL_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  // Receipt image upload
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaymentReceiptName(file.name);
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.paymentReceipt;
      return updated;
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Compress screenshot via canvas so uploads and storage are fast
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setPaymentReceiptUrl(compressed);
        } else {
          setPaymentReceiptUrl(dataUrl);
        }
      };
      img.onerror = () => {
        setPaymentReceiptUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Validate form
  const validate = () => {
    const errs: Record<string, string> = {};
    let firstInvalidFieldId: string | null = null;

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-fullName';
    }
    const rawDigits = phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 12 && rawDigits.startsWith('91') ? rawDigits.slice(2) : rawDigits;
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-phone';
    }
    if (!gender) {
      errs.gender = 'Please select male or female';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-gender';
    }
    if (!age.trim()) {
      errs.age = 'Please enter your age';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-age';
    } else {
      const numAge = Number(age);
      if (isNaN(numAge) || numAge < 5 || numAge > 99) {
        errs.age = 'Please enter a valid age (5 - 99)';
        if (!firstInvalidFieldId) firstInvalidFieldId = 'input-age';
      }
    }
    if (!flatNo.trim()) {
      errs.flatNo = 'Please enter your flat number (e.g. A-101)';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-flatNo';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-email';
    }
    if (!transactionId.trim()) {
      errs.transactionId = 'Please enter UPI / UTR Reference number';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-transactionId';
    }
    if (!paymentReceiptUrl) {
      errs.paymentReceipt = 'Payment screenshot is compulsory';
      if (!firstInvalidFieldId) firstInvalidFieldId = 'input-paymentReceipt';
    }

    if (Object.keys(errs).length > 0) {
      const errorList = Object.values(errs)
        .map((msg) => `• ${msg}`)
        .join('\n');
      errs.form = `Please complete the required details before submitting:\n${errorList}`;

      // Smoothly scroll to the first invalid field
      if (firstInvalidFieldId) {
        setTimeout(() => {
          const el = document.getElementById(firstInvalidFieldId!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus?.();
          }
        }, 100);
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle submit and save to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const playerId = generateUUID();
    const computedPaymentStatus: PaymentStatus = 'pending';
    const rawDigits = phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 12 && rawDigits.startsWith('91') ? rawDigits.slice(2) : rawDigits;
    const numAge = age.trim() ? Number(age) : undefined;
    const cleanFlat = flatNo.trim();
    const bioText = `[Flat: ${cleanFlat} | Age: ${age.trim()}] ${bio.trim()}`.trim();

    const newPlayer: Player = {
      id: playerId,
      name: fullName.trim(),
      mobile_number: cleanPhone,
      email: email.trim() || undefined,
      role,
      batting_style: battingStyle,
      bowling_style: bowlingStyle,
      jersey_number: null,
      tournament_id: 'kapl-3-mens',
      base_price: 100,
      photo_url: photoUrl.trim() || null,
      experience,
      previous_team: (experience !== 'new_player' && experience !== 'new') ? (previousTeam === 'Other / Custom Franchise' ? customPreviousTeam : previousTeam) : undefined,
      past_achievements: pastAchievements.trim() || undefined,
      bio: bio.trim() || undefined,
      gender,
      age: numAge,
      flat_no: cleanFlat,
      payment_method: paymentMethod,
      payment_status: computedPaymentStatus,
      transaction_id: transactionId.trim() || undefined,
      payment_amount: REGISTRATION_ENTRY_FEE,
      payment_receipt_url: paymentReceiptUrl || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      const basePayload: any = {
        id: playerId,
        name: newPlayer.name,
        photo_url: newPlayer.photo_url,
        role: newPlayer.role,
        batting_style: newPlayer.batting_style,
        bowling_style: newPlayer.bowling_style,
        jersey_number: null,
        mobile_number: newPlayer.mobile_number,
        email: newPlayer.email,
        experience: newPlayer.experience,
        previous_team: newPlayer.previous_team,
        past_achievements: newPlayer.past_achievements,
        bio: bioText,
        gender: newPlayer.gender,
        payment_method: newPlayer.payment_method,
        payment_status: newPlayer.payment_status,
        transaction_id: newPlayer.transaction_id,
        payment_amount: newPlayer.payment_amount,
        payment_receipt_url: newPlayer.payment_receipt_url,
        tournament_id: 'kapl-3-mens',
        base_price: 100,
      };

      // 1. First try inserting with direct age and flat_no columns
      let { error: insertError } = await supabase.from('players').insert({
        ...basePayload,
        age: numAge,
        flat_no: cleanFlat,
      });

      // Fallback: If Postgres schema does not have age or flat_no columns yet, insert basePayload (which stores them in bio)
      if (
        insertError &&
        (insertError.code === 'PGRST204' ||
          insertError.message?.includes('column') ||
          insertError.message?.includes('schema cache'))
      ) {
        const fallbackRes = await supabase.from('players').insert(basePayload);
        insertError = fallbackRes.error;
      }

      if (insertError) {
        throw new Error(insertError.message);
      }

      // 2. Local storage persistence
      try {
        const existingRaw = localStorage.getItem('portal_registered_players');
        const list: Player[] = existingRaw ? JSON.parse(existingRaw) : [];
        list.unshift(newPlayer);
        localStorage.setItem('portal_registered_players', JSON.stringify(list));
      } catch {}

      setNewlyRegisteredPlayer(newPlayer);
      setRegisteredSuccess(true);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#FBBF24', '#10B981', '#06B6D4'],
        });
      } catch {}

      // Scroll to top to see success confirmation
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Refresh list
      await fetchRegisteredPlayers();
    } catch (err: any) {
      const errorMsg = err?.message || 'Registration failed. Please try again.';
      console.error('Registration failed:', err);

      if (errorMsg.includes('players_transaction_id_key') || errorMsg.includes('transaction_id')) {
        setErrors({
          transactionId: 'This UPI / UTR transaction reference number has already been used',
          form: 'This UPI / UTR transaction ID has already been submitted for another registration. If you made a new payment, please enter your unique transaction reference ID.',
        });
        setTimeout(() => {
          const el = document.getElementById('input-transactionId');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus?.();
          }
        }, 100);
      } else if (errorMsg.includes('players_mobile_number_key') || errorMsg.includes('mobile_number')) {
        setErrors({
          phone: 'This phone number is already registered',
          form: 'This mobile number is already registered in Premier League 3.0. Please enter a different mobile number or contact tournament admin.',
        });
        setTimeout(() => {
          const el = document.getElementById('input-phone');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus?.();
          }
        }, 100);
      } else {
        setErrors({
          form: errorMsg.includes('duplicate')
            ? `Duplicate entry detected: ${errorMsg}`
            : errorMsg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for another registration
  const handleRegisterAnother = () => {
    setRegisteredSuccess(false);
    setNewlyRegisteredPlayer(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setGender('male');
    setAge('');
    setFlatNo('');
    setJerseyNumber('');
    setPhotoUrl('');
    setBio('');
    setExperience('new_player');
    setPreviousTeam('');
    setCustomPreviousTeam('');
    setPastAchievements('');
    setTransactionId('');
    setPaymentReceiptUrl('');
    setPaymentReceiptName('');
    setActiveTab('register');
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (registeredPlayers.length === 0) return;
    const headers = ['Player ID', 'Name', 'Phone', 'Gender', 'Age', 'Flat No', 'Email', 'Role', 'Batting', 'Bowling', 'Experience', 'Previous Team', 'Payment Status', 'Transaction ID', 'Registered At'];
    const rows = registeredPlayers.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.mobile_number || '-',
      p.gender || '-',
      p.age || '-',
      p.flat_no || '-',
      p.email || '-',
      p.role,
      p.batting_style || '-',
      p.bowling_style || '-',
      `"${formatExperienceLabel(p.experience)}"`,
      `"${(p.previous_team || '-').replace(/"/g, '""')}"`,
      p.payment_status || 'pending',
      p.transaction_id || '-',
      p.created_at || '-',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Registered_Players_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy UTR inside Player Modal
  const handleCopyModalUtr = (utr?: string) => {
    if (!utr || !navigator?.clipboard) return;
    navigator.clipboard.writeText(utr);
    setCopiedModalUtr(true);
    setTimeout(() => setCopiedModalUtr(false), 2000);
  };

  // Roster KPI Metrics
  const rosterStats = useMemo(() => {
    const total = registeredPlayers.length;
    const paid = registeredPlayers.filter((p) => p.payment_status === 'paid').length;
    const pending = total - paid;
    const maleCount = registeredPlayers.filter((p) => p.gender === 'male').length;
    const femaleCount = registeredPlayers.filter((p) => p.gender === 'female').length;
    const allRounders = registeredPlayers.filter((p) => p.role === 'all_rounder').length;
    const batters = registeredPlayers.filter((p) => p.role === 'batter').length;
    const bowlers = registeredPlayers.filter((p) => p.role === 'bowler').length;
    const keepers = registeredPlayers.filter((p) => p.role === 'wicket_keeper').length;

    return { total, paid, pending, maleCount, femaleCount, allRounders, batters, bowlers, keepers };
  }, [registeredPlayers]);

  const hasActiveFilters = Boolean(
    rosterSearch.trim() ||
    rosterRoleFilter !== 'all' ||
    rosterGenderFilter !== 'all' ||
    rosterStatusFilter !== 'all' ||
    rosterSortBy !== 'newest'
  );

  const handleClearFilters = () => {
    setRosterSearch('');
    setRosterRoleFilter('all');
    setRosterGenderFilter('all');
    setRosterStatusFilter('all');
    setRosterSortBy('newest');
  };

  // Filtered & Sorted Roster
  const filteredRoster = useMemo(() => {
    const result = registeredPlayers.filter((p) => {
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase().trim();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesJersey = p.jersey_number && String(p.jersey_number).includes(q);
        const matchesId = p.id?.toLowerCase().includes(q);
        const matchesTeam = p.previous_team?.toLowerCase().includes(q);
        const matchesPhone = p.mobile_number?.toLowerCase().includes(q);
        const matchesUtr = p.transaction_id?.toLowerCase().includes(q);
        const matchesFlat = p.flat_no?.toLowerCase().includes(q);
        const matchesAge = p.age && String(p.age).toLowerCase().includes(q);
        if (!matchesName && !matchesJersey && !matchesId && !matchesTeam && !matchesPhone && !matchesUtr && !matchesFlat && !matchesAge) {
          return false;
        }
      }
      if (rosterRoleFilter !== 'all' && p.role !== rosterRoleFilter) return false;
      if (rosterGenderFilter !== 'all' && p.gender !== rosterGenderFilter) return false;
      if (rosterStatusFilter !== 'all') {
        const isPaid = p.payment_status === 'paid';
        if (rosterStatusFilter === 'paid' && !isPaid) return false;
        if (rosterStatusFilter === 'pending' && isPaid) return false;
      }
      return true;
    });

    return [...result].sort((a, b) => {
      if (rosterSortBy === 'newest') {
        const tA = new Date(a.created_at || 0).getTime();
        const tB = new Date(b.created_at || 0).getTime();
        return tB - tA;
      }
      if (rosterSortBy === 'oldest') {
        const tA = new Date(a.created_at || 0).getTime();
        const tB = new Date(b.created_at || 0).getTime();
        return tA - tB;
      }
      if (rosterSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (rosterSortBy === 'jersey') {
        const jA = Number(a.jersey_number ?? 9999);
        const jB = Number(b.jersey_number ?? 9999);
        return jA - jB;
      }
      return 0;
    });
  }, [registeredPlayers, rosterSearch, rosterRoleFilter, rosterTournamentFilter, rosterStatusFilter, rosterSortBy]);

  // Role badges helper
  const getRoleBadge = (r: PlayerRole | string) => {
    switch (r) {
      case 'batter':
        return { label: 'Batter', icon: '🏏', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'bowler':
        return { label: 'Bowler', icon: '⚡', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'wicket_keeper':
        return { label: 'Wicket-Keeper', icon: '🧤', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'all_rounder':
      default:
        return { label: 'All-Rounder', icon: '👑', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
  };

  // Tournament label helper
  const getTournamentLabel = (tId?: string, full = false) => {
    if (tId === 'kapl-3-womens') return full ? "Women's League" : "Women's";
    if (tId === 'all') return full ? "Dual Draft (Both Leagues)" : "Dual Draft";
    return full ? "Men's League" : "Men's";
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#0E1320]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-base sm:text-xl shadow-md shadow-amber-500/20 border border-amber-300/40 shrink-0">
              🏏
            </div>
            <div className="min-w-0 truncate">
              <span className="text-xs sm:text-lg font-black font-display tracking-tight text-white flex items-center gap-1 sm:gap-1.5 truncate">
                PREMIER LEAGUE <span className="text-gradient-gold">3.0</span>
              </span>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('register');
                setRegisteredSuccess(false);
              }}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all',
                activeTab === 'register'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all',
                activeTab === 'roster'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Players ({registeredPlayers.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-3 sm:py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#121624] via-[#0E1320] to-[#080B12] p-3.5 sm:p-7 md:p-8 shadow-xl sm:shadow-2xl shadow-amber-500/10 mb-3.5 sm:mb-8">
          <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  KAPL 3.0 • MEGA AUCTION
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping" />
                  {registeredPlayers.length} REGISTERED
                </span>
              </div>

              <h1 className="text-xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
                Player <span className="text-gradient-gold">Registration</span> & Payment Portal
              </h1>

              <p className="text-[11px] sm:text-sm text-slate-300 leading-snug sm:leading-relaxed">
                Official tournament player registration with UPI scan & pay. All registered players are saved and immediately visible in the live tournament player list.
              </p>
            </div>

            {/* Quick Summary Strip */}
            <div className="grid grid-cols-2 md:flex md:flex-col gap-2 p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 shrink-0 text-center md:text-left text-[11px] sm:text-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
                <span className="text-[10px] sm:text-xs text-slate-400">Entry Fee</span>
                <span className="font-bold text-emerald-400 text-xs sm:text-sm">₹500</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4 border-l border-white/10 md:border-l-0 pl-2 md:pl-0">
                <span className="text-[10px] sm:text-xs text-slate-400">Payment</span>
                <span className="font-bold text-slate-200 text-xs sm:text-sm">UPI QR</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* POST-REGISTRATION SUCCESS CONFIRMATION + ALL PLAYERS VISIBLE */}
        {/* ------------------------------------------------------------- */}
        {/* Success Modal Popup */}
        {registeredSuccess && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-b from-[#0F1E1B] via-[#0D1619] to-[#080B12] p-6 sm:p-10 text-center space-y-6 shadow-2xl shadow-emerald-500/40 max-w-lg w-full scale-in">
              <button
                type="button"
                onClick={() => {
                  setRegisteredSuccess(false);
                  setActiveTab('roster');
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors"
                title="Close confirmation"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black shadow-2xl shadow-emerald-500/40 border border-emerald-300 animate-bounce">
                <CheckCircle2 className="w-16 h-16 text-black" />
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                <span className="inline-block px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ REGISTRATION CONFIRMED
                </span>
                <h2 className="text-3xl sm:text-5xl font-black font-display text-white leading-tight">
                  Welcome, <span className="text-gradient-gold">{fullName}</span>!
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Your registration has been successfully saved to the database. Your payment is pending verification by the admin.
                </p>
              </div>

              {/* Quick Info */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">📱 Phone</span>
                  <span className="font-bold text-white">{phone}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">💵 Entry Fee</span>
                  <span className="font-bold text-amber-400">₹{REGISTRATION_ENTRY_FEE}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">⏳ Status</span>
                  <span className="font-bold text-orange-400">Pending Review</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setRegisteredSuccess(false);
                    setActiveTab('roster');
                  }}
                  className="w-full h-12 px-6 rounded-2xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  View Roster
                </button>
                <button
                  onClick={handleRegisterAnother}
                  className="w-full h-12 px-6 rounded-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-yellow-600 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Register Another Player
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Your payment details will be verified by the admin team. You will receive confirmation once verified.
              </p>
            </div>
          </div>
        )}

        {registeredSuccess && (
          <div className="space-y-8 animate-in fade-in duration-300 mb-12">
            <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-b from-[#0F1E1B] via-[#0D1619] to-[#080B12] p-6 sm:p-10 text-center space-y-6 shadow-2xl shadow-emerald-500/20">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black shadow-xl shadow-emerald-500/30 border border-emerald-300 animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-black" />
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <span className="inline-block px-3.5 py-1 rounded-full text-xs uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ REGISTRATION CONFIRMED
                </span>
                <h2 className="text-3xl sm:text-4xl font-black font-display text-white">
                  Welcome to the League, <span className="text-gradient-gold">{fullName}</span>!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your registration has been saved. You can now see yourself along with all registered players below!
                </p>
              </div>

              {/* Player Trading Pass Snapshot */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-left flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{getRoleBadge(role).icon}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-base truncate">{fullName}</h4>
                    <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border', getRoleBadge(role).cls)}>
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {gender === 'female' ? '👩 Female' : '👨 Male'} • Flat: {flatNo || '-'} • Age: {age || '-'}
                  </p>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Payment: UPI Submitted
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRegisterAnother}
                  className="h-12 px-6 rounded-2xl font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/20 hover:opacity-95 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Register Another Player
                </button>
                <button
                  onClick={handleExportCsv}
                  className="h-12 px-6 rounded-2xl font-bold border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Download Players (CSV)
                </button>
              </div>
            </div>

            {/* Transition banner to all players */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h4 className="text-sm font-bold text-white">All Registered Players</h4>
                  <p className="text-xs text-slate-400">All registered players are listed below.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-300 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40">
                {registeredPlayers.length} Total Registered
              </span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REGISTRATION FORM + LIVE CARD PREVIEW (activeTab === 'register') */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'register' && !registeredSuccess && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start mb-8 sm:mb-12">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              {errors.form && (
                <div className="rounded-2xl bg-red-500/20 border-2 border-red-500/50 p-4 sm:p-5 flex gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-300 mb-2">⚠️ Please Complete These Fields:</h4>
                    <p className="text-xs text-red-400 whitespace-pre-line leading-relaxed font-mono">{errors.form}</p>
                  </div>
                </div>
              )}
              <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* 1. Player Information */}
                <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0E1320]/80 backdrop-blur-xl p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>1. Player Information</span>
                  </div>

                  {/* Gender Selector: Male / Female */}
                  <div id="input-gender" className="space-y-1.5 scroll-mt-24">
                    <label className="text-xs font-bold text-slate-200">
                      Gender <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      {[
                        { id: 'male', label: 'Male', icon: '👨' },
                        { id: 'female', label: 'Female', icon: '👩' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGender(item.id as 'male' | 'female')}
                          className={cn(
                            'p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.98]',
                            gender === item.id
                              ? 'border-amber-400 bg-amber-500/15 text-white ring-2 ring-amber-400/40 shadow-md shadow-amber-500/10'
                              : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                          )}
                        >
                          <span className="text-lg sm:text-xl">{item.icon}</span>
                          <span>{item.label}</span>
                          {gender === item.id && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 ml-0.5" />}
                        </button>
                      ))}
                    </div>
                    {errors.gender && <p className="text-xs text-red-400">{errors.gender}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="input-fullName"
                        placeholder="e.g. Virat Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={cn('w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 scroll-mt-24', errors.fullName && 'border-red-500')}
                      />
                      {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">
                        Mobile / WhatsApp Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="input-phone"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={cn('w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 scroll-mt-24', errors.phone && 'border-red-500')}
                      />
                      {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Age & Flat No in 2 columns on all devices */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">
                        Age <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="input-age"
                        type="number"
                        min="5"
                        max="99"
                        placeholder="e.g. 24"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className={cn('w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 scroll-mt-24', errors.age && 'border-red-500')}
                      />
                      {errors.age && <p className="text-xs text-red-400">{errors.age}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">
                        Flat No <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="input-flatNo"
                        type="text"
                        placeholder="e.g. A-101"
                        value={flatNo}
                        onChange={(e) => setFlatNo(e.target.value)}
                        className={cn('w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 scroll-mt-24', errors.flatNo && 'border-red-500')}
                      />
                      {errors.flatNo && <p className="text-xs text-red-400">{errors.flatNo}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">Email Address (Optional)</label>
                    <input
                      id="input-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn('w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 scroll-mt-24', errors.email && 'border-red-500')}
                    />
                    {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                  </div>
                </div>

                {/* 2. Playing Role & Style */}
                <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0E1320]/80 backdrop-blur-xl p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>2. Playing Role & Style</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-200">Primary Playing Role</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                      {[
                        { id: 'batter', label: 'Batter', icon: '🏏' },
                        { id: 'bowler', label: 'Bowler', icon: '⚡' },
                        { id: 'all_rounder', label: 'All-Rounder', icon: '👑' },
                        { id: 'wicket_keeper', label: 'Wicket-Keeper', icon: '🧤' },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setRole(item.id as PlayerRole)}
                          className={cn(
                            'p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all text-center space-y-1 active:scale-[0.98]',
                            role === item.id
                              ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-2 ring-amber-500/30'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                          )}
                        >
                          <span className="text-xl sm:text-2xl">{item.icon}</span>
                          <h5 className="text-[11px] sm:text-xs font-bold text-white truncate">{item.label}</h5>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">Batting Style</label>
                      <select
                        value={battingStyle}
                        onChange={(e) => setBattingStyle(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="Right-hand bat" className="bg-[#0E1320]">Right-hand bat</option>
                        <option value="Left-hand bat" className="bg-[#0E1320]">Left-hand bat</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">Bowling Style</label>
                      <select
                        value={bowlingStyle}
                        onChange={(e) => setBowlingStyle(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="Right-arm medium" className="bg-[#0E1320]">Right-arm fast / medium</option>
                        <option value="Right-arm fast" className="bg-[#0E1320]">Right-arm express fast</option>
                        <option value="Right-arm off spin" className="bg-[#0E1320]">Right-arm off spin</option>
                        <option value="Right-arm leg spin" className="bg-[#0E1320]">Right-arm leg spin</option>
                        <option value="Left-arm medium" className="bg-[#0E1320]">Left-arm fast / medium</option>
                        <option value="Left-arm orthodox" className="bg-[#0E1320]">Left-arm orthodox spin</option>
                        <option value="None / Occasional" className="bg-[#0E1320]">None / Occasional</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Experience & Previous Team */}
                <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0E1320]/80 backdrop-blur-xl p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>3. Experience & Previous Team</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">Playing Experience</label>
                    <select
                      value={experience}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExperience(val);
                        if (val === 'new_player') {
                          setPreviousTeam('');
                          setCustomPreviousTeam('');
                        }
                      }}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="season_1" className="bg-[#0E1320]">Season 1 Player</option>
                      <option value="season_2" className="bg-[#0E1320]">Season 2 Player</option>
                      <option value="both_seasons" className="bg-[#0E1320]">Season 1 & 2 Player (Both)</option>
                      <option value="new_player" className="bg-[#0E1320]">New Player</option>
                    </select>
                  </div>

                  {experience !== 'new_player' && experience !== 'new' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">Previous Team / Franchise</label>
                      <select
                        value={previousTeam}
                        onChange={(e) => setPreviousTeam(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="" className="bg-[#0E1320]">Select a team...</option>
                        {PREVIOUS_TEAMS.map((team) => (
                          <option key={team} value={team} className="bg-[#0E1320]">
                            {team}
                          </option>
                        ))}
                      </select>

                      {previousTeam === 'Other / Custom Franchise' && (
                        <input
                          placeholder="Enter your custom team name"
                          value={customPreviousTeam}
                          onChange={(e) => setCustomPreviousTeam(e.target.value)}
                          className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">Past Achievements (Optional)</label>
                    <textarea
                      placeholder="E.g., Tournament wins, awards, notable performances..."
                      value={pastAchievements}
                      onChange={(e) => setPastAchievements(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                {/* 4. Photo & Bio */}
                <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0E1320]/80 backdrop-blur-xl p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>4. Profile Photo & Bio</span>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-200 block">
                      Profile Photo (Upload from device or paste image link)
                    </label>

                    {/* Direct Upload Button */}
                    <label className="w-full h-12 sm:h-13 px-4 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 active:scale-[0.99] font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                      <span>Upload Photo from Device / Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setPhotoUrl(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>

                    {/* Visual Divider */}
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="h-px bg-white/10 flex-1" />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Or Paste Image Link Below
                      </span>
                      <div className="h-px bg-white/10 flex-1" />
                    </div>

                    {/* Bigger, Roomier Upload Link Text Bar */}
                    <div className="relative flex items-center">
                      <Link2 className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 text-amber-400 pointer-events-none" />
                      <input
                        type="url"
                        placeholder="Paste image URL here (e.g. https://.../photo.jpg)"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-black/50 border border-white/15 pl-11 pr-10 text-base sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-inner"
                      />
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Clear link"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {photoUrl && (
                      <div className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-amber-500/30 text-xs">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <img src={photoUrl} alt="Preview" className="w-10 h-10 rounded-xl object-cover border border-amber-400/50 shadow-md shrink-0" />
                          <div className="min-w-0">
                            <span className="text-white font-bold text-xs truncate block">Profile photo ready</span>
                            <span className="text-[11px] text-emerald-400 font-medium">Applied to official player card ✓</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">Player Bio / Motto (Optional)</label>
                    <textarea
                      placeholder="Share your cricketing strengths and goals..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                {/* 5. PAYMENT & SCANNER SECTION */}
                <div className="rounded-2xl sm:rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-[#151926] to-[#0A0D15] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl shadow-amber-500/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span>5. Registration & Payment</span>
                    </div>
                    <span className="text-xs font-black px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      ₹{REGISTRATION_ENTRY_FEE} FEE
                    </span>
                  </div>

                  {/* Fee Banner */}
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-bold text-amber-300 text-xs sm:text-sm">Official Player Registration Kit</h4>
                      <p className="text-slate-400 mt-0.5 text-[11px] sm:text-xs">
                        Includes official tournament match kit, match balls, and Mega Auction draft entry.
                      </p>
                    </div>
                    <span className="text-lg sm:text-xl font-black text-amber-400 shrink-0">₹{REGISTRATION_ENTRY_FEE}</span>
                  </div>

                  {/* QR Scanner Display Container */}
                  <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-black/60 border border-amber-500/30 text-center space-y-3.5 sm:space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                        OFFICIAL PAYMENT QR SCANNER
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        UPI Scan & Pay
                      </span>
                    </div>

                    {/* QR Scanner Frame with Laser Scanline */}
                    <div className="relative mx-auto w-48 h-48 sm:w-60 sm:h-60 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-2xl shadow-amber-500/25 border border-amber-300/40 flex items-center justify-center">
                      <div className="relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden bg-white p-2 flex items-center justify-center">
                        {/* Laser Scan line */}
                        <div className="animate-scanline inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-lg shadow-amber-500 pointer-events-none z-10" />

                        <img
                          src={scannerImgError ? PLACEHOLDER_SCANNER_SVG : OFFICIAL_SCANNER_IMG}
                          alt="Official Tournament Scanner"
                          className="w-full h-full object-contain"
                          onError={() => setScannerImgError(true)}
                        />
                      </div>
                    </div>

                    {/* Scanner note */}
                    <div className="max-w-md mx-auto p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 text-left space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                        <Smartphone className="w-3.5 h-3.5" />
                        Scanner Information
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Official scanner is active above. Scan using any UPI app or transfer directly to the official UPI ID below.
                      </p>
                    </div>

                    {/* UPI ID Strip */}
                    <div className="max-w-md mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10 text-left">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tournament UPI ID</span>
                        <span className="text-xs sm:text-sm font-black text-white font-mono break-all">{OFFICIAL_UPI_ID}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="h-10 sm:h-9 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy UPI ID</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] sm:text-[11px] text-slate-400">
                      Google Pay • PhonePe • Paytm • BHIM • Cred • Any Bank App
                    </p>
                  </div>

                  {/* Transaction ID & Screenshot for UPI */}
                  <div className="space-y-3.5 sm:space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200">
                          UPI / UTR Reference Number <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="input-transactionId"
                          placeholder="e.g. 431289456723 (12-digit UTR)"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className={cn('w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 scroll-mt-24', errors.transactionId && 'border-red-500')}
                        />
                        {errors.transactionId && <p className="text-xs text-red-400">{errors.transactionId}</p>}
                        {!errors.transactionId && <p className="text-[11px] text-slate-400">Available in your GPay / PhonePe payment receipt</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200">Account Holder Name (Optional)</label>
                        <input
                          placeholder="Name on bank / UPI account"
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 h-11 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Screenshot upload */}
                    <div id="input-paymentReceipt" className="space-y-2 scroll-mt-24">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">
                          Payment Screenshot / Receipt <span className="text-red-400">*</span>
                        </label>
                        <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          Compulsory
                        </span>
                      </div>
                      {paymentReceiptUrl ? (
                        <div className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <img src={paymentReceiptUrl} alt="Receipt thumbnail" className="w-11 h-11 rounded-lg object-cover border border-white/20 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">{paymentReceiptName || 'receipt.png'}</p>
                              <span className="text-[10px] text-emerald-400 font-semibold">Screenshot Attached ✓</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentReceiptUrl('');
                              setPaymentReceiptName('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl sm:rounded-2xl border-2 border-dashed bg-white/[0.02] hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer text-center space-y-1",
                          errors.paymentReceipt ? "border-red-500 bg-red-500/5 hover:border-red-400" : "border-white/15 hover:border-amber-500/40"
                        )}>
                          <Upload className={cn("w-5 h-5", errors.paymentReceipt ? "text-red-400" : "text-amber-400")} />
                          <span className="text-xs font-bold text-white">Upload Payment Screenshot</span>
                          <span className="text-[10px] text-slate-400">Compulsory: PNG, JPG or WebP</span>
                          <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                        </label>
                      )}
                      {errors.paymentReceipt && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.paymentReceipt}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Banner above Submit Button */}
                {errors.form && (
                  <div className="rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 p-4 sm:p-5 flex items-start gap-3 text-left animate-in fade-in duration-200 shadow-xl shadow-rose-500/10">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-rose-300">
                        ⚠️ Please Complete Required Details
                      </h4>
                      <p className="text-xs text-rose-200 whitespace-pre-line leading-relaxed font-mono">
                        {errors.form}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[52px] sm:h-14 px-4 py-3 text-sm sm:text-base font-black rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black shadow-xl shadow-amber-500/25 hover:from-amber-600 hover:to-yellow-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Saving Registration...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span className="sm:hidden">Complete Registration (₹{REGISTRATION_ENTRY_FEE})</span>
                      <span className="hidden sm:inline">Complete Registration & Enter Tournament Draft (₹{REGISTRATION_ENTRY_FEE})</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 shrink-0" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Live Trading Card Preview Column */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  LIVE OFFICIAL PLAYER CARD
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">
                  KAPL 3.0 TRADING PASS
                </span>
              </div>

              {/* Trading Card */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-[#121624] via-[#0E1320] to-black p-4 sm:p-6 shadow-2xl shadow-amber-500/20 text-center space-y-4 sm:space-y-5">
                {/* Flat Number Badge top-right */}
                <div className="absolute top-3 right-3 font-mono text-xs font-black text-amber-300 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {flatNo ? `Flat ${flatNo}` : 'Flat A-101'}
                </div>

                {/* Avatar */}
                <div className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/25 mt-2">
                  <div className="w-full h-full rounded-[18px] sm:rounded-[22px] overflow-hidden bg-neutral-900 flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt={fullName || 'Player'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl sm:text-5xl">{getRoleBadge(role).icon}</span>
                    )}
                  </div>
                </div>

                {/* Name & Role */}
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight truncate">
                    {fullName || 'Player Name'}
                  </h3>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className={cn('text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border', getRoleBadge(role).cls)}>
                      {getRoleBadge(role).icon} {role.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 border border-white/10">
                      {gender === 'female' ? '👩 Female' : '👨 Male'}
                    </span>
                    {age && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Age: {age}
                      </span>
                    )}
                    {flatNo && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 border border-white/10">
                        {flatNo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-white/10 text-xs">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Batting</span>
                    <span className="font-semibold text-white truncate block text-[11px] sm:text-xs">{battingStyle}</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bowling</span>
                    <span className="font-semibold text-white truncate block text-[11px] sm:text-xs">{bowlingStyle}</span>
                  </div>
                </div>

                {/* Payment summary pill */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Entry Fee</span>
                    <span className="font-bold text-white text-xs sm:text-sm">₹{REGISTRATION_ENTRY_FEE} • UPI Payment</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {transactionId && paymentReceiptUrl ? 'UTR & Screenshot ✓' : transactionId ? 'UTR Entered' : 'Payment Ready'}
                  </span>
                </div>

                <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-time sync & live tournament pool</span>
                </div>
              </div>

              {/* View players CTA */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3 text-xs">
                <div>
                  <h5 className="font-bold text-white">View Existing Players</h5>
                  <p className="text-slate-400 text-[11px]">{registeredPlayers.length} players registered</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Players</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ALL REGISTERED PLAYERS VIEW (Tab 'roster' or on success) */}
        {/* ------------------------------------------------------------- */}
        {(activeTab === 'roster' || registeredSuccess) && (
          <div className="space-y-6 pt-2 animate-in fade-in duration-300">
            {/* Header Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#0E1320]/80 border border-white/[0.08] backdrop-blur-xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync Active
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Premier League 3.0</span>
                </div>
                <h3 className="text-lg sm:text-2xl font-black font-display text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Official Players <span className="text-gradient-gold">({registeredPlayers.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live tournament draft board with all registered players. Click any player card for their full profile and payment receipt.
                </p>
              </div>

              {/* View mode & Action buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t border-white/[0.06] md:border-t-0">
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 shrink-0">
                  <button
                    onClick={() => setRosterViewMode('grid')}
                    className={cn(
                      'p-2 rounded-lg text-xs font-bold transition-colors',
                      rosterViewMode === 'grid' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    )}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRosterViewMode('table')}
                    className={cn(
                      'p-2 rounded-lg text-xs font-bold transition-colors',
                      rosterViewMode === 'table' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    )}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchRegisteredPlayers()}
                    className="h-9 sm:h-10 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors"
                    title="Force refresh database records"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5 text-amber-400', isLoadingRoster && 'animate-spin')} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="h-9 sm:h-10 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors"
                    title="Export players to CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Metrics Dashboard Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Card 1: Total Draft Pool */}
              <button
                type="button"
                onClick={handleClearFilters}
                className={cn(
                  'p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all group flex flex-col justify-between active:scale-[0.98]',
                  !hasActiveFilters
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-[#0E1320]/80 border-white/[0.08] hover:border-amber-500/30'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pool</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-3xl font-black font-display text-white">{rosterStats.total}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Players in draft</div>
                </div>
              </button>

              {/* Card 2: Verified Fees */}
              <button
                type="button"
                onClick={() => setRosterStatusFilter((prev) => (prev === 'paid' ? 'all' : 'paid'))}
                className={cn(
                  'p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all group flex flex-col justify-between active:scale-[0.98]',
                  rosterStatusFilter === 'paid'
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                    : 'bg-[#0E1320]/80 border-white/[0.08] hover:border-emerald-500/40'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-3xl font-black font-display text-emerald-300">{rosterStats.paid}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    {rosterStats.total ? Math.round((rosterStats.paid / rosterStats.total) * 100) : 0}% fees confirmed
                  </div>
                </div>
              </button>

              {/* Card 3: Pending Verification */}
              <button
                type="button"
                onClick={() => setRosterStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
                className={cn(
                  'p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all group flex flex-col justify-between active:scale-[0.98]',
                  rosterStatusFilter === 'pending'
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'bg-[#0E1320]/80 border-white/[0.08] hover:border-amber-500/40'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Pending
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-3xl font-black font-display text-amber-300">{rosterStats.pending}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Awaiting check</div>
                </div>
              </button>

              {/* Card 4: Divisions & Role Breakdown */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0E1320]/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Breakdown</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium text-[11px] sm:text-xs">M / F</span>
                    <span className="text-white font-bold">{rosterStats.maleCount} / {rosterStats.femaleCount}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-0.5">
                    <span>👑 {rosterStats.allRounders}</span>
                    <span>🏏 {rosterStats.batters}</span>
                    <span>⚡ {rosterStats.bowlers}</span>
                    <span>🧤 {rosterStats.keepers}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar & Controls */}
            <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#0E1320]/70 border border-white/[0.08] space-y-3">
              {/* Row 1: Search & Sort dropdown */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    placeholder="Search name, flat (A-101), age, team, phone..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 pl-10 pr-9 h-11 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  {rosterSearch && (
                    <button
                      onClick={() => setRosterSearch('')}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-initial">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                    <select
                      value={rosterSortBy}
                      onChange={(e) => setRosterSortBy(e.target.value as any)}
                      aria-label="Sort players by"
                      className="w-full sm:w-auto h-11 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 pl-8 pr-7 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer appearance-none"
                    >
                      <option value="newest" className="bg-[#0E1320] text-white">Sort: Newest First</option>
                      <option value="oldest" className="bg-[#0E1320] text-white">Sort: Oldest First</option>
                      <option value="name" className="bg-[#0E1320] text-white">Sort: Name (A-Z)</option>
                      <option value="jersey" className="bg-[#0E1320] text-white">Sort: Jersey #</option>
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="h-11 px-3 rounded-xl sm:rounded-2xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300 hover:bg-rose-500/20 active:scale-95 flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Filter Pills - horizontal scrollable strip on mobile with no scrollbar */}
              <div className="pt-2 border-t border-white/[0.05] space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Status:</span>
                  <button
                    onClick={() => setRosterStatusFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95',
                      rosterStatusFilter === 'all'
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                    )}
                  >
                    All ({rosterStats.total})
                  </button>
                  <button
                    onClick={() => setRosterStatusFilter('paid')}
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 active:scale-95',
                      rosterStatusFilter === 'paid'
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'bg-white/[0.04] text-emerald-400 hover:bg-emerald-500/10'
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Verified ({rosterStats.paid})
                  </button>
                  <button
                    onClick={() => setRosterStatusFilter('pending')}
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 active:scale-95',
                      rosterStatusFilter === 'pending'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-white/[0.04] text-amber-400 hover:bg-amber-500/10'
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    Pending ({rosterStats.pending})
                  </button>

                  <span className="text-slate-600 px-1 shrink-0">|</span>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Gender:</span>
                  {[
                    { id: 'all', label: `All` },
                    { id: 'male', label: `👨 Male (${rosterStats.maleCount})` },
                    { id: 'female', label: `👩 Female (${rosterStats.femaleCount})` },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setRosterGenderFilter(chip.id as any)}
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95',
                        rosterGenderFilter === chip.id
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}

                  <span className="text-slate-600 px-1 shrink-0">|</span>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Role:</span>
                  {[
                    { id: 'all', label: `All Roles` },
                    { id: 'all_rounder', label: `👑 All-Rounders (${rosterStats.allRounders})` },
                    { id: 'batter', label: `🏏 Batters (${rosterStats.batters})` },
                    { id: 'bowler', label: `⚡ Bowlers (${rosterStats.bowlers})` },
                    { id: 'wicket_keeper', label: `🧤 Keepers (${rosterStats.keepers})` },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setRosterRoleFilter(chip.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95',
                        rosterRoleFilter === chip.id
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Count Indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>
                  Showing <strong className="text-white font-bold">{filteredRoster.length}</strong> of{' '}
                  <strong className="text-white font-bold">{registeredPlayers.length}</strong> players
                </span>
                {hasActiveFilters && (
                  <span className="text-amber-400 font-medium">Filtered view active</span>
                )}
              </div>
            </div>

            {/* Players Grid or Table */}
            {isLoadingRoster && registeredPlayers.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Loading live players...</p>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="py-16 text-center space-y-3 rounded-3xl border border-white/10 bg-[#0E1320]/40 p-8">
                <span className="text-4xl">🏏</span>
                <h4 className="text-lg font-bold text-white">No Players Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? 'No players matched your active search and filter criteria.'
                    : 'No players registered yet. Be the first to register!'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : rosterViewMode === 'grid' ? (
              /* Enhanced Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRoster.map((player) => {
                  const isNewlyRegistered = newlyRegisteredPlayer && player.id === newlyRegisteredPlayer.id;

                  return (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayerModal(player)}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-3.5 active:scale-[0.99]',
                        isNewlyRegistered
                          ? 'border-amber-400 bg-gradient-to-b from-amber-500/15 via-[#161C2E] to-[#0E1320] shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/40'
                          : 'border-white/[0.08] bg-[#0E1320]/80 hover:border-amber-400/50 hover:bg-[#121829] hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5'
                      )}
                    >
                      {/* Flat No / Badges top-right */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {isNewlyRegistered && (
                          <span className="bg-amber-400 text-black font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                            ⭐ YOU
                          </span>
                        )}
                        {player.flat_no ? (
                          <span className="bg-black/60 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                            Flat {player.flat_no}
                          </span>
                        ) : player.jersey_number ? (
                          <span className="bg-black/60 border border-amber-500/30 text-amber-400 font-mono font-black text-xs px-2.5 py-0.5 rounded-full">
                            #{player.jersey_number}
                          </span>
                        ) : null}
                      </div>

                      {/* Player Avatar & Details Header */}
                      <div className="flex items-start gap-3 sm:gap-3.5 pr-20 sm:pr-24">
                        <div className="w-13 h-13 rounded-2xl overflow-hidden bg-neutral-900 border border-white/15 flex items-center justify-center shrink-0 shadow-md group-hover:border-amber-400/60 transition-colors">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{getRoleBadge(player.role).icon}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-white text-base truncate group-hover:text-amber-300 transition-colors">
                            {player.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border', getRoleBadge(player.role).cls)}>
                              {getRoleBadge(player.role).icon} {player.role?.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-lg border border-white/10 text-slate-300">
                              {player.gender === 'female' ? '👩 Female' : '👨 Male'}
                            </span>
                            {player.age && (
                              <span className="text-[10px] px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-300">
                                Age {player.age}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Batting & Bowling Specs */}
                      <div className="grid grid-cols-2 gap-1.5 text-left text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Batting</span>
                          <span className="font-semibold text-slate-200 truncate block text-[11px]">{player.batting_style || 'Right-hand'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Bowling</span>
                          <span className="font-semibold text-slate-200 truncate block text-[11px]">{player.bowling_style || 'None'}</span>
                        </div>
                      </div>

                      {/* Franchise / Experience pill */}
                      {player.previous_team ? (
                        <div className="text-[11px] px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 flex items-center justify-between">
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Franchise</span>
                          <span className="font-medium text-amber-300 truncate max-w-[140px]">{player.previous_team}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] px-2.5 py-1 rounded-xl bg-white/[0.02] border border-white/[0.04] text-slate-400 flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold">Experience</span>
                          <span className="font-medium text-slate-300">
                            {formatExperienceLabel(player.experience)}
                          </span>
                        </div>
                      )}

                      {/* Bottom row: Payment status & View Profile link */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                        <span
                          className={cn(
                            'font-bold inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border',
                            player.payment_status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          )}
                        >
                          {player.payment_status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Verified ✓
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" />
                              Pending
                            </>
                          )}
                        </span>

                        <span className="text-slate-400 group-hover:text-amber-400 text-xs font-bold inline-flex items-center gap-1 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                          Profile
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Enhanced Table View */
              <div className="rounded-3xl border border-white/[0.08] bg-[#0E1320]/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-white/[0.04] border-b border-white/[0.08] text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Player</th>
                        <th className="py-3.5 px-3">Gender</th>
                        <th className="py-3.5 px-3">Age</th>
                        <th className="py-3.5 px-3">Flat No</th>
                        <th className="py-3.5 px-3">Role</th>
                        <th className="py-3.5 px-3">Batting</th>
                        <th className="py-3.5 px-3">Bowling</th>
                        <th className="py-3.5 px-3">Franchise / Exp</th>
                        <th className="py-3.5 px-3">Payment</th>
                        <th className="py-3.5 px-3">Registered</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredRoster.map((player) => (
                        <tr
                          key={player.id}
                          onClick={() => setSelectedPlayerModal(player)}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                              {player.photo_url ? (
                                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm">{getRoleBadge(player.role).icon}</span>
                              )}
                            </div>
                            <span className="font-semibold text-white">{player.name}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {player.gender === 'female' ? '👩 Female' : '👨 Male'}
                          </td>
                          <td className="py-3 px-3 text-amber-300 font-mono font-bold">
                            {player.age || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-200 font-mono font-bold">
                            {player.flat_no || (player.jersey_number ? `#${player.jersey_number}` : '-')}
                          </td>
                          <td className="py-3 px-3">
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg border', getRoleBadge(player.role).cls)}>
                              {player.role?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{player.batting_style || 'Right-hand bat'}</td>
                          <td className="py-3 px-3 text-slate-300">{player.bowling_style || 'None'}</td>
                          <td className="py-3 px-3 text-slate-300 truncate max-w-[140px]">
                            {player.previous_team ? `${player.previous_team} (${formatExperienceLabel(player.experience)})` : formatExperienceLabel(player.experience)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1',
                                player.payment_status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              )}
                            >
                              {player.payment_status === 'paid' ? 'Verified ✓' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {player.created_at ? new Date(player.created_at).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlayerModal(player);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-white hover:bg-amber-500 hover:text-black font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* INTERACTIVE PLAYER PROFILE MODAL */}
        {/* ------------------------------------------------------------- */}
        {selectedPlayerModal && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedPlayerModal(null)}
          >
            <div
              className="bg-[#0E1320] border border-white/15 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left my-4 sm:my-8 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 sm:gap-4 pb-3.5 sm:pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                  <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900 border-2 border-amber-400/60 flex items-center justify-center shrink-0 shadow-lg">
                    {selectedPlayerModal.photo_url ? (
                      <img
                        src={selectedPlayerModal.photo_url}
                        alt={selectedPlayerModal.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl sm:text-3xl">{getRoleBadge(selectedPlayerModal.role).icon}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="text-lg sm:text-2xl font-black font-display text-white truncate max-w-[190px] sm:max-w-none">
                        {selectedPlayerModal.name}
                      </h3>
                      {selectedPlayerModal.flat_no && (
                        <span className="bg-amber-400/20 text-amber-400 border border-amber-400/40 font-mono font-bold text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                          Flat {selectedPlayerModal.flat_no}
                        </span>
                      )}
                      {selectedPlayerModal.jersey_number && !selectedPlayerModal.flat_no && (
                        <span className="bg-amber-400/20 text-amber-400 border border-amber-400/40 font-mono font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full shrink-0">
                          #{selectedPlayerModal.jersey_number}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1.5">
                      <span className={cn('text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg border', getRoleBadge(selectedPlayerModal.role).cls)}>
                        {getRoleBadge(selectedPlayerModal.role).icon} {selectedPlayerModal.role?.replace('_', ' ')}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-lg border border-white/10 text-slate-300">
                        {selectedPlayerModal.gender === 'female' ? '👩 Female' : '👨 Male'}
                      </span>
                      {selectedPlayerModal.age && (
                        <span className="text-xs px-2.5 py-0.5 rounded-lg border border-amber-500/30 text-amber-300">
                          Age: {selectedPlayerModal.age}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPlayerModal(null)}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-colors shrink-0"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cricket & Player Specifications Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender</span>
                  <span className="font-semibold text-white mt-0.5 block capitalize">
                    {selectedPlayerModal.gender === 'female' ? 'Female' : 'Male'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Age</span>
                  <span className="font-semibold text-amber-400 mt-0.5 block font-mono">
                    {selectedPlayerModal.age ? `${selectedPlayerModal.age} yrs` : 'Not recorded'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Flat / Unit</span>
                  <span className="font-semibold text-amber-300 mt-0.5 block font-mono">
                    {selectedPlayerModal.flat_no || 'Not recorded'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Batting Style</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedPlayerModal.batting_style || 'Right-hand'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bowling Style</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedPlayerModal.bowling_style || 'None'}</span>
                </div>
              </div>

              {/* Franchise & Career */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Previous Franchise / Experience</span>
                  <span className="font-bold text-amber-300">
                    {selectedPlayerModal.previous_team
                      ? `${selectedPlayerModal.previous_team} • ${formatExperienceLabel(selectedPlayerModal.experience)}`
                      : formatExperienceLabel(selectedPlayerModal.experience)}
                  </span>
                </div>
                {selectedPlayerModal.past_achievements && (
                  <div className="pt-2 border-t border-white/[0.04]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Past Achievements</span>
                    <p className="text-slate-200 leading-relaxed">{selectedPlayerModal.past_achievements}</p>
                  </div>
                )}
                {selectedPlayerModal.bio && (
                  <div className="pt-2 border-t border-white/[0.04]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Player Note / Bio</span>
                    <p className="text-slate-300 italic">"{selectedPlayerModal.bio}"</p>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                    <span className="font-semibold text-white font-mono">{selectedPlayerModal.mobile_number || 'Confidential'}</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                    <span className="font-semibold text-white truncate block">{selectedPlayerModal.email || 'None provided'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Verification Dossier */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    Payment Verification Record
                  </span>
                  <span
                    className={cn(
                      'text-xs font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1',
                      selectedPlayerModal.payment_status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    )}
                  >
                    {selectedPlayerModal.payment_status === 'paid' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Verified ✓
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Pending Verification
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400">Entry Fee:</span>{' '}
                    <strong className="text-white font-bold font-mono">₹{selectedPlayerModal.payment_amount || REGISTRATION_ENTRY_FEE}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Method:</span>{' '}
                    <span className="text-white font-medium uppercase">{selectedPlayerModal.payment_method?.replace('_', ' ') || 'UPI QR'}</span>
                  </div>
                </div>

                {/* UTR / Transaction ID */}
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Transaction ID / UTR</span>
                    <span className="font-mono font-bold text-amber-300 text-xs truncate block">
                      {selectedPlayerModal.transaction_id || 'Not recorded'}
                    </span>
                  </div>
                  {selectedPlayerModal.transaction_id && (
                    <button
                      onClick={() => handleCopyModalUtr(selectedPlayerModal.transaction_id)}
                      className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center gap-1 transition-colors shrink-0"
                    >
                      {copiedModalUtr ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Payment Screenshot Proof */}
                {selectedPlayerModal.payment_receipt_url ? (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Payment Screenshot</span>
                      <button
                        onClick={() => setExpandedReceiptModal(selectedPlayerModal.payment_receipt_url || null)}
                        className="text-amber-400 hover:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Click to enlarge
                      </button>
                    </div>
                    <div
                      onClick={() => setExpandedReceiptModal(selectedPlayerModal.payment_receipt_url || null)}
                      className="group/img relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 max-h-48 cursor-pointer flex items-center justify-center"
                    >
                      <img
                        src={selectedPlayerModal.payment_receipt_url}
                        alt="Payment Receipt"
                        className="w-full h-full object-cover max-h-48 group-hover/img:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xs gap-1.5 backdrop-blur-[2px]">
                        <Eye className="w-4 h-4" /> View Full Screenshot
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center text-slate-400 text-xs">
                    No payment receipt screenshot uploaded for this registration.
                  </div>
                )}
              </div>

              {/* Close Footer */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlayerModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-bold transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PAYMENT SCREENSHOT LIGHTBOX MODAL */}
        {/* ------------------------------------------------------------- */}
        {expandedReceiptModal && (
          <div
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setExpandedReceiptModal(null)}
          >
            <div className="max-w-4xl w-full flex flex-col items-center space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="w-full flex items-center justify-between text-white pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold">Payment Receipt Proof</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={expandedReceiptModal}
                    download="payment-receipt.jpg"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Download
                  </a>
                  <button
                    onClick={() => setExpandedReceiptModal(null)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[82vh] overflow-auto rounded-2xl border border-white/20 shadow-2xl bg-black">
                <img
                  src={expandedReceiptModal}
                  alt="Full Payment Screenshot"
                  className="max-h-[82vh] max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#0E1320] py-6 text-center text-xs text-slate-500">
        <p>Premier League 3.0 • Official Player Registration & Live Players Portal</p>
      </footer>
    </div>
  );
}

