import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentTab: (tab: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, setCurrentTab }) => {
  const { user, role } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [speechStatus, setSpeechStatus] = useState<string>('Press the microphone and speak a command.');

  // Text to Speech
  const speakText = (text: string, lang: 'en' | 'hi' = language) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Screen Readback helper
  const handleReadback = () => {
    if (language === 'hi') {
      if (role === 'farmer') {
        speakText(
          `नमस्ते ${user?.name || 'किसान साथी'}। फार्मडायरेक्ट पोर्टल में आपका स्वागत है। आप अपने फसल की लिस्टिंग, मंडी के भाव और अपने भुगतान की स्थिति देख सकते हैं।`,
          'hi'
        );
      } else {
        speakText(
          'नमस्ते। फार्मडायरेक्ट मंडी में ताजी फसल सीधे किसानों से उपलब्ध है। सभी भुगतान एस्क्रो खाते में सुरक्षित रहते हैं।',
          'hi'
        );
      }
    } else {
      if (role === 'farmer') {
        speakText(
          `Hello ${user?.name || 'Farmer'}. Welcome to your FarmDirect Portal. You can manage your crop listings, check APMC Mandi benchmark prices, and view your settled payouts ledger.`,
          'en'
        );
      } else {
        speakText(
          'Welcome to FarmDirect Marketplace. Browse fresh farm harvests directly from verified regional growers, with guaranteed escrow payment protection.',
          'en'
        );
      }
    }
  };

  // Speech Recognition listener
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechStatus('Web Speech API is not supported in this browser. You can still use the audio readback!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus('Listening... Speak your command now.');
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript.toLowerCase();
        setTranscript(text);
        processCommand(text);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setSpeechStatus(`Error: ${event.error || 'Could not understand audio'}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setSpeechStatus(`Voice error: ${err.message}`);
    }
  };

  // Command Parser
  const processCommand = (cmd: string) => {
    if (cmd.includes('market') || cmd.includes('home') || cmd.includes('दुकान') || cmd.includes('बाजार')) {
      setCurrentTab('home');
      setSpeechStatus('Navigating to Marketplace.');
      speakText('Navigating to Marketplace');
      setTimeout(onClose, 1000);
    } else if (cmd.includes('order') || cmd.includes('ऑर्डर')) {
      if (role === 'farmer') {
        setCurrentTab('farmer-orders');
      } else {
        setCurrentTab('orders');
      }
      setSpeechStatus('Navigating to Orders.');
      speakText('Opening your orders');
      setTimeout(onClose, 1000);
    } else if (cmd.includes('produce') || cmd.includes('listing') || cmd.includes('फसल')) {
      setCurrentTab('farmer-produce');
      setSpeechStatus('Navigating to Produce Listings.');
      speakText('Opening produce listings');
      setTimeout(onClose, 1000);
    } else if (cmd.includes('payout') || cmd.includes('payment') || cmd.includes('भुगतान')) {
      setCurrentTab('farmer-payouts');
      setSpeechStatus('Navigating to Payouts Ledger.');
      speakText('Opening payouts ledger');
      setTimeout(onClose, 1000);
    } else if (cmd.includes('read') || cmd.includes('summary') || cmd.includes('सुनाओ')) {
      handleReadback();
    } else {
      setSpeechStatus(`Command "${cmd}" received. Try saying "Go to orders" or "Read summary".`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-center">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <h3 className="font-extrabold text-base">Voice Assistant</h3>
          </div>
          <p className="text-xs text-emerald-200">Kisan & Buyer Voice Navigator</p>

          {/* Language Toggle */}
          <div className="flex justify-center gap-1 mt-3">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                language === 'en' ? 'bg-white text-emerald-900' : 'bg-emerald-900/60 text-emerald-100'
              }`}
            >
              <Globe className="w-3 h-3" />
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                language === 'hi' ? 'bg-white text-emerald-900' : 'bg-emerald-900/60 text-emerald-100'
              }`}
            >
              <Globe className="w-3 h-3" />
              हिंदी (Hindi)
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center">
          
          {/* Animated Mic Button */}
          <button
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 mb-4 shadow-xl ${
              isListening
                ? 'bg-rose-600 text-white ring-8 ring-rose-200 scale-110 animate-pulse'
                : 'bg-emerald-700 text-white hover:bg-emerald-800 hover:scale-105'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          <p className="text-xs font-semibold text-stone-700 min-h-[36px] flex items-center justify-center px-4">
            {speechStatus}
          </p>

          {transcript && (
            <div className="mt-2 p-2 bg-stone-100 rounded-lg text-xs font-mono text-stone-800">
              "{transcript}"
            </div>
          )}

          {/* Quick Voice Commands */}
          <div className="mt-5 w-full text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2 text-center">
              Supported Commands
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <span className="px-2 py-1 bg-stone-100 rounded text-[11px] text-stone-700">"Go to orders"</span>
              <span className="px-2 py-1 bg-stone-100 rounded text-[11px] text-stone-700">"Go to produce"</span>
              <span className="px-2 py-1 bg-stone-100 rounded text-[11px] text-stone-700">"Go to payouts"</span>
              <span className="px-2 py-1 bg-stone-100 rounded text-[11px] text-stone-700">"Marketplace"</span>
            </div>
          </div>

          {/* Audio Readback Trigger */}
          <button
            onClick={handleReadback}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold text-xs hover:bg-emerald-100 transition"
          >
            <Volume2 className="w-4 h-4 text-emerald-700" />
            <span>Read Current Screen Aloud ({language === 'hi' ? 'हिंदी में' : 'English'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantModal;
