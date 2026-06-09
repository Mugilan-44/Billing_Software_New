import React from 'react';
import { useBlocker } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function UnsavedChangesWarning({ isDirty }) {
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    // Handle full page reloads / tab closures
    React.useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    if (blocker.state !== "blocked") return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Unsaved Changes</h3>
                <p className="text-slate-600 mb-6 text-sm">
                    Are you sure you want to leave? All the data you entered will be lost.
                </p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => blocker.reset()} 
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        Stay Here
                    </button>
                    <button 
                        onClick={() => blocker.proceed()} 
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
                    >
                        Discard Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
