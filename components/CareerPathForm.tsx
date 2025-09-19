import React, { useState } from 'react';

interface CareerPathFormProps {
    onClose: () => void;
    onSubmit: (skills: string, interests: string, experience: string) => void;
}

const FormTextarea: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
}> = ({ id, label, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gemini-light-text mb-2">
            {label}
        </label>
        <textarea
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={4}
            className="w-full bg-gemini-dark border border-white/20 rounded-lg p-3 text-gemini-dark-text resize-y focus:ring-2 focus:ring-gemini-blue focus:outline-none transition-shadow"
        />
    </div>
);

const CareerPathForm: React.FC<CareerPathFormProps> = ({ onClose, onSubmit }) => {
    const [skills, setSkills] = useState('');
    const [interests, setInterests] = useState('');
    const [experience, setExperience] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (skills.trim() || interests.trim() || experience.trim()) {
            onSubmit(skills, interests, experience);
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-gemini-dark/80 backdrop-blur-sm flex items-center justify-center z-30"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="career-form-title"
        >
            <div 
                className="bg-gemini-dark-card rounded-xl shadow-2xl w-full max-w-lg m-4 border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10">
                    <h2 id="career-form-title" className="text-xl font-bold text-gemini-dark-text">Explore Career Paths</h2>
                    <p className="text-sm text-gemini-light-text mt-1">Provide some details so I can suggest the best career paths for you.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                       <FormTextarea 
                            id="skills"
                            label="Your Skills"
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            placeholder="e.g., Python, Project Management, Graphic Design"
                       />
                       <FormTextarea 
                            id="interests"
                            label="Your Interests"
                            value={interests}
                            onChange={(e) => setInterests(e.target.value)}
                            placeholder="e.g., Artificial Intelligence, Renewable Energy, Creative Writing"
                       />
                       <FormTextarea 
                            id="experience"
                            label="Your Professional Experience"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="Briefly describe your past roles or projects."
                       />
                    </div>
                    <div className="flex justify-end gap-3 p-4 bg-gemini-dark rounded-b-xl">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-sm font-medium text-gemini-light-text bg-gemini-dark-card hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gemini-blue hover:bg-blue-500 transition-colors"
                        >
                            Find My Career Path
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CareerPathForm;