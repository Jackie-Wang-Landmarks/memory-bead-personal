import React from 'react';
import { BeadData } from '../types';

interface BeadProps {
  data: BeadData;
  onClick?: (id: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Bead: React.FC<BeadProps> = ({ data, onClick, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',  // Reduced from w-64
    xl: 'w-56 h-56',  // Reduced from w-80 for Echo view
  };

  const isGhost = !data.imageUrl && data.type === 'daily';

  return (
    <div 
      className={`flex flex-col items-center gap-4 cursor-pointer group transition-transform duration-500 ${onClick ? 'active:scale-95' : ''} ${className}`}
      onClick={(e) => {
          e.stopPropagation();
          onClick && onClick(data.id);
      }}
    >
      <div 
        className={`relative ${sizeClasses[size]} overflow-hidden transition-all duration-700 ease-in-out shadow-bead transform-gpu z-0`}
        style={{
          borderRadius: data.shape,
          backgroundColor: data.dominantColor,
          border: isGhost ? '2px dashed rgba(163,177,198, 0.5)' : '4px solid rgba(255,255,255,0.2)',
        }}
      >
        {/* Content Layer */}
        {data.imageUrl ? (
          <img 
            src={data.imageUrl} 
            alt={data.title}
            className="w-full h-full object-cover opacity-90 mix-blend-overlay transition-transform duration-700 group-hover:scale-110 will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30 bg-gradient-to-br from-white via-transparent to-black/10">
             {/* Abstract pattern for ghost beads */}
             <div className="w-1/2 h-1/2 rounded-full border-2 border-gray-400/30 animate-pulse" />
          </div>
        )}
        
        {/* Glassy Highlights */}
        {!isGhost && (
          <>
            <div className="absolute top-[10%] left-[15%] w-[30%] h-[20%] bg-gradient-to-br from-white to-transparent opacity-40 rounded-full blur-md pointer-events-none" />
            <div className="absolute bottom-[10%] right-[15%] w-[25%] h-[25%] bg-black opacity-10 rounded-full blur-xl pointer-events-none" />
          </>
        )}
      </div>
      
      {size !== 'xl' && (
        <div className="flex flex-col items-center opacity-80 group-hover:opacity-100 transition-opacity text-center">
           <span className="font-serif text-xs font-bold text-gray-700 tracking-widest truncate max-w-[100px]">{data.title}</span>
           <span className="text-[10px] text-gray-500">{data.date}</span>
        </div>
      )}
    </div>
  );
};