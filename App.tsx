import React, { useState, useRef, useEffect } from 'react';
import { BeadData, Tab, ImageAnalysisResult, BeadEcho, CoreBead } from './types';
import { analyzeImageForBead, generateReflectionQuestions } from './services/geminiService';
import { GrainOverlay } from './components/GrainOverlay';
import { NeumorphicButton } from './components/NeumorphicButton';
import { Bead } from './components/Bead';
import { Plus, Mic, Image as ImageIcon, Disc, Grid, Sparkles, X, Loader2, Camera, Infinity, ChevronLeft, StopCircle, Play, Pause, Trash2, Pencil, UploadCloud, User, RefreshCw, Check } from 'lucide-react';

// Initial Mock Data
const INITIAL_BEADS: BeadData[] = [
  {
    id: '1',
    imageUrl: 'https://picsum.photos/id/102/300/300',
    title: 'Raspberry Summer',
    prompt: 'Do you remember the taste of the first berry?',
    userStory: 'We used to pick these in the backyard until our fingers were stained red. My sister always ate more than she collected.',
    date: 'Jun 15',
    dominantColor: '#e89da2',
    shape: '45% 55% 40% 60% / 50% 60% 40% 50%',
    type: 'scanned',
    echoQuestions: [
      "Can you describe the smell of the backyard?",
      "What sound do you remember most from that day?",
      "Did this become a tradition?"
    ],
    additionalImages: [],
    echoes: [],
    audioUrl: 'mock_audio_url'
  },
  {
    id: '2',
    imageUrl: 'https://picsum.photos/id/160/300/300',
    title: 'Old Screen',
    prompt: 'What was the first message you sent?',
    userStory: 'I went to climb soho building when I was in middle school. It felt like the tallest place on earth.',
    date: 'Jan 20',
    dominantColor: '#a8c2d1',
    shape: '60% 40% 55% 45% / 40% 50% 50% 60%',
    type: 'scanned',
    echoQuestions: [
       "Do you have a photo of the place or anything that visually captures it?",
       "Did this experience change anything about how you saw yourself?",
       "Was there anyone there who tried to stop you?"
    ],
    additionalImages: [],
    echoes: []
  },
];

const DAILY_PROMPT_BEAD: BeadData = {
  id: 'daily-1',
  title: 'Morning Light',
  prompt: 'What is a small moment of peace you found today?',
  date: 'Today',
  dominantColor: '#f3e5ab',
  shape: '50% 50% 50% 50% / 50% 50% 50% 50%', // Perfect circle initially
  type: 'daily',
  isDraft: true,
  echoQuestions: [
    "Where were you standing?",
    "What was the light touching?",
    "Why did this moment stand out?"
  ],
  echoes: []
};

// --- Helper Component: Mini Audio Player ---
const MiniAudioPlayer = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup when src changes
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
    }
    setIsPlaying(false);
    
    return () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [src]);

  const togglePlay = () => {
    if (src === 'mock_audio_url') {
      // Simulation for prototype initial data
      if (isPlaying) {
          setIsPlaying(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
          setIsPlaying(true);
          // Simulate end after 3s
          timeoutRef.current = window.setTimeout(() => setIsPlaying(false), 3000);
      }
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
      
      // Error handling for playback
      audioRef.current.onerror = (e) => {
          // Fix: Type assertion for Event to avoid 'target' on string error
          const target = (e as Event).target as HTMLAudioElement;
          const err = target?.error;
          console.error("Audio playback error:", err?.message, err?.code);
          setIsPlaying(false);
          alert("Could not play audio. Format may not be supported.");
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
          playPromise.catch(e => {
              console.error("Audio play() failed:", e);
              setIsPlaying(false);
          });
      }
    }
  };

  return (
    <button
      onClick={togglePlay}
      className="flex items-center gap-3 px-4 py-2 bg-gray-100/80 border border-gray-200 rounded-2xl hover:bg-gray-200/80 transition-colors w-max mb-4 shadow-sm group"
    >
      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white transition-colors ${isPlaying ? 'bg-gray-800' : 'bg-gray-600 group-hover:bg-gray-700'}`}>
        {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
      </div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">
            {isPlaying ? 'Playing...' : 'Voice Note'}
        </span>
        {/* Fake waveform visual */}
        <div className="flex gap-[2px] items-center h-3">
            {[...Array(12)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-[2px] bg-gray-400 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'h-1'}`} 
                    style={{ 
                        height: isPlaying ? `${Math.max(4, Math.random() * 12)}px` : '3px', 
                        animationDelay: `${i * 0.05}s`,
                        opacity: isPlaying ? 0.8 : 0.4 
                    }} 
                />
            ))}
        </div>
      </div>
    </button>
  );
};

