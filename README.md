# Idea Saver - AI-Powered Voice Notes

Idea Saver is a modern Progressive Web App (PWA) designed to instantly capture your thoughts and ideas through voice notes. It leverages the power of generative AI to not only transcribe your recordings but also to organize, summarize, and expand upon them, turning fleeting thoughts into actionable plans.

This application is built with a professional tech stack, featuring user authentication, free and pro tiers, and seamless cloud synchronization of your notes.

## Key Features

- **Voice Recording & Playback:** High-quality audio recording directly in the browser with a custom audio player for review.
- **AI-Powered Transcription:** Fast and accurate multilingual transcription of your voice notes.
- **AI-Powered Note Titling:** Automatically generate a concise, relevant title for each note.
- **Editable Transcriptions:** Manually refine and correct transcriptions to ensure perfect accuracy.
- **Shareable Notes:** Share individual note sections (like a summary or task list) or the entire bundle of generated content as a single text file.
- **Secure Authentication:** User accounts handled securely by Firebase Authentication, with support for email/password and Google Sign-In.
- **Free & Pro Tiers:** Provides a feature-rich free tier and unlocks advanced AI capabilities with a Pro subscription.
- **PWA (Progressive Web App):** Installable on any device (desktop or mobile) for an app-like experience and offline capabilities.
- **Light/Dark Mode:** A sleek, modern interface that adapts to your system's theme preference.

### Pro Features
- **AI Summarization:** Get a one-sentence summary of your note.
- **AI Note Expansion:** Elaborate on your brief ideas, turning them into well-structured text.
- **AI Project Plan Generation:** Transform a voice note into a formal project plan with goals, milestones, and risks.
- **AI Task Extraction:** Automatically pull out a markdown-formatted to-do list from your transcription.
- **Cloud Sync:** Securely save and sync all your transcriptions and AI-generated content across devices using Firestore. (Audio playback is only available on the recording device).

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components
- **Authentication:** Firebase Authentication
- **Database:** Firebase Firestore (for Pro users with Cloud Sync)
- **Local Storage:** Browser's `localStorage` for offline access and non-Pro users.
- **AI:** Google AI via Genkit

## Getting Started

Follow these instructions to set up and run the project locally.

### 1. Prerequisites

- Node.js (v18 or later)
- npm or yarn

### 2. Firebase Project Setup

Before you begin, you need a Firebase project.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the on-screen instructions.
3. Once your project is created, navigate to **Project settings** (the gear icon).
4. Under the **General** tab, scroll down to **Your apps**.
5. Click the Web icon (`</>`) to create a new web app.
6. Give it a nickname and register the app.
7. After registering, Firebase will provide you with a `firebaseConfig` object. You will need these values for the next step.
8. From the sidebar, go to **Build > Authentication**.
    - On the **Sign-in method** tab, enable the **Email/Password** and **Google** sign-in providers.
    - On the **Settings** tab, go to **Authorized domains**. Click **Add domain** and add `localhost`. If you deploy your app to a custom domain, you must add that domain here as well. This is a critical step for Google Sign-In to work.
9. Go to **Build > Firestore Database** and create a database. Start in **test mode** for easy setup.

### 3. Environment Variables

Create a file named `.env` in the root of the project and add your Firebase configuration details.

```env
# Get these from your Firebase project settings
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...

# This is your Google Cloud API key for Genkit AI features
# Enable the "Vertex AI API" in your Google Cloud Console for the associated project
GOOGLE_API_KEY=AIza...
```

### 4. Installation and Running

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:9002`.

## Troubleshooting

This section covers common issues you might encounter during setup and development.

### Google Sign-In Fails with "auth/unauthorized-domain"

This is the most common setup issue. The error message "This domain is not authorized..." means that there's a mismatch between the domain you're running the app on (`localhost` for local development) and the settings in your Firebase/Google Cloud project.

The error message in the app will tell you the exact **Project ID** it's trying to connect to. Make sure you are configuring the correct project in the Firebase Console.

Follow these steps carefully to resolve it:

#### Step 1: Check Authorized Domains in Firebase

This is the most direct cause. You must tell Firebase which domains are allowed to make authentication requests.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (e.g., `your-project-id`).
3.  Navigate to **Build > Authentication** from the left-hand menu.
4.  Go to the **Settings** tab.
5.  Under the **Authorized domains** section, click **Add domain**.
6.  Add `localhost` for local development.
7.  If you have deployed your app, add your live domain as well (e.g., `ideasaver.site`).
8.  **Important:** Make sure your project's auto-generated auth domain (like `your-project-id.firebaseapp.com`) is also in this list. It usually is by default.

#### Step 2: Ensure Google Sign-In Provider is Enabled

1.  In the same **Authentication** section, go to the **Sign-in method** tab.
2.  Find **Google** in the list of providers.
3.  Make sure it is **Enabled**. If it's disabled, click on it, enable the toggle, and provide a project support email. Click **Save**.

#### Step 3: Configure the OAuth Consent Screen (Very Common Issue)

This is a critical but often missed step. Firebase Authentication uses Google Cloud behind the scenes.

1.  Go to the [Google Cloud Console API & Services Credentials page](https://console.cloud.google.com/apis/credentials).
2.  Make sure you have selected the correct Google Cloud project at the top of the page. It should be the same project as your Firebase project (e.g., `your-project-id`).
3.  Click on the **OAuth consent screen** tab on the left.
4.  If it's not configured, you'll see a button to **"Configure Consent Screen"**. Click it.
    *   Choose a **User Type**. For development, **External** is fine. Click **Create**.
    *   On the next screen, you **must** fill in the required fields:
        *   **App name:** (e.g., "Idea Saver")
        *   **User support email:** (Select your email address)
        *   **App logo:** Optional, but recommended.
        *   **Authorized domains:** Add the domain where your app is hosted (e.g., `ideasaver.site`).
        *   **Developer contact information:** (Enter your email address at the bottom)
    *   Click **Save and Continue**. The next pages are "Scopes" and "Test Users". You can skip these and continue clicking "Save and Continue". You do not need to add any scopes or test users.
    *   On the final "Summary" page, you might be asked for "Información adicional" (Additional Information) for verification purposes. **You can leave this section blank.** This app only requests basic profile information and does not require Google's formal verification process.
    *   **Verification Questionnaire:** You may be presented with a "Cuestionario de verificación" (Verification Questionnaire). You should answer **No** to all questions. The app is intended for public use, not for personal, internal, or specific plugin use.
    *   Finally, go back to the dashboard and click **"Publish App"** to move it from "Testing" to "Production". While in testing, only registered test users can sign in. Publishing makes it available to any Google user. **This is the most common final step that is missed.** If your app is in "Testing", the sign-in will fail for any user not on your explicit "Test Users" list.

        **Important:** Don't worry, "publishing" here doesn't submit your app for a lengthy review or list it in a public marketplace. It simply means that any Google user is *allowed* to sign in, which is necessary for anyone (including your first test users) to use the app. You must switch to "Production" to test with real users.

#### Step 4: Final Checks

- **Clear Browser Cache:** Sometimes your browser can cache old settings. Try clearing your browser's cache and cookies, or open the app in an Incognito/Private window.
- **Restart Development Server:** After making changes to your `.env` file, always stop and restart your `npm run dev` server to ensure the new variables are loaded.
