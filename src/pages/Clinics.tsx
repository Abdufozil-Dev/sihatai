import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronRight, Star, ChevronLeft, Phone, Stethoscope, Clock, Globe } from 'lucide-react';
import { Clinic, Doctor } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MOCK_CLINICS: Clinic[] = [
  {
    id: '1',
    name: "Toshkent Tibbiyot Akademiyati",
    address: "Toshkent sh., Farobiy ko'chasi, 2-uy",
    phone: "+998 71 214-90-41",
    services: ["Kardiologiya", "Nevrologiya", "Xirurgiya"],
    doctors: [
      { id: 'd1', name: "Dr. Alisher Karimov", specialty: "Kardiolog", clinicId: '1', phone: '+998 90 123-45-67', availability: ['09:00', '10:00', '11:00'] },
      { id: 'd2', name: "Dr. Nigora Ahmedova", specialty: "Nevrolog", clinicId: '1', phone: '+998 90 765-43-21', availability: ['14:00', '15:00', '16:00'] }
    ],
    createdAt: new Date() as any
  },
  {
    id: '2',
    name: "Akfa Medline",
    address: "Toshkent sh., Olmazor tumani, Kichik halqa yo'li, 5A",
    phone: "+998 71 203-30-03",
    services: ["Diagnostika", "Pediatriya", "Stomatologiya", "Oftalmologiya"],
    doctors: [
      { id: 'd3', name: "Dr. Jasur Umarov", specialty: "Pediatr", clinicId: '2', phone: '+998 93 111-22-33' },
      { id: 'd4', name: "Dr. Malika Saidova", specialty: "Stomatolog", clinicId: '2', phone: '+998 93 444-55-66' },
      { id: 'd5', name: "Dr. Rustam G'ofurov", specialty: "Oftalmolog", clinicId: '2', phone: '+998 93 777-88-99' }
    ],
    createdAt: new Date() as any
  },
  {
    id: '3',
    name: "Shox Med Center",
    address: "Toshkent sh., Oybek ko'chasi, 34-uy",
    phone: "+998 71 202-02-02",
    services: ["Ginekologiya", "Urologiya", "Dermatologiya"],
    doctors: [
      { id: 'd6', name: "Dr. Azizbek Tursunov", specialty: "Dermatolog", clinicId: '3', phone: '+998 94 555-66-77' },
      { id: 'd7', name: "Dr. Shahlo Karimova", specialty: "Ginekolog", clinicId: '3', phone: '+998 94 888-99-00' }
    ],
    createdAt: new Date() as any
  }
];

const tg = window.Telegram?.WebApp;

