import React from 'react';
import { Code, Mail, Phone, User, ExternalLink, ShieldCheck, Heart } from 'lucide-react';
import ukraineCoatOfArms from '../../assets/ukraine-coat-of-arms.svg';
import { useSettings } from '../../contexts/SettingsContext';

const AboutPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();
  const appVersion = settings?.appVersion || __APP_VERSION__;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-white p-4 md:p-8">
      {/* Decorative background elements */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-50/50 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
      
      {/* Repeating Ornament Pattern (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l5 5h-10l5-5zM0 20l5-5v10l-5-5zM40 20l-5 5v-10l5 5zM20 40l-5-5h10l-5 5zM20 20l5 5h-10l5-5z' fill='%230057B7' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '40px 40px'
      }} />

      <div className="relative mx-auto max-w-3xl">
        {/* Header Section */}
        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0057B7] to-[#00428A] text-4xl font-bold text-white shadow-2xl transition-transform hover:scale-105">
                S
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD700] shadow-md">
                <ShieldCheck size={16} className="text-[#0057B7]" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900 md:text-5xl">
                SADOK <span className="text-sm font-normal text-gray-400">PRO</span>
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  v{appVersion}
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <Heart size={14} className="fill-red-500 text-red-500" />
                  Made with love in Ukraine
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <img
              src={ukraineCoatOfArms}
              alt="Малий Державний Герб України"
              className="h-16 w-auto opacity-95 transition-opacity hover:opacity-100 drop-shadow-xl"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Studio Info */}
          <div className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white/60 p-8 shadow-xl backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-2xl md:col-span-2">
            <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-[#0057B7] via-[#FFD700] to-[#0057B7]" />
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
              <Code size={24} className="text-blue-600" />
              Про студію
            </h3>
            <p className="text-lg leading-relaxed text-gray-600">
              <strong className="text-blue-700">Osipix Studio</strong> — це незалежна команда українських розробників. 
              Ми спеціалізуємось на створенні високотехнологічних рішень для автоматизації освіти та соціальної сфери. 
              SADOK — наш ключовий продукт, створений для підтримки українських закладів дошкільної освіти.
            </p>
          </div>

          {/* Developer Card */}
          <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
              <User size={20} className="text-[#0057B7]" />
              Розробка та архітектура
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-gray-800">Eduard Osipov</p>
                <p className="text-sm font-medium text-blue-600/80 uppercase tracking-wider">Lead Developer & Founder</p>
              </div>
              <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
                <a href="mailto:edosipov@gmail.com" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail size={16} /> edosipov@gmail.com
                </a>
                <a href="tel:+380675694704" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Phone size={16} /> +380 67 569 47 04
                </a>
              </div>
            </div>
          </div>

          {/* Social/Links Card */}
          <div className="group rounded-3xl border border-gray-100 bg-gradient-to-br from-[#0057B7] to-[#00428A] p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-white">
              <ExternalLink size={20} />
              Офіційні ресурси
            </h3>
            <div className="space-y-3">
              <button className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20">
                Технічна підтримка <span>→</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20">
                Сайт студії <span>→</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20">
                Документація (Wiki) <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>© {currentYear} Osipix Studio. Всі права захищені.</p>
          <p className="mt-1">Слава Україні! 🇺🇦</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
