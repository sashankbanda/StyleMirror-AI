import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { StyleOption, AppStatus, StyleMirrorResponse, AppMode } from './types';
import { generateStylePrompt, generateStyledImage, analyzeReferenceStyle } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import BulkImageUploader from './components/BulkImageUploader';
import StyleOptions from './components/StyleOptions';
import ImageComparator from './components/ImageComparator';
import { SparklesIcon, AlertTriangleIcon, WandIcon, DownloadIcon, CompareIcon, ImageIcon, ImagesIcon, FileZipIcon, BookmarkIcon, TrashIcon } from './components/Icons';

export default function App() {
  // Common state
  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>('single');

  // Single mode state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<StyleOption[]>([]);
  const [manualText, setManualText] = useState('');
  const [generatedJson, setGeneratedJson] = useState<StyleMirrorResponse | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compare' | 'final'>('compare');
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);

  // Bulk mode state
  const [bulkImages, setBulkImages] = useState<string[]>([]);
  const [bulkPrompt, setBulkPrompt] = useState<string>('');
  const [bulkGeneratedImages, setBulkGeneratedImages] = useState<string[]>([]);
  const [bulkStatusMessage, setBulkStatusMessage] = useState('');
  const [savedBulkPrompts, setSavedBulkPrompts] = useState<string[]>([]);

  useEffect(() => {
    try {
        const storedPrompts = localStorage.getItem('savedBulkPrompts');
        if (storedPrompts) {
            setSavedBulkPrompts(JSON.parse(storedPrompts));
        }
    } catch (e) {
        console.error("Failed to load saved prompts from localStorage", e);
    }
  }, []);

  const updateSavedPrompts = (newPrompts: string[]) => {
    setSavedBulkPrompts(newPrompts);
    try {
        localStorage.setItem('savedBulkPrompts', JSON.stringify(newPrompts));
    } catch (e) {
        console.error("Failed to save prompts to localStorage", e);
    }
  };

  const handleSaveBulkPrompt = () => {
    const trimmedPrompt = bulkPrompt.trim();
    if (trimmedPrompt && !savedBulkPrompts.includes(trimmedPrompt)) {
        const newPrompts = [trimmedPrompt, ...savedBulkPrompts];
        updateSavedPrompts(newPrompts);
    }
  };

  const handleSelectBulkPrompt = (prompt: string) => {
    setBulkPrompt(prompt);
  };

  const handleDeleteBulkPrompt = (promptToDelete: string) => {
    const newPrompts = savedBulkPrompts.filter(p => p !== promptToDelete);
    updateSavedPrompts(newPrompts);
  };

  const handleAnalyzeStyle = useCallback(async () => {
    if (!referenceImage) {
      setError('Please upload a reference image first.');
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    setError(null);
    setAnalysisSummary(null);
    setSelectedOptions([]);

    try {
      const analysisResponse = await analyzeReferenceStyle(referenceImage);
      if (analysisResponse.status === 'error' || !analysisResponse.recommended_options) {
        throw new Error(analysisResponse.message || 'Failed to get style analysis.');
      }
      setAnalysisSummary(analysisResponse.identified_style_summary || 'Analysis complete.');
      setSelectedOptions(analysisResponse.recommended_options);
      setStatus('idle');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
      setStatus('error');
    }
  }, [referenceImage]);

  const handleGenerate = useCallback(async () => {
    if (!referenceImage || !userImage) {
      setError('Please upload both a reference image and a user image.');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setError(null);
    setGeneratedJson(null);
    setGeneratedImage(null);
    setViewMode('compare');

    try {
      const promptResponse = await generateStylePrompt(referenceImage, userImage, selectedOptions, manualText);
      if (promptResponse.status === 'error' || !promptResponse.final_prompt) {
        throw new Error(promptResponse.message || 'Failed to generate a valid prompt.');
      }
      setGeneratedJson(promptResponse);

      const finalImage = await generateStyledImage(userImage, promptResponse.final_prompt);
      setGeneratedImage(finalImage);
      
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setStatus('error');
    }
  }, [referenceImage, userImage, selectedOptions, manualText]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'stylemirror-output.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  const handleBulkGenerate = useCallback(async () => {
    if (bulkImages.length === 0 || !bulkPrompt) {
        setError('Please upload at least one image and provide a prompt.');
        setStatus('error');
        return;
    }
    setStatus('generating');
    setError(null);
    setBulkGeneratedImages([]);
    const results: string[] = [];
    try {
        for (let i = 0; i < bulkImages.length; i++) {
            setBulkStatusMessage(`Generating image ${i + 1} of ${bulkImages.length}...`);
            const image = bulkImages[i];
            const newImage = await generateStyledImage(image, bulkPrompt);
            results.push(newImage);
        }
        setBulkGeneratedImages(results);
        setStatus('success');
        setBulkStatusMessage(`Successfully generated ${results.length} images!`);
    } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred during bulk generation.');
        setStatus('error');
        setBulkStatusMessage('Bulk generation failed.');
    }
}, [bulkImages, bulkPrompt]);

  const handleBulkDownload = useCallback(async () => {
    if (bulkGeneratedImages.length === 0) return;
    
    setBulkStatusMessage('Zipping files...');
    const zip = new JSZip();
    
    bulkGeneratedImages.forEach((dataUrl, index) => {
      const base64Data = dataUrl.split(',')[1];
      zip.file(`generated_image_${index + 1}.png`, base64Data, { base64: true });
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'stylemirror-bulk-output.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setBulkStatusMessage('Download started!');
    } catch(e) {
      console.error(e);
      setBulkStatusMessage('Error creating ZIP file.');
    }

  }, [bulkGeneratedImages]);
  
  const resetState = () => {
    setStatus('idle');
    setError(null);
    setReferenceImage(null);
    setUserImage(null);
    setSelectedOptions([]);
    setManualText('');
    setGeneratedJson(null);
    setGeneratedImage(null);
    setAnalysisSummary(null);
    setBulkImages([]);
    setBulkPrompt('');
    setBulkGeneratedImages([]);
    setBulkStatusMessage('');
  };
  
  const handleModeChange = (newMode: AppMode) => {
    if (mode !== newMode) {
      resetState();
      setMode(newMode);
    }
  };

  const isLoading = status === 'analyzing' || status === 'generating';

  const singleLoadingMessages: { [key in AppStatus]?: { text: string; icon: React.ReactNode } } = {
    analyzing: { text: "AI is analyzing your reference style...", icon: <WandIcon className="w-6 h-6 animate-pulse" /> },
    generating: { text: "Crafting your new look... This may take a moment.", icon: <SparklesIcon className="w-6 h-6 animate-ping" /> },
  };
  
  const currentSingleLoadingMessage = (status === 'analyzing' || status === 'generating') && mode === 'single' ? singleLoadingMessages[status] : null;

  const renderSingleMode = () => {
    const isAnalyzing = status === 'analyzing';
    const isGenerating = status === 'generating';
    const analysisComplete = !!analysisSummary;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Left Column: Controls */}
        <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col gap-6 border border-slate-700 h-fit lg:h-full lg:overflow-y-auto">
          <fieldset disabled={isLoading}>
            <ImageUploader title="1. Upload Reference Image (Style)" onImageUpload={setReferenceImage} />
          </fieldset>
          
          {referenceImage && !analysisComplete && (
            <button
              onClick={handleAnalyzeStyle}
              disabled={isAnalyzing || !referenceImage}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Style'}
              {!isAnalyzing && <WandIcon className="w-5 h-5" />}
            </button>
          )}

          {analysisComplete && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">Analysis Result</h3>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-slate-300 italic">"{analysisSummary}"</p>
                </div>
              </div>
              
              <fieldset disabled={isLoading}>
                 <StyleOptions selectedOptions={selectedOptions} onChange={setSelectedOptions} />
              </fieldset>

              <fieldset disabled={isLoading}>
                <div>
                  <label htmlFor="manual-text" className="block text-sm font-medium text-slate-300 mb-2">
                    Optional Edits
                  </label>
                  <input
                    type="text"
                    id="manual-text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="e.g., 'Add a fox on my shoulder'"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                  />
                </div>
              </fieldset>
              
              <fieldset disabled={isLoading}>
                 <ImageUploader title="2. Upload Your Image (Content)" onImageUpload={setUserImage} />
              </fieldset>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !analysisComplete || !userImage || !referenceImage}
            className={`w-full flex items-center justify-center gap-3 bg-violet-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 ${analysisComplete ? 'block' : 'hidden'}`}
          >
            {isGenerating ? 'Generating...' : 'Apply Style'}
            {!isGenerating && <SparklesIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col justify-center items-center border border-slate-700 min-h-[400px] lg:min-h-0">
          {status === 'idle' && (
            <div className="text-center text-slate-400">
              <WandIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300">Your masterpiece awaits</h3>
              <p>Upload a reference image to begin the analysis.</p>
            </div>
          )}
          {currentSingleLoadingMessage && (
            <div className="text-center text-slate-400 flex flex-col items-center gap-4">
              {currentSingleLoadingMessage.icon}
              <p className="text-lg animate-pulse">{currentSingleLoadingMessage.text}</p>
            </div>
          )}
          {status === 'error' && error && (
            <div className="text-center text-red-400 bg-red-900/20 border border-red-500/30 p-6 rounded-lg">
              <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-300">Oops! Something went wrong.</h3>
              <p className="mt-2">{error}</p>
            </div>
          )}
          {status === 'success' && userImage && generatedImage && (
            <div className="w-full h-full flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-center">Style Applied!</h2>
              <div className="relative w-full aspect-square max-h-[500px] mx-auto group">
                {viewMode === 'compare' ? (
                  <ImageComparator beforeImage={userImage} afterImage={generatedImage} />
                ) : (
                  <img src={generatedImage} alt="Generated style" className="w-full h-full object-contain rounded-lg" />
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg backdrop-blur-sm border border-slate-700">
                    <button title="Compare View" onClick={() => setViewMode('compare')} className={`p-2 rounded-md transition-colors ${viewMode === 'compare' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                      <CompareIcon className="w-5 h-5" />
                    </button>
                    <button title="Final Image View" onClick={() => setViewMode('final')} className={`p-2 rounded-md transition-colors ${viewMode === 'final' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleDownload}
                    title="Download Image"
                    className="flex items-center justify-center gap-2 bg-slate-900/80 p-2 rounded-lg text-white font-semibold hover:bg-violet-600 focus:outline-none focus:ring-2 ring-inset ring-transparent focus:ring-violet-500 transition-all duration-300 backdrop-blur-sm border border-slate-700"
                  >
                    <DownloadIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {generatedJson?.final_prompt && (
                <div className="bg-slate-900 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold text-violet-400 mb-2">Generated Prompt:</h4>
                  <p className="text-sm text-slate-300 font-mono bg-slate-800 p-3 rounded">{generatedJson.final_prompt}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  const renderBulkMode = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Left Column: Controls */}
        <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col gap-6 border border-slate-700 h-fit lg:h-full lg:overflow-y-auto">
            <BulkImageUploader onImagesUpload={setBulkImages} />
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="bulk-prompt" className="block text-lg font-semibold text-slate-300">
                  Prompt for All Images
                </label>
                <button
                  onClick={handleSaveBulkPrompt}
                  disabled={!bulkPrompt.trim() || savedBulkPrompts.includes(bulkPrompt.trim())}
                  className="text-sm text-violet-400 hover:text-violet-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1.5"
                  title="Save prompt for later use"
                >
                  <BookmarkIcon className="w-4 h-4" />
                  Save Prompt
                </button>
              </div>
              <textarea
                id="bulk-prompt"
                rows={4}
                value={bulkPrompt}
                onChange={(e) => setBulkPrompt(e.target.value)}
                placeholder="e.g., 'A cinematic photo of the subject in a fantasy forest, high detail, epic lighting'"
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
              />
            </div>

            {savedBulkPrompts.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-slate-300 mb-3">Saved Prompts</h4>
                <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                  {savedBulkPrompts.map((prompt, index) => (
                    <div key={index} className="group flex items-center justify-between gap-2 bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition-colors">
                      <p 
                        className="text-sm text-slate-300 flex-1 truncate cursor-pointer" 
                        title="Click to use this prompt"
                        onClick={() => handleSelectBulkPrompt(prompt)}
                      >
                        {prompt}
                      </p>
                      <button 
                        onClick={() => handleDeleteBulkPrompt(prompt)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200 flex-shrink-0"
                        title="Delete prompt"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleBulkGenerate}
              disabled={isLoading || bulkImages.length === 0 || !bulkPrompt}
              className="w-full flex items-center justify-center gap-3 bg-violet-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isLoading ? 'Generating...' : `Generate ${bulkImages.length} Images`}
              {!isLoading && <SparklesIcon className="w-5 h-5" />}
            </button>
        </div>
        
        {/* Right Column: Results */}
        <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col justify-center items-center border border-slate-700 min-h-[400px] lg:min-h-0">
            {status === 'idle' && (
              <div className="text-center text-slate-400">
                <ImagesIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-300">Ready for Batch Processing</h3>
                <p>Upload your images, enter a prompt, and generate them all at once.</p>
              </div>
            )}
            {isLoading && (
              <div className="text-center text-slate-400 flex flex-col items-center gap-4">
                  <SparklesIcon className="w-8 h-8 animate-ping" />
                  <p className="text-lg animate-pulse">{bulkStatusMessage || 'Preparing for generation...'}</p>
              </div>
            )}
             {status === 'error' && error && (
              <div className="text-center text-red-400 bg-red-900/20 border border-red-500/30 p-6 rounded-lg">
                <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-300">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
              </div>
            )}
             {status === 'success' && bulkGeneratedImages.length > 0 && (
                <div className="text-center text-slate-300 flex flex-col items-center gap-6">
                    <FileZipIcon className="w-20 h-20 text-violet-400"/>
                    <h3 className="text-2xl font-bold">Generation Complete!</h3>
                    <p className="text-slate-400">{bulkStatusMessage}</p>
                    <button
                        onClick={handleBulkDownload}
                        className="w-full max-w-sm flex items-center justify-center gap-3 bg-violet-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-all duration-300"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download All as ZIP
                    </button>
                </div>
             )}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
           <SparklesIcon className="w-10 h-10 text-violet-400" />
           <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-purple-400 text-transparent bg-clip-text">
             StyleMirror AI
           </h1>
        </div>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Recreate any visual style on your own photos or generate new styles for a batch of images.
        </p>
      </header>

      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto w-full">
        <div className="mb-8 p-1 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-2">
            <button 
              onClick={() => handleModeChange('single')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'single' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              Single Style
            </button>
            <button 
              onClick={() => handleModeChange('bulk')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'bulk' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              Bulk Generate
            </button>
        </div>
        
        {mode === 'single' ? renderSingleMode() : renderBulkMode()}
      </main>
    </div>
  );
}