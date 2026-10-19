'use client';
import Link from "next/link";
import { useLanguage } from '@/components/providers/LanguageProvider';
import { LanguageSelect } from './LanguageSelect';
import { sharedMessages } from '@/lib/i18n/shared-messages';

export function Footer() {
    const { locale } = useLanguage();
    const text = sharedMessages[locale];
    return (
        <footer className="bg-black text-white py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-4">POTATA</h3>
                    <p className="text-gray-400 text-sm">
                        {text.footerIntro}<br />{text.footerExperience}
                    </p>
                </div>

                <div>
                    <h4 className="font-bold mb-4">{text.shop}</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><Link href="/shop" className="hover:text-white">{text.newArrivals}</Link></li>
                        <li><Link href="/ranking" className="hover:text-white">{text.bestSellers}</Link></li>
                        <li><Link href="/category" className="hover:text-white">{text.modestWear}</Link></li>
                    </ul>
                </div>

            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/10 text-center text-xs text-gray-400">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span>© 2024 POTATA. {text.rights}</span>
                  <LanguageSelect />
                </div>
            </div>
        </footer>
    );
}
