# Manual voice tests (humans only, no automation)

Run on a real phone (Android Chrome) and on a laptop (Chrome). Tick what passes.

Happy path
- [ ] Hindi: speak "Main thela lagata hoon, teen bachche hain, kiraye ke ghar mein rehta hoon, bank account bhai ke naam pe hai." The profile fills live and a follow-up asks for age.
- [ ] Hinglish with number words: say your age as "battis" and hear it read back correctly.
- [ ] Telugu: complete the same story in Telugu (or note the fallback if no Telugu voice exists).
- [ ] Results are spoken in the chosen language and cards show source and verified status.
- [ ] Print sheet opens and says it is not an application.

Failure handling
- [ ] Say nothing for 6 seconds: hear "Boliye, main sun raha hoon." After 12 seconds listening stops.
- [ ] Play loud background noise (video or music): low-confidence message appears, and after two failures the Haan/Nahi buttons show.
- [ ] Say a wrong age, then answer "Nahi" at read-back: it asks again.
- [ ] Give two different ages in one story: it asks which is right.
- [ ] Tap the mic while the app is speaking: speech stops at once and it listens.
- [ ] Answer a question with something off-topic: it steers back once, then offers to skip.
- [ ] Disable the mic permission: the typed box and "Play sample" still complete the flow.

Rules sanity
- [ ] Age 42 is NOT matched to PM-SYM and the card says the entry age stops at 40.
- [ ] Someone in EPF or ESIC is not matched to PM-SYM or e-Shram.
- [ ] App starts and works with no .env file at all.
