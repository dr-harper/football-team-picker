export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <a href="/" className="text-green-400 text-sm hover:text-white transition-colors mb-8 inline-block">← Back to TeamShuffle</a>
                <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
                <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

                <div className="space-y-8 text-white/70 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">About TeamShuffle</h2>
                        <p>TeamShuffle (<strong className="text-white/90">teamshuffle.app</strong>) is a free tool for organising amateur football games. It is provided as a hobby project, free of charge, with no guarantees of uptime or continued availability.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Acceptance</h2>
                        <p>By using TeamShuffle you agree to these terms. If you do not agree, please do not use the service.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Use of the service</h2>
                        <p className="mb-3">You agree to use TeamShuffle only for its intended purpose — organising amateur football games. You must not:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Use the service for any unlawful purpose</li>
                            <li>Attempt to gain unauthorised access to other users' data</li>
                            <li>Use the service to harass, abuse, or harm others</li>
                            <li>Attempt to disrupt or degrade the service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Your account</h2>
                        <p>You are responsible for maintaining the security of your Google account. You are responsible for all activity that occurs under your account.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Your content</h2>
                        <p>You retain ownership of any content you add to TeamShuffle (player names, game data, etc.). By adding content you grant us the right to store and display it to members of your leagues.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Disclaimer of warranties</h2>
                        <p>TeamShuffle is provided "as is" without warranty of any kind. We do not guarantee the service will be available, error-free, or that your data will never be lost. Please do not rely on this service for anything critical.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Limitation of liability</h2>
                        <p>To the fullest extent permitted by law, the developer of TeamShuffle shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Changes to these terms</h2>
                        <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Governing law</h2>
                        <p>These terms are governed by the laws of England and Wales.</p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-base mb-2">Contact</h2>
                        <p>Questions about these terms: <a href="mailto:mikeylharper@gmail.com" className="text-green-400 hover:text-white transition-colors">mikeylharper@gmail.com</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
}
