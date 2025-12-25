import { 
  WelcomeIllustration, 
  AddPropertiesIllustration, 
  OrganizeIllustration,
  MapViewIllustration,
  ShareIllustration,
  CompletionIllustration 
} from './TutorialIllustrations';
import { Chrome, Star, Map, Link2, Sparkles } from 'lucide-react';

// Shared step props interface (className reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// Step content wrapper for consistent styling
function StepContent({ 
  children, 
  illustration 
}: { 
  children: React.ReactNode; 
  illustration: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Illustration */}
      <div className="mb-6 animate-fadeIn">
        {illustration}
      </div>
      {/* Content */}
      <div className="animate-slideUp">
        {children}
      </div>
    </div>
  );
}

// Step 0: Welcome
export function WelcomeStep() {
  return (
    <StepContent illustration={<WelcomeIllustration />}>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome to Rent Shortlist! 🏠
        </h2>
        <p className="text-gray-600 text-base leading-relaxed max-w-md">
          Your personal hub for collecting and comparing rental properties. 
          Let's show you around in <span className="font-semibold text-primary-600">2 minutes</span>.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
            <Sparkles size={14} />
            4 quick steps
          </span>
        </div>
      </div>
    </StepContent>
  );
}

// Step 1: Add Properties
export function AddPropertiesStep() {
  return (
    <StepContent illustration={<AddPropertiesIllustration />}>
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold mb-2">
          <Chrome size={14} />
          CHROME EXTENSION
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Save listings with one click
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-md">
          Browse Rightmove, Zoopla, or any property site. Click the extension to instantly 
          save the listing to your shortlist — complete with photos, price, and address.
        </p>
        <div className="flex flex-col items-center gap-2 pt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Works on any property website
          </div>
        </div>
      </div>
    </StepContent>
  );
}

// Step 2: Organize
export function OrganizeStep() {
  return (
    <StepContent illustration={<OrganizeIllustration />}>
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-2">
          <Star size={14} />
          STAY ORGANIZED
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Rate, tag, and compare
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-md">
          Give properties a star rating, add personal notes, and create custom tags 
          like "To Visit" or "Favorite". Filter to find your perfect match.
        </p>
        <div className="flex items-center justify-center gap-3 pt-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
            Favorite
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            To Visit
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            BTR
          </span>
        </div>
      </div>
    </StepContent>
  );
}

// Step 3: Map View
export function MapViewStep() {
  return (
    <StepContent illustration={<MapViewIllustration />}>
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold mb-2">
          <Map size={14} />
          VISUALIZE
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          See everything on a map
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-md">
          All your properties displayed on an interactive map. Set your 
          center point (like your office) to see travel distances and commute times.
        </p>
        <div className="flex items-center justify-center gap-4 pt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            🚇 Transit time
          </span>
          <span className="flex items-center gap-1">
            🚗 Drive time
          </span>
          <span className="flex items-center gap-1">
            🚶 Walk time
          </span>
        </div>
      </div>
    </StepContent>
  );
}

// Step 4: Share
export function ShareStep() {
  return (
    <StepContent illustration={<ShareIllustration />}>
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold mb-2">
          <Link2 size={14} />
          SHARE INSTANTLY
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Your data lives in the URL
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-md">
          Everything saves automatically to a unique link. Bookmark it to keep your 
          list, or share it with family and friends — they'll see the exact same properties!
        </p>
        <div className="flex flex-col items-center gap-2 pt-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-xs text-gray-600 font-mono">
            <span className="text-primary-600">rentshortlist.com/</span>
            <span className="text-gray-400">happy-panda-42</span>
          </div>
          <p className="text-[11px] text-gray-400">No account needed!</p>
        </div>
      </div>
    </StepContent>
  );
}

// Step 5: Completion
export function CompletionStep() {
  return (
    <StepContent illustration={<CompletionIllustration />}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          You're ready to go! 🎉
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-md">
          Start by adding your first property or explore the demo data. 
          You can restart this tutorial anytime from the Settings menu.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 w-full max-w-xs">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-lg">🏠</span>
              <span>Add properties</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-lg">⭐</span>
              <span>Rate & organize</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-lg">🗺️</span>
              <span>View on map</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-lg">🔗</span>
              <span>Share your list</span>
            </div>
          </div>
        </div>
      </div>
    </StepContent>
  );
}
