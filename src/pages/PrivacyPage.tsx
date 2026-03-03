export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <a href="/" className="text-green-400 text-sm hover:text-white transition-colors mb-8 inline-block">← Back to TeamShuffle</a>
                <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
                <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

                <div className="space-y-8 text-white/70 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Who we are</h2>
                        <p>TeamShuffle (<strong className="text-white/90">teamshuffle.app</strong>) is a free hobby app for organising amateur football games. It is operated by an individual developer and is not a commercial product.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">What data we collect</h2>
                        <p className="mb-3">When you sign in with Google we receive:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Your Google account email address</li>
                            <li>Your display name</li>
                            <li>Your Google account profile photo (if set)</li>
                        </ul>
                        <p className="mt-3">When you use the app we store:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                            <li>League and game data you create (names, dates, locations, scores)</li>
                            <li>Your availability responses for games</li>
                            <li>Your display name preference</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">How we use your data</h2>
                        <p>Your data is used solely to provide the TeamShuffle service — organising leagues, generating teams, and tracking game results. We do not use your data for advertising, profiling, or any commercial purpose.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Where your data is stored</h2>
                        <p>All data is stored in <strong className="text-white/90">Google Firebase</strong> (Firestore and Authentication), which is hosted on Google Cloud infrastructure in the EU. Authentication is handled entirely by Google.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Data sharing</h2>
                        <p>We do not sell, trade, or share your personal data with any third parties. Your game and league data is visible to other members of leagues you join.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Data retention and deletion</h2>
                        <p>Your data is retained for as long as your account exists. To request deletion of your account and associated data, contact us at the email address below.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Your rights</h2>
                        <p>Under UK GDPR you have the right to access, correct, or delete your personal data. To exercise any of these rights, please contact us.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Contact</h2>
                        <p>For any privacy-related queries: <a href="mailto:mikeylharper@gmail.com" className="text-green-400 hover:text-white transition-colors">mikeylharper@gmail.com</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
}
