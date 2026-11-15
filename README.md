# KYC/KYB Console

Classroom game for RSU Digital Economy, Lecture 10. Teams act as a bank's compliance desk: each gets a unique fictional client, rates 14 KYC/KYB answers (Low/Medium/High risk), classifies the client and decides: Open / Open + EDD / Decline.

- Presenter: `https://fedyanine-byte.github.io/kyc-console/#/presenter`
- Teams join: `https://fedyanine-byte.github.io/kyc-console/#/join` (QR on presenter screen)

Flow: New session → teams join → Assign clients · Start → (Lock answers) → Reveal → Explanation ▸ per team.
Scoring: 1 pt per correctly rated answer (14), +3 correct overall risk, +5 correct decision, −10 for opening the sanctioned client's account.
Cases live in `src/data/cases.js`. All clients and list entries are fictional.
Data: Firebase Realtime Database (brussels-tribunal project), path `games/kyc-console`.
