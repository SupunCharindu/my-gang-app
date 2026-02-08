'use client'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'

export default function SplashScreen({ finishLoading }) {
  
  // ★ අලුත් කොටස: තත්පර 3කින් ස්ප්ලෑෂ් එක අනිවාර්යයෙන්ම නවත්තනවා
  useEffect(() => {
    const timer = setTimeout(() => {
      finishLoading()
    }, 3000) // 3000ms = 3 Seconds

    return () => clearTimeout(timer)
  }, [finishLoading])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center"
    >
      <div className="relative flex flex-col items-center">
        
        {/* ICON */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: "spring" }}
          className="mb-6 relative"
        >
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
          <div className="relative w-24 h-24 border-4 border-white/10 bg-white/5 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 backdrop-blur-sm">
             <Home size={48} className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          </div>
        </motion.div>

        {/* TEXT */}
        <div className="text-center space-y-2 overflow-hidden">
            <motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-5xl md:text-6xl font-black text-white tracking-tighter"
                style={{ fontFamily: 'sans-serif' }}
            >
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                    අපේ ගෙදර
                </span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-gray-400 text-xs font-medium tracking-[0.5em] uppercase"
            >
                EST. 2024
            </motion.p>
        </div>

        {/* LOADING BAR */}
        <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 200 }}
            transition={{ delay: 0.5, duration: 2.5 }}
            className="h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mt-12"
        />

      </div>
    </motion.div>
  )
}