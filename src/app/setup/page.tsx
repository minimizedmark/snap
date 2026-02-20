'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Building2,
  Clock,
  Users,
  MessageSquare,
  Mic,
  Plus,
  X,
  ChevronRight,
  CheckCircle,
  Play,
  Square,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';

// ─── Industry Data ───────────────────────────────────────────────────────────

const INDUSTRY_DATA: Record<string, {
  label: string;
  services: string[];
  commonCalls: string[];
  extraQuestion?: { label: string; options: string[] };
}> = {
  'HVAC/Plumbing': {
    label: 'HVAC / Plumbing',
    services: ['Heating repair', 'AC service', 'Water heater', 'Drain cleaning', 'Emergency plumbing', 'Ductwork', 'Gas lines'],
    commonCalls: ['No heat/cooling', 'Strange noises', 'Water leaks', 'Clogged drains', 'High energy bills', 'Gas smell (emergency)', 'Schedule maintenance'],
    extraQuestion: { label: 'Peak Seasons', options: ['Summer (AC)', 'Winter (heating)', 'Spring maintenance', 'Year-round'] },
  },
  'Salon/Spa': {
    label: 'Salon / Spa',
    services: ['Haircuts', 'Color/highlights', 'Facials', 'Massage', 'Nails', 'Waxing', 'Eyebrows'],
    commonCalls: ['Book appointment', 'Check availability', 'Reschedule', 'Color correction', 'Last-minute openings', 'Pricing questions', 'Gift cards'],
    extraQuestion: { label: 'Appointment Types', options: ['Walk-ins welcome', 'Appointment only', 'Some walk-in services'] },
  },
  'Auto Service': {
    label: 'Auto Service',
    services: ['Oil change', 'Brake repair', 'Engine diagnostics', 'Tires', 'State inspection', 'Towing', 'Transmission'],
    commonCalls: ["Won't start", 'Breakdown/towing', 'Flat tire', 'Accident', 'Strange noises', 'Overheating', 'Check engine light'],
    extraQuestion: { label: 'Service Time', options: ['While you wait', 'Same day', 'Drop off overnight', 'By appointment'] },
  },
  'Medical/Dental': {
    label: 'Medical / Dental',
    services: ['General checkups', 'Cleanings', 'X-rays', 'Fillings/crowns', 'Urgent care', 'Specialist referrals', 'Lab work'],
    commonCalls: ['Schedule appointment', 'Prescription refill', 'Test results', 'Insurance questions', 'Cancel/reschedule', 'Urgent symptoms', 'Billing questions'],
    extraQuestion: { label: 'Patient Types', options: ['New patients welcome', 'Referral only', 'Walk-ins accepted', 'Telehealth available'] },
  },
  'Legal': {
    label: 'Legal / Law Firm',
    services: ['Personal injury', 'Family law', 'Criminal defense', 'Business law', 'Estate planning', 'Real estate', 'Immigration'],
    commonCalls: ['Free consultation', 'Case status update', 'Document questions', 'Court date info', 'New case inquiry', 'Billing questions', 'Urgent legal matter'],
    extraQuestion: { label: 'Consultation Type', options: ['Free initial consultation', 'Paid consultation', 'Phone screening first', 'In-person only'] },
  },
  'Restaurant': {
    label: 'Restaurant',
    services: ['Dine-in', 'Takeout', 'Delivery', 'Catering', 'Private events', 'Bar/drinks', 'Bakery/desserts'],
    commonCalls: ['Make reservation', 'Check hours', 'Menu questions', 'Large party booking', 'Catering inquiry', 'Dietary accommodations', 'Gift cards'],
    extraQuestion: { label: 'Reservation Style', options: ['Reservations required', 'Walk-ins only', 'Both reservations & walk-ins', 'Online booking available'] },
  },
  'General Contractor': {
    label: 'General Contractor',
    services: ['Kitchen remodel', 'Bathroom remodel', 'Room additions', 'Roofing', 'Siding', 'Windows/doors', 'Decks/patios'],
    commonCalls: ['Get an estimate', 'Project timeline', 'Schedule consultation', 'Insurance claim work', 'Permit questions', 'Material selection', 'Warranty issue'],
    extraQuestion: { label: 'Project Size', options: ['Small repairs', 'Medium remodels', 'Large renovations', 'New construction', 'Commercial projects'] },
  },
  'Electrical': {
    label: 'Electrical',
    services: ['Wiring/rewiring', 'Panel upgrades', 'Outlet installation', 'Lighting', 'Generator install', 'EV charger install', 'Electrical inspections'],
    commonCalls: ['No power', 'Flickering lights', 'Tripping breakers', 'New construction wiring', 'Code violations', 'Emergency electrical', 'Estimate request'],
    extraQuestion: { label: 'Service Type', options: ['Residential only', 'Commercial only', 'Both residential & commercial', 'Emergency 24/7'] },
  },
  'Landscaping': {
    label: 'Landscaping',
    services: ['Lawn mowing', 'Tree trimming', 'Landscape design', 'Irrigation', 'Hardscaping', 'Snow removal', 'Garden maintenance'],
    commonCalls: ['Get a quote', 'Schedule service', 'Weekly maintenance', 'One-time cleanup', 'Tree removal', 'Sprinkler repair', 'Seasonal cleanup'],
    extraQuestion: { label: 'Service Schedule', options: ['Weekly maintenance', 'Bi-weekly', 'Monthly', 'One-time projects only', 'Seasonal contracts'] },
  },
  'Pest Control': {
    label: 'Pest Control',
    services: ['Ant treatment', 'Termite inspection', 'Rodent control', 'Bed bug treatment', 'Mosquito control', 'Wildlife removal', 'Preventive treatment'],
    commonCalls: ['Bug/pest sighting', 'Schedule inspection', 'Emergency service', 'Recurring plan', 'Pricing questions', 'Termite damage', 'Re-treatment needed'],
    extraQuestion: { label: 'Treatment Type', options: ['One-time treatment', 'Monthly plan', 'Quarterly plan', 'Annual plan'] },
  },
  'Cleaning Service': {
    label: 'Cleaning Service',
    services: ['Regular house cleaning', 'Deep cleaning', 'Move-in/move-out', 'Office cleaning', 'Carpet cleaning', 'Window washing', 'Post-construction'],
    commonCalls: ['Get a quote', 'Book cleaning', 'Reschedule', 'Add extra service', 'Recurring schedule', 'Complaint/redo', 'Last-minute booking'],
    extraQuestion: { label: 'Service Frequency', options: ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Custom schedule'] },
  },
  'Real Estate': {
    label: 'Real Estate',
    services: ['Buying assistance', 'Selling/listing', 'Rental management', 'Property valuation', 'Investment properties', 'Commercial real estate', 'Relocation help'],
    commonCalls: ['Property inquiry', 'Schedule showing', 'List my property', 'Market value question', 'Offer status', 'Open house info', 'Agent availability'],
    extraQuestion: { label: 'Specialization', options: ['Residential', 'Commercial', 'Both', 'Luxury properties', 'First-time buyers'] },
  },
  'Roofing': {
    label: 'Roofing',
    services: ['Roof repair', 'Roof replacement', 'Leak repair', 'Gutter install', 'Storm damage', 'Roof inspection', 'Chimney repair'],
    commonCalls: ['Roof leaking', 'Storm damage', 'Get an estimate', 'Insurance claim', 'Gutter cleaning', 'Annual inspection', 'Emergency repair'],
    extraQuestion: { label: 'Roof Types', options: ['Shingle', 'Metal', 'Flat/commercial', 'Tile', 'All types'] },
  },
  'Other': {
    label: 'Other',
    services: [],
    commonCalls: [],
  },
};

const BUSINESS_TYPES = Object.keys(INDUSTRY_DATA);

const RESPONSE_TIMEFRAMES = [
  'Within 15 minutes',
  'Within 30 minutes',
  'Within 1 hour',
  'Within 2 hours',
  'Within 4 hours',
  'Same business day',
  'Next business day',
];

const STAFF_ROLES = [
  'Owner',
  'Manager',
  'Receptionist',
  'Technician',
  'Sales',
  'Dispatcher',
  'On-Call',
  'Other',
];

const PERSONALITY_OPTIONS = [
  'Professional',
  'Friendly',
  'Technical',
  'Casual',
  'Warm',
  'Authoritative',
  'Empathetic',
  'Efficient',
];

const KEY_MESSAGE_OPTIONS = [
  'Licensed & Insured',
  '24/7 Availability',
  'Free Estimates',
  'Same-Day Service',
  'Family Owned',
  'Satisfaction Guaranteed',
  'Emergency Service Available',
  'Serving the area for 10+ years',
  'Certified Professionals',
  'Competitive Pricing',
];

const QUOTE_HANDLING_OPTIONS = [
  'Free estimates over the phone',
  'Free on-site estimates',
  'Estimates require a scheduled visit',
  'We provide price ranges by phone',
  'Quote after inspection only',
  'Flat rate pricing available',
];

const EMERGENCY_PROTOCOL_OPTIONS = [
  'Dispatch technician within 1 hour',
  'Emergency rates apply after hours',
  'Call forwarded to on-call staff',
  'Emergency voicemail checked every 30 min',
  'We do not handle emergencies',
  'Emergency line separate from main',
];

const AFTER_HOURS_OPTIONS = [
  'Calls returned first thing next business day',
  'Voicemail with next-day callback',
  'Text message auto-reply sent',
  'After-hours answering service',
  'Emergency calls still answered',
  'Online booking available 24/7',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface StaffMember {
  name: string;
  role: string;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHoursMap = Record<string, DayHours>;

// ─── Checkbox Group Component ────────────────────────────────────────────────

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  showOther = true,
  columns = 2,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  showOther?: boolean;
  columns?: number;
}) {
  const [otherValue, setOtherValue] = useState('');
  const predefined = new Set(options);

  // Extract any "other" values that aren't in the predefined list
  useEffect(() => {
    const customValues = selected.filter(s => !predefined.has(s));
    if (customValues.length > 0) {
      setOtherValue(customValues.join(', '));
    }
  }, []);

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  const handleOtherChange = (value: string) => {
    setOtherValue(value);
    const predefinedSelected = selected.filter(s => predefined.has(s));
    const otherItems = value.split(',').map(s => s.trim()).filter(Boolean);
    onChange([...predefinedSelected, ...otherItems]);
  };

  return (
    <div>
      <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">{label}</label>
      <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-2`}>
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 cursor-pointer snap-transition ${
              selected.includes(opt)
                ? 'border-safety-orange bg-safety-orange/10'
                : 'border-gray-200 hover:border-safety-orange/50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-gray-300 text-safety-orange focus:ring-safety-orange w-4 h-4 flex-shrink-0"
            />
            <span className={`text-sm font-medium ${selected.includes(opt) ? 'text-safety-orange' : 'text-charcoal-text'}`}>
              {opt}
            </span>
          </label>
        ))}
      </div>
      {showOther && (
        <div className="mt-3">
          <input
            type="text"
            value={otherValue}
            onChange={(e) => handleOtherChange(e.target.value)}
            className="input-snap w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
            placeholder="Anything else? (separate with commas)"
          />
        </div>
      )}
    </div>
  );
}

// ─── Radio Group Component ───────────────────────────────────────────────────

function RadioGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 cursor-pointer snap-transition ${
              selected === opt
                ? 'border-safety-orange bg-safety-orange/10'
                : 'border-gray-200 hover:border-safety-orange/50'
            }`}
          >
            <input
              type="radio"
              name="business-type"
              checked={selected === opt}
              onChange={() => onChange(opt)}
              className="border-gray-300 text-safety-orange focus:ring-safety-orange w-4 h-4 flex-shrink-0"
            />
            <span className={`text-sm font-medium ${selected === opt ? 'text-safety-orange' : 'text-charcoal-text'}`}>
              {INDUSTRY_DATA[opt]?.label || opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main Setup Page ─────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [businessType, setBusinessType] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [primaryServices, setPrimaryServices] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>(['']);
  const [extraAnswers, setExtraAnswers] = useState<string[]>([]);

  // Step 2
  const [businessHours, setBusinessHours] = useState<BusinessHoursMap>(() => {
    const hours: BusinessHoursMap = {};
    DAYS.forEach((day) => {
      hours[day] = { open: '08:00', close: '17:00', closed: day === 'Sunday' };
    });
    return hours;
  });
  const [emergencyServices, setEmergencyServices] = useState(false);
  const [emergencyDefinition, setEmergencyDefinition] = useState('');
  const [responseTimeframe, setResponseTimeframe] = useState('Within 1 hour');

  // Step 3
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([{ name: '', role: 'Owner' }]);
  const [callRoutingRules, setCallRoutingRules] = useState({
    emergencyContact: '',
    afterHoursContact: '',
    generalInquiry: '',
  });

  // Step 4
  const [businessPersonality, setBusinessPersonality] = useState<string[]>([]);
  const [keyMessages, setKeyMessages] = useState<string[]>([]);

  // Step 5
  const [commonCallReasons, setCommonCallReasons] = useState<string[]>([]);
  const [quoteHandling, setQuoteHandling] = useState<string[]>([]);
  const [emergencyProtocol, setEmergencyProtocol] = useState<string[]>([]);
  const [afterHoursProtocol, setAfterHoursProtocol] = useState<string[]>([]);

  // Step 6
  const [greetingScript, setGreetingScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [mediaSupported, setMediaSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current industry data
  const industryInfo = INDUSTRY_DATA[businessType] || null;

  // Load existing profile on mount
  useEffect(() => {
    fetch('/api/onboarding/company-profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          const p = data.profile;
          if (p.businessType) setBusinessType(p.businessType);
          if (p.businessDescription) setBusinessDescription(p.businessDescription as string);
          if (p.primaryServices?.length) setPrimaryServices(p.primaryServices);
          if (p.serviceAreas?.length) setServiceAreas(p.serviceAreas);
          if (p.businessHours) setBusinessHours(p.businessHours as BusinessHoursMap);
          if (p.emergencyServices) setEmergencyServices(p.emergencyServices);
          if (p.emergencyDefinition) setEmergencyDefinition(p.emergencyDefinition);
          if (p.responseTimeframe) setResponseTimeframe(p.responseTimeframe);
          if (p.staffMembers) setStaffMembers(p.staffMembers as StaffMember[]);
          if (p.callRoutingRules) setCallRoutingRules(p.callRoutingRules as typeof callRoutingRules);
          if (p.businessPersonality?.length) setBusinessPersonality(p.businessPersonality);
          if (p.keyMessages?.length) setKeyMessages(p.keyMessages);
          if (p.commonCallReasons?.length) setCommonCallReasons(p.commonCallReasons);
          // Handle quote/emergency/afterhours - could be string (old) or array (new)
          if (p.quoteHandling) {
            setQuoteHandling(Array.isArray(p.quoteHandling) ? p.quoteHandling : [p.quoteHandling]);
          }
          if (p.emergencyProtocol) {
            setEmergencyProtocol(Array.isArray(p.emergencyProtocol) ? p.emergencyProtocol : [p.emergencyProtocol]);
          }
          if (p.afterHoursProtocol) {
            setAfterHoursProtocol(Array.isArray(p.afterHoursProtocol) ? p.afterHoursProtocol : [p.afterHoursProtocol]);
          }
          if (p.greetingScript) setGreetingScript(p.greetingScript);
          if (p.greetingAudioUrl) setUploadedUrl(p.greetingAudioUrl);
          if (p.currentStep && p.currentStep > 1) setStep(p.currentStep);
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  // Check media support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setMediaSupported(false);
    }
  }, []);

  // Reset services/calls when business type changes
  const handleBusinessTypeChange = (type: string) => {
    setBusinessType(type);
    setBusinessDescription('');
    setPrimaryServices(type === 'Other' ? ['', '', ''] : []);
    setCommonCallReasons(type === 'Other' ? ['', '', ''] : []);
    setExtraAnswers([]);
  };

  const saveStep = async (stepNum: number, data: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepNum, data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (stepNum: number, data: Record<string, unknown>) => {
    const success = await saveStep(stepNum, data);
    if (success) setStep(stepNum + 1);
  };

  const handleSaveAndExit = async () => {
    const stepData = getCurrentStepData();
    if (stepData) {
      await saveStep(step, stepData);
    }
    router.push('/dashboard');
  };

  const getCurrentStepData = (): Record<string, unknown> | null => {
    switch (step) {
      case 1: return { businessType, businessDescription, primaryServices, serviceAreas: serviceAreas.filter(Boolean) };
      case 2: return { businessHours, emergencyServices, emergencyDefinition, responseTimeframe };
      case 3: return { staffMembers: staffMembers.filter(s => s.name), callRoutingRules };
      case 4: return { businessPersonality, keyMessages };
      case 5: return {
        commonCallReasons,
        quoteHandling: quoteHandling.join('; '),
        emergencyProtocol: emergencyProtocol.join('; '),
        afterHoursProtocol: afterHoursProtocol.join('; '),
      };
      case 6: return { greetingScript, greetingAudioUrl: uploadedUrl };
      default: return null;
    }
  };

  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/company-profile/generate-script', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setGreetingScript(data.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setGeneratingScript(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access to record.');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const reRecord = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'greeting.webm');
      const res = await fetch('/api/upload-greeting', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      await saveStep(6, { greetingScript, greetingAudioUrl: uploadedUrl });
      const res = await fetch('/api/onboarding/company-profile', { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to complete setup');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic list helpers
  const addToList = (list: string[], setList: (v: string[]) => void, max = 10) => {
    if (list.length < max) setList([...list, '']);
  };

  const removeFromList = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const updateList = (list: string[], setList: (v: string[]) => void, idx: number, val: string) => {
    const updated = [...list];
    updated[idx] = val;
    setList(updated);
  };

  const stepLabels = ['Business', 'Operations', 'Staff', 'Brand', 'Scenarios', 'Greeting'];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-safety-orange rounded flex items-center justify-center mx-auto mb-4 border-2 border-white" style={{ boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)' }}>
            <Phone className="w-10 h-10 text-white animate-pulse" />
          </div>
          <p className="text-charcoal-text font-bold uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-deep-black border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-safety-orange rounded flex items-center justify-center border-2 border-white" style={{ boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Company Profile</h1>
                <p className="text-sm text-safety-orange font-bold uppercase tracking-wider">Setup Your AI Responses</p>
              </div>
            </div>
            <button onClick={handleSaveAndExit} className="text-sm text-gray-400 hover:text-white snap-transition flex items-center space-x-1">
              <Save className="w-4 h-4" />
              <span>Save & Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Step indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`flex items-center ${i < 6 ? 'flex-1' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= i ? 'bg-safety-orange text-white border-2 border-white' : 'bg-gray-200 text-gray-600'}`}
                    style={step >= i ? { boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)' } : {}}
                  >
                    {i}
                  </div>
                  {i < 6 && <div className={`h-1 flex-1 mx-2 ${step > i ? 'bg-safety-orange' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs">
              {stepLabels.map((label, i) => (
                <span key={label} className={step >= i + 1 ? 'text-safety-orange font-bold' : 'text-gray-600'}>{label}</span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}

            {/* ─── Step 1: Business Basics ─── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Building2 className="w-6 h-6 text-safety-orange" />
                  <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">What&apos;s Your Business?</h2>
                </div>

                <RadioGroup
                  label="Select Your Industry"
                  options={BUSINESS_TYPES}
                  selected={businessType}
                  onChange={handleBusinessTypeChange}
                />

                {/* Industry-specific services */}
                {industryInfo && industryInfo.services.length > 0 && (
                  <CheckboxGroup
                    label="Services You Offer"
                    options={industryInfo.services}
                    selected={primaryServices}
                    onChange={setPrimaryServices}
                  />
                )}

                {/* Other business type - generalized flow */}
                {businessType === 'Other' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="business-description" className="block text-sm font-bold text-charcoal-text mb-2 uppercase tracking-wider">
                        What Does Your Business Do?
                      </label>
                      <textarea
                        id="business-description"
                        name="business-description"
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        rows={3}
                        className="input-snap w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                        placeholder="Briefly describe what your business does and who your customers are (e.g. &quot;We run a dog grooming salon serving pet owners in Austin&quot;)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-charcoal-text mb-2 uppercase tracking-wider">Your Services</label>
                      {primaryServices.map((service, idx) => (
                        <div key={idx} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            name={`service-${idx}`}
                            value={service}
                            onChange={(e) => {
                              const updated = [...primaryServices];
                              updated[idx] = e.target.value;
                              setPrimaryServices(updated);
                            }}
                            className="input-snap flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                            placeholder={`Service ${idx + 1}`}
                            aria-label={`Service ${idx + 1}`}
                          />
                          {primaryServices.length > 1 && (
                            <button
                              onClick={() => setPrimaryServices(primaryServices.filter((_, i) => i !== idx))}
                              className="text-gray-400 hover:text-red-500 snap-transition"
                              aria-label="Remove service"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {primaryServices.length < 10 && (
                        <button
                          onClick={() => setPrimaryServices([...primaryServices, ''])}
                          className="flex items-center space-x-1 text-sm text-safety-orange hover:text-[#E65F00] snap-transition font-bold"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Service</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Extra industry question */}
                {industryInfo?.extraQuestion && (
                  <CheckboxGroup
                    label={industryInfo.extraQuestion.label}
                    options={industryInfo.extraQuestion.options}
                    selected={extraAnswers}
                    onChange={setExtraAnswers}
                  />
                )}

                {/* Service areas - keep as text inputs */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-2 uppercase tracking-wider">Service Areas</label>
                  {serviceAreas.map((area, idx) => (
                    <div key={idx} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={area}
                        onChange={(e) => updateList(serviceAreas, setServiceAreas, idx, e.target.value)}
                        className="input-snap flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                        placeholder="City or area name"
                      />
                      {serviceAreas.length > 1 && (
                        <button onClick={() => removeFromList(serviceAreas, setServiceAreas, idx)} className="text-gray-400 hover:text-red-500 snap-transition">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addToList(serviceAreas, setServiceAreas)} className="flex items-center space-x-1 text-sm text-safety-orange hover:text-[#E65F00] snap-transition font-bold">
                    <Plus className="w-4 h-4" />
                    <span>Add Area</span>
                  </button>
                </div>

                <button
                  onClick={() => handleNext(1, { businessType, businessDescription, primaryServices: primaryServices.filter(Boolean), serviceAreas: serviceAreas.filter(Boolean) })}
                  disabled={!businessType || primaryServices.filter(Boolean).length < 1 || (businessType === 'Other' && !businessDescription.trim()) || loading}
                  className="btn-snap-light w-full px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                >
                  <span>{loading ? 'Saving...' : 'Continue'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ─── Step 2: Operations ─── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Clock className="w-6 h-6 text-safety-orange" />
                  <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Operations</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">Business Hours</label>
                  <div className="space-y-2">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center space-x-3">
                        <span className="w-24 text-sm font-bold text-charcoal-text">{day}</span>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={businessHours[day].closed}
                            onChange={(e) => setBusinessHours({ ...businessHours, [day]: { ...businessHours[day], closed: e.target.checked } })}
                            className="rounded border-gray-300 text-safety-orange focus:ring-safety-orange"
                          />
                          <span className="text-xs text-gray-500">Closed</span>
                        </label>
                        {!businessHours[day].closed && (
                          <>
                            <input
                              type="time"
                              value={businessHours[day].open}
                              onChange={(e) => setBusinessHours({ ...businessHours, [day]: { ...businessHours[day], open: e.target.value } })}
                              className="input-snap px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                              type="time"
                              value={businessHours[day].close}
                              onChange={(e) => setBusinessHours({ ...businessHours, [day]: { ...businessHours[day], close: e.target.value } })}
                              className="input-snap px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={emergencyServices}
                      onChange={(e) => setEmergencyServices(e.target.checked)}
                      className="rounded border-gray-300 text-safety-orange focus:ring-safety-orange w-5 h-5"
                    />
                    <span className="text-sm font-bold text-charcoal-text uppercase tracking-wider">We offer emergency services</span>
                  </label>
                  {emergencyServices && (
                    <textarea
                      value={emergencyDefinition}
                      onChange={(e) => setEmergencyDefinition(e.target.value)}
                      className="input-snap w-full mt-3 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                      rows={3}
                      placeholder="Describe what qualifies as an emergency (e.g., burst pipes, no heat in winter, gas leaks...)"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-2 uppercase tracking-wider">Typical Response Timeframe</label>
                  <select
                    value={responseTimeframe}
                    onChange={(e) => setResponseTimeframe(e.target.value)}
                    className="input-snap w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                  >
                    {RESPONSE_TIMEFRAMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-4">
                  <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                  <button
                    onClick={() => handleNext(2, { businessHours, emergencyServices, emergencyDefinition, responseTimeframe })}
                    disabled={loading}
                    className="btn-snap-light flex-1 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Saving...' : 'Continue'}</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Staff & Roles ─── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Users className="w-6 h-6 text-safety-orange" />
                  <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Staff & Roles</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">Team Members</label>
                  {staffMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const updated = [...staffMembers];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setStaffMembers(updated);
                        }}
                        className="input-snap flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                        placeholder="Name"
                      />
                      <select
                        value={member.role}
                        onChange={(e) => {
                          const updated = [...staffMembers];
                          updated[idx] = { ...updated[idx], role: e.target.value };
                          setStaffMembers(updated);
                        }}
                        className="input-snap px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {staffMembers.length > 1 && (
                        <button onClick={() => setStaffMembers(staffMembers.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 snap-transition">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {staffMembers.length < 10 && (
                    <button onClick={() => setStaffMembers([...staffMembers, { name: '', role: 'Technician' }])} className="flex items-center space-x-1 text-sm text-safety-orange hover:text-[#E65F00] snap-transition font-bold">
                      <Plus className="w-4 h-4" />
                      <span>Add Team Member</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">Call Routing</label>
                  <div className="space-y-3">
                    {[
                      { key: 'emergencyContact' as const, label: 'Emergency Calls' },
                      { key: 'afterHoursContact' as const, label: 'After-Hours Calls' },
                      { key: 'generalInquiry' as const, label: 'General Inquiries' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
                        <select
                          value={callRoutingRules[key]}
                          onChange={(e) => setCallRoutingRules({ ...callRoutingRules, [key]: e.target.value })}
                          className="input-snap w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                        >
                          <option value="">Select team member...</option>
                          {staffMembers.filter(s => s.name).map((s, i) => (
                            <option key={i} value={s.name}>{s.name} ({s.role})</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button onClick={() => setStep(2)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                  <button
                    onClick={() => handleNext(3, { staffMembers: staffMembers.filter(s => s.name), callRoutingRules })}
                    disabled={loading}
                    className="btn-snap-light flex-1 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Saving...' : 'Continue'}</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 4: Brand Voice ─── */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-safety-orange" />
                  <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Brand Voice</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">Business Personality</label>
                  <p className="text-sm text-gray-500 mb-3">Select words that describe your business tone.</p>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setBusinessPersonality((prev) =>
                            prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]
                          );
                        }}
                        className={`px-4 py-2 rounded-lg border-2 font-bold text-sm uppercase tracking-wide snap-transition ${
                          businessPersonality.includes(opt)
                            ? 'border-safety-orange bg-safety-orange/10 text-safety-orange'
                            : 'border-gray-300 text-charcoal-text hover:border-safety-orange/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-text mb-3 uppercase tracking-wider">Key Messages</label>
                  <p className="text-sm text-gray-500 mb-3">Select messages you want highlighted in responses.</p>
                  <div className="flex flex-wrap gap-2">
                    {KEY_MESSAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setKeyMessages((prev) =>
                            prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]
                          );
                        }}
                        className={`px-4 py-2 rounded-lg border-2 font-bold text-sm uppercase tracking-wide snap-transition ${
                          keyMessages.includes(opt)
                            ? 'border-safety-orange bg-safety-orange/10 text-safety-orange'
                            : 'border-gray-300 text-charcoal-text hover:border-safety-orange/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button onClick={() => setStep(3)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                  <button
                    onClick={() => handleNext(4, { businessPersonality, keyMessages })}
                    disabled={businessPersonality.length < 1 || loading}
                    className="btn-snap-light flex-1 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Saving...' : 'Continue'}</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 5: Common Scenarios ─── */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Phone className="w-6 h-6 text-safety-orange" />
                  <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Common Scenarios</h2>
                </div>

                {/* Industry-specific common call reasons */}
                {industryInfo && industryInfo.commonCalls.length > 0 ? (
                  <CheckboxGroup
                    label="Why Do Customers Call You?"
                    options={industryInfo.commonCalls}
                    selected={commonCallReasons}
                    onChange={setCommonCallReasons}
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-charcoal-text mb-2 uppercase tracking-wider">Common Call Reasons</label>
                    {commonCallReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          name={`call-reason-${idx}`}
                          value={reason}
                          onChange={(e) => {
                            const updated = [...commonCallReasons];
                            updated[idx] = e.target.value;
                            setCommonCallReasons(updated);
                          }}
                          className="input-snap flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                          placeholder={`Reason ${idx + 1}`}
                          aria-label={`Call reason ${idx + 1}`}
                        />
                        {commonCallReasons.length > 1 && (
                          <button
                            onClick={() => setCommonCallReasons(commonCallReasons.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 snap-transition"
                            aria-label="Remove reason"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {commonCallReasons.length < 10 && (
                      <button
                        onClick={() => setCommonCallReasons([...commonCallReasons, ''])}
                        className="flex items-center space-x-1 text-sm text-safety-orange hover:text-[#E65F00] snap-transition font-bold"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Reason</span>
                      </button>
                    )}
                  </div>
                )}

                <CheckboxGroup
                  label="How Do You Handle Quote Requests?"
                  options={QUOTE_HANDLING_OPTIONS}
                  selected={quoteHandling}
                  onChange={setQuoteHandling}
                  showOther={true}
                />

                <CheckboxGroup
                  label="Emergency Protocol"
                  options={EMERGENCY_PROTOCOL_OPTIONS}
                  selected={emergencyProtocol}
                  onChange={setEmergencyProtocol}
                  showOther={true}
                />

                <CheckboxGroup
                  label="After-Hours Protocol"
                  options={AFTER_HOURS_OPTIONS}
                  selected={afterHoursProtocol}
                  onChange={setAfterHoursProtocol}
                  showOther={true}
                />

                <div className="flex space-x-4">
                  <button onClick={() => setStep(4)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                  <button
                    onClick={() => handleNext(5, {
                      commonCallReasons: commonCallReasons.filter(Boolean),
                      quoteHandling: quoteHandling.join('; '),
                      emergencyProtocol: emergencyProtocol.join('; '),
                      afterHoursProtocol: afterHoursProtocol.join('; '),
                    })}
                    disabled={commonCallReasons.filter(Boolean).length < 1 || loading}
                    className="btn-snap-light flex-1 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Saving...' : 'Continue'}</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 6: Greeting Script & Recording ─── */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Mic className="w-6 h-6 text-safety-orange" />
                  <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Greeting Script & Recording</h2>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-charcoal-text uppercase tracking-wider">Greeting Script</label>
                    <button
                      onClick={handleGenerateScript}
                      disabled={generatingScript}
                      className="flex items-center space-x-1 text-sm text-safety-orange hover:text-[#E65F00] snap-transition font-bold disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{generatingScript ? 'Generating...' : 'Generate Script'}</span>
                    </button>
                  </div>
                  <textarea
                    value={greetingScript}
                    onChange={(e) => setGreetingScript(e.target.value)}
                    className="input-snap w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition"
                    rows={6}
                    placeholder="Your greeting script will appear here. Click 'Generate Script' to create one based on your profile, or write your own..."
                  />
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <h3 className="text-sm font-bold text-charcoal-text mb-4 uppercase tracking-wider">Record Your Greeting</h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-900 font-medium mb-2">Tips for the best greeting:</p>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>Use the generated script above as your guide — read it naturally</li>
                      <li>Speak clearly and at a steady pace</li>
                      <li>Record in a quiet room with no background noise</li>
                      <li>Smile while you talk — it comes through in your voice</li>
                      <li>Keep it under 20 seconds for the best caller experience</li>
                    </ul>
                  </div>

                  {!mediaSupported ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4 mb-4">
                        {!isRecording && !audioBlob && (
                          <button
                            onClick={startRecording}
                            className="btn-snap-light px-6 py-3 rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2"
                          >
                            <Mic className="w-5 h-5" />
                            <span>Start Recording</span>
                          </button>
                        )}

                        {isRecording && (
                          <button
                            onClick={stopRecording}
                            className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2 hover:bg-red-600 snap-transition"
                          >
                            <Square className="w-5 h-5" />
                            <span>Stop</span>
                          </button>
                        )}

                        {audioBlob && !isRecording && (
                          <>
                            <button onClick={reRecord} className="px-4 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2 hover:bg-gray-50 snap-transition">
                              <RotateCcw className="w-5 h-5" />
                              <span>Re-record</span>
                            </button>
                            {!uploadedUrl && (
                              <button
                                onClick={uploadAudio}
                                disabled={loading}
                                className="btn-snap-light px-6 py-3 rounded-lg font-bold uppercase tracking-wide flex items-center space-x-2 disabled:opacity-50"
                              >
                                <Save className="w-5 h-5" />
                                <span>{loading ? 'Uploading...' : 'Save Recording'}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {(isRecording || audioBlob) && (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2">
                            {isRecording && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                            <span className="text-sm font-bold text-charcoal-text">{recordingTime}s / 30s</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div className="bg-safety-orange h-2 rounded-full snap-transition" style={{ width: `${(recordingTime / 30) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {audioUrl && (
                        <div className="mt-4">
                          <audio controls src={audioUrl} className="w-full" />
                        </div>
                      )}

                      {uploadedUrl && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4 flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-green-800 font-bold flex-1">Recording saved successfully!</span>
                          <button onClick={() => { reRecord(); setUploadedUrl(null); }} className="text-sm text-safety-orange hover:text-[#E65F00] font-bold snap-transition">
                            Change Recording
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!uploadedUrl && (
                  <p className="text-sm text-safety-orange font-bold">Please record and save your greeting before completing setup.</p>
                )}

                <div className="flex space-x-4">
                  <button onClick={() => setStep(5)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                  <button
                    onClick={handleComplete}
                    disabled={loading || !uploadedUrl}
                    className="btn-snap-light flex-1 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{loading ? 'Completing...' : 'Complete Setup'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
