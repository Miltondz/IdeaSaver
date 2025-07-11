
export const en = {
  // AppShell & Nav
  appName: 'Idea Saver',
  nav_record: 'Record',
  nav_history: 'History',
  nav_settings: 'Settings',
  nav_about: 'About',
  logout: 'Logout',
  logout_success_title: 'Logged Out',
  logout_success_desc: 'You have been successfully logged out.',
  logout_fail_title: 'Logout Failed',
  logout_fail_desc: 'Could not log you out. Please try again.',
  header_credit_display: '{credits} Credit{plural} Left',
  header_pro_trial_day_left: 'Pro Plan Active',
  header_pro_trial_days_left: 'Pro Plan Active',
  
  // Login Page
  login_header: 'Idea Saver',
  login_subheader: 'Quickly capture and transcribe your ideas.',
  login_signin_tab: 'Sign In',
  login_signup_tab: 'Sign Up',
  login_signin_title: 'Welcome Back',
  login_signin_desc: 'Sign in to access your notes and recordings.',
  login_email_label: 'Email',
  login_password_label: 'Password',
  login_signin_button: 'Sign In',
  login_forgot_password_link: 'Forgot Password?',
  login_no_account: "Don't have an account?",
  login_signup_link: 'Sign Up',
  login_signup_title: 'Unleash Your Ideas',
  login_signup_desc: 'First, create your account. Then, select a plan on the next screen to get started.',
  login_create_account_button: 'Create Account',
  login_terms_prefix: 'By signing up, you agree to our',
  login_terms_link: 'Terms of Service',
  login_and: 'and',
  login_privacy_link: 'Privacy Policy',
  login_already_account: 'Already have an account?',
  login_signin_link: 'Sign In',
  login_or_continue_with: 'Or continue with',

  // Auth Error Toasts
  auth_fail_title: 'Authentication Failed',
  auth_missing_info: 'Please enter both an email and a password.',
  auth_config_error: 'Firebase is not configured correctly.',
  auth_invalid_email: 'Please enter a valid email address.',
  auth_user_not_found: 'Incorrect email or password. Please check your spelling and try again, or use the "Forgot Password?" link.',
  auth_wrong_password: 'Incorrect password. Please try again.',
  auth_email_in_use: 'This email is already registered. Try signing in, or use Google if you signed up with it previously.',
  auth_email_in_use_google: 'This email was registered using Google. Please use the "Continue with Google" button to sign in.',
  auth_email_in_use_password: 'This email is already registered with a password. Please go to the "Sign In" tab or use the "Forgot Password?" link if needed.',
  auth_weak_password: 'Password should be at least 6 characters.',
  auth_invalid_api_key: "Your Firebase API Key is invalid. The app is configured with Project ID: '{projectId}'. Please double-check the API Key in your .env file and ensure it matches the one from that project in the Firebase Console. See the README.md for detailed troubleshooting steps.",
  auth_popup_blocked: 'Your browser blocked the sign-in popup. Please allow popups for this site.',
  auth_popup_closed: 'The sign-in window was closed. Please try again.',
  auth_unauthorized_domain: "This domain isn't authorized for your app (Project ID: '{projectId}'). The most likely cause is an unconfigured OAuth Consent Screen in Google Cloud. Go to your Google Cloud Console 'Credentials' page, click 'Configure Consent Screen', fill out the form, and publish it. See the README for a full guide.",
  auth_account_exists: 'An account already exists with this email, but with a different sign-in method (e.g., password). Try signing in with that method.',
  
  // Account Creation Toasts
  account_created_title: 'Account Created!',
  account_created_desc: 'Welcome! Please select a plan to continue.',

  // Forgot Password Page
  forgot_password_title: 'Forgot Password',
  forgot_password_desc: "No problem. Enter your email below and we'll send you a link to reset it.",
  forgot_password_button: 'Send Reset Link',
  forgot_password_back_link: 'Back to Sign In',
  forgot_password_email_required: 'Email required',
  forgot_password_email_required_desc: 'Please enter your email address.',
  forgot_password_link_sent_title: 'Reset Link Sent',
  forgot_password_link_sent_desc: 'Please check your email for a link to reset your password.',
  forgot_password_fail_title: 'Failed to Send',
  forgot_password_user_not_found: 'No account found with this email address.',

  // Pricing Page
  pricing_title: 'Choose your plan to get started',
  pricing_subtitle: 'Select a plan to start capturing your ideas.',
  pricing_monthly: 'Monthly',
  pricing_yearly: 'Yearly (Save 2 months)',
  pricing_month_short: 'mo',
  pricing_year_short: 'yr',
  pricing_pro_billed_yearly: 'Billed annually',
  pricing_free_plan_title: 'Free Plan',
  pricing_free_plan_desc: 'Capture your key thoughts and experience the magic of AI.',
  pricing_free_feature_1: '3 Welcome AI Credits & 2 AI Credits per month',
  pricing_free_feature_2: 'Unlimited Local Recordings (10 min max)',
  pricing_free_feature_3: 'AI-powered Transcription & Naming (uses credits)',
  pricing_free_feature_4: 'Trial Pro AI features (uses credits)',
  pricing_free_feature_5: 'Save notes locally on your device',
  pricing_free_feature_6: 'Dark Mode',
  pricing_free_feature_7: 'Email Support',
  pricing_free_button: 'Continue with Free Plan',
  pricing_pro_plan_title: 'Pro Plan',
  pricing_pro_plan_badge: 'Most Popular',
  pricing_pro_plan_desc: 'Unlock unlimited potential for your ideas with advanced AI.',
  pricing_pro_feature_1: 'Unlimited AI Credits & Recordings',
  pricing_pro_feature_2: 'AI-powered Transcription & Naming',
  pricing_pro_feature_3: 'AI-powered Note Expansion',
  pricing_pro_feature_4: 'AI-powered Project Planning',
  pricing_pro_feature_5: 'AI-powered Summarization',
  pricing_pro_feature_6: 'Action Item Extraction',
  pricing_pro_feature_7: 'Cloud Sync (Access notes across all your devices)',
  pricing_pro_feature_8: 'Unlimited Note Storage',
  pricing_pro_feature_9: 'Advanced Search & Organization (Folders, Tags)',
  pricing_pro_feature_10: 'Priority Customer Support',
  pricing_pro_button_upgrade: 'Upgrade to Pro',
  pricing_error_title: 'Error',
  pricing_select_error: 'You must be logged in to select a plan.',
  pricing_pro_trial_activated: 'Pro Trial Activated!',
  pricing_pro_trial_activated_desc: 'Cloud Sync is now enabled. Welcome aboard!',
  pricing_pro_trial_used_title: 'Pro Trial Already Used',
  pricing_pro_trial_used_desc: "You have already used your 7-day Pro trial. Please upgrade to a paid plan to continue using Pro features.",
  pricing_free_plan_selected: 'Free Plan Selected',
  pricing_free_plan_selected_desc: 'Welcome to Idea Saver! You have 3 AI credits to start.',
  pricing_config_error_title: 'Configuration Error',
  pricing_config_error_desc: "Your app's return URL is set to 'localhost', but you are accessing it from a different address. Please update the NEXT_PUBLIC_APP_URL in your .env file to '{hostname}' to proceed with payment.",
  
  // Record Page
  record_motivation_1: "Your ideas, amplified.",
  record_motivation_2: "Capture brilliance. Instantly.",
  record_motivation_3: "Unlock your mind's potential.",
  record_motivation_4: "Thoughts made tangible.",
  record_motivation_5: "The future of note-taking is here.",
  record_motivation_6: "From thought to masterpiece.",
  record_motivation_7: "Ideas, unchained.",
  record_motivation_8: "Never lose an 'aha!' moment again.",
  record_motivation_9: "Beyond notes. It's intelligence.",
  record_motivation_10: "Stop forgetting. Start creating.",
  record_motivation_11: "Turn fleeting thoughts into fully-formed concepts.",
  record_motivation_12: "Your brain, supercharged by AI.",
  record_motivation_13: "Transform spoken words into expanded wisdom.",
  record_motivation_14: "The ultimate tool for creators, innovators, and thinkers.",
  record_motivation_15: "Don't just save ideas, grow them.",
  record_motivation_16: "What if your notes could write themselves?",
  record_motivation_17: "Discover the true power of your voice.",
  record_motivation_18: "The secret weapon for your next breakthrough.",
  record_motivation_19: "Experience notes like never before.",
  record_status_recording: 'Recording your brilliance...',
  record_status_review: 'Review Your Note',
  record_status_transcribing: 'Transcribing...',
  record_status_naming: 'Creating Title...',
  record_status_completed: 'Success!',
  record_auth_error: 'You must be logged in to process recordings.',
  record_no_recording_error_title: 'No Recording Found',
  record_no_recording_error_desc: 'Could not find the audio to process.',
  record_empty_title: 'No audio recorded',
  record_empty_desc: 'The recording was empty. Please try again.',
  record_mic_denied_title: 'Microphone Access Denied',
  record_mic_denied_desc: 'Please allow microphone access in your browser settings to record audio.',
  record_processing_fail_title: 'Processing Error',
  record_processing_fail_desc: 'Could not process the audio. Please try again.',
  share_api_not_available: 'Sharing is not available on this browser.',
  record_share_fail_title: 'Sharing failed',
  record_share_fail_desc: 'Could not share the note. Details: {error}',
  share_text_fail_fallback_title: 'Sharing Failed',
  share_text_fail_fallback_desc: 'The text has been copied to your clipboard instead.',
  record_share_audio_fail_title: 'Share Failed',
  record_share_audio_fail_desc: 'Could not share the audio file. Details: {error}',
  record_share_unsupported_title: 'Sharing not supported',
  record_share_unsupported_desc: "This browser doesn't support sharing. The note has been copied to your clipboard instead.",
  record_share_unsupported_file_title: 'File Sharing Not Supported',
  record_share_unsupported_file_desc: 'Your browser does not support sharing this type of file.',
  record_share_denied_title: 'Sharing Permission Denied',
  record_share_denied_desc: "We couldn't open the share dialog. Please check your browser or system permissions. Details: {error}",
  record_save_cloud_success_title: 'Saved to Cloud!',
  record_save_cloud_success_desc: 'Your note has been saved to the database.',
  record_save_cloud_fail_title: 'Save Failed',
  record_save_cloud_fail_desc: 'Could not save to the database.',
  record_discard_success_title: 'Note Discarded',
  record_discard_success_desc: 'The recording has been successfully deleted.',
  record_discard_fail_title: 'Deletion Failed',
  record_discard_fail_desc: 'Could not discard the note. Please try again.',
  record_tap_to_start: 'Tap the mic to start recording',
  record_tap_to_stop: 'Tap the mic to stop recording',
  record_review_title: 'Review Recording',
  record_review_desc: 'Listen to your note before processing it.',
  record_save_audio_only: 'Save Audio Only',
  record_share_audio_button: 'Share Audio',
  record_transcribe_button: 'Transcribe',
  record_transcribe_with_credit: 'Transcribe (1 Credit)',
  record_discard_button: 'Discard',
  record_completed_title: 'Your note is saved. You can now edit the transcription or use AI actions.',
  record_transcription_label: 'Transcription',
  record_transcription_placeholder: 'Your transcription appears here...',
  record_save_button: 'Save',
  record_ai_actions_label: 'AI Actions',
  record_credits_remaining: 'You have {credits} AI credit{plural} remaining',
  record_credits_no_pro: 'Costs 1 AI Credit',
  record_credits_no_credits: 'No credits left',
  record_summarize_button: 'Summarize',
  record_expand_button: 'Expand',
  record_project_plan_button: 'As Project',
  record_get_tasks_button: 'Get Tasks',
  record_share_note_button: 'Share Note',
  record_view_history_button: 'View History',
  record_close_button: 'Close',
  record_console_logs_title: 'Console Logs',
  record_console_logs_desc: 'Live output from the recording and transcription process.',
  record_console_logs_empty: 'No logs yet. Start a recording to see output.',
  record_no_changes_to_save: 'No changes to save.',
  record_save_audio_only_success: 'You can find it and transcribe it later from your history.',
  record_audio_note_saved: 'Audio note saved!',
  record_audio_note_prefix: 'Idea Saver Note - {timestamp}',
  record_save_audio_only_fail_title: 'Save Failed',
  record_save_audio_only_fail_desc: 'Could not save the audio note.',
  record_overwrite_button: 'Overwrite',
  record_overwrite_expand_title: 'Overwrite Expanded Note?',
  record_overwrite_expand_desc: 'An expanded version of this note already exists. Generating a new version will overwrite the existing one. Are you sure you want to continue?',
  record_overwrite_summary_title: 'Overwrite Summary?',
  record_overwrite_summary_desc: 'This note already has a summary. Generating a new one will overwrite the existing summary. Are you sure you want to continue?',
  record_overwrite_project_plan_title: 'Overwrite Project Plan?',
  record_overwrite_project_plan_desc: 'A project plan for this note already exists. Generating a new version will overwrite the existing one. Are you sure you want to continue?',
  record_overwrite_tasks_title: 'Overwrite Action Items?',
  record_overwrite_tasks_desc: 'An action item list for this note already exists. Generating a new one will overwrite the existing list. Are you sure you want to continue?',
  record_overwrite_transcription_title: 'Overwrite Transcription?',
  record_overwrite_transcription_desc: 'This will save your changes and overwrite the previous transcription. Are you sure?',
  record_unsupported_format_title: 'Format Not Supported',
  record_unsupported_format_desc: 'Your browser does not support the required audio formats (MP4, WebM).',
  record_download_title: 'Download Started',
  record_download_desc: 'Audio file has been downloaded to your device.',

  // AI Actions (General)
  ai_confirmation_title: 'Confirm AI Action',
  ai_confirmation_desc: 'This action will cost 1 AI credit. You have {credits} credit{plural} remaining. Do you want to proceed?',
  ai_confirmation_button: 'Proceed',
  ai_overwrite_title: 'Overwrite {feature}?',
  ai_overwrite_desc: 'A version of this already exists. Generating a new version will overwrite it. Are you sure you want to continue?',
  ai_overwrite_button: 'Overwrite',
  ai_no_credits_error: "You're out of AI credits. Upgrade to Pro for unlimited use.",
  ai_no_credits_error_title: 'No AI Credits',
  ai_result_dialog_desc: "This is an AI-generated {action} of your original note. The result has been automatically saved.",
  'ai_action_expand': 'expansion',
  'ai_action_summarize': 'summary',
  'ai_action_expand-as-project': 'project plan',
  'ai_action_extract-tasks': 'task list',
  'ai_action_transcribe': 'transcription',
  ai_node_expanded_title: 'Expanded Note',
  ai_node_summarized_title: 'Summarized Note',
  ai_node_project_plan_title: 'Project Plan',
  ai_node_action_items_title: 'Action Items',
  ai_result_title: 'AI Result',
  ai_processing_title: '{action} in progress...',
  ai_close_button: 'Close',
  ai_copy_tooltip: 'Copy',
  ai_copied_toast: 'Copied to clipboard!',
  ai_expand_success: 'Note expanded and saved!',
  ai_expand_fail: 'Could not expand the note.',
  ai_expand_fail_title: 'Expansion Failed',
  ai_summarize_success: 'Note summarized and saved!',
  ai_summarize_fail: 'Could not summarize the note.',
  ai_summarize_fail_title: 'Summarization Failed',
  ai_project_plan_success: 'Project plan generated and saved!',
  ai_project_plan_fail: 'Could not generate a project plan.',
  ai_project_plan_fail_title: 'Project Plan Failed',
  ai_extract_tasks_success: 'Action items extracted and saved!',
  ai_extract_tasks_fail: 'Could not extract action items.',
  ai_extract_tasks_fail_title: 'Task Extraction Failed',
  ai_transcribe_success: 'Note transcribed and saved!',
  ai_transcribe_fail: 'Could not transcribe the note.',
  ai_transcribe_fail_title: 'Transcription Failed',
  ai_update_success: 'Transcription updated!',
  ai_update_fail: 'Could not save your changes.',
  ai_update_fail_title: 'Update Failed',
  
  // History Page
  history_page_title: 'Recording History',
  history_loading: 'Loading App...',
  history_no_recordings: 'No Recordings Yet',
  history_no_recordings_desc: "No notes yet! Tap 'Record' to capture your first idea.",
  history_no_recordings_pro_trial: "and start your 7-day Pro Trial",
  history_recorded_ago: 'Recorded {timeAgo}',
  history_audio_note_placeholder: 'Audio note, not yet transcribed.',
  history_view_details_tooltip: 'View Details',
  history_share_note_tooltip: 'Share Note',
  history_share_audio_tooltip: 'Share Audio File',
  history_summarize_tooltip: 'Summarize with AI',
  history_summarize_tooltip_credits: 'Summarize with AI ({credits} credits left)',
  history_expand_tooltip: 'Expand with AI',
  history_expand_tooltip_credits: 'Expand with AI ({credits} credits left)',
  history_project_plan_tooltip: 'Expand as Project',
  history_project_plan_tooltip_credits: 'Expand as Project ({credits} credits left)',
  history_extract_tasks_tooltip: 'Extract Tasks',
  history_extract_tasks_tooltip_credits: 'Extract Tasks ({credits} credits left)',
  history_delete_dialog_title: 'Are you sure?',
  history_delete_dialog_desc: 'This action cannot be undone. This will permanently delete this recording and its transcription.',
  history_delete_button: 'Delete',
  history_cancel_button: 'Cancel',
  history_deleted_toast: 'The recording has been permanently deleted.',
  history_deleted_toast_title: 'Recording Deleted',
  history_delete_failed_toast: 'Could not delete the recording. Please try again.',
  history_delete_failed_toast_title: 'Deletion Failed',
  history_share_all_button: 'Share All',
  history_nothing_to_share: 'This note has no content to share.',
  history_nothing_to_share_title: 'Nothing to share',
  history_details_title: 'Note Details',
  history_audio_playback_title: 'Audio',
  history_audio_playback_unavailable: 'Audio playback is only available on the device where it was recorded.',
  history_transcription_heading: 'Transcription',
  history_summary_heading: 'Summary',
  history_expanded_note_heading: 'Expanded Note',
  history_project_plan_heading: 'Project Plan',
  history_action_items_heading: 'Action Items',
  history_ready_to_transcribe: 'Ready to Transcribe',
  history_ready_to_transcribe_desc: 'This is an audio-only note. Use an AI credit to get the transcription and unlock more actions.',
  history_transcribe_with_ai: 'Transcribe with AI',
  history_transcribe_with_credit: 'Transcribe with AI (1 Credit)',
  history_failed_to_load_title: 'Failed to Load History',
  history_failed_to_load_desc: 'Could not fetch your recordings. Please try again.',
  history_retranscribe_button: 'Re-transcribe',
  history_retranscribe_confirm_title: 'Re-transcribe Note?',
  history_retranscribe_confirm_desc: 'This will use 1 AI credit (if not on Pro plan) and will replace the current transcription and all previously generated AI content (summaries, expansions, etc.). This action cannot be undone.',
  history_retranscribe_confirm_button: 'Yes, Re-transcribe',
  history_retranscribe_no_audio_desc: 'Cannot re-transcribe without the original audio data.',
  
  // Settings Page
  settings_page_title: 'Settings',
  settings_page_desc: 'Manage your application settings and integrations.',
  settings_admin_title: 'Admin Dashboard',
  settings_admin_desc: 'Usage tracking, cost management, and developer controls.',
  settings_dev_controls: 'Developer Controls',
  settings_simulate_pro: 'Simulate Pro User',
  settings_ai_usage: 'AI Usage & Cost Tracking',
  settings_ai_usage_desc: 'Monitor your AI model usage and associated costs directly in the Google Cloud console. This is the most accurate source for billing information.',
  settings_view_vertex_usage: 'View Vertex AI Usage',
  settings_db_management: 'Database Management',
  settings_db_management_desc: 'Manage your Firestore database, including collections, documents, and security rules.',
  settings_open_firestore: 'Open Firestore Console',
  settings_plan_credits: 'Plan & Credits',
  settings_current_plan: 'Your current plan:',
  settings_plan_pro: 'Pro',
  settings_plan_free: 'Free',
  settings_credits_remaining: 'You have {credits} AI credit{plural} remaining.',
  settings_upgrade_to_pro: 'Upgrade to Pro',
  settings_data_and_sync_title: "Data & Sync",
  settings_data_and_sync_desc: "Control how your data is saved and managed.",
  settings_cloud_sync: 'Cloud Sync',
  settings_cloud_sync_pro_feature: 'Cloud Sync is a Pro feature.',
  settings_cloud_sync_pro_feature_desc: "Sync your notes securely across all your devices and ensure they're always backed up.",
  settings_enable_cloud_sync: 'Enable Cloud Sync',
  settings_auto_save_cloud: 'Automatically save new notes to cloud',
  settings_auto_delete: 'Auto-delete Recordings',
  settings_auto_delete_desc: 'Automatically delete old local recordings to save space on your device. This cannot be undone.',
  settings_delete_never: 'Never',
  settings_delete_7_days: 'After 7 days',
  settings_delete_15_days: 'After 15 days',
  settings_delete_30_days: 'After 30 days',
  settings_trello: 'Trello Integration',
  settings_trello_pro_feature: 'Trello Integration is a Pro feature.',
  settings_trello_pro_feature_desc: 'Connect ideas directly to your Trello boards for seamless project management.',
  settings_trello_connect_desc: 'Connect your Trello account to seamlessly create cards from your notes.',
  settings_connect_trello: 'Connect to Trello',
  settings_save_button: 'Save Changes',
  settings_save_success: 'Your new settings have been applied.',
  settings_save_success_title: 'Settings Saved',
  settings_local_storage: 'Local Storage Management',
  settings_local_storage_desc: "View and manage recordings stored directly on this device's browser storage.",
  settings_manage_local: 'Manage Local Recordings',
  settings_sheet_title: 'Local Device Recordings',
  settings_sheet_desc: 'These recordings are saved in your browser. Deleting them here is permanent.',
  settings_sheet_delete_success: 'Recording Deleted',
  settings_sheet_delete_fail: 'Deletion Failed',
  settings_sheet_empty: 'No local recordings found for this user.',
  settings_danger_zone_title: 'Danger Zone',
  settings_danger_zone_desc: 'Irreversible account actions.',
  settings_delete_account_button: 'Delete Account Permanently',
  settings_delete_confirm1_title: 'Are you absolutely sure?',
  settings_delete_confirm1_desc: 'This action is irreversible. It will immediately delete all your notes, data, and settings from our servers.',
  settings_delete_confirm1_button: 'Continue with Deletion',
  settings_delete_confirm2_title: 'Final Confirmation',
  settings_delete_confirm2_desc: 'This is your final warning. Your account and all associated data will be permanently deleted. This cannot be undone.',
  settings_delete_confirm2_button: 'Yes, Delete My Account Permanently',
  settings_account_deleted_title: 'Account Deleted',
  settings_account_deleted_desc: 'Your account has been permanently deleted.',
  settings_delete_account_fail_title: 'Failed to Delete Account',
  settings_delete_account_fail_desc: 'An error occurred while deleting your account:',
  settings_reauth_required_title: 'Re-authentication Required',
  settings_reauth_required_desc: 'For your security, you have been signed out. Please sign in again to proceed with deleting your account.',
  settings_downgrade_to_free: 'Switch to Free Plan',
  settings_downgrade_confirm_title: 'Switch to Free Plan?',
  settings_downgrade_confirm_desc: "You will lose access to Pro features like unlimited AI actions and cloud sync. Your existing synced notes will remain, but new notes won't be synced. Are you sure?",
  settings_downgrade_confirm_button: 'Yes, Switch to Free',
  settings_downgrade_success_title: 'Switched to Free Plan',
  settings_downgrade_success_desc: 'You are now on the Free plan.',

  
  // About Page
  about_title: 'Sole Developer & Creator',
  about_description: "👾 Hey, I'm Milton — a lifelong tech tinkerer and full-time code wrangler. I like building things that solve problems, break gracefully, and maybe even make life a bit easier. I'm always learning, always debugging, and never too far from a command line.",
  about_linkedin: 'LinkedIn',
  about_canvasdesk: 'Check out CanvasDesk',
  about_contact_email: 'Contact via Email',
  about_footer: 'This application is proudly built with Next.js, React, and Genkit.',

  // Terms & Privacy
  terms_title: 'Terms of Service',
  privacy_title: 'Privacy Policy',
  back_to_home: 'Back to Home',
  last_updated: 'Last updated: {date}',

  // Feedback Component
  feedback_dialog_title: 'Send Feedback',
  feedback_dialog_desc: 'Have a suggestion or found a bug? Let us know!',
  feedback_type_label: 'Type of Feedback',
  feedback_type_bug: 'Bug Report',
  feedback_type_suggestion: 'Suggestion',
  feedback_type_other: 'Other',
  feedback_message_label: 'Your Message',
  feedback_message_placeholder: 'Please describe your feedback in detail...',
  feedback_submit_button: 'Send Feedback',
  feedback_email_subject: 'Feedback for Idea Saver ({type})',
  feedback_thank_you_title: 'Thank You!',
  feedback_thank_you_desc: 'Your feedback has been sent. We appreciate you helping us improve.',
  feedback_message_required_title: 'Message Required',
  feedback_message_required_desc: 'Please write a message before sending.',

  // Onboarding Splash
  onboarding_step1_title: "Record Your Voice",
  onboarding_step1_desc: "Tap the microphone to instantly capture your thoughts, ideas, and reminders.",
  onboarding_step2_title: "Unleash AI Magic",
  onboarding_step2_desc: "Automatically transcribe, summarize, and even expand your notes into structured documents.",
  onboarding_step3_title: "Sync & Access Anywhere",
  onboarding_step3_desc: "With a Pro plan, your notes are securely saved to the cloud, available on all your devices.",
  onboarding_dont_show_again: "Don't show this again",
  onboarding_get_started: "Get Started",

  // Debug Drawer
  debug_drawer_title: "Debug Logs",
  debug_drawer_desc: "Live event logs from the application.",
  debug_drawer_copy_button: "Copy All Logs",
  debug_drawer_copied_toast: "All logs copied to clipboard!",
  debug_drawer_clear_button: "Clear Logs",
  debug_drawer_cleared_toast: "Logs cleared!",

  // Tooltips
  tooltip_feedback: "Enviar Comentarios",
  tooltip_history: "Ver Historial",
  tooltip_debug: "Registros de Depuración",
};
