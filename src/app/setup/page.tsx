'use client';

import { useState, useEffect } from 'react';
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
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Save,
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

// ─── Generating Sub-Step Component ───────────────────────────────────────────

function GeneratingSubStep({
  onGenerated,
  onError,
}: {
  onGenerated: (script: string) => void;
  onError: (msg: string) => void;
}) {
  const [failed, setFailed] = useState(false);

  const generate = async () => {
    setFailed(false);
    try {
      const res = await fetch('/api/onboarding/company-profile/generate-script', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      onGenerated(data.script);
    } catch (err) {
      setFailed(true);
      onError(err instanceof Error ? err.message : 'Failed to generate script');
    }
  };

  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-bold mb-4">Couldn&apos;t generate your script. Please try again.</p>
        <button onClick={generate} className="btn-snap-light px-6 py-3 rounded-lg font-bold uppercase tracking-wide">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-safety-orange rounded-full flex items-center justify-center mx-auto mb-6" style={{ boxShadow: '0 0 20px rgba(255, 107, 0, 0.4)' }}>
        <Sparkles className="w-8 h-8 text-white animate-pulse" />
      </div>
      <p className="text-xl font-bold text-deep-black uppercase tracking-wide mb-2">Writing Your Personal Script...</p>
      <p className="text-gray-500 text-sm">Using your business profile to craft something specific to you.</p>
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
  const [scriptStep, setScriptStep] = useState<1 | 2 | 3>(1); // 1=education, 2=generating, 3=review
  const [existingRecordingUrl, setExistingRecordingUrl] = useState<string | null>(null);
  const [completingSetup, setCompletingSetup] = useState(false);

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
          if (p.greetingAudioUrl) setExistingRecordingUrl(p.greetingAudioUrl);
          if (p.currentStep && p.currentStep > 1) setStep(p.currentStep);
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
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
      case 6: return { greetingScript };
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
      setScriptStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleSaveScriptAndRecord = async () => {
    const success = await saveStep(6, { greetingScript });
    if (success) router.push('/setup/record');
  };

  const handleCompleteFromBanner = async () => {
    setCompletingSetup(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/company-profile', { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to complete setup');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setCompletingSetup(false);
    }
  };

  // Word count helper
  const wordCount = greetingScript.trim() ? greetingScript.trim().split(/\s+/).length : 0;

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

            {/* ─── Step 6: Greeting Script ─── */}
            {step === 6 && (
              <div className="space-y-6">

                {/* Stuck user recovery banner */}
                {existingRecordingUrl && (
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-900">You have a saved recording</p>
                      <p className="text-sm text-amber-800 mt-1">Your greeting is already recorded and saved. You can complete setup now, or re-record from the recording page.</p>
                      <div className="flex space-x-3 mt-3">
                        <button
                          onClick={handleCompleteFromBanner}
                          disabled={completingSetup}
                          className="btn-snap-light px-4 py-2 rounded-lg font-bold uppercase tracking-wide text-sm flex items-center space-x-2 disabled:opacity-50"
                        >
                          {completingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          <span>{completingSetup ? 'Completing...' : 'Complete Setup Now'}</span>
                        </button>
                        <button
                          onClick={() => router.push('/setup/record')}
                          className="px-4 py-2 border-2 border-gray-300 text-charcoal-text rounded-lg font-bold uppercase tracking-wide text-sm hover:bg-gray-50 snap-transition"
                        >
                          Go to Recording Page
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-step 1: Education */}
                {scriptStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <Mic className="w-6 h-6 text-safety-orange" />
                      <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Your Greeting Is Everything</h2>
                    </div>

                    <div className="bg-deep-black border-2 border-safety-orange rounded-lg p-6 space-y-4" style={{ boxShadow: '0 0 15px rgba(255, 107, 0, 0.2)' }}>
                      <p className="text-white font-medium leading-relaxed">
                        When a contractor misses a call, the caller has already mentally moved on — they&apos;re about to dial the next guy on the list. A personal, warm greeting is what stops them in their tracks.
                      </p>
                      <p className="text-white font-medium leading-relaxed">
                        We&apos;ve studied what works: callers who hear a real human voice are dramatically more likely to engage and wait for a callback. A generic &quot;please leave a message&quot; gets ignored. Your voice doesn&apos;t.
                      </p>
                      <div className="border-t border-safety-orange/40 pt-4">
                        <p className="text-safety-orange font-bold text-sm uppercase tracking-wider mb-2">Here&apos;s the thing most people don&apos;t know:</p>
                        <p className="text-white font-medium leading-relaxed">
                          Leaving a message isn&apos;t even required — SnapCalls captures every caller&apos;s number automatically. But a great greeting dramatically increases the chance they stay engaged instead of moving on.
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-5 space-y-3">
                      <p className="text-sm font-bold text-charcoal-text uppercase tracking-wider">What makes a great greeting?</p>
                      <ul className="space-y-2">
                        {[
                          'Uses your name — makes it personal, not robotic',
                          'Mentions your specific trade — shows you know what you\'re doing',
                          'Keeps it under 30 seconds — callers tune out longer recordings',
                          'Ends with confidence — not "I\'ll try to call you back"',
                        ].map((tip) => (
                          <li key={tip} className="flex items-start space-x-2 text-sm text-charcoal-text">
                            <span className="text-safety-orange font-bold mt-0.5">✓</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex space-x-4">
                      <button onClick={() => setStep(5)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                      <button
                        onClick={() => setScriptStep(2)}
                        className="btn-snap-light flex-1 px-6 py-3 rounded-lg font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span>Build My Script</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-step 2: Auto-generating */}
                {scriptStep === 2 && (
                  <GeneratingSubStep
                    onGenerated={(script) => { setGreetingScript(script); setScriptStep(3); }}
                    onError={(msg) => { setError(msg); setScriptStep(1); }}
                  />
                )}

                {/* Sub-step 3: Review & Edit */}
                {scriptStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <Mic className="w-6 h-6 text-safety-orange" />
                      <h2 className="text-2xl font-bold text-deep-black uppercase tracking-wide">Review Your Script</h2>
                    </div>

                    <p className="text-gray-600">We&apos;ve written a personal script based on your business profile. Read it out loud, edit anything that doesn&apos;t sound like you, then head to the recording page.</p>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-charcoal-text uppercase tracking-wider">Your Script</label>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            wordCount === 0 ? 'bg-gray-100 text-gray-500' :
                            wordCount <= 60 ? 'bg-green-100 text-green-700' :
                            wordCount <= 75 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {wordCount === 0 ? '0 words' :
                             wordCount <= 60 ? `✓ ${wordCount} words` :
                             wordCount <= 75 ? `⚠ ${wordCount} words (a little long)` :
                             `✗ ${wordCount} words (too long)`}
                          </span>
                          <button
                            onClick={() => setScriptStep(2)}
                            disabled={generatingScript}
                            className="flex items-center space-x-1 text-sm text-safety-orange hover:text-[#E65F00] snap-transition font-bold disabled:opacity-50"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={greetingScript}
                        onChange={(e) => setGreetingScript(e.target.value)}
                        className="input-snap w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-safety-orange focus:border-safety-orange snap-transition text-base leading-relaxed"
                        rows={6}
                        placeholder="Your script will appear here..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Target: 60 words or fewer — comfortably spoken in 20–30 seconds.</p>
                    </div>

                    <div className="flex space-x-4">
                      <button onClick={() => setScriptStep(1)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-text rounded-lg hover:bg-gray-50 font-bold uppercase tracking-wide snap-transition">Back</button>
                      <button
                        onClick={handleSaveScriptAndRecord}
                        disabled={loading || !greetingScript.trim()}
                        className="btn-snap-light flex-1 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide flex items-center justify-center space-x-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                        <span>{loading ? 'Saving...' : 'Save & Go to Recording'}</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
