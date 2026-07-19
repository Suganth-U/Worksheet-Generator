import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export default function App() {
  const componentRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'worksheet',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [sentenceInput, setSentenceInput] = useState('The yellow sun shines.');
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);

  // Dynamic scaling for mobile, tablet, and PC
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 400) setScale(0.35);
      else if (width < 500) setScale(0.45);
      else if (width < 640) setScale(0.55);
      else if (width < 768) setScale(0.65);
      else if (width < 1024) setScale(0.75);
      else if (width < 1280) setScale(0.6); // Scale down on small laptops when side-by-side
      else if (width < 1440) setScale(0.75);
      else setScale(0.9);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [data, setData] = useState({
    sentence: 'The yellow sun shines.',
    colorWord: 'yellow',
    mainEmoji: '☀️',
    q1: 'What color is the sun?',
    q1Options: [
      { text: 'red', emoji: '🔴' },
      { text: 'yellow', emoji: '🟡' },
      { text: 'orange', emoji: '🟠' }
    ],
    q2: 'What do you see?',
    q2Options: [
      { text: 'moon', emoji: '🌙' },
      { text: 'star', emoji: '⭐' },
      { text: 'sun', emoji: '☀️' }
    ],
    q3: 'What does the sun do?',
    q3Options: [
      { text: 'hides', emoji: '☁️' },
      { text: 'shines', emoji: '✨' }
    ]
  });

  const generateWorksheet = async () => {
    if (!sentenceInput.trim()) {
      setError('Please enter a sentence.');
      return;
    }

    setIsGenerating(true);
    setError('');

    let resultText = '';
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      const prompt = `
      You are an expert worksheet creator for children with autism. 
      The user has provided a simple sentence: "${sentenceInput}".
      
      Generate a JSON response that maps to this exact structure:
      {
        "colorWord": "One key adjective or noun from the sentence to highlight in bold color",
        "mainEmoji": "One single emoji that represents the main subject of the sentence",
        "q1": "A multiple choice question about an adjective or color in the sentence",
        "q1Options": [
          {"text": "wrong option", "emoji": "single emoji"},
          {"text": "correct option", "emoji": "single emoji"},
          {"text": "wrong option", "emoji": "single emoji"}
        ],
        "q2": "A multiple choice question about the main subject (What do you see?)",
        "q2Options": [
          {"text": "wrong option", "emoji": "single emoji"},
          {"text": "correct option", "emoji": "single emoji"},
          {"text": "wrong option", "emoji": "single emoji"}
        ],
        "q3": "A multiple choice question about the action (What does it do?)",
        "q3Options": [
          {"text": "wrong option", "emoji": "single emoji"},
          {"text": "correct option", "emoji": "single emoji"},
          {"text": "wrong option", "emoji": "single emoji"}
        ]
      }
      
      CRITICAL: Ensure the response is ONLY valid JSON. Make sure options are randomized so the correct answer isn't always in the same spot. 
      For action questions (q3), use an emoji that makes sense for the subject (e.g., if a frog jumps, use a frog 🐸, not a kangaroo 🦘).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colorWord: { type: Type.STRING },
              mainEmoji: { type: Type.STRING },
              q1: { type: Type.STRING },
              q1Options: { 
                type: Type.ARRAY, 
                items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, emoji: { type: Type.STRING } } } 
              },
              q2: { type: Type.STRING },
              q2Options: { 
                type: Type.ARRAY, 
                items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, emoji: { type: Type.STRING } } } 
              },
              q3: { type: Type.STRING },
              q3Options: { 
                type: Type.ARRAY, 
                items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, emoji: { type: Type.STRING } } } 
              }
            }
          }
        }
      });

      resultText = response.text;
      const parsedData = JSON.parse(resultText);

      setData({
        sentence: sentenceInput,
        ...parsedData
      });

    } catch (err) {
      console.error("Full error:", err);
      console.error("Result Text was:", resultText);
      const errorMessage = (err.message || String(err)).toLowerCase();
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        setError('Token limit reached. Please try again after some time.');
      } else if (err instanceof SyntaxError) {
        setError(`JSON Error: ${err.message}. Raw text: ${resultText.substring(0, 100)}...`);
      } else {
        setError('Failed to create worksheet. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const words = data.sentence.split(' ').filter(w => w.length > 0);
  const colorWordIndex = words.findIndex(w => w.toLowerCase().replace(/[^a-z]/g, '') === data.colorWord.toLowerCase());

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans overflow-x-hidden selection:bg-gray-300">
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-16 xl:gap-8 items-start">
        
        {/* Editor Form - Clean Solid Design */}
        <div className="w-full xl:w-[350px] flex-shrink-0 flex flex-col gap-6 sticky top-8 z-10">
          
          <div className="text-center xl:text-left mb-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-black mb-2">
              Worksheet Creator
            </h1>
            <p className="text-gray-600 font-medium">Type a sentence to generate.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
            <div className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wider">Sentence</label>
                <textarea 
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-lg font-medium text-black outline-none focus:border-black focus:ring-0 transition-all resize-none placeholder:text-gray-400" 
                  rows="3"
                  placeholder="type the sentence"
                  value={sentenceInput} 
                  onChange={e => setSentenceInput(e.target.value)} 
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-bold flex items-center gap-2">
                  {error}
                </div>
              )}

              <button 
                onClick={generateWorksheet}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-6 py-4 rounded-xl font-bold text-lg transition-colors"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                {isGenerating ? 'Generating...' : 'Create Worksheet'}
              </button>
            </div>
          </div>

          <button 
            onClick={() => handlePrint()} 
            className="w-full bg-white border-2 border-black hover:bg-gray-50 text-black font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1"
          >
            <Printer size={22} /> 
            <span className="text-lg">Download PDF</span>
          </button>
        </div>

        {/* Scalable Live Preview */}
        <div className="w-full flex-1 flex justify-center pb-12 xl:pb-0">
          <div 
            className="relative flex justify-center w-full transition-all duration-300 ease-out" 
            style={{ height: `calc(${A4_HEIGHT_MM}mm * ${scale})` }}
          >
            <div 
              className="absolute top-0 origin-top transition-transform duration-300 ease-out print:!scale-100 print:!relative shadow-xl" 
              style={{ transform: `scale(${scale})` }}
            >
              
              {/* The Actual A4 Target */}
              <div 
                ref={componentRef} 
                className="bg-white overflow-hidden print:shadow-none box-border flex flex-col" 
                style={{ 
                  width: `${A4_WIDTH_MM}mm`, 
                  height: `${A4_HEIGHT_MM}mm`, 
                  padding: '12mm', 
                  fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif" 
                }}
              >
                <div className="w-full h-full text-black flex flex-col justify-between border-4 border-black">
                  
                  {/* Top Half: Sentence & Main Image | Read/Build/Write */}
                  <div className="flex border-b-4 border-black h-[48%] bg-white">
                    
                    {/* Left: Sentence & Main Image */}
                    <div className="w-[55%] border-r-4 border-black p-6 flex flex-col relative bg-[#F9F9F9]">
                      <h1 className="text-4xl font-medium tracking-wide leading-tight">
                        {words.map((word, i) => {
                          const isColorWord = i === colorWordIndex;
                          const exactColor = isColorWord ? data.colorWord.toLowerCase() : 'inherit';
                          return (
                            <span 
                              key={i} 
                              style={isColorWord ? { color: exactColor, fontWeight: 'bold' } : {}}
                            >
                              {word}{' '}
                            </span>
                          );
                        })}
                      </h1>
                      <div className="flex-grow flex items-center justify-center pb-4 relative min-h-[200px]">
                        <span id="emoji-fallback" style={{ fontSize: '130px' }} className="leading-none drop-shadow-md absolute inset-0 flex items-center justify-center">
                          {data.mainEmoji}
                        </span>
                        <img 
                          src={`https://image.pollinations.ai/prompt/${encodeURIComponent(data.sentence + ", extremely cute simple 2d flat vector illustration for kids, bold solid colors, white background, perfectly symmetrical, flawless, no deformed features, high quality educational clipart")}?width=400&height=400&nologo=true&model=flux`}
                          alt={data.sentence}
                          className="max-h-[300px] max-w-full object-contain rounded-xl shadow-sm border-2 border-gray-100 bg-white relative z-10 opacity-0 transition-opacity duration-500"
                          onLoad={(e) => {
                            e.target.style.opacity = '1';
                            const fallback = e.target.previousSibling;
                            if (fallback) fallback.style.display = 'none';
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.previousSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Read, Build, Write */}
                    <div className="w-[45%] flex flex-col bg-white">
                      {/* Read */}
                      <div className="border-b-4 border-black p-3 bg-white">
                        <p className="text-2xl font-medium">1. Read the sentence.</p>
                      </div>
                      
                      {/* Build */}
                      <div className="border-b-4 border-black p-3 flex-grow bg-white flex flex-col">
                        <p className="text-2xl font-medium mb-4">2. Build the sentence.</p>
                        <div className="flex gap-3 flex-wrap justify-center mt-auto mb-4">
                          {words.map((_, i) => (
                            <div key={i} className="w-20 h-20 border-[3px] border-gray-300 bg-white flex items-center justify-center shadow-sm">
                              <div className="w-12 h-8 border-2 border-dashed border-gray-300"></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Write */}
                      <div className="p-3 h-[35%] bg-white flex flex-col">
                        <p className="text-2xl font-medium mb-6">3. Write the sentence.</p>
                        <div className="flex-grow flex flex-col justify-end gap-10 mb-6">
                          <div className="border-b-[3px] border-black w-[90%] mx-auto"></div>
                          <div className="border-b-[3px] border-black w-[90%] mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Questions */}
                  <div className="flex border-b-4 border-black h-[35%] bg-white">
                    {/* Q1 */}
                    <div className="w-1/3 border-r-4 border-black flex flex-col">
                      <div className="bg-[#EEDCA2] p-3 text-center border-b-4 border-black h-24 flex flex-col justify-center">
                        <p className="font-medium text-xl leading-tight px-1">4. {data.q1}</p>
                        <p className="text-base mt-1 opacity-80">(circle)</p>
                      </div>
                      <div className="flex-grow flex flex-col justify-around py-4 bg-white">
                        <div className="flex justify-evenly items-end h-[80%] px-2">
                          {data.q1Options.map((opt, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 w-1/3 text-center">
                              <span className="text-5xl drop-shadow-sm">{opt.emoji}</span>
                              <span className="font-medium text-lg leading-tight tracking-wide break-words">{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Q2 */}
                    <div className="w-1/3 border-r-4 border-black flex flex-col">
                      <div className="bg-[#F2DFDD] p-3 text-center border-b-4 border-black h-24 flex flex-col justify-center">
                        <p className="font-medium text-xl leading-tight px-1">5. {data.q2}</p>
                        <p className="text-base mt-1 opacity-80">(circle)</p>
                      </div>
                      <div className="flex-grow flex flex-col justify-around py-4 bg-[#FFFBF7]">
                        <div className="flex justify-evenly items-end h-[80%] px-2">
                          {data.q2Options.map((opt, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 w-1/3 text-center">
                              <span className="text-5xl drop-shadow-sm">{opt.emoji}</span>
                              <span className="font-medium text-lg leading-tight tracking-wide break-words">{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Q3 */}
                    <div className="w-1/3 flex flex-col">
                      <div className="bg-[#DFDFDF] p-3 text-center border-b-4 border-black h-24 flex flex-col justify-center">
                        <p className="font-medium text-xl leading-tight px-1">6. {data.q3}</p>
                        <p className="text-base mt-1 opacity-80">(circle)</p>
                      </div>
                      <div className="flex-grow flex flex-col justify-around py-4 bg-white">
                        <div className="flex justify-evenly items-end h-[80%] px-2">
                          {data.q3Options.map((opt, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 w-1/3 text-center">
                              <span className="text-5xl drop-shadow-sm">{opt.emoji}</span>
                              <span className="font-medium text-lg leading-tight tracking-wide break-words">{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Cut-out Words */}
                  <div className="flex-1 flex justify-start items-center gap-6 px-6 bg-white">
                    {words.map((word, i) => (
                      <div key={i} className="border-4 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] px-10 py-4 min-w-[100px] flex items-center justify-center border-dashed">
                        <span className="text-4xl font-medium tracking-wide">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