// --- Helper Functions ---

const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/aac'
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
};

// --- Helper Component: Expand Modal ---
interface ExpandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, text: string, images: string[], audio: string | undefined) => void;
  title?: string;
  initialData?: {
    title?: string;
    text: string;
    images: string[];
    audio?: string;
  };
  mode?: 'edit' | 'echo';
  isDraft?: boolean;
}

const ExpandModal: React.FC<ExpandModalProps> = ({ isOpen, onClose, onSave, title = "Expand Memory", initialData, mode = 'echo', isDraft = false }) => {
  const [localTitle, setLocalTitle] = useState('');
  const [localText, setLocalText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [localImages, setLocalImages] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const mimeTypeRef = useRef<string>('');

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
        setLocalTitle(initialData?.title || '');
        setLocalText(initialData?.text || '');
        setLocalImages(initialData?.images || []);
        setRecordedBlobUrl(initialData?.audio || null);
        setIsRecording(false);
    }
  }, [isOpen, initialData]);

  const handleRecordingToggle = async () => {
      if (isRecording) {
          // Stop Recording
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          // Start Recording
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              
              // Explicitly choose supported mime type
              const preferredType = getSupportedMimeType();
              const options = preferredType ? { mimeType: preferredType } : undefined;
              
              const recorder = new MediaRecorder(stream, options);
              
              // CRITICAL: Capture the actual MIME type the recorder is using.
              // Browsers might ignore 'options' or use a default if preferredType is empty.
              mimeTypeRef.current = recorder.mimeType;

              chunksRef.current = [];

              recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) chunksRef.current.push(e.data);
              };

              recorder.onstop = () => {
                  try {
                      // Use the ACTUAL mime type used during recording to create the Blob
                      const type = mimeTypeRef.current || 'audio/webm';
                      const blob = new Blob(chunksRef.current, { type });
                      const url = URL.createObjectURL(blob);
                      setRecordedBlobUrl(url);
                  } catch (e) {
                      console.error("Error creating audio blob:", e);
                  }
                  
                  // Stop all tracks to release mic
                  stream.getTracks().forEach(track => track.stop());
              };

              recorder.start();
              mediaRecorderRef.current = recorder;
              setIsRecording(true);
              setRecordedBlobUrl(null); 
          } catch (err) {
              console.error("Microphone access failed:", err);
              alert("Could not access microphone. Please check permissions.");
          }
      }
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const reader = new FileReader();
          reader.onload = () => setLocalImages(prev => [...prev, reader.result as string]);
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const removeImage = (index: number) => {
      setLocalImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAction = () => {
      onSave(localTitle, localText, localImages, recordedBlobUrl || undefined);
      onClose();
  };

  if (!isOpen) return null;

  // Dynamic button label
  let saveLabel = "Save";
  if (isDraft) {
      saveLabel = mode === 'edit' ? "Update Draft" : "Confirm to Collection";
  } else {
      saveLabel = mode === 'edit' ? "Save Changes" : "Add Echo";
  }

  return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-clay rounded-3xl p-6 shadow-2xl animate-slide-up flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-gray-300 pb-4">
                  <h3 className="font-serif text-xl text-gray-700">{title}</h3>
                  <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                      <X size={20} />
                  </button>
              </div>

              {/* Title Input - Only show in Edit mode */}
              {mode === 'edit' && (
                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Title</label>
                     <input 
                        type="text"
                        value={localTitle}
                        onChange={(e) => setLocalTitle(e.target.value)}
                        className="w-full bg-white/50 rounded-xl p-3 text-gray-800 font-serif font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Memory Title"
                     />
                  </div>
              )}

              {/* Text Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">
                    {mode === 'echo' && !isDraft ? "Your Echo" : "Story"}
                </label>
                <textarea 
                    className="w-full h-32 bg-white/50 rounded-xl p-4 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder={mode === 'echo' && !isDraft ? "Add a new layer to this memory..." : "Write your story..."}
                    value={localText}
                    onChange={(e) => setLocalText(e.target.value)}
                />
              </div>

              {/* Media Controls */}
              <div className="flex gap-4 h-16">
                  {/* Audio Control */}
                  {recordedBlobUrl ? (
                      <div className="flex-1 flex gap-2">
                           <button 
                               onClick={() => setRecordedBlobUrl(null)} 
                               className="h-full px-4 bg-red-100 text-red-600 rounded-2xl border border-red-200 flex items-center justify-center hover:bg-red-200"
                               title="Delete Recording"
                           >
                               <Trash2 size={20} />
                           </button>
                           <div className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden">
                                <div className="scale-75 origin-center">
                                    <MiniAudioPlayer src={recordedBlobUrl} />
                                </div>
                           </div>
                      </div>
                  ) : (
                      <button 
                        onClick={handleRecordingToggle}
                        className={`flex-1 flex items-center justify-center gap-2 h-full rounded-2xl transition-all ${isRecording ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {isRecording ? <StopCircle /> : <Mic size={20} />}
                        <span className="text-xs font-bold">{isRecording ? 'Stop Recording' : 'Record Audio'}</span>
                      </button>
                  )}

                  {/* Photo Control */}
                  <button 
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 h-full rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                      <ImageIcon size={20} />
                      <span className="text-xs font-bold">Add Photo</span>
                  </button>
              </div>

              {/* Image Preview */}
              {localImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                      {localImages.map((img, idx) => (
                          <div key={idx} className="relative shrink-0 group">
                              <img src={img} className="w-16 h-16 rounded-lg object-cover border border-white" alt="preview" />
                              <button 
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50"
                              >
                                  <X size={12} className="text-red-500" />
                              </button>
                              {mode === 'edit' && idx === 0 && (
                                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 rounded-b-lg">Cover</span>
                              )}
                          </div>
                      ))}
                  </div>
              )}

              <NeumorphicButton 
                  variant="black" 
                  label={saveLabel} 
                  onClick={handleSaveAction} 
                  className="w-full !rounded-full shadow-lg"
              />

              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageAdd} />
          </div>
      </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('echo');
  const [beads, setBeads] = useState<BeadData[]>(INITIAL_BEADS);
  const [dailyBead, setDailyBead] = useState<BeadData>(DAILY_PROMPT_BEAD);
  
  // Daily Queue from JSON Import
  const [dailyQueue, setDailyQueue] = useState<BeadData[]>([]);
  const [rawImportData, setRawImportData] = useState<CoreBead[] | null>(null);
  const [playerSelectOptions, setPlayerSelectOptions] = useState<string[]>([]);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  
  // Collection View State
  const [selectedCollectionBeadId, setSelectedCollectionBeadId] = useState<string | null>(null);
  
  // Echo Tab Specifics
  const [echoQuestionIndex, setEchoQuestionIndex] = useState(0);
  const [isQuestionFading, setIsQuestionFading] = useState(false);
  
  // Modal State
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'echo' | 'edit'>('echo');

  // Creation State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [tempAnalysis, setTempAnalysis] = useState<ImageAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Computed Active Bead Logic
  // Echo Tab: Always checks dailyQueue[0] or fallback dailyBead
  // Collection Popover: Checks beads.find(id)
  const queueHead = dailyQueue.length > 0 ? dailyQueue[0] : null;
  const collectionBead = selectedCollectionBeadId ? beads.find(b => b.id === selectedCollectionBeadId) : null;
  
  // Determine which bead controls the question rotation
  const rotatingBead = activeTab === 'echo' ? (queueHead || dailyBead) : collectionBead;
  const activeModalBead = selectedCollectionBeadId ? collectionBead : (queueHead || dailyBead);

  // --- Effects ---

  // Rotate Echo Questions
  useEffect(() => {
    if (!rotatingBead || isExpandModalOpen) return;

    const interval = setInterval(() => {
      setIsQuestionFading(true);
      setTimeout(() => {
        setEchoQuestionIndex(prev => {
          const questions = rotatingBead.echoQuestions || [];
          return (prev + 1) % (questions.length || 1);
        });
        setIsQuestionFading(false);
      }, 500); 
    }, 7000); 

    return () => clearInterval(interval);
  }, [rotatingBead, isExpandModalOpen]);

  // Generate Questions if missing
  useEffect(() => {
    const checkAndGenerate = async (bead: BeadData, isQueue: boolean) => {
        if (bead.userStory && (!bead.echoQuestions || bead.echoQuestions.length === 0)) {
            const questions = await generateReflectionQuestions(bead.userStory, bead.title);
            if (isQueue) {
                 setDailyQueue(prev => prev.map(b => b.id === bead.id ? { ...b, echoQuestions: questions } : b));
                 if (bead.id === dailyBead.id) setDailyBead(prev => ({ ...prev, echoQuestions: questions }));
            } else {
                 setBeads(prev => prev.map(b => b.id === bead.id ? { ...b, echoQuestions: questions } : b));
            }
        }
    };

    if (activeTab === 'echo') {
        if (queueHead) checkAndGenerate(queueHead, true);
        else checkAndGenerate(dailyBead, true);
    } else if (collectionBead) {
        checkAndGenerate(collectionBead, false);
    }
  }, [activeTab, queueHead, dailyBead, collectionBead]);

  // --- Helpers ---

  const getRandomShape = () => {
    const r = () => Math.floor(Math.random() * 20) + 40; 
    return `${r()}% ${100-r()}% ${r()}% ${100-r()}% / ${r()}% ${r()}% ${100-r()}% ${100-r()}%`;
  };

  const getPastelColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  // --- Import Logic ---

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string) as CoreBead[];
          if (Array.isArray(json)) {
            setRawImportData(json);
            const players = Array.from(new Set(json.map(b => b.playerId)));
            if (players.length > 1) {
               setPlayerSelectOptions(players);
               setShowPlayerSelect(true);
            } else if (players.length === 1) {
               importBeadsForPlayer(players[0], json);
            } else {
               alert("No valid player data found in JSON.");
            }
          }
        } catch (err) {
          console.error("Invalid JSON", err);
          alert("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const importBeadsForPlayer = (playerId: string, dataOverride?: CoreBead[]) => {
    const sourceData = dataOverride || rawImportData;
    if (!sourceData) return;

    const filtered = sourceData.filter(b => b.playerId === playerId && b.type === 'STORY');
    
    const newQueue: BeadData[] = filtered.map(core => ({
        id: `daily-${core.id}`,
        type: 'daily',
        title: core.keyword || "Imported Memory",
        prompt: core.storySnippet || "What else do you remember?",
        userStory: core.fullStory,
        date: new Date(core.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        dominantColor: getPastelColor(),
        shape: getRandomShape(),
        isDraft: true,
        echoQuestions: [],
        echoes: [],
        audioUrl: core.audioUrl,
        additionalImages: core.images || [],
        imageUrl: core.images?.[0] || undefined
    }));

    setDailyQueue(newQueue);
    setShowPlayerSelect(false);
    setActiveTab('echo');
  };

  // --- Queue Logic ---

  const swapToNextDailyPrompt = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (dailyQueue.length <= 1) return;
    setDailyQueue(prev => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    setEchoQuestionIndex(0);
  };

  // --- Handlers ---

  const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    const base64Clean = base64Data.split(',')[1];
    const result = await analyzeImageForBead(base64Clean);
    setTempAnalysis(result);
    setIsAnalyzing(false);
  };

  const saveNewBead = () => {
    if (!capturedImage || !tempAnalysis) return;

    const newBead: BeadData = {
      id: Date.now().toString(),
      imageUrl: capturedImage,
      title: tempAnalysis.title,
      prompt: tempAnalysis.prompt,
      userStory: storyText,
      dominantColor: tempAnalysis.color,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      shape: getRandomShape(),
      type: 'scanned',
      echoQuestions: [],
      additionalImages: [],
      echoes: []
    };

    setBeads(prev => [newBead, ...prev]);
    resetCreation();
    setActiveTab('collection');
    // Open the new bead
    setSelectedCollectionBeadId(newBead.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setModalMode('edit');
      setIsExpandModalOpen(true);
  };

  const handleEcho = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setModalMode('echo'); // 'echo' here means adding Echo content or Finalizing draft
      setIsExpandModalOpen(true);
  };

  const handleSaveModal = (title: string, text: string, images: string[], audio: string | undefined) => {
      // Determine what we are editing
      const isCollectionMode = selectedCollectionBeadId !== null;
      const targetBead = isCollectionMode ? collectionBead : (queueHead || dailyBead);
      
      if (!targetBead) return;

      if (modalMode === 'edit') {
          // Editing existing content: 
          // First image in list becomes bead cover (imageUrl), rest are additional
          const newImageUrl = images.length > 0 ? images[0] : undefined;
          const newAdditionalImages = images.length > 1 ? images.slice(1) : [];

          const updatedBead = {
              ...targetBead,
              title: title,
              userStory: text,
              imageUrl: newImageUrl,
              additionalImages: newAdditionalImages,
              audioUrl: audio,
          };
          
          if (isCollectionMode) {
              setBeads(prev => prev.map(b => b.id === targetBead.id ? updatedBead : b));
          } else {
              // We are editing a draft in the queue
              if (queueHead) {
                  setDailyQueue(prev => prev.map(b => b.id === targetBead.id ? updatedBead : b));
              } else {
                  setDailyBead(updatedBead);
              }
          }
      } else {
          // 'Echo' Mode: Either finalizing a draft OR adding a blog entry
          if (targetBead.isDraft) {
             // Finalize Draft -> Collection
             // If user added images here (finalization), where do they go?
             // Prompt says: "if through echo, then it's added to the paper slip"
             // But usually for draft finalization we might want a cover image if none exists.
             // We will stick to the rule: Echo -> Paper slip (additionalImages).
             // However, if the bead has NO image, we might want to populate it.
             // Let's stick to the rule requested: images added here go to additionalImages/Echo.
             
             // Keep existing cover if any, append all new images to additional
             // Note: 'images' from modal contains ALL images currently in the modal inputs.
             // But in 'echo' mode, initialData doesn't pre-populate images usually, so 'images' are NEW images.
             
             const finalizedBead = {
                 ...targetBead,
                 title: title,
                 userStory: text, 
                 additionalImages: images.length > 0 ? [...(targetBead.additionalImages || []), ...images] : targetBead.additionalImages,
                 audioUrl: audio || targetBead.audioUrl,
                 isDraft: false,
                 shape: getRandomShape(),
                 date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                 echoes: [] 
             };

             setBeads(prev => [finalizedBead, ...prev]);
             
             // Remove from queue
             if (queueHead) {
                 setDailyQueue(prev => prev.filter(b => b.id !== targetBead.id));
             } else {
                 setDailyBead(prev => ({...prev, id: Date.now().toString(), isDraft: true, userStory: ''}));
             }
          } else {
              // Add Echo to existing Collection Bead
              const newEcho: BeadEcho = {
                  id: Date.now().toString(),
                  date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
                  text: text,
                  images: images,
                  audioUrl: audio
              };

              const updatedBead = {
                  ...targetBead,
                  echoes: [...(targetBead.echoes || []), newEcho],
              };
              
              setBeads(prev => prev.map(b => b.id === targetBead.id ? updatedBead : b));
          }
      }
  };

  const resetCreation = () => {
    setCapturedImage(null);
    setTempAnalysis(null);
    setStoryText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Renderers ---

  const renderBeadView = (bead: BeadData, isInteractiveQueue: boolean) => {
      const currentQuestion = bead.echoQuestions?.[echoQuestionIndex] || bead.prompt;
      const hasEchoes = bead.echoes && bead.echoes.length > 0;
      
      return (
        <div className="w-full flex flex-col items-center pb-24 relative">
             {/* Top Prompt */}
            <div className="w-full max-w-sm flex flex-col items-center space-y-2 z-10 animate-fade-in mt-4 shrink-0 px-4">
                <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-lg relative overflow-hidden transition-opacity duration-500">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <p className={`font-serif text-lg text-amber-50 text-center italic leading-relaxed drop-shadow-md transition-opacity duration-500 ${isQuestionFading ? 'opacity-0' : 'opacity-100'}`}>
                        "{currentQuestion}"
                    </p>
                </div>
            </div>

            {/* Bead Area */}
            <div className={`relative flex items-center justify-center w-full min-h-[180px] shrink-0 my-6`}>
                {/* Queue Shuffle Button - Only for Drafts Queue */}
                {isInteractiveQueue && dailyQueue.length > 1 && (
                    <button 
                        onClick={swapToNextDailyPrompt}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm group"
                        title="Skip to Next"
                    >
                        <RefreshCw size={20} className="text-white/70 group-hover:text-white" />
                    </button>
                )}

                <div className="relative group">
                    <Bead 
                        data={bead} 
                        size="xl" 
                        className="transform transition-transform duration-700 ease-in-out hover:scale-105"
                        onClick={() => handleEcho()}
                    />
                    
                    {/* Echo / Add Action */}
                    <button 
                        onClick={handleEcho}
                        className="absolute inset-0 flex items-center justify-center z-20 group cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center animate-pulse-soft shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all group-hover:bg-white/30 group-hover:scale-110">
                            <Plus className="text-white drop-shadow-md" size={24} strokeWidth={1.5} />
                        </div>
                    </button>
                </div>
            </div>

            {/* Title & Date (High Visibility) */}
            <div className="text-center mb-6">
                <h2 className="font-serif text-2xl text-amber-50 tracking-wide drop-shadow-lg">{bead.title}</h2>
                <p className="text-xs text-white/60 font-bold uppercase tracking-widest mt-1">{bead.date}</p>
            </div>

            {/* Story Paper */}
            <div className={`w-full max-w-md px-4 z-10 animate-slide-up transition-all duration-500`}>
                <div className={`bg-paper p-8 transform rotate-1 rounded-sm shadow-paper relative flex flex-col ${hasEchoes ? 'paper-stack' : ''}`}>
                    
                    {!hasEchoes && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-white/40 rotate-1 backdrop-blur-[1px] shadow-sm" />
                    )}
                    
                    <div className="w-full relative group/paper">
                        <button 
                            onClick={handleEdit}
                            className="absolute -top-4 -right-4 p-2 bg-white rounded-full shadow-md text-gray-400 hover:text-gray-700 hover:scale-105 transition-all opacity-0 group-hover/paper:opacity-100 z-20"
                            title="Edit Content"
                        >
                            <Pencil size={14} />
                        </button>

                        <div className="mb-6">
                            {bead.audioUrl && <MiniAudioPlayer src={bead.audioUrl} />}
                            {bead.userStory ? (
                                <p className="font-serif text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                                    {bead.userStory}
                                </p>
                            ) : (
                                <p className="font-serif text-gray-400 italic text-sm text-center">
                                    Tap the bead to write your story...
                                </p>
                            )}
                            {bead.additionalImages && bead.additionalImages.length > 0 && (
                                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                    {bead.additionalImages.map((src, i) => (
                                        <img key={i} src={src} className="w-16 h-16 object-cover rounded shadow-sm opacity-90 hover:opacity-100 transition-opacity" alt="memory" />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Echoes Feed */}
                        {hasEchoes && bead.echoes?.map((echo) => (
                            <div key={echo.id} className="pt-6 border-t border-gray-300/50 mt-2 relative animate-fade-in">
                                 <div className="flex items-center gap-3 mb-3">
                                    <div className="h-[1px] bg-gray-300 flex-1"></div>
                                    <h4 className="font-serif text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        Echo on {echo.date}
                                    </h4>
                                    <div className="h-[1px] bg-gray-300 flex-1"></div>
                                 </div>
                                 {echo.audioUrl && <MiniAudioPlayer src={echo.audioUrl} />}
                                 <p className="font-serif text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-4">
                                     {echo.text}
                                 </p>
                                 {echo.images && echo.images.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {echo.images.map((src, i) => (
                                            <img key={i} src={src} className="w-20 h-20 object-cover rounded shadow-sm" alt="echo-memory" />
                                        ))}
                                    </div>
                                 )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderEchoTab = () => {
    // Echo Tab is STRICTLY for the Queue/Drafts
    const beadToShow = queueHead;

    return (
      <div className="w-full h-full bg-wood relative flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar">
        {!beadToShow ? (
             // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 opacity-60">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center mb-6 animate-pulse">
                    <Check size={40} className="text-white/50" />
                </div>
                <h2 className="font-serif text-2xl text-white/80 mb-2">All Caught Up</h2>
                <p className="text-sm text-white/50 max-w-xs">No new echoes are calling right now...but a new one will drift your way when the time is right.</p>
            </div>
        ) : (
             renderBeadView(beadToShow, true)
        )}
      </div>
    );
  };

  const renderCollectionTab = () => (
    <div className="flex-1 flex flex-col bg-wood relative overflow-hidden">
       {/* Import Button */}
       <div className="absolute top-6 right-6 z-30">
           <button 
             onClick={() => jsonInputRef.current?.click()}
             className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white/80 hover:bg-white/20 transition-colors shadow-lg"
             title="Import Memories from Part 1"
           >
              <UploadCloud size={20} />
           </button>
           <input ref={jsonInputRef} type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
       </div>

       {/* Horizontal Scroll Area */}
       <div className="absolute inset-0 flex items-center overflow-x-auto no-scrollbar px-12 snap-x snap-mandatory">
          <div className="flex items-center gap-12 pr-24">
              {/* Header Card in Scroll */}
              <div className="snap-center shrink-0 w-64 h-80 flex flex-col justify-center items-start pl-8 text-white/90">
                   <h1 className="font-serif text-5xl italic mb-2 tracking-tighter text-amber-50">Memory<br/>Archive</h1>
                   <p className="text-xs uppercase tracking-[0.2em] text-white/60 border-l border-white/40 pl-4 py-1">
                       {beads.length} Stories Collected
                   </p>
              </div>

              {beads.map((bead) => (
                 <div key={bead.id} className="snap-center shrink-0 flex flex-col items-center gap-6 group">
                     <div className="relative">
                        <Bead 
                            data={bead} 
                            size="lg" 
                            onClick={(id) => setSelectedCollectionBeadId(id)} 
                            className="hover:scale-105 transition-transform duration-500"
                        />
                        {/* Connection Line */}
                        <div className="absolute top-1/2 left-full w-12 h-[2px] bg-white/10 -z-10" />
                     </div>
                     <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/90 text-xs tracking-wider font-bold">
                         {bead.title}
                     </div>
                 </div>
              ))}
              
              <div className="w-12 shrink-0" /> {/* Spacer */}
          </div>
       </div>
       
       {/* Background Line */}
       <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -z-10" />

       {/* Collection Detail Popup */}
       {selectedCollectionBeadId && collectionBead && (
           <div className="absolute inset-0 z-40 bg-wood/95 backdrop-blur-xl flex flex-col overflow-y-auto no-scrollbar animate-fade-in">
               <button 
                 onClick={() => setSelectedCollectionBeadId(null)}
                 className="fixed top-6 left-6 z-50 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
               >
                   <ChevronLeft size={24} />
               </button>
               {renderBeadView(collectionBead, false)}
           </div>
       )}
    </div>
  );

  const renderCreateTab = () => (
     <div className="flex-1 flex flex-col relative h-full bg-paper">
        <div className="pt-8 px-6 flex justify-between items-center z-20 shrink-0">
            <h2 className="font-serif text-2xl text-gray-800">New Story Bead</h2>
            {capturedImage && (
                <button onClick={resetCreation} className="p-2 bg-white rounded-full shadow-md hover:scale-95 transition-transform">
                    <X size={18} className="text-gray-500" />
                </button>
            )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-evenly p-6 gap-4 z-10">
           <div className="relative w-full max-w-xs aspect-square flex items-center justify-center max-h-[40vh]">
              {capturedImage ? (
                  <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
                      <div 
                        className="w-[80%] aspect-square shadow-2xl transition-all duration-1000"
                        style={{
                            borderRadius: tempAnalysis ? getRandomShape() : '50%',
                            backgroundColor: tempAnalysis?.color || '#e0e5ec',
                            transform: isAnalyzing ? 'scale(0.9) rotate(5deg)' : 'scale(1) rotate(0deg)'
                        }}
                      >
                         <img 
                            src={capturedImage} 
                            className="w-full h-full object-cover mix-blend-overlay opacity-80 rounded-[inherit]" 
                            alt="Captured" 
                         />
                      </div>
                      
                      {isAnalyzing && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                              <div className="bg-black/80 text-white px-4 py-2 rounded-full text-xs tracking-widest flex items-center gap-2 backdrop-blur-md">
                                  <Loader2 size={12} className="animate-spin" />
                                  ANALYZING...
                              </div>
                          </div>
                      )}

                      {!isAnalyzing && tempAnalysis && (
                          <div className="absolute -bottom-8 left-0 right-0 text-center animate-slide-up">
                              <h3 className="font-serif text-xl text-gray-800">{tempAnalysis.title}</h3>
                          </div>
                      )}
                  </div>
              ) : (
                  <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-64 h-64 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group cursor-pointer active:scale-95 transition-transform bg-white/50"
                  >
                      <Camera size={32} className="text-gray-300" />
                  </div>
              )}
           </div>
        </div>

        <div className="pb-8 pt-6 px-8 bg-white/80 backdrop-blur-md rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-white/60 flex flex-col items-center gap-6 z-20 shrink-0">
            {!capturedImage ? (
                <>
                   <NeumorphicButton 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full max-w-xs !rounded-full !py-5 shadow-xl bg-gray-900 text-white"
                      variant="black"
                      label="Capture Object"
                      icon={<Camera size={20} />}
                   />
                </>
            ) : (
                !isAnalyzing && tempAnalysis && (
                    <div className="w-full max-w-xs flex flex-col gap-4 animate-fade-in">
                        <textarea 
                            className="w-full h-20 bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 resize-none focus:outline-none shadow-inner border border-gray-100"
                            placeholder="Add your story note..."
                            value={storyText}
                            onChange={(e) => setStoryText(e.target.value)}
                        />
                        <NeumorphicButton 
                            onClick={saveNewBead}
                            variant="black"
                            label="Save to Collection"
                            className="w-full !rounded-full"
                        />
                    </div>
                )
            )}
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileCapture} />
     </div>
  );

  // Setup modal props dynamically
  return (
    <div className="w-full h-[100dvh] font-sans bg-clay text-gray-600 overflow-hidden flex flex-col">
      <GrainOverlay />
      
      {/* Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'collection' && renderCollectionTab()}
        {activeTab === 'echo' && renderEchoTab()}
        {activeTab === 'create' && renderCreateTab()}
        
        {/* Modal Overlay */}
        <ExpandModal 
            isOpen={isExpandModalOpen} 
            onClose={() => setIsExpandModalOpen(false)} 
            onSave={handleSaveModal}
            title={modalMode === 'edit' ? "Edit Content" : (activeModalBead?.isDraft ? "Reflect & Finalize" : "Add Echo")}
            initialData={modalMode === 'edit' && activeModalBead ? {
                title: activeModalBead.title,
                text: activeModalBead.userStory || '',
                // Combine imageUrl (main) and additionalImages (paper) so they can be edited together
                images: activeModalBead.imageUrl 
                    ? [activeModalBead.imageUrl, ...(activeModalBead.additionalImages || [])]
                    : (activeModalBead.additionalImages || []),
                audio: activeModalBead.audioUrl
            } : undefined}
            mode={modalMode}
            isDraft={activeModalBead?.isDraft}
        />
        
        {/* Player Selection Modal */}
        {showPlayerSelect && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-up">
                    <h3 className="font-serif text-xl mb-6 text-center text-gray-800">Select Player</h3>
                    <div className="flex flex-col gap-3">
                        {playerSelectOptions.map(pid => (
                            <button
                                key={pid}
                                onClick={() => importBeadsForPlayer(pid)}
                                className="p-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-4 text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center group-hover:bg-gray-400 text-white">
                                    <User size={20} />
                                </div>
                                <span className="font-bold text-gray-600 truncate flex-1">Player {pid.substring(0, 8)}...</span>
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowPlayerSelect(false)}
                        className="mt-6 w-full py-3 text-sm text-gray-500 hover:text-gray-800"
                    >
                        Cancel Import
                    </button>
                </div>
            </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`h-20 z-50 flex justify-around items-center pb-4 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t transition-colors duration-300 ${activeTab === 'create' ? 'bg-white border-gray-100' : 'bg-wood border-white/10'}`}>
          <NavButton 
            active={activeTab === 'collection'} 
            onClick={() => setActiveTab('collection')} 
            icon={<Grid size={22} />} 
            label="Archive" 
            theme={activeTab === 'create' ? 'light' : 'dark'}
          />
          <NavButton 
            active={activeTab === 'echo'} 
            onClick={() => { setActiveTab('echo'); setSelectedCollectionBeadId(null); }} 
            icon={<Infinity size={26} />} 
            label="Echo"
            className="scale-100" 
            theme={activeTab === 'create' ? 'light' : 'dark'}
          />
          <NavButton 
            active={activeTab === 'create'} 
            onClick={() => setActiveTab('create')} 
            icon={<Disc size={22} />} 
            label="Create" 
            theme={activeTab === 'create' ? 'light' : 'dark'}
          />
      </nav>
    </div>
  );
}

// Nav Button Helper
const NavButton = ({ active, onClick, icon, label, className = '', theme = 'light' }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, className?: string, theme?: 'light' | 'dark' }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
        theme === 'dark' 
            ? (active ? 'text-white' : 'text-white/40 hover:text-white/60') 
            : (active ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600')
    } ${className}`}
  >
    <div className={`p-3 rounded-2xl transition-all duration-300 ${active ? (theme === 'dark' ? 'bg-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]' : 'bg-clay shadow-neumorph-inset') : ''}`}>
       {icon}
    </div>
    <span className={`text-[10px] font-bold tracking-wider ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);