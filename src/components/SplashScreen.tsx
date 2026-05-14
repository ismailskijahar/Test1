import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  // This is a controlled visibility splash, usually you'd wrap your app or show it during early auth loading
  // For the sake of the request, I'll make it self-contained for the "initial boot" feel
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-[#2B2D42] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Atmospheric Background Lights */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-coral/10 rounded-full blur-[120px]" 
          />
          <motion.div 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-indigo/10 rounded-full blur-[120px]" 
          />

          <div className="relative flex flex-col items-center gap-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Logo theme="dark" size="lg" />
            </motion.div>

            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
              className="h-0.5 w-48 bg-gradient-to-r from-transparent via-brand-coral/50 to-transparent"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 1, delay: 1 }}
              className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40"
            >
              Management Systems
            </motion.p>
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-4">
             <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1, 
                      repeat: Infinity, 
                      delay: i * 0.2 
                    }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                ))}
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