export default function Clinics() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchClinics = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/clinics');
        if (response.ok) {
          const data = await response.json();
          setClinics(data);
        } else {
          // Fallback to mock data if API fails
          setClinics(MOCK_CLINICS);
        }
      } catch (e) {
        console.error("Fetch clinics error:", e);
        setClinics(MOCK_CLINICS);
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []);

  const handleBack = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (selectedClinic) {
      setSelectedClinic(null);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    }
    return () => {
      tg?.BackButton?.offClick();
      tg?.BackButton?.hide();
    };
  }, [selectedClinic]);

  const handleClinicClick = (clinic: Clinic) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
    setSelectedClinic(clinic);
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.address.toLowerCase().includes(search.toLowerCase()) ||
    c.services.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="pt-12 px-6 mb-8 flex items-center gap-4">
        <button 
          onClick={handleBack}
          className="w-12 h-12 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight uppercase">KLINIKALAR</h1>
          <p className="text-[#2563EB] font-bold text-[10px] mt-1 uppercase tracking-widest">YAQIN MARKAZLAR</p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Search Section */}
        <div className="relative group mb-2">
          <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-full group-focus-within:bg-blue-600/10 transition-all" />
          <div className="relative bg-white rounded-[2rem] p-2.5 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Search size={22} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Klinika yoki xizmatni qidiring..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium px-2 py-2 outline-none text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Clinics Content */}
        <AnimatePresence mode="wait">
          {!selectedClinic ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredClinics.length > 0 ? (
                filteredClinics.map((clinic) => (
                  <motion.div
                    key={clinic.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleClinicClick(clinic)}
                    className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-100 transition-all group cursor-pointer hover:shadow-lg hover:shadow-blue-50/20"
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex gap-4 items-center flex-1 min-w-0">
                        <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                          {clinic.photo_url ? (
                            <img src={clinic.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <MapPin size={32} className="text-blue-600" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-xl font-bold text-[#0F172A] tracking-tight group-hover:text-blue-600 transition-colors truncate">
                            {clinic.name}
                          </h3>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <MapPin size={12} className="text-blue-500" />
                            <span className="truncate">{clinic.address}</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            {clinic.services && clinic.services.slice(0, 2).map((service, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[8px] font-bold rounded-lg uppercase tracking-wider">
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-slate-200 group-hover:text-blue-500 transition-all shrink-0 pt-6 pr-2">
                        <ChevronRight size={24} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2.5">
                          {clinic.doctors && clinic.doctors.slice(0, 3).map((doc, i) => (
                            <div key={i} className="w-9 h-9 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                              {doc.photo_url ? (
                                <img src={doc.photo_url} alt="Doctor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Stethoscope size={16} className="text-slate-300" />
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                          {clinic.doctors?.length || 0} shifokor
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg text-amber-600 text-[9px] font-bold shadow-sm shadow-amber-100">
                        <Star size={12} fill="currentColor" />
                        <span>4.8</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                    <Search size={32} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Hech narsa topilmadi</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Clinic Hero */}
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-200 mx-auto overflow-hidden">
                  {selectedClinic.photo_url ? (
                    <img src={selectedClinic.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MapPin size={32} className="text-white" />
                  )}
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedClinic.name}</h2>
                  <div className="flex flex-col items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-blue-500" />
                      <span>{selectedClinic.address}</span>
                    </div>
                    {selectedClinic.working_hours && (
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} className="text-emerald-500" />
                        <span>{selectedClinic.working_hours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedClinic.description && (
                  <p className="text-sm text-slate-500 text-center font-medium leading-relaxed italic">
                    "{selectedClinic.description}"
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <a 
                    href={`tel:${selectedClinic.phone}`}
                    className="flex items-center justify-center gap-3 bg-slate-50 h-14 rounded-2xl border border-slate-100 text-slate-900 font-bold text-xs active:scale-95 transition-all"
                  >
                    <Phone size={18} className="text-blue-600" />
                    <span>Qo'ng'iroq</span>
                  </a>
                  <a 
                    href={selectedClinic.location_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-slate-50 h-14 rounded-2xl border border-slate-100 text-slate-900 font-bold text-xs active:scale-95 transition-all"
                  >
                    <Globe size={18} className="text-blue-600" />
                    <span>Xaritada ko'rish</span>
                  </a>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">Xizmatlar</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedClinic.services?.map((service, idx) => (
                    <span key={idx} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Doctors */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">Shifokorlar</h3>
                <div className="space-y-4">
                  {selectedClinic.doctors && selectedClinic.doctors.map((doctor) => (
                    <div key={doctor.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col gap-4 group hover:border-emerald-100 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            {doctor.photo_url ? (
                              <img src={doctor.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <img src={`https://picsum.photos/seed/${doctor.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-sm tracking-tight">{doctor.name}</p>
                            <div className="flex items-center gap-2">
                              <Stethoscope size={12} className="text-emerald-600" />
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{doctor.specialty}</span>
                            </div>
                            {doctor.experience && (
                              <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest block">Tajriba: {doctor.experience}</span>
                            )}
                          </div>
                        </div>
                        <a 
                          href={`tel:${doctor.phone || selectedClinic.phone}`}
                          className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center justify-center active:scale-90 transition-all"
                        >
                          <Phone size={18} />
                        </a>
                      </div>
                      
                      {doctor.bio && (
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                          {doctor.bio}
                        </p>
                      )}

                      {doctor.availability && doctor.availability.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {doctor.availability.map((time, tIdx) => (
                            <span key={tIdx} className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded-md">
                              {time}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
